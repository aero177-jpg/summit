import * as React from "react";
import { useState } from "react";
import { db } from "../models/db";
import { Collapse } from "react-collapse";
import {
  ArrowIcon,
  CalendarIcon,
  CheckIcon,
  ChevronIcon,
  CommentIcon,
  MoreInfoIcon,
  PlusIcon,
  XMarkIcon,
} from "./customIcons";
import { nanoid } from "nanoid";
import { TinyChecklist } from "./TinyChecklist";
import { CommentSection } from "./BudgetItem";
import { variantEnum } from "../constants";
import { Button } from "./Button";
import ExpandableText from "./ExpandableText";
import { DurationInput } from "./DurationInput";
import LinkTextEditor from "./LazyLinkTextEditor";

export const AddBudgetItem: React.FC<any> = ({ section, isQuickItem = false, isTime = false }) => {
  const [item, setItem] = useState({
    sectionId: "",
    title: "",
    amount: 0,
    isIncome: false,
    multiplier: { baseAmount: 0, mod: 1 },
    date: new Date(),
    comment: "",
    multiplierMode: "list",
    commentVisible: false,
    checklistItems: [],
  });
  const [openMod, setOpenMod] = useState(false);
  const [open, setOpen] = useState(isQuickItem);
  const [editCommentMode, setEditCommentMode] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const saveChange = async (e) => {
    e.preventDefault();
    if (!item.title.trim()) return;

    setRefreshKey(refreshKey + 1);
    const { amount, ...fields } = item;
    await db.items.add({
      ...fields,
      [isTime ? "durationSeconds" : "amount"]: Number(amount),
      title: item.title.trim(),
      _id: nanoid(),
      sectionId: section._id,
      collectionId: section.collectionId,
      multiplierMode: item.multiplierMode == "list" && !item.checklistItems?.length ? "none" : item.multiplierMode,
    });
    setItem({
      sectionId: "",
      title: "",
      amount: 0,
      multiplier: { baseAmount: 0, mod: 1 },
      date: new Date(),
      comment: "",
      isIncome: false,
      multiplierMode: "list",
      commentVisible: false,
      checklistItems: [],
    });
    setOpenMod(false);
    setOpen(false);
  };
  const blurInput = (e) => {
    saveChange(e);
  };

  const blurOnEnter = (e) => {
    if (e.key === "Enter") {
      saveChange(e);
    }
    return;
  };

  const stopPropagationOnEscape = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
    }
  };

  const handleChangeAndSize = (ev, size, inputType) => {
    const target = ev.target;
    // target.style.width = size;
    const length = target.value.length <= 3 ? 4 : target.value.length;
    target.style.width = `${1 * length + 0.7}em `;
    if (inputType === "total") {
      setItem({
        ...item,
        amount: ev.target.value,
        multiplier: { baseAmount: ev.target.value, mod: item.multiplier.mod },
      });
    }
    if (inputType === "base") {
      setItem({
        ...item,
        multiplier: {
          baseAmount: parseInt(ev.target.value),
          mod: item.multiplier.mod,
        },
        amount: parseInt(ev.target.value) * item.multiplier.mod,
      });
    }
    if (inputType === "mod") {
      setItem({
        ...item,
        multiplier: {
          baseAmount: item.multiplier.baseAmount,
          mod: parseInt(ev.target.value),
        },
        amount: item.multiplier.baseAmount * parseInt(ev.target.value),
      });
    }
  };
  const multiplierModeOptions = ["list", "x", "none"];

  const handleShowComment = () => {
    if (editCommentMode) {
      setEditCommentMode(false);
      return;
    }
    setItem({ ...item, commentVisible: !item.commentVisible });
    if (!item.commentVisible) {
      setEditCommentMode(true);
    }
  };
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
        amount: Math.abs(calculateChecklistTotal(ev)),
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
        amount: parseInt(ev.target.value) * item.multiplier.mod,
      });
    }
    if (inputType === "mod") {
      setItem({
        ...item,
        multiplier: {
          baseAmount: item.multiplier.baseAmount,
          mod: parseInt(ev.target.value),
        },
        amount: isEmpty ? item.amount : item.multiplier.baseAmount * parseInt(ev.target.value),
      });
    }
  };
  const handleMultiplierModeChange = () => {
    const currentIndex = multiplierModeOptions.indexOf(item.multiplierMode);
    const nextIndex = (currentIndex + 1) % multiplierModeOptions.length;
    const nextCheckListMode = multiplierModeOptions[nextIndex];
    const updatedValue =
      nextCheckListMode == "list"
        ? Math.abs(calculateChecklistTotal(item.checklistItems))
        : nextCheckListMode == "x"
          ? item.multiplier.baseAmount * item.multiplier.mod
          : item.amount;
    setItem({
      ...item,
      multiplierMode: nextCheckListMode,
      amount: updatedValue,
    });
  };
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  return (
    <div className="flex-grow" key={refreshKey}>
      <form onSubmit={saveChange}>
        <div
          style={{ marginLeft: isQuickItem && "2px" }}
          className={`itemContainer newItem mt-3 flex p-1 ${isQuickItem ? "inputWhite" : ""}`}
        >
          {isQuickItem === false && (
            <div
              style={{
                padding: "0px 0.5em",
                margin: "2px 4px",
                color: "var(--text-bright, rgb(224, 224, 224))",
              }}
              className=" flex items-center justify-center rounded-md submitArrow"
              onClick={() => setOpen(!open)}
            >
              <ChevronIcon
                style={{
                  width: ".8em",
                  transform: `${open ? "rotate(180deg)" : ""}`,
                  transition: "all .2s ease-in-out",
                }}
              />
            </div>
          )}
          <LinkTextEditor
            singleLine
            autoFocus={isQuickItem}
            value={item.title}
            className="itemTitleContainer"
            onChange={(title) => setItem((current) => ({ ...current, title }))}
            onSubmit={() => saveChange({ preventDefault() {} })}
            placeholder={isQuickItem ? "Add quick item..." : ""}
            controls={
              <button
                type="submit"
                aria-label="Add item"
                disabled={!item.title.trim()}
                className={`submitArrow ${item.title && "valid"}`}
                style={{ padding: "0px 0.35em", margin: "2px 4px" }}
              >
                <ArrowIcon />
              </button>
            }
          />
          {!isTime && (
            <div
              style={{
                width: "2.8em",
                margin: "2px",
                marginRight: "4px",
                opacity: item.amount > 1 ? 1 : 0,
              }}
              onClick={() => setItem({ ...item, isIncome: !item.isIncome })}
              className={`grid place-items-center ml-2 rounded-md checklistButton
           checklistButton ${item.isIncome ? "isChecked" : ""}`}
            >
              <b style={{ scale: "1.2", userSelect: "none" }}>+</b>
            </div>
          )}
          {isTime ? (
            <DurationInput
              value={Number(item.amount)}
              onChange={(amount) =>
                setItem({ ...item, amount, multiplier: { baseAmount: amount, mod: item.multiplier.mod } })
              }
              className="ml-2"
            />
          ) : (
            <input
              style={{ margin: "2px 4px" }}
              className="basicInput"
              disabled={false}
              type="number"
              value={item.amount == 0 ? "" : Math.abs(item.amount)}
              //@ts-ignore
              onChange={(e) => handleChangeAndSize(e, "60px", "total")}
              onSubmit={blurOnEnter}
              placeholder=""
            />
          )}
        </div>
      </form>
      <Collapse isOpened={isQuickItem || open} initialStyle={{ height: "auto", overflow: "initial" }}>
        <div className="w-100 h-fit pt-2">
          <ExpandableText
            text={item.comment}
            open={item.commentVisible}
            updateText={(e) => setItem({ ...item, comment: e })}
          />
          <div className="flex ">
            <div className="flex-grow">
              {item.multiplierMode == "x" ? (
                <div className="flex items-center">
                  {isTime ? (
                    <DurationInput
                      value={item.multiplier?.baseAmount ?? item.amount}
                      onChange={(baseAmount) =>
                        setItem({
                          ...item,
                          multiplier: { baseAmount, mod: item.multiplier.mod },
                          amount: baseAmount * item.multiplier.mod,
                        })
                      }
                      className="mr-1 optionButton"
                    />
                  ) : (
                    <input
                      className="basicInput mr-1 optionButton"
                      style={{ width: "6em" }}
                      type="number"
                      value={item.multiplier?.baseAmount ?? item.amount}
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
                <>
                  {item?.commentVisible && (
                    <CommentSection
                      item={item}
                      setItem={setItem}
                      editCommentMode={editCommentMode}
                      setEditCommentMode={setEditCommentMode}
                    />
                  )}
                </>
              )}
            </div>
            <div className="flex-1"></div>
            <div className="flex" style={{ gap: "3px" }}>
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
                    <div className="flex items-end">
                      {"2"}
                      <XMarkIcon style={{ width: ".5em", margin: "0 0 2px 1px" }} />
                    </div>
                  ) : (
                    <b>-</b>
                  )}
                </div>
              </Button>
              <Button
                onClick={() => handleShowComment()}
                color={item?.commentVisible ? "#5d5d5da3" : "#6d8085"}
                colorDarkMode={item?.commentVisible ? "#5d5d5da3" : "#829da0"}
              >
                <CommentIcon style={{ width: ".75em", transform: "scale(1.2)" }} />
              </Button>
            </div>
          </div>
          <div style={{ height: ".4em" }}></div>
        </div>
      </Collapse>
    </div>
  );
};
