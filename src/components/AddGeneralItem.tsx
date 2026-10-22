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
  PlusIcon,
  StatusIcon,
  XMarkIcon,
} from "./customIcons";
import { IItem } from "../models/item";
import { ISection } from "../models/section";
import { TinyChecklist, convertDate } from "./TinyChecklist";
import useAutosizeTextArea from "../utils/useAutosizedTextArea";
import { nanoid } from "nanoid";
import PortalModal from "./PortalModal";
import ItemTags from "./AddTag";
import ExpandableText from "./ExpandableText";
import { Button } from "./Button";
import AddTag from "./AddTag";
import { AnimatePresence, motion } from "framer-motion";
import LinkTextEditor from "./LazyLinkTextEditor";

export const AddGeneralItem: React.FC<{
  section: ISection;
  isQuickItem?: boolean;
}> = ({ section, isQuickItem = false }) => {
  const [item, setItem] = useState({
    sectionId: "",
    collectionId: "",
    status: "none",
    title: "",
    tags: [],
    date: new Date(),
    comment: "",
    checklistItems: [],
    commentVisible: false,
    timerSettings: null,
  });
  const [showComment, setShowComment] = useState(false);
  const [openTags, setOpenTags] = useState(false);
  const [open, setOpen] = useState(isQuickItem);
  const [refreshKey, setRefreshKey] = useState(0);
  const saveChange = async (e) => {
    e.preventDefault();
    if (!item.title.trim()) return;

    await db.items.add({
      ...item,
      title: item.title.trim(),
      _id: nanoid(),
      sectionId: section._id,
      collectionId: section.collectionId,
    });
    setItem({
      sectionId: "",
      collectionId: "",
      status: "none",
      title: "",
      tags: [],
      date: new Date(),
      comment: "",
      checklistItems: [],
      commentVisible: false,
      timerSettings: null,
    });
    setOpen(false);
    setRefreshKey(refreshKey + 1);
  };

  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
  useAutosizeTextArea(textAreaRef.current, item.comment);

  const handleUpdateItem = (keyToUpdate, newValue) => {
    setItem((prevItem) => ({
      ...prevItem,
      [keyToUpdate]: newValue,
    }));
  };

  const blurOnEnter = (e) => {
    if (e.key === "Enter") {
      saveChange(e);
    }
    return;
  };
  const handleShowComment = (e) => {
    e.preventDefault();
    setShowComment(!showComment);
  };
  const isScheduled = item?.timerSettings?.date;
  const isPastDue = new Date(item?.timerSettings?.date) < new Date();

  return (
    <div className="flex-grow" key={refreshKey}>
      <form onSubmit={saveChange}>
        <div
          style={{ marginLeft: isQuickItem && "2px" }}
          className={`itemContainer newItem mt-3 flex p-1 ${isQuickItem ? "inputWhite" : ""}`}
        >
          {isQuickItem == false && (
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
                disabled={!item.title}
                className={` submitArrow ${item.title && "valid"}`}
                style={{
                  padding: "0px 0.35em",
                  margin: "2px 4px",
                }}
              >
                <ArrowIcon />
              </button>
            }
          />
        </div>
      </form>
      {item?.tags?.length > 0 && (
        <div style={{ fontSize: ".6em", margin: "6px 0 0 2px" }}>
          {item?.tags &&
            item.tags.map((tag, index) => (
              <span key={index} className={`${tag.color}tag smalltag mr-1`}>
                {tag.title}
              </span>
            ))}
        </div>
      )}
      <Collapse isOpened={isQuickItem || open}>
        <div className="mt-2" />
        <ExpandableText
          text={item.comment}
          open={showComment}
          updateText={(comment) => setItem({ ...item, comment, commentVisible: Boolean(comment) })}
        />

        <AnimatePresence>
          {openTags && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ItemTags
                itemTags={item?.tags || []}
                updateItemTags={(tags) => handleUpdateItem("tags", tags)}
                updateItemStatus={(status) => handleUpdateItem("status", status)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap-reverse" style={{ gap: "6px" }}>
          <TinyChecklist items={[]} updateItemChecklist={(e) => setItem({ ...item, checklistItems: e })} />
          <div className="flex-1"></div>
          <div className="flex" style={{ gap: "3px" }}>
            <Button onClick={() => setOpenTags(!openTags)} color="#856c83">
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
              className="datepicker-native-button"
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
                    marginLeft: "4px",
                    fontSize: ".8em",
                    marginBottom: "-2px",
                  }}
                >
                  {convertDate(item?.timerSettings?.date)}
                </div>
              )}
            </Button>
            <Button
              onClick={(e) => handleShowComment(e)}
              color={item?.commentVisible ? "#5d5d5da3" : "#6d8085"}
              colorDarkMode={item?.commentVisible ? "#5d5d5da3" : "#829da0"}
            >
              <CommentIcon style={{ width: ".75em", transform: "scale(1.2)" }} />
            </Button>
          </div>
        </div>
        <div style={{ height: ".4em" }}></div>
      </Collapse>
    </div>
  );
};
