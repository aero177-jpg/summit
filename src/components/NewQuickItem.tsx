import React, { useEffect, useState } from "react";
import { db } from "../models/db";
import { nanoid } from "nanoid";
import { collectionTypeOptions } from "./CollectionList";
import { AddGeneralItem } from "./AddGeneralItem";
import { ISection } from "../models/section";
import { AddBudgetItem } from "./AddBudgetItem";
import { BulletListIcon, LightningIcon, ListIcon, WalletIcon } from "./customIcons";
import { variantEnum } from "../constants";
import { Button } from "./Button";
import AddTag from "./AddTag";

interface NewQuickItemProps {
  // add any props here
}
export function useQuickCollectionIds() {
  const [ids, setIds] = useState({ global: "", local: null });

  useEffect(() => {
    const fetchId = async () => {
      const collection = await db.collections.where("collectionType").equals("quick").first();
      const quickCollection = collection ?? (await db.getOrCreateQuickCollection());
      setIds({ global: quickCollection._id, local: quickCollection.id });
    };

    fetchId();
  }, []);

  return ids;
}
const NewQuickItem: React.FC<NewQuickItemProps> = (props) => {
  const [variant, setVariant] = React.useState<string>("general");
  const [section, setSection] = React.useState<ISection>(null);
  function formatDate(date) {
    let day = date.getDate();
    let month = date.getMonth() + 1; // Months are zero-based in JavaScript
    let year = date.getFullYear();

    // Pad day and month with leading zeros if necessary
    if (day < 10) day = "0" + day;
    if (month < 10) month = "0" + month;

    return day + "." + month + "." + year.toString().substr(-2);
  }
  const quickCollectionId = async () => {
    const collection = await db.getOrCreateQuickCollection();
    return collection._id;
  };

  const quickSection: any = async () => {
    const collectionId = await quickCollectionId();
    const allSections = await db.sections.where("collectionId").equals(collectionId).toArray();
    const section = allSections.find((section) => section.title === `${formatDate(new Date())} - ${variant}`);
    if (section) {
      return section;
    } else {
      const newSection = await db.sections.add({
        title: `${formatDate(new Date())} - ${variant}`,
        _id: nanoid(),
        collectionId: collectionId,
        createdAt: new Date(),
        sectionMode: variant === "budget" ? "budget" : "general",
        dataVersion: 1,
      });
      const newSection2 = await db.sections.get(newSection);
      return newSection2;
    }
  };

  useEffect(() => {
    let isCurrentVariant = true;
    const handleGetSection = async () => {
      const section = await quickSection();
      if (isCurrentVariant) {
        setSection(section);
      }
    };
    handleGetSection();

    return () => {
      isCurrentVariant = false;
    };
  }, [variant]);
  const handleVariantChange = (e, options) => {
    e.preventDefault();
    const currentIndex = options.indexOf(variant);
    const nextIndex = (currentIndex + 1) % options.length;
    const nextOption = options[nextIndex];
    setVariant(nextOption);
  };
  return (
    <div
      style={{
        maxHeight: "240px",
        overflow: "auto",
      }}
    >
      {section && (
        <>
          <div className="ml-2 mb-2 flex justify-between items-center">
            <Button
              onClick={(e) => handleVariantChange(e, collectionTypeOptions)}
              color={`${variant == "general" ? "#5086ad" : variant == "budget" ? "#6f877b" : "#5086ad"}`}
              colorDarkMode={`${variant == "general" ? "#5f93b9" : variant == "budget" ? "#7ea592" : "#5086ad"}`}
              style={{
                display: "flex",
                padding: "0.1em 0.6em",
                minWidth: "5.1rem",
                boxShadow: "black 1px 2px 7px -5px",
              }}
              className="rounded-md gap-1 items-center"
            >
              {variant == "budget" ? (
                <WalletIcon style={{ width: ".8em" }} />
              ) : (
                <BulletListIcon style={{ width: ".8em" }} />
              )}
              {variant ?? "general"}
            </Button>
            <LightningIcon
              className=""
              style={{
                color: "#5b5b5b",
                marginRight: ".6em",
                height: "1.2em",
                width: "1.2em",
              }}
            />
          </div>

          <div className="mx-2">
            {section && variant === "general" ? (
              <AddGeneralItem section={section} isQuickItem={true} />
            ) : variant === "budget" ? (
              <AddBudgetItem section={section} isQuickItem={true} />
            ) : (
              <div style={{ height: "88px" }}></div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NewQuickItem;
