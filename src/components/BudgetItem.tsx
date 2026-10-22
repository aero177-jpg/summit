import * as React from "react";
import { db } from "../models/db";
import { IItem } from "../models/item";
import { useEffect, useRef, useState } from "react";
import { Collapse } from "react-collapse";
import { LongPressCallbackReason, LongPressEventType, useLongPress } from "use-long-press";
import {
  CheckIcon,
  ChevronIcon,
  CommentIcon,
  EditIcon,
  ListIcon,
  MoreInfoIcon,
  TrashIcon,
  XMarkIcon,
} from "./customIcons";
import { handleEnter, longPressOptions } from "../actions";
import useAutosizeTextArea from "../utils/useAutosizedTextArea";
import { TinyChecklist } from "./TinyChecklist";
import { LinkItUrl } from "react-linkify-it";
import LinkText from "./LinkText";
import LinkTextEditor from "./LazyLinkTextEditor";
import { ArrowIcon } from "./customIcons";
import { AnimatePresence, motion } from "framer-motion";
import { variantEnum } from "../constants";
import TextareaAutoResize from "react-textarea-autosize";
import { Button } from "./Button";
import ExpandableText from "./ExpandableText";
import { usePersistItem } from "../utils/usePersistItem";
import { DurationInput, formatDuration } from "./DurationInput";

export const BudgetItem: React.FC<{
  _item: IItem;
  expandClick: any;
  isOpened: boolean;
  skipInitialExpansionAnimation?: boolean;
  isTime?: boolean;
  legacyTime?: boolean;
}> = ({ _item, expandClick, isOpened, skipInitialExpansionAnimation, isTime = false, legacyTime = false }) => {
  const [item, setItem] = useState<IItem>(_item);
  const amountKey = isTime ? "durationSeconds" : "amount";
  const activeAmount = isTime ? (item.durationSeconds ?? (legacyTime ? item.amount : 0) ?? 0) : (item.amount ?? 0);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [openMod, setOpenMod] = useState(false);
  const [editCommentMode, setEditCommentMode] = useState<boolean>(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [updatedComment, setUpdatedComment] = useState(item?.comment);

  usePersistItem(item, _item, setItem);

  useEffect(() => {
    if (editMode === true) {
      setOpenSettings(false);
    }
  }, [editMode]);

  useEffect(() => {
    if (isOpened === false) {
      setEditMode(false);
      setOpenMod(false);
    }
  }, [isOpened]);

  const handleUpdateItem = (keyToUpdate, newValue) => {
    setItem((prevItem) => ({
      ...prevItem,
      [keyToUpdate === "amount" ? amountKey : keyToUpdate]: newValue,
    }));
  };

  const callback = React.useCallback(() => {
    setEditMode(!editMode);
  }, [editMode]);

  const bind = useLongPress(
    callback,
    longPressOptions(() => expandClick(_item.id)),
  );
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useAutosizeTextArea(textAreaRef.current, item.comment);

  // const handleShowComment = () => {
  //   if (editCommentMode) {
  //     setEditCommentMode(false);
  //     return;
  //   }
  //   setItem({ ...item, commentVisible: !item.commentVisible });
  //   if (!item.commentVisible) {
  //     setEditCommentMode(true);
  //   }
  // };
  const calculateChecklistTotal = (valueArray) => {
    if (!valueArray) return 0;
    const checklistTotal = valueArray.reduce((acc, checklistItem) => {
      const amount = Number(checklistItem?.amount) * (checklistItem?.checked == true ? -1 : 1);
      return acc + (isNaN(amount) ? 0 : amount);
    }, 0);

    return checklistTotal;
  };
  const handleChange = (ev, inputType) => {
    const target = ev.target;
    let isEmpty = false;
    if ((inputType != "list" && isNaN(Number(target.value))) || (inputType != "list" && target.value == "")) {
      isEmpty = true;
    }
    // const length = target.value.length <= 2 ? 2 : target.value.length;
    // target.style.width = `${1 * length}em `;

    if (inputType === "list") {
      setItem({
        ...item,
        checklistItems: ev,
        [amountKey]: Math.abs(calculateChecklistTotal(ev)),
        isIncome: calculateChecklistTotal(ev) < 0,
      });
    }

    if (inputType === "base") {
      setItem({
        ...item,
        multiplier: {
          baseAmount: parseInt(ev.target.value),
          mod: item.multiplier.mod,
        },
        [amountKey]: parseInt(ev.target.value) * item.multiplier.mod,
      });
    }
    if (inputType === "mod") {
      setItem({
        ...item,
        multiplier: {
          baseAmount: item.multiplier.baseAmount,
          mod: parseInt(ev.target.value),
        },
        [amountKey]: isEmpty ? activeAmount : item.multiplier.baseAmount * parseInt(ev.target.value),
      });
    }
  };

  const blurOnEnter = (e) => {
    if (e.key === "Enter") {
      setEditMode(false);
      expandClick(_item.id);
      e.target.blur();
    }
    return;
  };
  const onSubmit = (e) => {
    e.preventDefault();
    setEditMode(false);
  };
  const multiplierModeOptions = ["list", "x", "none"];

  const handleMultiplierModeChange = () => {
    const currentIndex = multiplierModeOptions.indexOf(item.multiplierMode);
    const nextIndex = (currentIndex + 1) % multiplierModeOptions.length;
    const nextCheckListMode = multiplierModeOptions[nextIndex];
    const updatedValue =
      nextCheckListMode == "list"
        ? Math.abs(calculateChecklistTotal(item.checklistItems))
        : nextCheckListMode == "x"
          ? item.multiplier.baseAmount * item.multiplier.mod
          : activeAmount;
    setItem({
      ...item,
      multiplierMode: nextCheckListMode,
      [amountKey]: updatedValue,
    });
  };
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleTap = () => {
    if (!isDragging) {
      expandClick(_item.id);
      if (isOpened) {
        setOpenSettings(false);
      }
      // console.log("Tap event handled");
    }
  };

  const handleShowComment = () => {
    setItem({
      ...item,
      commentVisible: !item.commentVisible,
    });
  };

  const saveComment = () => {
    db.items.update(item.id, {
      ...item,
      comment: updatedComment,
    });
    setEditCommentMode(false);
  };
  return (
    <div>
      <div
        className="itemContainer overflow-hidden relative"
        // style={{ background: "#31383fe3" }}
      >
        <motion.div
          layout="position"
          className={`${editMode === false ? "itemHeaderClicky" : "itemHeaderEditMode"} ${
            item.status === "done" ? "itemDone" : ""
          }   z-10 relative  flex justify-between p-1`}
          animate={{
            x: openSettings ? -80 : 0,
          }}
          drag="x"
          dragSnapToOrigin={true}
          dragConstraints={{ left: -80, right: 0 }}
          dragElastic={0.05}
          onDragStart={handleDragStart}
          onDragEnd={(event, info) => {
            handleDragEnd();
            const isHorizontalSwipe = Math.abs(info.offset.x) >= Math.abs(info.offset.y) * 1.5;
            if (isHorizontalSwipe && (info.offset.x < -10 || info.velocity.x < -20)) {
              if (openSettings === false) {
                setOpenSettings(true);
              } else {
                setOpenSettings(false);
              }
            } else {
              setOpenSettings(false);
            }
          }}
        >
          {editMode === false ? (
            <>
              <div
                // {...bind("test context")}
                onClick={() => handleTap()}
                className="itemTitleContainer pl-1"
              >
                <LinkText text={item.title} />
              </div>
              <div className="flex items-center gap-1">
                {item?.checklistItems?.length > 0 && (
                  <div className="h-6 flex items-center w-auto">
                    <MoreInfoIcon
                      style={{
                        width: ".9em",
                        height: ".7em",
                        marginTop: "3px",
                      }}
                    />
                  </div>
                )}
                {item?.comment?.length > 0 && (
                  <div>
                    <CommentIcon
                      style={{
                        width: ".7em",
                        height: ".7em",
                        transform: "scale(1.1, 1)",
                      }}
                    />
                  </div>
                )}
                <div
                  style={
                    isTime
                      ? { width: "max-content", flexShrink: 0, whiteSpace: "nowrap", fontSize: "0.9em" }
                      : undefined
                  }
                  className={`basicInput ${item?.isIncome ? "incomeInput" : ""}`}
                >
                  {isTime ? formatDuration(activeAmount) : activeAmount}
                </div>
              </div>
            </>
          ) : (
            <>
              <form className="flex w-full" onSubmit={onSubmit}>
                <LinkTextEditor
                  value={item.title}
                  onChange={(title) => handleUpdateItem("title", title)}
                  singleLine
                  autoFocus
                  className="itemTitleContainer pl-1"
                  onSubmit={() => setEditMode(false)}
                  controls={
                    <button
                      type="button"
                      aria-label="Save title"
                      onClick={() => setEditMode(false)}
                      className="submitArrow valid"
                    >
                      <ArrowIcon />
                    </button>
                  }
                />

                {isTime ? (
                  <DurationInput
                    value={activeAmount}
                    onChange={(amount) => handleUpdateItem("amount", amount)}
                    className="ml-1"
                  />
                ) : (
                  <input
                    disabled={item?.multiplierMode == "list" || item?.multiplierMode == "x"}
                    className={"basicInput"}
                    style={{ width: "5.5em", background: `${item?.multiplierMode !== "none" ? "#515151" : ""}` }}
                    type="number"
                    value={activeAmount}
                    placeholder=""
                    onChange={(e) => handleUpdateItem("amount", e.target.value)}
                  />
                )}
                <input type="submit" hidden />
              </form>
            </>
          )}
        </motion.div>
        <AnimatePresence mode="wait">
          {(openSettings || isDragging) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: "2px 0", gap: "3px" }}
              className="absolute right-0 top-0 h-full flex items-center justify-center"
            >
              <Button
                onClick={() => setEditMode(!editMode)}
                color="#617385"
                style={{
                  height: "100%",
                  width: "2em",
                }}
                className="maxBtnHeight"
              >
                <EditIcon style={{ width: ".9em", marginLeft: "2px", scale: "0.9" }} />
              </Button>

              <Button
                onClick={() => db.items.delete(item.id)}
                color="#cb4d4d"
                style={{
                  height: "100%",
                  width: "2em",
                }}
                className="maxBtnHeight"
              >
                <TrashIcon style={{ width: ".65em" }} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait">
        {isOpened && (
          <motion.div
            layout="position"
            className="overflow-hidden"
            initial={skipInitialExpansionAnimation ? false : { y: -100, height: 0, opacity: 0 }}
            animate={{
              y: 0,
              height: "auto",
              opacity: 1,
              transition: {
                height: {
                  delay: 0,
                  duration: 0.2,
                  type: "tween",
                  // mass: 1,
                  // damping: 25,
                  // stiffness: 700,
                },
                opacity: {
                  duration: 0.4,
                  delay: 0.1,
                },
              },
            }}
            exit={{
              marginBottom: [0, 20, 5, 0],
              height: 0,
              opacity: 1,
              transition: {
                height: {
                  duration: 0.1,
                },
                opacity: {
                  duration: 0.25,
                },
              },
            }}
            key="test2"
          >
            {/* <div className="w-100 h-fit pl-2 pr-1 pt-0"> */}
            <ExpandableText
              text={item.comment}
              open={item.commentVisible}
              updateText={(text) => handleUpdateItem("comment", text)}
            />
            <div className="flex ">
              <div className="flex-grow">
                {item.multiplierMode == "x" ? (
                  <div className="flex items-center" style={{ margin: "1px" }}>
                    {isTime ? (
                      <DurationInput
                        value={item.multiplier?.baseAmount ?? activeAmount}
                        onChange={(baseAmount) =>
                          setItem({
                            ...item,
                            multiplier: { baseAmount, mod: item.multiplier.mod },
                            [amountKey]: baseAmount * item.multiplier.mod,
                          })
                        }
                        className="mr-1 optionButton"
                      />
                    ) : (
                      <input
                        className="basicInput mr-1 optionButton"
                        style={{ width: "6em" }}
                        type="number"
                        value={item.multiplier?.baseAmount ?? activeAmount}
                        //@ts-ignore
                        onChange={(e) => handleChange(e, "base")}
                        placeholder=""
                      />
                    )}

                    <XMarkIcon style={{ color: "#636363" }} />
                    <input
                      className="basicInput ml-1 optionButton"
                      style={{ width: "3em" }}
                      type="number"
                      value={item.multiplier?.mod == 0 ? 1 : item.multiplier?.mod}
                      //@ts-ignore
                      onChange={(e) => handleChange(e, "mod")}
                      placeholder="mod"
                    />
                  </div>
                ) : item.multiplierMode == "list" ? (
                  <TinyChecklist
                    variant={variantEnum.BUDGET}
                    isTime={isTime}
                    items={item?.checklistItems}
                    updateItemChecklist={(e) => handleChange(e, "list")}
                  />
                ) : (
                  <></>
                )}
              </div>

              <Button
                onClick={() => handleMultiplierModeChange()}
                color={`${
                  item.multiplierMode == "list" ? "#6f877b" : item.multiplierMode == "x" ? "#5086ad" : "#929292"
                }`}
                className="ml-1"
              >
                <div className="flex justify-center">
                  {item.multiplierMode == "list" ? (
                    <div
                      style={{
                        borderRadius: "7px",
                        padding: "0.2rem",
                        // color: "#e2e2e2",
                      }}
                    >
                      <MoreInfoIcon
                        style={{
                          width: ".9em",
                          height: ".7em",
                          marginTop: "3px",
                        }}
                      />
                    </div>
                  ) : item.multiplierMode == "x" ? (
                    <div
                      className="flex items-end"
                      // style={{
                      //   color: `${true ? "#f7f7f7" : "#666d73"}`,
                      // }}
                    >
                      {"2"}
                      <XMarkIcon style={{ width: ".5em", margin: "0 0 2px 1px" }} />
                    </div>
                  ) : (
                    <b>-</b>
                  )}
                </div>
              </Button>
              <div className="w-1" />
              <Button
                onClick={() => handleShowComment()}
                color={item?.commentVisible ? "#5d5d5da3" : "#6d8085"}
                colorDarkMode={item?.commentVisible ? "#5d5d5da3" : "#829da0"}
              >
                <CommentIcon style={{ width: ".75em", transform: "scale(1.2)" }} />
              </Button>
            </div>
            {/* <div style={{ height: ".4em" }}></div> */}
            {/* </div> */}

            <div style={{ height: ".4em" }}></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export const CommentSection = ({ item, setItem, editCommentMode, setEditCommentMode }) => {
  return (
    <div className=" p-2 pt-0">
      <div className="flex ">
        {editCommentMode || !item.comment ? (
          <textarea
            autoFocus={item.comment.length < 1}
            style={{
              marginTop: "3px",
              outline: "rgb(125 158 185) solid 2px",
              boxShadow: "0px 0px 2px 2px rgb(109 144 157)",
            }}
            className="w-full itemCommentInput"
            id="review-text"
            onBlur={() => setEditCommentMode(false)}
            value={item.comment}
            onChange={(e) => setItem({ ...item, comment: e.target.value })}
            placeholder=""
            rows={2}
          />
        ) : (
          <div
            style={{ minHeight: "2em" }}
            className="flex-1 itemCommentInput whitespace-pre"
            onClick={() => setEditCommentMode(true)}
          >
            <LinkItUrl>{item.comment}</LinkItUrl>
          </div>
        )}
      </div>
    </div>
  );
};
