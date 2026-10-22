import { useAutoAnimate } from "@formkit/auto-animate/react";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { ArrowIcon, CalendarIcon, CheckIcon, EditIcon, TrashIcon } from "./customIcons";
import { LongPressCallbackReason, LongPressEventType, useLongPress } from "use-long-press";
import { handleEnter } from "../actions";
import { variantEnum } from "../constants";
import { Button } from "./Button";
import { DurationInput, formatDuration } from "./DurationInput";

interface TinyChecklistProps {
  items: TinyChecklistItem[];
  updateItemChecklist: (TinyChecklistItem) => void;
  variant?: variantEnum;
  isTime?: boolean;
}

interface TinyChecklistItem {
  text: string;
  checked?: boolean;
  amount?: number;
  createdAt?: string;
}

export const TinyChecklist: React.FC<TinyChecklistProps> = ({
  items,
  updateItemChecklist,
  variant,
  isTime = false,
}) => {
  const [listItems, setListItems] = useState<TinyChecklistItem[]>(items ? items : []);
  const [editModeAll, setEditModeAll] = useState(false);
  const [newItem, setNewItem] = useState({
    text: "",
    amount: 0,
    checked: false,
    createdAt: "",
  });
  const [parent, enableAnimations] = useAutoAnimate({
    duration: 150,
    easing: "ease-in-out",
  });
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.text.length && !newItem.amount && !newItem.createdAt) return;

    const updatedList = [...listItems, newItem];
    setListItems(updatedList);
    updateItemChecklist(updatedList);
    setNewItem({
      text: "",
      amount: 0,
      checked: false,
      createdAt: "",
    });
  };

  const handleUpdateItem = (index: number, action: string, e?: any) => {
    const updatedList = [...listItems];
    console.log(action);
    if (action === "check") {
      e.preventDefault();
      updatedList[index].checked = !updatedList[index].checked;
    }
    if (action === "text") {
      updatedList[index].text = e.target.value;
    }
    if (action === "delete") {
      updatedList.splice(index, 1);
    }
    if (action === "amount") {
      updatedList[index].amount = Number(e?.target?.value ?? e);
    }
    if (action === "date") {
      updatedList[index].createdAt = e.target.value;
    }
    setListItems(updatedList);
    updateItemChecklist(updatedList);
  };

  return (
    <div>
      <form
        onSubmit={handleAddItem}
        style={{
          padding: ".1em .4em 0.1em 0.6em",
          minHeight: "32px",
        }}
        className="itemCommentInput itemCreationInput flex items-center"
      >
        {variant == variantEnum.BUDGET && (
          <button
            style={{ border: "none", marginRight: "4px" }}
            className="datepicker-native-button btn btn-secondary btn-sm hideItem"
          >
            <CalendarIcon />
            <input
              type="date"
              value={newItem.createdAt}
              onChange={(e) => setNewItem({ ...newItem, createdAt: e.target.value })}
              className="datepicker-native-button-input"
            />
          </button>
        )}
        <div className="flex-auto">
          <input
            style={{ width: "calc(100% - 30px)" }}
            // onKeyDown={(e) => handleEnter(e, handleAddItem)}
            className="bg-transparent outline-none flex-grow itemCommentPlaceholder"
            type="text"
            autoComplete="off"
            onSubmit={() => console.log("submit")}
            value={newItem.text}
            onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
            placeholder="Add a new item..."
          />
          <div className="tinyDate">{convertDate(newItem.createdAt)}</div>
        </div>

        {variant === variantEnum.BUDGET && (
          <div className=" flex items-center">
            <div
              style={{
                marginRight: "4px",
                marginLeft: "2px",
                opacity: newItem.amount > 1 ? 1 : 0,
                width: newItem.amount > 1 ? "" : 0,
              }}
              onClick={() => setNewItem({ ...newItem, checked: !newItem.checked })}
              className={`grid place-items-center rounded-md checklistButton
           checklistButton ${newItem.checked ? "isChecked" : ""}`}
            >
              <b style={{ scale: "1.2", userSelect: "none" }}>+</b>
            </div>

            {isTime ? (
              <DurationInput
                value={newItem.amount}
                onChange={(amount) => setNewItem({ ...newItem, amount })}
                className="checklistAmount"
              />
            ) : (
              <input
                // onKeyDown={(e) =>
                //   handleEnter(e, () => handleEnter(e, handleAddItem))
                // }
                type="number"
                className=" checklistAmount px-2  rounded-md outline-none"
                value={newItem.amount == 0 ? "" : Math.abs(newItem.amount)}
                style={{ width: "4em" }}
                placeholder=""
                onChange={(e) => setNewItem({ ...newItem, amount: parseInt(e.target.value) })}
              />
            )}
          </div>
        )}
        <button
          onClick={(e) => handleAddItem(e)}
          type="submit"
          value=""
          className={` submitArrow ${(newItem.text.length || newItem.createdAt.length) && "valid"}`}
          style={{
            display: variant === variantEnum.BUDGET ? "none" : "",
            padding: "0.2em 0.5em",
          }}
        >
          <ArrowIcon />
        </button>
      </form>
      {listItems.length > 0 && (
        <ul ref={parent} className="itemCommentInput w-100 text-sm" style={{ marginTop: ".3em" }}>
          {listItems.map((item, index) => (
            <TinyChecklistItem
              editModeAll={editModeAll}
              key={index}
              item={item}
              index={index}
              isLast={index === listItems.length - 1}
              handleUpdateItem={handleUpdateItem}
              variant={variant}
              isTime={isTime}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export const TinyChecklistItem: React.FC<{
  item: TinyChecklistItem;
  index: Number;
  isLast: boolean;
  handleUpdateItem: any;
  variant?: variantEnum;
  editModeAll?: boolean;
  isTime?: boolean;
}> = ({ item, index, isLast, handleUpdateItem, variant, editModeAll, isTime = false }) => {
  const [editMode, setEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleUpdate = (index, type, event) => {
    if (!isDragging) {
      handleUpdateItem(index, type, event);
      // expandClick(_item.id);
      // console.log("Tap event handled");
    }
  };
  const callback = React.useCallback(() => {
    setEditMode(!editMode);
  }, [editMode]);

  useEffect(() => {
    setEditMode(editModeAll);
  }, [editModeAll]);

  const bind = useLongPress(callback, {
    onCancel: (event, { reason }) =>
      reason !== LongPressCallbackReason.CancelledByMovement &&
      reason !== LongPressCallbackReason.CancelledOutsideElement &&
      variant !== variantEnum.BUDGET &&
      handleUpdate(index, "check", event),
    threshold: 600,

    detect: LongPressEventType.Pointer,
    cancelOnMovement: true,
  });

  const clickOutsideRef = useRef(null);
  useEffect(() => {
    if (editMode === true) {
      setOpenSettings(false);
    }
  }, [editMode]);
  const onClickOutside = () => {
    setEditMode(false);
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideModal = event.target instanceof Element && event.target.closest(".modalContainer");
      if (clickOutsideRef.current && !clickOutsideRef.current.contains(event.target) && !clickedInsideModal) {
        onClickOutside();
      }
    };
    document.addEventListener("click", handleClickOutside, true);
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [onClickOutside]);

  const updateAndClose = (e, type: string) => {
    // console.log(e);
    if (type === "delete") {
      handleUpdate(index, type, e.target.value);
    }
    setEditMode(false);
  };
  return (
    <>
      <div className="relative h-max overflow-hidden">
        <motion.li
          className={`checklistItem flex justify-between ${
            variant !== variantEnum.BUDGET && item.checked ? "isChecked" : ""
          }`}
          animate={{
            x: openSettings ? -84 : 0,
          }}
          drag="x"
          dragSnapToOrigin={true}
          dragConstraints={{ left: -84, right: 0 }}
          dragElastic={0.05}
          onDragStart={handleDragStart}
          onDragEnd={(event, info) => {
            handleDragEnd();
            if (info.offset.x < -10 || info.velocity.x < -20) {
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
            <div className="flex w-full items-center">
              <div
                className="flex-grow mr-1 flex items-center"
                {...bind("test context")}
                style={{
                  userSelect: "none",
                  padding: "2px 0px",
                  minHeight: "24px",
                }}
              >
                {item.text}
                <div className="tinyDate">{convertDate(item?.createdAt)}</div>
              </div>
              <div className="flex gap-1">
                {variant === variantEnum.BUDGET ? (
                  <>
                    {item.amount > 0 && (
                      <div className={`checklistAmount rounded-md px-2 ${item.checked ? "incomeInput" : ""}`}>
                        {isTime ? formatDuration(item.amount) : item.amount}
                      </div>
                    )}
                  </>
                ) : (
                  <Button
                    onClick={(e) => handleUpdate(index, "check", e)}
                    active={item.checked}
                    color={item.checked ? "#509c7c" : "#7f9091"}
                    colorDarkMode={item.checked ? "#509c7c" : "#4f5859"}
                    className="itemStatusCheckButton"
                    style={{
                      height: "24px",
                      width: "32px",
                      margin: "0 0 0 8px",
                      padding: "0",
                      scale: "0.9",
                    }}
                  >
                    <CheckIcon />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div ref={clickOutsideRef} className="flex w-full">
              <form
                className="flex items-center w-full"
                // style={{ width: "calc(100% - 30px)" }}
              >
                {variant == variantEnum.BUDGET && (
                  <button style={{ border: "none" }} className="datepicker-native-button btn btn-secondary btn-sm">
                    <CalendarIcon />
                    <input
                      type="date"
                      value={item.createdAt}
                      onChange={(e) => handleUpdate(index, "date", e)}
                      className="datepicker-native-button-input"
                    />
                  </button>
                )}
                <div className="flex-auto">
                  <input
                    className="outline-none bg-transparent flex-grow w-full"
                    style={{ color: "var(--text-bright, white)" }}
                    type="text"
                    value={item.text}
                    autoFocus={true}
                    onKeyDown={(e) => handleEnter(e, () => updateAndClose(e, "text"))}
                    placeholder=""
                    onChange={(e) => handleUpdate(index, "text", e)}
                  />
                  <div className="tinyDate">{convertDate(item.createdAt)}</div>
                </div>

                {variant === variantEnum.BUDGET && (
                  <div className=" flex items-center">
                    <div
                      style={{
                        marginLeft: "2px",
                        marginRight: "4px",
                        padding: "1px 6px",
                      }}
                      onClick={(e) => handleUpdate(index, "check", e)}
                      className={`grid place-items-center rounded-md 
             checklistButton ${item.checked ? "isChecked" : ""}`}
                    >
                      <b style={{ scale: "1.2", userSelect: "none" }}>+</b>
                    </div>

                    {isTime ? (
                      <DurationInput
                        value={item.amount ?? 0}
                        onChange={(amount) => handleUpdate(index, "amount", amount)}
                        className="checklistAmount"
                      />
                    ) : (
                      <input
                        onKeyDown={(e) => handleEnter(e, () => updateAndClose(e, "amount"))}
                        type="number"
                        className=" checklistAmount px-2  rounded-md outline-none"
                        value={item.amount == 0 ? "" : Math.abs(item.amount)}
                        style={{ width: "4em" }}
                        placeholder=""
                        onChange={(e) => handleUpdate(index, "amount", e)}
                      />
                    )}
                  </div>
                )}
              </form>
              <div className="h-full flex items-center"></div>
            </div>
          )}
        </motion.li>
        <AnimatePresence>
          {(openSettings || isDragging) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                // paddingBottom: `${!isLast ? "6px" : "0px"}`,
                gap: "8px",
                marginRight: "4px",
                height: "24px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
              className="absolute right-0 flex justify-center"
            >
              <Button
                onClick={() => setEditMode(!editMode)}
                color="#617385"
                className="rounded-md"
                style={{
                  height: "24px",
                  width: "32px",
                  margin: "0",
                  padding: "0",
                  scale: "0.85",
                }}
              >
                <EditIcon style={{ width: ".9em", marginLeft: "2px", scale: "0.9" }} />
              </Button>

              <Button
                onClick={(e) => updateAndClose(e, "delete")}
                color="#cb4d4d"
                className="rounded-md"
                style={{
                  height: "24px",
                  width: "32px",
                  margin: "0",
                  padding: "0",
                  scale: "0.85",
                }}
              >
                <TrashIcon style={{ width: ".65em" }} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {!isLast && <div className="tinyDivider" />}
    </>
  );
};

export const convertDate = (date) => {
  if (!date) return "";
  let dateObject = new Date(date);

  // Get day, month and year
  let day: any = dateObject.getDate();
  let month: any = dateObject.getMonth() + 1;
  let year: any = dateObject.getFullYear();
  day = day < 10 ? "0" + day : "" + day;
  month = month < 10 ? "0" + month : "" + month;
  year = ("" + year).slice(-2);

  // Format to "dd.mm.yy"
  const formattedDate = day + "." + month + "." + year;
  return formattedDate;
};
