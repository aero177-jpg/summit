import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../models/db";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Collapse } from "react-collapse";
import { LongPressCallbackReason, LongPressEventType, useLongPress } from "use-long-press";
import {
  ArchiveIcon,
  BulletListIcon,
  CheckIcon,
  ChevronIcon,
  EditIcon,
  ListIcon,
  RefreshIcon,
  TrashIcon,
  WalletIcon,
} from "./customIcons";
import Dropdown from "./Dropdown";
import { ICollection } from "../models/collection";
import useFade from "../utils/useFade";
import { ActionButton } from "./ActionButton";
import { useNavigate } from "react-router-dom";
import AnimatedPage from "./AnimatedPage";
import { ActionButtonContext } from "../context/ActionButtonContext";
import { SyncButton } from "./SyncButton";
import { nanoid } from "nanoid";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import ItemLinkDropdown, { ActiveItemsToggle, QuickItemsToggle } from "./ItemLinkDropdown";

import PortalModal from "./PortalModal";
import NewQuickItem, { useQuickCollectionIds } from "./NewQuickItem";
import { useTheme } from "../App";
import { colorOptions, variantEnum } from "../constants";
import { AddSection } from "./AddSection";
import { Button } from "./Button";

export const collectionTypeOptions = ["general", "budget"];
export const colorOptionsTheme = [
  { label: "", value: "#cd544f" },
  { label: "neutral", value: "#e2e2df" },
  { label: "dark", value: "#181818" },
  { label: "black", value: "#000000" },
];
export const backgroundPatternOptions = [
  // { label: "isometric", value: "var(--pattern-preview-isometric)" },
  // { label: "dots", value: "var(--pattern-preview-dots)" },
  { label: "dots", value: "var(--pattern-preview-dots)" },
  { label: "waves", value: "var(--pattern-preview-waves)" },
];
export const CollectionCard = ({ collection, onClick }) => {
  const [editMode, setEditMode] = useState(false);
  const [updatedCollection, setUpdatedCollection] = useState<any>(collection);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [isVisible, setVisible, fadeProps] = useFade(false);

  const updateCollection = (changes) => {
    setUpdatedCollection((currentCollection) => ({
      ...currentCollection,
      ...changes,
    }));
    void db.collections.update(collection.id, changes);
  };

  useEffect(() => {
    if (editMode) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [editMode]);

  const callback = useCallback(() => {
    setIsLongPressed(!isLongPressed);
  }, [isLongPressed]);
  const handleOpen = (reason) => {
    if (isLongPressed === true) {
      setIsLongPressed(false);
      setEditMode(false);
    } else {
      onClick();
    }
  };
  const bind = useLongPress(callback, {
    onCancel: (event, { reason }) =>
      reason !== LongPressCallbackReason.CancelledByMovement &&
      reason !== LongPressCallbackReason.CancelledOutsideElement &&
      handleOpen(reason),
    threshold: 300,

    detect: LongPressEventType.Pointer,
    cancelOnMovement: true,
  });
  const handleUpdateColor = (color) => {
    if (!editMode) return;
    updateCollection({ tag: color });
  };

  const handleDelete = () => {
    db.collections.update(collection.id, { ...collection, archived: true });
    setIsLongPressed(false);
  };

  const handleEditArchived = (e, action) => {
    e.preventDefault();
    e.stopPropagation();
    if (action === "refresh") {
      db.collections.update(collection.id, {
        ...collection,
        archived: false,
      });
    }
    if (action === "delete") {
      void db.deleteCollection(collection);
    }
  };

  return (
    <div className="m-2 mb-3 ">
      <div
        className="relative"
        style={{
          width: `${collection.archived ? "calc(100% - 5.3rem)" : "100%"}`,
        }}
      >
        <div className="flex-auto">
          <div {...bind("test context")} className=" collectionLinkHeader flex px-1 py-2 h-11 ">
            <div
              className="colorTab mr-2"
              style={{
                height: "90%",
                opacity: `${collection?.tag?.label ? 1 : 0}`,
                backgroundColor: `${updatedCollection?.tag?.value ?? collection?.tag?.value}`,
              }}
            />
            {collection.collectionType == "budget" ? (
              <WalletIcon className="mr-1" style={{ width: ".8rem", height: ".7rem" }} />
            ) : (
              <BulletListIcon className="mr-1" style={{ width: ".8rem", height: ".7rem" }} />
            )}
            {editMode === false ? (
              <div className="prevent-select"> {collection.title}</div>
            ) : (
              <div className="w-full flex pl-2">
                <input
                  className={`w-full bg-transparent pl-2 outline-none sectionHeaderInput mx-1 ${
                    editMode && "collectionHeaderEditMode"
                  }`}
                  type={"text"}
                  autoFocus={true}
                  value={updatedCollection.title}
                  onChange={(e) => updateCollection({ title: e.target.value })}
                  placeholder={""}
                />
              </div>
            )}
          </div>
        </div>
        {collection?.archived && (
          <div
            style={{
              position: "absolute",
              right: "-5.3rem",
              top: 0,
              // background: "#2f2f2f",
              display: "flex",
              padding: "0.4rem",
            }}
            className="rounded-md h-11"
          >
            <div className="w-4" />
            <Button
              onClick={(e) => handleEditArchived(e, "refresh")}
              color="#528b5f"
              // style={{ background: "#528b5f", padding: "0.1em 0.65em" }}
              // className="rounded-md mr-1"
            >
              <RefreshIcon style={{ width: ".8em" }} />
            </Button>

            <div className="w-1" />
            <Button
              onClick={(e) => handleEditArchived(e, "delete")}
              color="#cb4d4d"
              // style={{ background: "#cb4d4d", padding: "0.1em 0.65em" }}
              // className="rounded-md"
            >
              <TrashIcon style={{ width: ".8em" }} />
            </Button>
          </div>
        )}
      </div>

      <div className="pb-0">
        <Collapse isOpened={isLongPressed}>
          <div className="w-100 h-fit pt-2 pb-1  ">
            <div className="flex pb-1">
              <input
                className="itemCommentInput collectionCommentInput flex-1"
                type="text"
                placeholder="Add comment..."
                style={{ padding: "4px 8px" }}
                value={updatedCollection.comment}
                onChange={(e) => updateCollection({ comment: e.target.value })}
              />
            </div>
          </div>
          <div className="flex">
            <div>
              {isVisible && (
                <div className={`defaultHidden ${editMode ? "show" : ""}`} {...fadeProps}>
                  <Dropdown
                    data={colorOptions}
                    handleUpdate={handleUpdateColor}
                    open={!editMode}
                    initialItem={collection.tag}
                  />
                </div>
              )}
            </div>
            <div className="flex-auto" />
            <Button onClick={() => handleDelete()} color="#cb4d4d">
              <ArchiveIcon style={{ width: ".8em" }} />
            </Button>
            <div className="w-1" />
            <Button onClick={() => setEditMode(!editMode)} color={`${editMode ? "#498069" : "#7c8cba"}`}>
              {editMode ? (
                <CheckIcon style={{ width: ".9em", marginLeft: "0px" }} />
              ) : (
                <EditIcon style={{ width: ".9em", marginRight: "-1px" }} />
              )}
            </Button>
          </div>
        </Collapse>
      </div>
    </div>
  );
};

export const CollectionList = () => {
  const [openNewCollection, setOpenNewCollection] = useState(false);
  const [filteredItemsType, setFilteredItemsType] = useState("");
  const [openItemsList, setOpenItemsList] = useState(null);
  const [openSettings, setOpenSettings] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { theme, setTheme, backgroundPattern, setBackgroundPattern, isDarkMode } = useTheme();

  const { setActionBtnVisible } = useContext(ActionButtonContext);
  useEffect(() => {
    setActionBtnVisible(true);
  }, []);
  const parentDivRef2 = useRef();
  const emptyCollection: ICollection = {
    _id: nanoid(),
    title: "",
    tag: { label: "", value: "#dbdbdb1f" },
    comment: "",
    collectionType: variantEnum.GENERAL,
    sorted: false,
  };
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("email");
  const boxVariant = {
    hidden: {
      // y: "-100px", //move out of the site
      opacity: 0, //make it transparent
    },
    visible: {
      // y: 0, // bring it back to nrmal
      opacity: 1,
      transition: {
        when: "beforeChildren", //use this instead of delay
        staggerChildren: 0.06, //apply stagger on the parent tag
      },
    },
  };
  const listVariant = {
    hidden: {
      y: -20, //move out of the site
      opacity: 0,
    },
    visible: {
      y: 0, // bring it back to nrmal
      opacity: 1,
    },
  };

  let allCollections = useLiveQuery(() => db.collections.toArray());
  const archivedCollections = allCollections?.filter((col) => col?.archived == true);
  const collections = allCollections?.filter((col) => col?.archived !== true && col?.collectionType !== "quick");

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const items = await db.items.toArray();
        const activeTimers = items.filter((item) => item?.timerSettings?.isCompleted === false);
        activeTimers.forEach((scheduledItem) => {
          const itemDate = new Date(scheduledItem.timerSettings.date);
          const currentDate = new Date();
          if (itemDate <= currentDate) {
            if (!["nah", "paused", "done"].includes(scheduledItem?.status)) {
              db.items.update(scheduledItem.id, {
                ...scheduledItem,
                status: "do now!",
              });
            } else if (scheduledItem?.status === "done") {
              db.items.update(scheduledItem.id, {
                ...scheduledItem,
                timerSettings: {
                  ...scheduledItem.timerSettings,
                  isCompleted: true,
                },
              });
            }
          }
        });
      } catch (error) {
        console.error("Query failed: ", error);
      }
    };

    fetchItems();
    const timerInterval = window.setInterval(fetchItems, 60_000);

    return () => {
      window.clearInterval(timerInterval);
    };
  }, []);
  const quickCollectionIds = useQuickCollectionIds();
  // Indexed queries so the home screen only loads (and only re-renders for) the items it shows
  const statusItems = useLiveQuery(() => db.items.where("status").anyOf("active", "do now!").toArray());
  const activeItems = statusItems?.filter((item) => item.status === "active");
  const quickCollectionItems = useLiveQuery(
    () => db.items.where("collectionId").equals(quickCollectionIds.global ?? "").toArray(),
    [quickCollectionIds.global],
  );

  const today = new Date();
  function getDateDaysBefore(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  today.setHours(0, 0, 0, 0); // Set the time to 00:00:00
  const prioItems = statusItems?.filter((item) => item.status === "do now!");

  const quickItems = quickCollectionItems?.filter((item) => new Date(item.date) >= getDateDaysBefore(3));
  // const [parent, enableAnimations] = useAutoAnimate({ duration: 400 });
  const handleChangeRoute = (route: string) => {
    navigate(route);
  };

  const createCollectionCards = (col) =>
    col?.map((col, i) => (
      <motion.div key={col._id} variants={listVariant}>
        <CollectionCard collection={col} key={i} onClick={() => handleChangeRoute(`/collection/${col.id}`)} />
      </motion.div>
    ));
  const saveChange = (sectionToSave) => {
    db.collections.add(sectionToSave);
    setActionBtnVisible(true);
    setOpenNewCollection(false);
  };

  const handleToggleActive = (status) => {
    if (status === "quick" && quickItems?.length == 0) {
      handleChangeRoute(`/collection/${quickCollectionIds.local ?? ""}`);
    }

    if (filteredItemsType !== status) {
      setFilteredItemsType(status);
      if (filteredItemsType.length == 0) {
        setOpenItemsList(true);
      }
      if (openItemsList === false) {
        setOpenItemsList(true);
      }
    } else {
      setOpenItemsList(!openItemsList);
    }
  };

  const [openNewItemModal, setOpenNewItemModal] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // useEffect(() => {
  //   console.log(offset);
  // }, [offset]);
  const handleCloseNewCollection = () => {
    setActionBtnVisible(true);
    setOpenNewCollection(false);
  };

  const handleCloseNewItemModal = () => {
    setOpenNewItemModal(false);
    setActionBtnVisible(true);
  };
  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };
  const handleShowArchived = () => {
    if (showArchived === true) {
      setActionBtnVisible(true);
    } else {
      setActionBtnVisible(false);
    }
    setShowArchived(!showArchived);
  };
  return (
    <AnimatedPage>
      <div className="budgetBackground p-2 relative" ref={parentDivRef2}>
        <div className="mb-4 flex relative ">
          <div className="flex-1 rounded-md overflow-x-hidden">
            <motion.div
              animate={{
                x: openSettings ? -195 : 0,
                transition: {
                  duration: 0.15,
                  type: "spring",
                  mass: 1,
                  damping: 28,
                  stiffness: 500,
                },
              }}
              drag="x"
              dragSnapToOrigin={openSettings ? true : false}
              dragConstraints={{ left: -200, right: 0 }}
              // dragTransition={{ bounceStiffness: 300, bounceDamping: 22 }}
              dragElastic={0.05}
              onDrag={(event, info) => setOffset(info.point.x)}
              onDragStart={handleDragStart}
              onDragEnd={(event, info) => {
                handleDragEnd();
                if (info.offset.x < -30 || info.velocity.x < -100) {
                  if (openSettings === false) {
                    setOpenSettings(true);
                  } else {
                    setOpenSettings(false);
                  }
                } else {
                  setOpenSettings(false);
                }
              }}
              className=" pageHeader-bg w-full rounded-md p-3 flex items-center gap-2 relative z-10"
            >
              <QuickItemsToggle
                className={""}
                style={{
                  opacity: `${openSettings ? 0 : 1}`,
                  transition: `opacity .2s ease-in ${openSettings ? "0ms" : "200ms"}`,
                }}
                disabled={openSettings}
                onClick={() => handleToggleActive("quick")}
                itemsLength={quickItems?.length}
              />
              <div className="text-lg font-medium ml-3 flex-grow headertext"></div>
              <div className="flex gap-2 overflow-hidden px-2 -mr-2">
                <ActiveItemsToggle
                  className={`${openItemsList == null && "shake"}`}
                  style={{
                    opacity: `${openSettings ? 0 : 1}`,
                    transition: `opacity .2s ease-in ${openSettings ? "0ms" : "200ms"}`,
                  }}
                  disabled={openSettings}
                  status={"Do now!"}
                  onClick={() => handleToggleActive("Do now!")}
                  itemsLength={prioItems?.length}
                />
                <ActiveItemsToggle
                  className={""}
                  style={{
                    opacity: `${openSettings ? 0 : 1}`,
                    transition: `opacity .2s ease-in ${openSettings ? "0ms" : "200ms"}`,
                  }}
                  disabled={openSettings}
                  status={"active"}
                  onClick={() => handleToggleActive("active")}
                  itemsLength={activeItems?.length}
                />
                {openSettings && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3 items-center"
                    style={{
                      height: "32px",
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      right: "1.5em",
                      margin: "auto 0",
                    }}
                  >
                    <Dropdown
                      data={colorOptionsTheme}
                      handleUpdate={(item) => setTheme(item.label)}
                      initialItem={colorOptionsTheme.find((i) => i.label === theme)}
                      open={false}
                      hideClickShield={true}
                      colorTriggerStyle={{
                        width: "64px",
                        height: "28px",
                        boxShadow: isDarkMode ? "none" : undefined,
                        border: isDarkMode ? "1px solid #6666664f" : undefined,
                      }}
                      secondaryData={backgroundPatternOptions}
                      handleSecondaryUpdate={(item) =>
                        setBackgroundPattern(backgroundPattern === item.label ? "" : item.label)
                      }
                      secondaryInitialItem={backgroundPatternOptions.find((item) => item.label === backgroundPattern)}
                    />
                    {archivedCollections?.length > 0 && (
                      <button
                        key="archived"
                        type="button"
                        className="rounded-md mr-1 flex items-center smallButton"
                        onClick={() => handleShowArchived()}
                      >
                        <ChevronIcon
                          style={{
                            width: ".8em",
                            margin: "4px 4px 3px 8px",
                            transform: `${showArchived ? "rotate(180deg)" : "rotate(0deg)"}`,
                            transition: "all .2s ease-in-out",
                          }}
                        />
                        <div
                          className="flex items-center"
                          style={{
                            gap: "5px",
                            margin: "2px 4px",
                            marginLeft: "4px",
                            fontWeight: 600,
                            // background: "#565656",
                            padding: "0 10px",
                            borderRadius: "6px",
                          }}
                        >
                          <ArchiveIcon style={{ transform: "scale(.85)" }} />
                          {archivedCollections?.length}
                        </div>
                      </button>
                    )}
                  </motion.div>
                )}
              </div>

              <div onClick={() => setOpenSettings(!openSettings)} className="h-auto">
                <ul className="verticalDots">
                  <li></li>
                  <li></li>
                  <li></li>
                </ul>
              </div>
            </motion.div>
          </div>
          <AnimatePresence>
            {(openSettings || isDragging) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="absolute right-0 top-0 h-full flex items-center justify-center">
                  <SyncButton />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div
          className=" w-full"
          style={{
            zIndex: 1,
            // opacity: `${openSettings ? 0 : 1}`,
            transition: `opacity .2s ease-in ${openSettings ? "0ms" : "200ms"}`,
          }}
        >
          <ItemLinkDropdown
            data={
              filteredItemsType === "active"
                ? activeItems
                : filteredItemsType === "Do now!"
                  ? prioItems
                  : filteredItemsType === "quick"
                    ? quickItems
                    : []
            }
            status={filteredItemsType}
            openItemsList={openItemsList}
            handleCloseList={() => console.log("")}
          />
        </div>
        <PortalModal showModal={openNewCollection} handleCloseCB={handleCloseNewCollection}>
          <div style={{ width: "100%", padding: "0.5em" }}>
            <AddSection
              saveCB={saveChange}
              variant="collection"
              newSection={emptyCollection}
              placeholder="Add collection..."
            />
          </div>
        </PortalModal>

        <PortalModal showModal={openNewItemModal} handleCloseCB={handleCloseNewItemModal}>
          <NewQuickItem />
        </PortalModal>

        <AnimatePresence mode="wait">
          {collections && (
            <LayoutGroup>
              <motion.div variants={boxVariant} animate="visible" initial="hidden" className="flex-1 overflow-auto">
                {createCollectionCards(collections)}
                {showArchived && openSettings ? createCollectionCards(archivedCollections) : null}
                {/* <button
                  onClick={() => {
                    setOpenNewItemModal(true);
                  }}
                >
                  click me
                </button> */}
              </motion.div>
            </LayoutGroup>
          )}
        </AnimatePresence>
        <ActionButton
          parentDivRef={parentDivRef2}
          onClick={() => setOpenNewCollection(true)}
          onClickSecondary={() => setOpenNewItemModal(true)}
        />
      </div>
    </AnimatedPage>
  );
};
