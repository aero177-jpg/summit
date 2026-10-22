import { db, firebaseBackup_db, resetDatabase } from "../models/db";
import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
// Firebase is loaded on demand so it stays out of the startup bundle
const loadFirebase = () => import("../utils/firebaseServices");
import useLocalStorage from "../actions";
import { convertDate } from "./TinyChecklist";
import { exportLegacyData } from "../data/legacy/exportLegacyData";
import { useLiveQuery } from "dexie-react-hooks";
import { migrateItemTables, ITEM_DATA_VERSION } from "../domain/migrateItemTables";
import { RefreshIcon } from "./customIcons";
import { Button } from "./Button";
import { useTheme } from "../App";

export const SyncButton: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const pendingMigration =
    useLiveQuery(() => db.sections.filter((section) => section.dataVersion !== ITEM_DATA_VERSION).count(), []) ?? 0;
  const [syncDates, setSyncDates] = useLocalStorage("syncDates", {
    upload: "",
    download: "",
  });
  useEffect(() => {
    const showLogin = () => {
      const userId = localStorage.getItem("uid");
      if (!userId) {
        return false;
      }
      return true;
    };
    setIsLoggedIn(showLogin());
  }, []);

  const getCollectionWithSectionsAndItems = async (): Promise<any[]> => {
    const collections = await db.collections.toArray();
    return Promise.all(
      collections.map(async ({ id, ...collection }) => {
        const sections = await db.sections.where("collectionId").equals(collection._id).toArray();
        const sectionsWithItems = await Promise.all(
          sections.map(async ({ id, ...section }) => ({
            ...section,
            items: await db.items.where("sectionId").equals(section._id).toArray(),
          })),
        );
        return { ...collection, sections: sectionsWithItems };
      }),
    );
  };

  const sync = async () => {
    if (pendingMigration) {
      window.alert("Convert legacy data before uploading.");
      return;
    }
    const { getUserData, updateItemsInSubcollection } = await loadFirebase();
    const backup = await getUserData();
    await firebaseBackup_db.backups.add(backup);
    const collections = await getCollectionWithSectionsAndItems();
    if (!collections) {
      return;
    }
    collections.forEach((collection) => {
      if (!collection?._id) {
        collection._id = nanoid();
      }
    });

    await updateItemsInSubcollection(collections);
    setSyncDates({
      ...syncDates,
      upload: new Date().toISOString(),
    });
    // handleDownload();
  };

  const runSyncAction = async (action, failureMessage) => {
    setIsSyncing(true);
    try {
      await action();
    } catch (error) {
      console.error(error);
      window.alert(failureMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownload = async () => {
    const { getUserData } = await loadFirebase();
    const collections = await getUserData();
    if (!collections?.length) {
      window.alert("No cloud data was found. Your local data was not changed.");
      return;
    }

    const shouldReplace = window.confirm(
      `Replace local data with ${collections.length} cloud collection${collections.length === 1 ? "" : "s"}? A local backup will be saved first.`,
    );
    if (!shouldReplace) return;

    await firebaseBackup_db.backups.add(await exportLegacyData());

    const newSections = [];
    const newItems = [];
    const newCollections = [];
    const savedOrder = [];

    collections.forEach((col) => {
      if (!col?._id) {
        return;
      }
      col?.sections?.forEach((section) => {
        if (!section?._id) {
          return;
        }
        const items = section.items ?? [];
        const itemIdsByPreviousId = new Map(items.map((item) => [item.id, item._id]));
        const itemOrder = (section.customOrder ?? []).map((itemId) => itemIdsByPreviousId.get(itemId)).filter(Boolean);
        if (itemOrder.length) {
          savedOrder.push({ sectionId: section._id, itemOrder });
        }

        items.forEach((item) => {
          if (!item?._id) {
            return;
          }
          const { id, ...newItem } = item;
          newItems.push(newItem);
        });
        const { id, items: ignoredItems, ...newSection } = section;
        newSections.push(newSection);
      });
      const { id, sections: ignoredSections, ...newCollection } = col;
      newCollections.push(newCollection);
    });
    await resetDatabase(newCollections, newSections, newItems);
    await Promise.all(
      savedOrder.map(async ({ sectionId, itemOrder }) => {
        const localItems = await db.items.where("sectionId").equals(sectionId).toArray();
        const localIdByItemId = new Map(localItems.map((item) => [item._id, item.id]));
        const customOrder = itemOrder
          .map((itemId) => localIdByItemId.get(itemId))
          .filter((itemId) => itemId !== undefined);
        await db.sections.where("_id").equals(sectionId).modify({ customOrder });
      }),
    );
    setSyncDates({
      ...syncDates,
      download: new Date().toISOString(),
    });
    // await db.collections.bulkAdd(newCollections);
    // await db.sections.bulkAdd(newSections);
    // await db.items.bulkAdd(newItems);
  };

  const handleLogin = async () => {
    const { signInWithGoogle } = await loadFirebase();
    await signInWithGoogle();
    setIsLoggedIn(true);
  };

  const handleMigration = async () => {
    if (
      !window.confirm(
        `Convert ${pendingMigration} legacy sections? Original item values are retained; conflicting table values are kept in Legacy table columns. Unmatched table rows become additional items. Legacy time amounts become duration in seconds. A recovery export will be saved first. Cloud data is not changed until you upload.`,
      )
    )
      return;
    const backup = await exportLegacyData();
    await firebaseBackup_db.backups.add(backup);
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `budget-before-conversion-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    const result = await migrateItemTables();
    window.alert(
      `Converted ${result.sections} sections. Preserved ${result.conflicts} conflicting table cells and ${result.addedRows} unmatched table rows. Review your data, then upload to save it to the cloud.`,
    );
  };
  const convertButton = (
    <Button
      type="button"
      title="Convert downloaded legacy data"
      disabled={isSyncing}
      color="#617385"
      colorDarkMode={isDarkMode ? "var(--sectionheader-text)" : undefined}
      className="dropdown-item-label flex items-center gap-1"
      style={{ height: "auto", maxHeight: "none", width: "auto", margin: "0", padding: "8px 14px" }}
      onClick={() =>
        runSyncAction(
          handleMigration,
          "Conversion failed. The recovery export is available; no cloud data was changed.",
        )
      }
    >
      {/* <RefreshIcon style={{ width: ".8em" }} /> */}
      update
    </Button>
  );
  return (
    <div className="flex flex-wrap h-full px-2 justify-center items-center gap-2">
      {pendingMigration > 0 && !isLoggedIn && convertButton}
      {!isLoggedIn ? (
        <Button
          onClick={() => runSyncAction(handleLogin, "Sign in failed. Please try again.")}
          disabled={isSyncing}
          color="#5e6373"
          colorDarkMode={isDarkMode ? "var(--sectionheader-text)" : undefined}
          className="dropdown-item-label"
          style={{
            height: "auto",
            maxHeight: "none",
            width: "auto",
            margin: "0",
            padding: "8px 14px",
          }}
        >
          sign in!
        </Button>
      ) : (
        <>
          <div className="relative">
            {pendingMigration > 0 ? (
              convertButton
            ) : (
              <>
                <Button
                  onClick={() => runSyncAction(sync, "Upload failed. Your local data is still available.")}
                  disabled={isSyncing}
                  color="#5e6373"
                  colorDarkMode={isDarkMode ? "var(--sectionheader-text)" : undefined}
                  className="dropdown-item-label"
                  style={{
                    height: "auto",
                    maxHeight: "none",
                    width: "auto",
                    margin: "0",
                    padding: "8px 14px",
                  }}
                >
                  upload
                </Button>
                <p
                  className="absolute top-full left-0 mt-0.5 whitespace-nowrap italic leading-tight"
                  style={{ fontSize: "0.65rem", marginLeft: "2px" }}
                >
                  {convertDate(syncDates.upload)}
                </p>
              </>
            )}
          </div>
          <div className="relative">
            <Button
              onClick={() => runSyncAction(handleDownload, "Download failed. Your local data was not changed.")}
              disabled={isSyncing}
              color="#404040"
              colorDarkMode={isDarkMode ? "var(--sectionheader-text)" : undefined}
              className="dropdown-item-label"
              style={{
                height: "auto",
                maxHeight: "none",
                width: "auto",
                margin: "0px 0px",
                padding: "8px 14px",
              }}
            >
              download
            </Button>
            <p
              className="absolute top-full left-0 mt-0.5 whitespace-nowrap italic leading-tight"
              style={{ fontSize: "0.65rem", marginLeft: "2px" }}
            >
              {convertDate(syncDates.download)}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
