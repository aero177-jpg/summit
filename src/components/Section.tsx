import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../models/db";
import { useEffect, useId, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { AddBudgetItem } from "./AddBudgetItem";
import { BudgetItem } from "./BudgetItem";
import { ISection } from "../models/section";
import { ChevronIcon, CommentIcon, ListIcon, RefreshIcon, SortByIcon, TrashIcon } from "./customIcons";
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
import { TableSection } from "./TableSection";

export const Section: React.FC<{
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
  focusedSectionId?: string | null;
  setFocusedSectionId?: (sectionId: string | null) => void;
  onFocusSection?: (shouldOpen: boolean) => void;
  openAfterFocus?: boolean;
  onOpenAfterFocus?: () => void;
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
  focusedSectionId,
  setFocusedSectionId,
  onFocusSection,
  openAfterFocus,
  onOpenAfterFocus,
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
  const [heldListHeight, setHeldListHeight] = useState<number | null>(null);
  const [isFilterResizing, setIsFilterResizing] = useState(false);
  const sortControlsRef = useRef<HTMLDivElement>(null);
  const sortPopoverClassName = `section-sort-popover-${useId()}`;
  const [isReopeningList, setIsReopeningList] = useState(false);
  const hasAutoOpened = useRef(false);
  const restoreSectionsAfterClose = useRef(false);
  const isExpanded = listItem === expandedAccordion;
  const isQuickSection = filterType === "QUICK";
  const sectionMode =
    updatedSection.sectionMode ?? section.sectionMode ?? (variant === variantEnum.BUDGET ? "budget" : "general");
  const commentVisible = updatedSection.commentVisible ?? Boolean(updatedSection.comment?.trim());
  const { isDarkMode } = useTheme();

  useEffect(() => setUpdatedSectionState(section), [section]);

  const setUpdatedSection = (nextSection) => {
    setUpdatedSectionState(nextSection);
    if ((!filterType || isQuickSection) && section.id !== undefined) {
      void db.sections.update(section.id, { ...nextSection });
    }
  };

  const handleShowComment = () => {
    setUpdatedSection({
      ...updatedSection,
      commentVisible: !commentVisible,
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
      setShowSortOptions(false);
    }
  }, [expandedAccordion]);
  useEffect(() => {
    if (!openAfterFocus || openItemsList === true) return;
    setIsReopeningList(true);
    setOpenItemsList(true);
    setExpandedAccordion(listItem);
    onOpenAfterFocus?.();
  }, [openAfterFocus, openItemsList, listItem, setExpandedAccordion, onOpenAfterFocus]);
  useEffect(() => {
    if (showSortOptions == false) setReorderMode(false);
  }, [showSortOptions]);
  useEffect(() => {
    if (!showSortOptions || reorderMode) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || sortControlsRef.current?.contains(target)) return;
      const popovers = document.getElementsByClassName(sortPopoverClassName);
      if (Array.from(popovers).some((popover) => popover.contains(target))) return;
      setShowSortOptions(false);
    };
    document.addEventListener("click", handleOutsideClick, true);
    return () => document.removeEventListener("click", handleOutsideClick, true);
  }, [showSortOptions, reorderMode, sortPopoverClassName]);
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

  const handleOpen = () => {
    if (openItemsList === true) {
      restoreSectionsAfterClose.current = focusedSectionId === section._id;
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
    items = useLiveQuery(
      () => (section._id ? db.items.where({ sectionId: section._id }).toArray() : []),
      [section._id],
    );
  }
  const filteredItems =
    items && sectionMode !== "table" && section.hideFinished ? items.filter((item) => item.status !== "done") : items;

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
    if (heldListHeight === null) return;
    const shrinkTimer = window.setTimeout(() => setHeldListHeight(null), 180);
    return () => window.clearTimeout(shrinkTimer);
  }, [heldListHeight, section.hideFinished]);

  const handleToggleCompleted = () => {
    setIsFilterResizing(true);
    setHeldListHeight(overflowRef.current?.getBoundingClientRect().height ?? null);
    void db.sections.update(section.id, {
      ...section,
      hideFinished: !section?.hideFinished,
    });
  };

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
          isOpen={openItemsList === true}
          isFocused={focusedSectionId === section._id}
          onFocus={() => onFocusSection?.(openItemsList !== true)}
        />
        <div
          onAnimationStart={() => handleAnimation(true)}
          onAnimationEnd={() => handleAnimation(false)}
          className={` sectionDropdown overflow-hidden ${openItemsList === false ? "squeezeAnimationClose" : ""}`}
        >
          <AnimatePresence
            mode="wait"
            onExitComplete={() => {
              if (!restoreSectionsAfterClose.current) return;
              restoreSectionsAfterClose.current = false;
              setFocusedSectionId?.(null);
            }}
          >
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
                  open={commentVisible}
                  updateText={(text) =>
                    db.sections.update(section.id, {
                      ...section,
                      comment: text,
                    })
                  }
                />
                {!filterType?.length && sectionMode !== "table" && (
                  <motion.div
                    layout="position"
                    transition={{ layout: { type: "tween", duration: 0.2, ease: "linear" } }}
                    className="flex mx-2 items-center"
                    style={{ gap: ".4em" }}
                  >
                    {(sectionMode === "budget" || sectionMode === "time") && (
                      <AddBudgetItem section={section} isTime={sectionMode === "time"} />
                    )}

                    {sectionMode === "general" && !filterType?.length && <AddGeneralItem section={section} />}
                    <div className="relative self-start mt-0 shrink-0" ref={sortControlsRef}>
                      <div className="flex gap-1 justify-end items-center " style={{ height: "40px" }}>
                        {variant === variantEnum.GENERAL && !filterType?.length && (
                          <Button
                            onClick={() => setShowSortOptions(!showSortOptions)}
                            title="Filter and sort"
                            active={showSortOptions || section?.hideFinished || reorderMode}
                            color={
                              isDarkMode
                                ? showSortOptions || section?.hideFinished || reorderMode
                                  ? "#7388bb"
                                  : "#8c9499"
                                : section?.hideFinished
                                  ? "#7388bb"
                                  : "#566379"
                            }
                            colorDarkMode={
                              isDarkMode
                                ? showSortOptions || section?.hideFinished || reorderMode
                                  ? "#8598c6"
                                  : "#8c9499"
                                : section?.hideFinished
                                  ? "#8598c6"
                                  : "#61728e"
                            }
                            className={(showSortOptions || section?.hideFinished) && !isDarkMode ? "blueGlow" : ""}
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              padding: "0 0.4em",
                              boxShadow: isDarkMode
                                ? "none"
                                : showSortOptions
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
                            active={commentVisible}
                            color={commentVisible ? "#5d5d5da3" : "#6d8085"}
                            colorDarkMode={commentVisible ? "#5d5d5da3" : "#829da0"}
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
                              handleUpdate={(e) =>
                                setUpdatedSection({
                                  ...updatedSection,
                                  sortBy: e.label,
                                })
                              }
                              monochrome={isDarkMode}
                              triggerVariant="button"
                              popoverClassName={`${sortPopoverClassName} neutralOptionsPopover`}
                              open={true}
                              useLabel={true}
                              initialItem={
                                sortByTypes.find((option) => option.label === section?.sortBy) ?? sortByTypes[0]
                              }
                            />
                            <Button
                              title="Reverse order"
                              active={!!section?.reverseOrder}
                              color={isDarkMode ? (section?.reverseOrder ? "#7388bb" : "#8c9499") : "#61728e"}
                              colorDarkMode={isDarkMode ? (section?.reverseOrder ? "#8598c6" : "#8c9499") : undefined}
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
                                title="Custom reorder"
                                active={reorderMode}
                                color={reorderMode ? "#7388bb" : isDarkMode ? "#8c9499" : "#566379"}
                                colorDarkMode={reorderMode ? "#8598c6" : isDarkMode ? "#8c9499" : "#61728e"}
                                className={reorderMode && !isDarkMode && "blueGlow"}
                                style={{
                                  boxShadow: isDarkMode
                                    ? "none"
                                    : reorderMode
                                      ? "#7d8eb8 0px 0px 5px -2px"
                                      : "rgb(0 0 0) 0px 1px 7px -4px",
                                }}
                              >
                                <ListIcon />
                              </Button>
                            )}
                            {items.some((item) => item.status == "done") && (
                              <Button
                                title={section?.hideFinished ? "Show completed" : "Hide completed"}
                                active={!!section?.hideFinished}
                                color={section?.hideFinished ? "#7388bb" : isDarkMode ? "#8c9499" : "#566379"}
                                colorDarkMode={section?.hideFinished ? "#8598c6" : isDarkMode ? "#8c9499" : "#61728e"}
                                className={section?.hideFinished && !isDarkMode && "blueGlow"}
                                style={{
                                  boxShadow: isDarkMode
                                    ? "none"
                                    : section?.hideFinished
                                      ? "#7d8eb8 0px 0px 5px -2px"
                                      : "rgb(0 0 0) 0px 1px 7px -4px",
                                }}
                                onClick={handleToggleCompleted}
                              >
                                <FontAwesomeIcon icon={section?.hideFinished ? faEyeSlash : faEye} />
                              </Button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {sectionMode === "table" ? (
                  <TableSection section={updatedSection} items={customOrder} setUpdatedSection={setUpdatedSection} />
                ) : (
                  (itemsReverse.length > 0 || heldListHeight !== null || isFilterResizing) && (
                    <motion.div
                      className="sectionItemsScroll px-2 flex overflow-y-auto"
                      ref={overflowRef}
                      initial={false}
                      animate={{ minHeight: heldListHeight ?? 0 }}
                      transition={{ minHeight: { duration: heldListHeight === null ? 0.2 : 0, ease: "easeOut" } }}
                      onAnimationComplete={() => {
                        if (heldListHeight === null) setIsFilterResizing(false);
                      }}
                      style={{
                        paddingTop: "2px",
                        maxHeight: "400px",
                        overflowY: isAnimating || isFilterResizing ? "hidden" : undefined,
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
                                  opacity: { delay: isFilterResizing ? 0 : 0.05 },
                                  layout: isFilterResizing ? { duration: 0.16, ease: "easeOut" } : undefined,
                                }}
                                exit={{
                                  opacity: 0,
                                  transition: isFilterResizing ? { duration: 0.12, ease: "easeOut" } : undefined,
                                }}
                                layout="position"
                                key={item._id}
                                value={item}
                                dragListener={reorderMode}
                              >
                                <div>
                                  {sectionMode === "budget" || sectionMode === "time" ? (
                                    <BudgetItem
                                      key={`${item.id}:${sectionMode}`}
                                      _item={item}
                                      expandClick={expandClick}
                                      isOpened={item.id === openedItem}
                                      skipInitialExpansionAnimation={isReopeningList}
                                      isTime={sectionMode === "time"}
                                      legacyTime={section.dataVersion !== 1}
                                    />
                                  ) : (
                                    <GeneralItem
                                      reorderMode={reorderMode}
                                      listNumber={section.numberedList && i + 1}
                                      key={item.id}
                                      _item={item}
                                      expandClick={expandClick}
                                      isOpened={item.id === openedItem}
                                      checklistMode={updatedSection.checkListMode ?? section.checkListMode ?? "none"}
                                      skipInitialExpansionAnimation={isReopeningList}
                                    />
                                  )}
                                </div>
                              </Reorder.Item>
                            ))}
                          </AnimatePresence>
                        </Reorder.Group>
                      </div>
                    </motion.div>
                  )
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
          <Button
            color="#528b5f"
            title="Restore section"
            onClick={() =>
              db.sections.update(section.id, {
                ...section,
                archived: false,
              })
            }
            style={{ padding: "0.1em 0.65em", margin: "0 4px 0 0" }}
            className="rounded-md mr-1"
          >
            <RefreshIcon style={{ width: ".8em" }} />
          </Button>
          <Button
            color="#cb4d4d"
            title="Delete section"
            onClick={() => void db.deleteSection(section)}
            style={{ padding: "0.1em 0.65em", margin: "0" }}
            className="rounded-md"
          >
            <TrashIcon style={{ width: ".8em" }} />
          </Button>
        </div>
      )}
    </div>
  );
};
