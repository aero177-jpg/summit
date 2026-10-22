import { AnimatePresence, motion } from "framer-motion";
import { useLayoutEffect, useState } from "react";
import { CheckIcon } from "./customIcons";
import LinkTextEditor from "./LazyLinkTextEditor";
import LinkText from "./LinkText";
const ExpandableText = ({ open, text, updateText, autofocus = true, showSubmit = true }) => {
  const [updatedComment, setUpdatedComment] = useState(text ?? "");
  const [editCommentMode, setEditCommentMode] = useState<boolean>(!text);

  useLayoutEffect(() => {
    if (!editCommentMode) setUpdatedComment(text ?? "");
  }, [text, editCommentMode]);

  const saveComment = () => {
    updateText(updatedComment);
    setEditCommentMode(false);
  };
  const handleChange = (value: string) => {
    setUpdatedComment(value);
    if (!showSubmit) updateText(value);
  };
  const disabled = !text && updatedComment === text;
  return (
    <AnimatePresence mode="wait" initial={false}>
      {open && (
        <motion.div
          className="overflow-hidden"
          initial={{ height: 0, opacity: 0, marginBottom: "-0.5rem" }}
          animate={{
            height: "auto",
            opacity: 1,
            marginBottom: 0,
            transition: {
              height: { duration: 0.16, ease: "easeOut" },
              opacity: { duration: 0.12, delay: 0.03 },
              marginBottom: { duration: 0.16, ease: "easeOut" },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            marginBottom: "-0.5rem",
            transition: {
              height: { duration: 0.16, ease: "easeIn" },
              opacity: { duration: 0.12, ease: "easeIn" },
              marginBottom: { duration: 0.16, ease: "easeIn" },
            },
          }}
          key="comment"
        >
          <div className="relative w-full flex items-center px-1" style={{ paddingBottom: "4px" }}>
            {editCommentMode ? (
              <LinkTextEditor
                value={updatedComment}
                onChange={handleChange}
                autoFocus={autofocus}
                placeholder="Add a comment.."
                controls={
                  showSubmit && (
                    <button
                      type="button"
                      aria-label="Save comment"
                      disabled={disabled}
                      onClick={saveComment}
                      className={`submitArrow commentSaveButton ${!disabled && "valid"}`}
                      style={{
                        padding: "3px 0.4em",
                        borderRadius: "6px",
                        height: "24px",
                        transform: "translateY(-3px)",
                      }}
                    >
                      <CheckIcon style={{ width: ".8em", transform: "scaleY(.85)" }} />
                    </button>
                  )
                }
              />
            ) : (
              <div
                style={{ minHeight: "2em" }}
                className="flex-1 itemCommentInput itemCommentText whitespace-pre-wrap"
                onClick={() => setEditCommentMode(true)}
              >
                <LinkText text={updatedComment} />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExpandableText;
