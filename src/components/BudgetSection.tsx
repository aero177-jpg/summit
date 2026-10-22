import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../models/db";
import { useEffect, useRef, useState } from "react";
import { AddBudgetItem } from "./AddBudgetItem";
import { BudgetItem } from "./BudgetItem";
import { LongPressCallbackReason, LongPressEventType, useLongPress } from "use-long-press";
import { ISection } from "../models/section";
import { CheckIcon, ChevronIcon, CommentIcon, ListIcon, RefreshIcon, SortByIcon, TrashIcon } from "./customIcons";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { GeneralItem } from "./GeneralItem";
import { AddGeneralItem } from "./AddGeneralItem";
import { IItem } from "../models/item";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import { sortByTypes, variantEnum } from "../constants";
import SectionHeader from "./SectionHeader";
import { Button } from "./Button";
import ExpandableText from "./ExpandableText";
import Dropdown from "./Dropdown";
import { sortBy, filter } from "lodash";
import { useTheme } from "../App";

export const BudgetSection: React.FC<{
  handleAnimation?: (boolean) => void;
  isAnimating?: boolean;
  section: ISection;
  listItem: number;
  variant?: variantEnum;
  collectionId?: string;
  filterType?: string;
  expandedAccordion?: number;
  setExpandedAccordion?: any;
  isOnly?: boolean;
}> = ({
  handleAnimation,
  isAnimating,
  section,
  listItem,
  variant,
  filterType = "",
  collectionId,
  expandedAccordion,
  setExpandedAccordion,
  isOnly,
}) => {
  const [updatedSection, setUpdatedSectionState] = useState<any>(section);
  const [openItemsList, setOpenItemsList] = useState(null);
  const [openedItem, setOpenedItem] = useState<number>(null);
  const [openSettings2, setOpenSettings2] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);
  // const [parent, enableAnimations] = useAutoAnimate({
  //   duration: 150,
  //   easing: "ease-in-out",
  // });
  const [isOverflow, setIsOverflow] = useState(false);
  const [customOrder, setCustomOrder] = useState<IItem[]>([]);
  const [reorderMode, setReorderMode] = useState(false);
  const [isReopeningList, setIsReopeningList] = useState(false);
  const hasAutoOpened = useRef(false);
  const isExpanded = listItem === expandedAccordion;
  const isQuickSection = filterType === "QUICK";
  const sectionMode = section.sectionMode ?? (variant === variantEnum.BUDGET ? "budget" : "general");
  const { isDarkMode } = useTheme();

  const setUpdatedSection = (nextSection) => {
    setUpdatedSectionState(nextSection);
    void db.sections.update(section.id, { ...nextSection });
  };

  const handleShowComment = () => {
    setUpdatedSection({
      ...updatedSection,
      commentVisible: !updatedSection.commentVisible,
    });
  };
  useEffect(() => {
    if (reorderMode) {
      setOpenedItem(null);
    }
  }, [reorderMode]);
  useEffect(() => {
    if (!isExpanded) {
      setOpenSettings2(false);
      // setEditMode(false);
      if (openItemsList !== null) {
        setOpenItemsList(false);
      }
      if (updatedSection.commentVisible) {
        setUpdatedSection({ ...updatedSection, commentVisible: false });
      }
      setShowSortOptions(false);
    }
  }, [expandedAccordion]);
  useEffect(() => {
    if (showSortOptions == false) setReorderMode(false);
  }, [showSortOptions]);
  let items;

  const sectionDropdownVariants = {
    hidden: {
      height: 0,
      opacity: 0,
      y: -50,
    },
    visible: {
      y: 0,
      height: "auto",
      opacity: 1,
      transition: {
        height: {
          delay: 0.2,
          duration: 0.4,
          type: "spring",
          mass: 1,
          damping: 25,
          stiffness: 500,
        },
        opacity: {
          duration: 0.2,
          delay: 0.3,
        },
        y: {
          duration: 0.4,
          delay: 0.3,
          type: "spring",
          mass: 1,
          damping: 25,
          stiffness: 500,
        },
      },
    },
    exit: {
      // marginBottom: [0, 20, 5, 0],
      y: -50,
      height: 0,
      opacity: 1,
      transition: {
        height: {
          duration: 0.2,
          delay: 0.2,
        },
        opacity: {
          duration: 0.25,
        },
        y: {
          duration: 0.2,
          delay: 0.2,
        },
      },
    },
  };

  const callback = React.useCallback(() => {
    if (filterType) return;
    setOpenSettings2(!openSettings2);
    setExpandedAccordion(isExpanded && !openItemsList ? null : listItem);
  }, [openItemsList, expandedAccordion, listItem]);
  const bind = useLongPress(callback, {
    onCancel: (event, { reason }) =>
      reason !== LongPressCallbackReason.CancelledByMovement &&
      reason !== LongPressCallbackReason.CancelledOutsideElement &&
      handleOpen(),
    threshold: 300,

    detect: LongPressEventType.Pointer,
    cancelOnMovement: true,
  });
  const handleOpen = () => {
    if (openItemsList === true) {
      setExpandedAccordion(null);
    } else {
      if (items?.length === 0 && filterType?.length > 0) return;
      setIsReopeningList(true);
      setOpenItemsList(!openItemsList);
      setExpandedAccordion(isExpanded && !openItemsList ? null : listItem);
    }
  };

  if (filterType === "STATUS") {
    items = useLiveQuery(
      () => db.items.where({ collectionId: collectionId, status: section.title }).toArray(),
      [collectionId, section],
    );
  } else if (filterType === "TAG") {
    items = useLiveQuery(
      () =>
        db.items
          .where({ collectionId: collectionId })
          .filter((item) => item.tags && item.tags.some((tag) => tag.title === section.title))
          .toArray(),
      [collectionId, section],
    );
  } else {
    items = useLiveQuery(() => db.items.where({ sectionId: section._id }).toArray(), [section._id]);
  }
  const filteredItems = items && section.hideFinished ? items.filter((item) => item.status !== "done") : items;

  const itemsReverse: IItem[] = filteredItems ? (section?.numberedList ? [...filteredItems] : [...filteredItems]) : [];

  // const itemsCustomOrder = itemsReverse.sort((a, b) => {
  //   return customOrderIds[a._id] - customOrderIds[b._id];
  // });

  function sortByProgress(list) {
    return sortBy(list, function (item) {
      if (item.sublistMode === "slider" && item.progress?.current && item.progress?.max) {
        return item.progress.current / item.progress.max;
      } else if (item.sublist?.length > 0) {
        return filter(item.sublist, { checked: true }).length / item.sublist.length;
      }
    });
  }
  function sortListByTag(list) {
    return sortBy(list, function (item) {
      if (item.tags && item.tags.length > 0) {
        return item.tags[0].title;
      } else {
        return "";
      }
    });
  }

  function sortListById(list, idList) {
    if (!idList) return list;
    return sortBy(list, function (item) {
      const orderIndex = idList.indexOf(item.id);
      return orderIndex === -1 ? idList.length : orderIndex;
    });
  }
  const isOver24Hours = new Date().getTime() - new Date(section.createdAt).getTime() > 24 * 60 * 60 * 1000;
  useEffect(() => {
    if (isQuickSection) {
      if (filteredItems?.length === 0 && isOver24Hours) {
        void db.deleteSection(section);
      }
    }

    const sortByType = updatedSection?.sortBy ?? section?.sortBy;
    const idList: number[] = section?.customOrder ?? [];
    if (filteredItems?.length > 0) {
      let sorted = [];
      if (sortByType === "tag") {
        sorted = sortListByTag(filteredItems);
      } else if (sortByType === "progress") {
        sorted = sortByProgress(filteredItems);
      } else if (sortByType === "status") {
        sorted = sortBy(filteredItems, "status");
      } else {
        sorted = sortListById(filteredItems, idList);
      }

      if (section?.reverseOrder) sorted = sorted.reverse();
      // const sorted = filteredItems.sort((a, b) => {
      //   const indexA = idList.indexOf(a.id);
      //   const indexB = idList.indexOf(b.id);
      //   if (indexA === -1) return 1;
      //   if (indexB === -1) return -1;
      //   return indexA - indexB;
      // });
      return setCustomOrder(sorted);
    } else return setCustomOrder(itemsReverse);
  }, [items, section, updatedSection]);

  const renderedItemCount = filteredItems?.length;
  const isListReady = renderedItemCount !== undefined && customOrder.length === renderedItemCount;

  useEffect(() => {
    if (!isExpanded || openItemsList !== null || !isListReady) return;

    const restoreOpenTimer = setTimeout(() => setOpenItemsList(true), 50);
    return () => clearTimeout(restoreOpenTimer);
  }, [isExpanded, openItemsList, isListReady]);

  useEffect(() => {
    if (!isOnly || section.archived || hasAutoOpened.current || !isListReady) return;

    const autoOpenTimer = setTimeout(() => {
      hasAutoOpened.current = true;
      setExpandedAccordion(listItem);
      setOpenItemsList(true);
    }, 50);

    return () => clearTimeout(autoOpenTimer);
  }, [isOnly, section.archived, filteredItems?.length, customOrder.length, listItem]);

  const handleReorder = (items) => {
    setUpdatedSection({
      ...updatedSection,
      customOrder: items.map((i) => i.id),
    });
    setCustomOrder(items);
  };

  const overflowRef = useRef<any>(null);

  useEffect(() => {
    setIsOverflow(true);
  }, [items, openedItem]);

  if (!items) return null;

  const expandClick = (key) => {
    if (key === openedItem) {
      return setOpenedItem(null);
    }
    setOpenedItem(key);
  };
  const shouldAnimateItemEntrance = customOrder.length <= 12;

  return (
    <div
      style={{
        width: `${section.archived ? "calc(100% - 5.3rem)" : "100%"} `,
      }}
      className={`relative origin-top rounded-md mb-1 ${openItemsList ? "squeezeAnimationOpen" : ""}`}
    >
      <div className={`sectionBackground w-full relative`}>
        <SectionHeader
          filterType={filterType}
          section={section}
          updatedSection={updatedSection}
          setUpdatedSection={setUpdatedSection}
          items={items}
          variant={variant}
          sectionMode={sectionMode}
          handleOpen={handleOpen}
          openSettings2={openSettings2}
          setOpenSettings2={setOpenSettings2}
        />
        <div
          onAnimationStart={() => handleAnimation(true)}
          onAnimationEnd={() => handleAnimation(false)}
          className={` sectionDropdown overflow-hidden ${openItemsList === false ? "squeezeAnimationClose" : ""}`}
        >
          <AnimatePresence mode="wait">
            {openItemsList && (
              <motion.div
                onAnimationStart={() => handleAnimation(true)}
                onAnimationComplete={() => {
                  setIsReopeningList(false);
                  handleAnimation(false);
                }}
                className="overflow-hidden flex flex-col gap-2 "
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={sectionDropdownVariants}
                key="test"
              >
                {((filterType?.length && items.length) || !filterType?.length) && <div></div>}
                <ExpandableText
                  text={section.comment}
                  open={updatedSection.commentVisible}
                  updateText={(text) =>
                    db.sections.update(section.id, {
                      ...section,
                      comment: text,
                    })
                  }
                />
                {!filterType?.length && (
                  <motion.div
                    layout="position"
                    transition={{ layout: { type: "tween", duration: 0.2, ease: "linear" } }}
                    className="flex mx-2"
                    style={{ gap: ".4em" }}
                  >
                    {(sectionMode === "budget" || sectionMode === "time") && (
                      <AddBudgetItem section={section} isTime={sectionMode === "time"} />
                    )}

                    {sectionMode === "general" && !filterType?.length && <AddGeneralItem section={section} />}
                    <div className="relative">
                      <div className="flex gap-1 justify-end items-center " style={{ height: "40px" }}>
                        {variant === variantEnum.GENERAL && !filterType?.length && (
                          <Button
                            onClick={() => setShowSortOptions(!showSortOptions)}
                            color={section?.hideFinished ? "#7388bb" : "#566379"}
                            colorDarkMode={section?.hideFinished ? "#8598c6" : "#61728e"}
                            className={(showSortOptions || section?.hideFinished) && !isDarkMode ? "blueGlow" : ""}
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              padding: "0 0.4em",
                              boxShadow: showSortOptions
                                ? "#819ac6 0px 0px 2px 2px"
                                : section?.hideFinished
                                  ? "#7d8eb8 0px 0px 5px -2px"
                                  : "rgb(0 0 0) 0px 1px 7px -4px",
                            }}
                          >
                            {items.length !== filteredItems.length && (
                              <div className="mr-1">{items.length - filteredItems.length}</div>
                            )}
                            <SortByIcon
                              style={{
                                width: "1.4em",
                                marginLeft: "-5px",
                                transform: "scale(1.2, .9)",
                              }}
                            />{" "}
                          </Button>
                        )}

                        {(!filterType || isQuickSection) && (
                          <Button
                            onClick={() => handleShowComment()}
                            color={updatedSection?.commentVisible ? "#5d5d5da3" : "#6d8085"}
                            colorDarkMode={updatedSection?.commentVisible ? "#5d5d5da3" : "#829da0"}
                          >
                            <CommentIcon
                              style={{
                                width: ".75em",
                                transform: "scale(1.2)",
                              }}
                            />
                          </Button>
                        )}
                      </div>
                      <AnimatePresence>
                        {showSortOptions && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{
                              duration: 0.2,
                              type: "spring",
                              damping: 25,
                              stiffness: 700,
                            }}
                            className="sectionDropdown flex items-center gap-1 absolute z-20 px-2 py-1"
                            style={{
                              background: "var(--container-bg2)",
                              bottom: filteredItems?.length > 1 ? "-2.7em" : "-2px",
                              right: filteredItems?.length > 1 ? "-.5rem" : "5em",
                              width: "max-content",
                            }}
                          >
                            <Dropdown
                              data={sortByTypes}
                              popoverClassName="neutralOptionsPopover"
                              handleUpdate={(e) =>
                                setUpdatedSection({
                                  ...updatedSection,
                                  sortBy: e.label,
                                })
                              }
                              monochrome={isDarkMode}
                              open={true}
                              useLabel={true}
                              initialItem={
                                sortByTypes.find((option) => option.label === section?.sortBy) ?? sortByTypes[0]
                              }
                            />
                            <Button
                              color="#61728e"
                              onClick={() =>
                                db.sections.update(section.id, {
                                  ...section,
                                  reverseOrder: !section?.reverseOrder,
                                })
                              }
                            >
                              <ChevronIcon
                                style={{
                                  width: ".8em",
                                  transform: `${section?.reverseOrder ? "rotate(180deg)" : ""}`,
                                  transition: "all .2s ease-in-out",
                                }}
                              />
                            </Button>
                            {(!section?.sortBy || section?.sortBy?.length < 2) && (
                              <Button
                                onClick={() => setReorderMode(!reorderMode)}
                                color={reorderMode ? "#7388bb" : "#566379"}
                                colorDarkMode={reorderMode ? "#8598c6" : "#61728e"}
                                className={reorderMode && !isDarkMode && "blueGlow"}
                                style={{
                                  boxShadow: reorderMode ? "#7d8eb8 0px 0px 5px -2px" : "rgb(0 0 0) 0px 1px 7px -4px",
                                }}
                              >
                                <ListIcon />
                              </Button>
                            )}
                            {items.some((item) => item.status == "done") && (
                              <Button
                                color={section?.hideFinished ? "#7388bb" : "#566379"}
                                colorDarkMode={section?.hideFinished ? "#8598c6" : "#61728e"}
                                className={section?.hideFinished && !isDarkMode && "blueGlow"}
                                style={{
                                  boxShadow: section?.hideFinished
                                    ? "#7d8eb8 0px 0px 5px -2px"
                                    : "rgb(0 0 0) 0px 1px 7px -4px",
                                }}
                                onClick={() =>
                                  db.sections.update(section.id, {
                                    ...section,
                                    hideFinished: !section?.hideFinished,
                                  })
                                }
                              >
                                <CheckIcon />
                              </Button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {itemsReverse.length > 0 && (
                  <div
                    className=" px-2 flex "
                    ref={overflowRef}
                    style={{
                      paddingTop: "2px",
                      maxHeight: "400px",
                      overflowY: `${isAnimating ? "hidden" : "auto"}`,
                      overflowX: "hidden",
                    }}
                  >
                    <div className="" style={{ width: "100%" }}>
                      <Reorder.Group values={customOrder} axis="y" onReorder={handleReorder}>
                        <AnimatePresence>
                          {customOrder.map((item, i) => (
                            <Reorder.Item
                              initial={shouldAnimateItemEntrance ? { opacity: 0, y: -30 } : false}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                opacity: { delay: 0.05 },
                              }}
                              exit={{ opacity: 0 }}
                              layout="position"
                              key={item._id}
                              value={item}
                              dragListener={reorderMode}
                            >
                              <div>
                                {sectionMode === "budget" || sectionMode === "time" ? (
                                  <BudgetItem
                                    key={item.id}
                                    _item={item}
                                    expandClick={expandClick}
                                    isOpened={item.id === openedItem}
                                    skipInitialExpansionAnimation={isReopeningList}
                                    isTime={sectionMode === "time"}
                                  />
                                ) : (
                                  <GeneralItem
                                    reorderMode={reorderMode}
                                    listNumber={section.numberedList && i + 1}
                                    key={item.id}
                                    _item={item}
                                    expandClick={expandClick}
                                    isOpened={item.id === openedItem}
                                    checklistMode={section.checkListMode}
                                    skipInitialExpansionAnimation={isReopeningList}
                                  />
                                )}
                              </div>
                            </Reorder.Item>
                          ))}
                        </AnimatePresence>
                      </Reorder.Group>
                    </div>
                  </div>
                )}
                <div></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {section?.archived && (
        <div
          style={{
            position: "absolute",
            right: "-5.3rem",
            top: 0,
            height: "45px",
            // background: "#2f2f2f",
            display: "flex",
            padding: "0.4rem",
            // zIndex: -2,
          }}
          className="rounded-md"
        >
          <div className="w-4" />
          <button
            onClick={() =>
              db.sections.update(section.id, {
                ...section,
                archived: false,
              })
            }
            style={{ background: "#528b5f", padding: "0.1em 0.65em" }}
            className="rounded-md mr-1"
          >
            <RefreshIcon style={{ width: ".8em" }} />
          </button>
          <button
            onClick={() => void db.deleteSection(section)}
            style={{ background: "#cb4d4d", padding: "0.1em 0.65em" }}
            className="rounded-md"
          >
            <TrashIcon style={{ width: ".8em" }} />
          </button>
        </div>
      )}
    </div>
  );
};
