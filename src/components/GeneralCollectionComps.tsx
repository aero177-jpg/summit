import { useCallback, useContext, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ListIcon, SortByIcon } from "./customIcons";
import { db } from "../models/db";
import { IItem } from "../models/item";
import { ISection } from "../models/section";
import { Section } from "./Section";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ActionButtonContext } from "../context/ActionButtonContext";
import { colorOptionsTag } from "./AddTag";
import { statusOptions, variantEnum } from "../constants";
import { throttle } from "lodash";

export const GeneralHeaderOptions = ({ sections, collection, sorted, setSorted }) => {
  const { setActionBtnVisible } = useContext(ActionButtonContext);
  const showSorted =
    (sections &&
      sections.some(
        (section) => (section.checkListMode && section.checkListMode !== "none") || section.archived == true,
      )) ||
    collection?.allTags?.length > 0;

  const handleToggleSorted = () => {
    if (sorted === false) {
      setActionBtnVisible(false);
    } else {
      // setActionBtnVisible(true);
    }
    setSorted(!sorted);
  };
  return (
    <>
      {showSorted && (
        <button
          style={{ padding: "0.4rem" }}
          className="btn-header rounded-md w-11 grid place-items-center"
          onClick={() => handleToggleSorted()}
        >
          {sorted ? (
            <ListIcon style={{ width: "1.4em" }} />
          ) : (
            <SortByIcon
              style={{
                width: "1.4em",
                marginLeft: "-5px",
                transform: "scaleX(1.3)",
              }}
            />
          )}
        </button>
      )}
    </>
  );
};
const boxVariant = {
  hidden: {
    // y: "-100px", //move out of the site
    opacity: 0, //make it transparent
  },
  visible: {
    // y: 0, // bring it back to nrmal
    opacity: 1,
    transition: {
      // when: "beforeChildren", //use this instead of delay
      opacity: {
        delay: 0.2,
        duration: 0.2,
      },
      // staggerChildren: 0.06, //apply stagger on the parent tag
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
export const SortedSections = ({ sections, collection }) => {
  const [expandedAccordion, setExpandedAccordion] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const throttleSetIsAnimating = useCallback(
    throttle((newState) => setIsAnimating(newState), 1000),
    [],
  );
  const allItems = useLiveQuery(
    () => {
      const sectionIds = sections?.map((section) => section._id).filter(Boolean) ?? [];
      return sectionIds.length ? db.items.where("sectionId").anyOf(sectionIds).toArray() : [];
    },
    [sections],
    [],
  );

  const filteredSections: ISection[] = [];
  allItems.forEach((item: IItem) => {
    if (typeof item.status !== "string") return;

    let section = filteredSections.find((section) => section.title === item.status);
    if (!section) {
      let tag = statusOptions.find((option) => option.label === item.status);
      section = {
        title: item.status,
        collectionId: collection._id,
        tag: tag,
        checkListMode: "none",
      };
      filteredSections.push(section);
    }
  });

  const filteredByTagSections = collection?.allTags
    ? collection.allTags.map((tag: any) => {
        let statusOption = colorOptionsTag.find((option) => option.label === tag.color);
        return {
          title: tag.title,
          collectionId: collection._id,
          tag: statusOption,
          checkListMode: "none",
        };
      })
    : [];

  const createFilteredSections = (sections) =>
    sections.map((section, i) => (
      <motion.div key={`status-${section.title}`} variants={listVariant}>
        <Section
          handleAnimation={(e) => throttleSetIsAnimating(e)}
          isAnimating={isAnimating}
          section={{ ...section, id: i }}
          collectionId={collection._id}
          filterType={"STATUS"}
          listItem={i}
          variant={variantEnum.GENERAL}
          expandedAccordion={expandedAccordion}
          setExpandedAccordion={setExpandedAccordion}
        />
      </motion.div>
    ));

  const createFilteredByTagSections = (sections) =>
    sections.map((section, i) => (
      <motion.div key={`tag-${section.title}`} variants={listVariant}>
        <Section
          isAnimating={false}
          handleAnimation={(e) => throttleSetIsAnimating(e)}
          section={{ ...section, id: i }}
          collectionId={collection._id}
          filterType={"TAG"}
          listItem={i}
          variant={variantEnum.GENERAL}
          expandedAccordion={expandedAccordion}
          setExpandedAccordion={setExpandedAccordion}
        />
      </motion.div>
    ));

  return (
    <>
      <AnimatePresence mode="wait">
        <LayoutGroup>
          <motion.div
            variants={boxVariant}
            animate="visible"
            initial="hidden"
            // className="flex-1 overflow-auto"
          >
            {createFilteredSections(filteredSections)}
            {createFilteredByTagSections(filteredByTagSections)}
          </motion.div>
        </LayoutGroup>
      </AnimatePresence>
    </>
  );
};
