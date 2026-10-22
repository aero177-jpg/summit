import * as React from "react";
import { db } from "../models/db";
import { IItem } from "../models/item";
import { useEffect, useRef, useState } from "react";
import {
  ArrowIcon,
  CalendarIcon,
  CheckIcon,
  ChevronIcon,
  CommentIcon,
  EditIcon,
  MoreInfoIcon,
  SliderIcon,
  StatusIcon,
  TrashIcon,
  XMarkIcon,
} from "./customIcons";
import Dropdown from "./Dropdown";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { TinyChecklist, convertDate } from "./TinyChecklist";
import { LongPressCallbackReason, LongPressEventType, useLongPress } from "use-long-press";
import useLocalStorage, { displayCalculatedValue, handleEnter, longPressOptions } from "../actions";
import useAutosizeTextArea from "../utils/useAutosizedTextArea";
import { LinkItUrl } from "react-linkify-it";
import PortalModal from "./PortalModal";
import ItemTags from "./AddTag";
import { statusOptions } from "../constants";
import { Button } from "./Button";
import TextareaAutoResize from "react-textarea-autosize";
import ExpandableText from "./ExpandableText";
import ProgressSliderControl from "./ProgressSlider/ProgressSliderControl";
import { usePersistItem } from "../utils/usePersistItem";
import LinkText from "./LinkText";
import LinkTextEditor from "./LazyLinkTextEditor";

export const GeneralItem: React.FC<{
  _item: IItem;
  expandClick: any;
  isOpened: boolean;
  listNumber?: number;
  checklistMode?: string;
  reorderMode?: boolean;
  skipInitialExpansionAnimation?: boolean;
}> = ({ _item, expandClick, isOpened, listNumber, checklistMode, reorderMode, skipInitialExpansionAnimation }) => {
  const [item, setItem] = useState<IItem>(_item);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editCommentMode, setEditCommentMode] = useState<boolean>(false);
  const [openSettings, setOpenSettings] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [openTags, setOpenTags] = useState(false);
  const [updatedComment, setUpdatedComment] = useState(item?.comment);

  usePersistItem(item, _item, setItem);

  useEffect(() => {
    if (editMode === true) {
      setOpenSettings(false);
    }
  }, [editMode]);

  useEffect(() => {
    if (reorderMode === true) {
      setOpenSettings(false);
      setEditMode(false);
    }
  }, [reorderMode]);
  useAutosizeTextArea(textAreaRef.current, item.comment);
  useEffect(() => {
    if (isOpened === false) {
      setEditMode(false);
    }
  }, [isOpened]);
  const handleUpdateItem = (keyToUpdate, newValue) => {
    setItem((prevItem) => ({
      ...prevItem,
      [keyToUpdate]: newValue,
    }));
  };
  const callback = React.useCallback(() => {
    setEditMode(!editMode);
  }, [editMode]);

  const bind = useLongPress(
    callback,
    longPressOptions(() => expandClick(_item.id)),
  );

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
  const FormattedListNumber = typeof listNumber === "number" && listNumber + ". ";

  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleTap = () => {
    if (!isDragging && !reorderMode) {
      expandClick(_item.id);
      if (isOpened) {
        setOpenSettings(false);
      }
      // console.log("Tap event handled");
    }
  };

  const handleToggleSublistMode = () => {
    if (!isOpened) {
      expandClick(_item.id);
    }
    handleUpdateItem("sublistMode", item?.sublistMode === "slider" ? "list" : "slider");
  };
  const isScheduled = item?.timerSettings?.date;
  const isPastDue = new Date(item?.timerSettings?.date) < new Date();
  return (
    <div>
      <div
        style={{
          outline: reorderMode ? "var(--green-glow)" : "#00000000",
          background: "none",
        }}
        className={`${isOpened ? "glow" : ""} itemContainer overflow-hidden relative`}
      >
        <motion.div
          className={`${editMode === false ? "itemHeaderClicky" : "itemHeaderEditMode"} ${
            item.status === "done" ? "itemDone" : ""
          }   z-10 relative  flex justify-between p-1`}
          animate={{
            x: openSettings ? -128 : 0,
          }}
          drag="x"
          dragListener={!reorderMode}
          dragSnapToOrigin={true}
          dragConstraints={{ left: -128, right: 0 }}
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
            <div
              // {...bind("test context")}
              onClick={() => handleTap()}
              className={` itemTitleContainer  flex-col ${item.status === "done" ? "itemDone" : ""}  px-1`}
            >
              {FormattedListNumber}
              <LinkText text={item.title} />
              <div style={{ fontSize: ".6em" }}>
                {item?.tags &&
                  item.tags.map((tag, index) => (
                    <span key={index} className={`${tag.color}tag smalltag mr-1`}>
                      {tag.title}
                    </span>
                  ))}
              </div>{" "}
            </div>
          ) : (
            <>
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
                    style={{ background: "#618576", padding: "0em .6em" }}
                    className="rounded-md"
                  >
                    <ArrowIcon />
                  </button>
                }
              />
            </>
          )}
          {editMode === false && (
            <div className="itemHeaderMetadata flex shrink-0 items-center gap-1 px-1" style={{ color: "var(--item-text)" }}>
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap" onClick={() => handleTap()}>
                {item?.sublistMode == "slider" ? (
                  <>
                    {item?.progress?.current?.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          fontWeight: "600",
                          fontSize: "13px",
                          // marginTop: "2px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item?.progress?.type} {/* {item?.progress?.type ? ": " : ""} */}
                        {displayCalculatedValue(item?.progress?.current, item.progress.max)}-
                        {item?.progress?.max > 0 ? item.progress.max : "4"}{" "}
                        {/* <div
                        style={{
                          margin: "1px 3px 1px 6px",
                          width: "2px",
                          background: "#4b4b4b",
                        }}
                      ></div>{" "} */}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {item.checklistItems?.length > 0 && (
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: "13px",
                        }}
                      >
                        {item.checklistItems.filter((i) => i.checked).length}/{item.checklistItems.length}
                      </div>
                    )}
                    {item?.checklistItems?.length > 0 && (
                      <div className="h-6 flex items-center w-auto">
                        <MoreInfoIcon
                          style={{
                            width: ".9em",
                            height: ".7em",
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
                {item?.timerSettings?.isCompleted === false && item?.timerSettings?.date && (
                  <CalendarIcon
                    style={{
                      width: ".7em",
                      color: `${isPastDue ? "#cb4d4d" : ""}`,
                    }}
                  />
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
              </div>
              {checklistMode === "check" ? (
                <Button
                  active={item.status === "done"}
                  className="itemStatusCheckButton"
                  onClick={(e) => handleUpdateItem("status", item.status === "done" ? "none" : "done")}
                  color={`${item.status === "done" ? "#509c7c" : "#7f9091"}`}
                  colorDarkMode={`${item.status === "done" ? "#509c7c" : "#4f5859"}`}
                  style={{
                    height: "100%",
                    margin: "0px 2px",
                    maxHeight: "1.9em",
                  }}
                >
                  <CheckIcon />
                </Button>
              ) : checklistMode === "tag" ? (
                <div className="shrink-0">
                  <Dropdown
                    data={statusOptions}
                    handleUpdate={(e) => handleUpdateItem("status", e.label)}
                    open={false}
                    useLabel={true}
                    initialItem={statusOptions.find((option) => option.label === item.status)}
                  />
                </div>
              ) : (
                <div style={{ marginRight: "2px" }}></div>
              )}
            </div>
          )}
        </motion.div>
        <AnimatePresence mode="wait">
          {(openSettings || isDragging) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: "3px", gap: "6px", paddingRight: "0px" }}
              className="absolute right-0 top-0 h-full flex items-center justify-center"
            >
              <Button
                onClick={() => handleToggleSublistMode()}
                color={`${
                  item.sublistMode == "slider"
                    ? "#687a7c"
                    : // : item.sublistMode == "slider"
                      "#687a7c"
                  // : "#929292"
                }`}
              >
                <div className="flex justify-center">
                  {item.sublistMode == "slider" ? (
                    <SliderIcon style={{ width: ".9rem", height: ".9rem" }} />
                  ) : (
                    <MoreInfoIcon
                      style={{
                        marginLeft: "3px",
                        marginTop: "2px",
                        width: "0.9rem",
                        height: "0.9rem",
                      }}
                    />
                  )}
                </div>
              </Button>
              <Button
                onClick={() => setEditMode(!editMode)}
                color="#617385"
                // style={{
                //   display: "grid",

                //   placeItems: "center",
                //   background: "#617385",
                //   height: "100%",
                //   width: "2em",
                // }}
                // className="maxBtnHeight"
              >
                <EditIcon style={{ width: ".9em", marginLeft: "2px", scale: "0.9" }} />
              </Button>
              {/* <div className="w-1" /> */}

              <Button onClick={() => db.items.delete(item.id)} color="#cb4d4d">
                <TrashIcon style={{ width: ".65em" }} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div>
        <AnimatePresence mode="wait">
          {isOpened && (
            <>
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
                <ExpandableText
                  text={item.comment}
                  open={item.commentVisible}
                  updateText={(text) => handleUpdateItem("comment", text)}
                />
                <div className="flex" style={{ gap: "3px" }}>
                  {item?.sublistMode == "slider" ? (
                    <div className="flex-1 px-2">
                      <ProgressSliderControl
                        itemProgress={item?.progress}
                        itemStatus={item?.status}
                        updateItem={(key, e) => handleUpdateItem(key, e)}
                      />
                    </div>
                  ) : (
                    <>
                      <TinyChecklist
                        items={item?.checklistItems}
                        updateItemChecklist={(e) => handleUpdateItem("checklistItems", e)}
                      />
                      <div className="flex-1"></div>
                    </>
                  )}

                  <Button onClick={() => setOpenTags(true)} color="#856c83">
                    <StatusIcon style={{ marginBottom: "-2px" }} />
                  </Button>
                  <Button
                    color={`${isPastDue ? "#cb4d4d" : isScheduled ? "#567971" : "#566379"}`}
                    colorDarkMode={`${isPastDue ? "#cb4d4d" : isScheduled ? "#4d8175" : "#62789d"}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 .5em",
                    }}
                    className={`datepicker-native-button ${isPastDue || isScheduled ? "hasAccent" : ""}`}
                  >
                    <CalendarIcon style={{ marginRight: "-2px" }} />
                    <input
                      type="date"
                      value={item?.timerSettings?.date.toString() || ""}
                      onChange={(e) =>
                        handleUpdateItem("timerSettings", {
                          date: e.target.value,
                          isCompleted: false,
                        })
                      }
                      className="datepicker-native-button-input"
                    />
                    {isScheduled && (
                      <div
                        className="italic"
                        style={{
                          marginLeft: "2px",
                          fontSize: ".8em",
                          marginBottom: "-2px",
                        }}
                      >
                        {convertDate(item?.timerSettings?.date)}
                      </div>
                    )}
                  </Button>

                  <Button
                    onClick={() => handleShowComment()}
                    active={!!item?.commentVisible}
                    color={item?.commentVisible ? "#5d5d5da3" : "#6d8085"}
                    colorDarkMode={item?.commentVisible ? "#5d5d5da3" : "#829da0"}
                  >
                    <CommentIcon style={{ width: ".75em", transform: "scale(1.2)" }} />
                  </Button>
                </div>
                <div style={{ height: ".4em" }}></div>
              </motion.div>
              <PortalModal showModal={openTags} handleCloseCB={() => setOpenTags(false)}>
                <div className="p-2">
                  <ItemTags
                    itemTags={item?.tags || []}
                    updateItemTags={(tags) => handleUpdateItem("tags", tags)}
                    updateItemStatus={(status) => handleUpdateItem("status", status)}
                  />
                </div>
              </PortalModal>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
