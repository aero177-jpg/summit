import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArchiveIcon, ArrowIcon, CheckIcon, EditIcon, LockIcon, NumberListIcon, TrashIcon } from "./customIcons";
import { PieChart } from "react-minimal-pie-chart";
import { ColorItem, colorOptions, sectionModeOptions, statusOptions, variantEnum } from "../constants";
import { db } from "../models/db";
import { handleEnter } from "../actions";
import { Button } from "./Button";
import Dropdown from "./Dropdown";
import { DurationInput, formatDuration } from "./DurationInput";
import { createItemTableColumns } from "../domain/tableConversion";

const SectionHeader = ({
  filterType,
  section,
  updatedSection,
  setUpdatedSection,
  items,
  variant,
  sectionMode,
  handleOpen,
  openSettings2,
  setOpenSettings2,
  isOpen = false,
  isFocused = false,
  onFocus = undefined,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [editMode, setEditMode] = useState(0);
  const [listActive, setListActive] = useState(Boolean(section.numberedList));
  const [targetActive, setTargetActive] = useState(Boolean(section.showLockedAmount));
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  // const [lockedAmountLocal, setLockedAmountLocal] = useState(
  //   updatedSection?.lockedAmount ?? 0
  // );
  const currentCollection = JSON.parse(localStorage.getItem("currentCollection"));

  useEffect(() => setListActive(Boolean(section.numberedList)), [section.numberedList]);
  useEffect(() => setTargetActive(Boolean(section.showLockedAmount)), [section.showLockedAmount]);

  const disabledSlide = section?.archived || (!!filterType && filterType !== "QUICK");

  const slideExpandWidth = disabledSlide ? 0 : variant === variantEnum.QUICK ? -180 : -180;

  const handleToggleEditMode = () => {
    if (editMode == 0) {
      setOpenSettings2(false);
    }
    setEditMode(2);
  };
  const handleSaveSectionEdit = () => {
    setEditMode(0);
  };
  const filteredItems = items && section.hideFinished ? items.filter((item) => item.status !== "done") : items;
  const handleSectionModeChange = (option) => {
    if (!option.label) return;
    if (section.dataVersion !== 1) {
      window.alert("Convert legacy data before changing this section's type.");
      return;
    }
    if (option.value === "budget" || option.value === "time") {
      setUpdatedSection({ ...updatedSection, sectionMode: option.value });
      return;
    }
    if (option.value === "table") {
      setUpdatedSection({
        ...updatedSection,
        sectionMode: "table",
        tableColumns: createItemTableColumns(items ?? [], updatedSection.tableColumns),
      });
      return;
    }
    setUpdatedSection({
      ...updatedSection,
      sectionMode: "general",
      checkListMode: option.value,
    });
  };

  const calcTotal = useMemo(() => {
    return filteredItems?.reduce((total, item) => {
      const itemAmount = Number(
        sectionMode === "time"
          ? (item.durationSeconds ?? (section.dataVersion !== 1 ? item.amount : 0))
          : (item.amount ?? 0),
      );
      return Number(total) + (sectionMode === "time" ? itemAmount : item.isIncome ? itemAmount : -itemAmount);
    }, 0);
  }, [filteredItems, sectionMode, section.dataVersion]);

  const lockedDifference =
    section?.locked && Number.isFinite(calcTotal) ? Math.abs(Number(section.locked)) + calcTotal : null;

  const displayTotal = () => {
    if (!Number.isFinite(calcTotal)) return "";
    const toDisplay = calcTotal;
    // if (!!section?.locked) {
    //   toDisplay = section.locked;
    // } else {
    //   toDisplay = calcTotal;
    // }
    return toDisplay > 0 ? "+" + toDisplay : toDisplay.toString().replace("-", "");
  };

  const colorCounts: { [key: string]: number } = filteredItems.reduce((acc, item) => {
    const statusOption = statusOptions.find((option) => option.label === item.status);
    const color = statusOption ? statusOption.value : "#b2b4b7";
    if (acc[color]) {
      acc[color]++;
    } else {
      acc[color] = 1;
    }
    return acc;
  }, {});

  const handleUpdateColor = (color) => {
    if (!editMode) return;
    setUpdatedSection({ ...section, tag: color });
  };
  const deleteTag = async (section) => {
    const collection = await db.collections.get(Number(currentCollection));
    db.collections.update(Number(collection.id), {
      ...collection,
      allTags: collection?.allTags.filter((tag) => tag.title !== section.title),
    });
  };

  const colorItems: ColorItem[] = Object.entries(colorCounts).map(([color, count]) => ({
    color,
    value: count,
  }));

  const doneItemsCount = filteredItems.filter((item) => item.status === "done" || item.status === "nah").length;

  const blurOnEnter = (e) => {
    if (e.key === "Enter") {
      setEditMode(0);
    }
    return;
  };

  const handleClick = () => {
    if (editMode || isDragging || suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    handleOpen();
  };

  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    holdStart.current = null;
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (!onFocus || isFocused || event.button !== 0) return;
    holdStart.current = { x: event.clientX, y: event.clientY };
    holdTimer.current = setTimeout(() => {
      suppressClick.current = true;
      holdTimer.current = null;
      onFocus?.();
    }, 450);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!holdStart.current) return;
    if (Math.hypot(event.clientX - holdStart.current.x, event.clientY - holdStart.current.y) > 8) cancelHold();
  };

  const handleDragStart = () => {
    cancelHold();
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };
  const handleToggleLockedAmount = () => {
    db.sections.update(section.id, {
      ...section,
      showLockedAmount: !section?.showLockedAmount,
    });
    if (!section?.showLockedAmount) {
      setEditMode(1);
    }
  };
  const isBudgetLikeMode = sectionMode === "budget" || sectionMode === "time";
  const footerActive = isBudgetLikeMode ? targetActive : listActive;
  return (
    <div className="relative">
      <motion.div
        className={` w-100 sectionHeaderContainer flex justify-between text-lg font-bold`}
        data-open={isOpen}
        //   {...bind("test context")}
        onClick={() => handleClick()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        animate={{
          x: openSettings2 ? slideExpandWidth : 0,
        }}
        transition={{
          x: { type: "spring", stiffness: 200, mass: 0.3 },
        }}
        drag="x"
        dragSnapToOrigin={true}
        dragConstraints={{ left: slideExpandWidth, right: 0 }}
        dragElastic={0.05}
        onDragStart={handleDragStart}
        onDragEnd={(event, info) => {
          cancelHold();
          handleDragEnd();
          const isHorizontalSwipe = Math.abs(info.offset.x) >= Math.abs(info.offset.y) * 1.5;
          if (isHorizontalSwipe && (info.offset.x < -10 || info.velocity.x < -20)) {
            if (openSettings2 === false) {
              setOpenSettings2(true);
            } else {
              setOpenSettings2(false);
            }
          } else {
            setOpenSettings2(false);
          }
        }}
      >
        <div className="flex-auto" style={{ padding: "0.4rem" }}>
          {editMode !== 2 ? (
            <div className="w-full flex pl-2 items-center">
              {filterType === "TAG" ? (
                <div
                  style={{
                    marginLeft: "-8px",
                    marginRight: "5px",
                    color: `${section?.tag?.value}`,
                  }}
                >
                  #
                </div>
              ) : (
                <div
                  className="colorTab"
                  style={{
                    height: "26px",
                    opacity: `${section?.tag?.value ? 1 : 0}`,
                    backgroundColor: `${section?.tag?.value}`,
                  }}
                ></div>
              )}
              <div>{section.title}</div>
            </div>
          ) : (
            <div className="w-full flex pl-2">
              <div
                className="colorTab"
                style={{
                  zIndex: 1,
                  opacity: `${section?.tag?.value ? 1 : 0}`,
                  backgroundColor: `${updatedSection.tag?.value ?? section.tag?.value}`,
                }}
              ></div>
              <input
                className={`w-full bg-transparent pl-2 outline-none sectionHeaderInput mx-1 ${
                  editMode && "sectonHeaderEditMode"
                }`}
                type={"text"}
                autoFocus={true}
                onKeyDown={(e) => handleEnter(e, handleSaveSectionEdit)}
                value={updatedSection.title}
                onChange={(e) => setUpdatedSection({ ...section, title: e.target.value })}
                placeholder={"Add a section"}
              />
            </div>
          )}
        </div>
        <div className="flex items-center justify-end pr-2">
          {editMode === 2 ? (
            <>
              <div className="relative" style={{ left: "-7px" }}>
                <Dropdown
                  data={colorOptions}
                  handleUpdate={handleUpdateColor}
                  open={false}
                  initialItem={updatedSection.tag ?? section.tag}
                  hideClickShield={true}
                />
              </div>
              <button
                onClick={handleSaveSectionEdit}
                style={{ padding: "0.2em .6em" }}
                className="rounded-md sectionHeaderSave"
              >
                <ArrowIcon />
              </button>
            </>
          ) : (
            <>
              {sectionMode === "general" && filteredItems?.length > 0 && section.checkListMode !== "none" && (
                <>
                  <PieChart className="ml-2 h-7 rotate-90" lineWidth={45} data={colorItems} animate />
                </>
              )}
              {sectionMode === "general" && section.checkListMode == "none" && (
                <div className="flex items-center">
                  <span
                    className="flex gap-2"
                    style={{
                      color: items.length == 0 ? "#96a3b361" : "#96a3b3",
                      letterSpacing: "2px",
                    }}
                  >
                    {items.length !== filteredItems.length && (
                      <div className="opacity-50 flex items-center" style={{ color: "#6b9f6b" }}>
                        {items.length - filteredItems.length}
                        <CheckIcon style={{ transform: "scale(.8)" }} />
                      </div>
                    )}
                    <div>{filteredItems.length}</div>
                  </span>
                  {items.length == 0 && filterType && filterType != "QUICK" && (
                    <button
                      onClick={() => deleteTag(section)}
                      style={{
                        display: "grid",
                        placeItems: "center",
                        background: "#cb4d4d",
                        height: "1.5em",
                        width: "1.8em",
                      }}
                      className="ml-1 maxBtnHeight"
                    >
                      <TrashIcon style={{ width: ".65em" }} />
                    </button>
                  )}
                </div>
              )}

              {isBudgetLikeMode && section?.showLockedAmount ? (
                <>
                  {editMode == 0 ? (
                    <div className="flex flex-wrap mr-1 gap-1">
                      <div className="flexAmountContainer py-1">
                        <LockIcon
                          style={{
                            width: ".6em",
                            marginRight: "4px",
                            marginBottom: "2px",
                            transform: "scaleX(0.9)",
                          }}
                        />
                        <div style={{ fontSize: "0.8em" }}>
                          {sectionMode === "time" ? formatDuration(section?.locked ?? 0) : (section?.locked ?? 0)}
                        </div>
                      </div>
                      {lockedDifference !== null && lockedDifference != 0 && (
                        <div
                          style={{
                            // fontSize: "0.8em",
                            color: lockedDifference > 0 ? "#797979" : " #b04b4b",
                          }}
                          className="flexAmountContainer py-1  "
                        >
                          <div className="mb-0" style={{ fontSize: "0.8em" }}>
                            {/* {lockedDifference > 0 && "+"} */}
                            {sectionMode === "time" ? formatDuration(lockedDifference) : lockedDifference}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : sectionMode === "time" ? (
                    <DurationInput
                      value={Number(updatedSection?.locked ?? 0)}
                      onChange={(locked) => setUpdatedSection({ ...section, locked })}
                      className="mr-1"
                    />
                  ) : (
                    <input
                      className={"basicInput mr-1"}
                      style={{
                        width: "5.5em",
                        // background: `${
                        //   item?.multiplierMode !== "none" ? "#515151" : ""
                        // }`,
                      }}
                      autoFocus={editMode == 1}
                      type="number"
                      value={updatedSection?.locked ?? 0}
                      //@ts-ignore
                      onChange={(e) =>
                        //  setLockedAmountLocal(e.target.value)
                        setUpdatedSection({ ...section, locked: e.target.value })
                      }
                      onKeyDown={(e) => handleEnter(e, () => setEditMode(0))}
                      onBlur={() => setEditMode(0)}
                      // onSubmit={blurOnEnter}
                      placeholder=""
                    />
                  )}
                  <div> {sectionMode === "time" ? formatDuration(Math.abs(calcTotal)) : displayTotal()} </div>
                </>
              ) : (
                <>
                  {isBudgetLikeMode && (
                    <div> {sectionMode === "time" ? formatDuration(Math.abs(calcTotal)) : displayTotal()}</div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
      <AnimatePresence>
        {disabledSlide == false && (openSettings2 || isDragging) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              style={{ padding: "3px 6px", gap: "5px" }}
              className="absolute right-0 top-0 h-full flex items-center justify-center"
            >
              <Button onClick={() => handleToggleEditMode()} color="#617385">
                <EditIcon style={{ width: ".9em", marginLeft: "2px", scale: "0.9" }} />
              </Button>

              <Button
                onClick={() =>
                  db.sections.update(section.id, {
                    ...section,
                    archived: true,
                  })
                }
                color="#cb4d4d"
              >
                <ArchiveIcon style={{ width: ".8em" }} />
              </Button>
              <Dropdown
                data={sectionModeOptions}
                popoverClassName="sectionModePopover"
                handleUpdate={handleSectionModeChange}
                open={false}
                useLabel={true}
                triggerVariant="button"
                hideClickShield={true}
                closeOnSelect={false}
                labelMinWidth="85px"
                initialItem={sectionModeOptions.find((option) =>
                  sectionMode === "budget" || sectionMode === "time" || sectionMode === "table"
                    ? option.value === sectionMode
                    : option.value === (updatedSection.checkListMode ?? section.checkListMode ?? "none"),
                )}
                footer={
                  <div className="dropdown-item grid">
                    <div
                      className="dropdown-item-label"
                      onClick={() => {
                        if (isBudgetLikeMode) {
                          setTargetActive((active) => !active);
                          handleToggleLockedAmount();
                          return;
                        }
                        setListActive((active) => !active);
                        db.sections.update(section.id, {
                          numberedList: !listActive,
                        });
                      }}
                      style={{
                        boxShadow: footerActive ? "#b4b4b9 0px 0px 3px 0px" : "",
                        opacity: footerActive ? 1 : 0.5,
                      }}
                    >
                      {isBudgetLikeMode ? (
                        <LockIcon style={{ width: "0.8em", height: "0.8em", marginRight: "0.35em" }} />
                      ) : (
                        <NumberListIcon style={{ width: "0.8em", height: "0.8em", marginRight: "0.35em" }} />
                      )}
                      {isBudgetLikeMode ? "target" : "list"}
                    </div>
                  </div>
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SectionHeader;
