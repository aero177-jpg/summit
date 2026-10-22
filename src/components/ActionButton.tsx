import React, { useState, useEffect, useRef, useContext } from "react";
import { LightningIcon, PlusIcon } from "./customIcons";
import { ActionButtonContext } from "../context/ActionButtonContext";
import { AnimatePresence, motion } from "framer-motion";
import { LongPressCallbackReason, LongPressEventType, useLongPress } from "use-long-press";

export const ActionButton = ({ onClick, parentDivRef, onClickSecondary }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState(0);
  const [showSecondary, setShowSecondary] = useState(false);
  const [demounted, setDemounted] = useState(false);
  const prevScrollY = useRef(0);
  const suppressTap = useRef(false);
  const pressStartedAt = useRef(0);
  const { setActionBtnVisible, actionBtnVisible } = useContext(ActionButtonContext);
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = parentDivRef.current.scrollTop;
      if (prevScrollY.current < currentScrollY) {
        setActionBtnVisible(false);
      }
      if (prevScrollY.current > currentScrollY) {
        setActionBtnVisible(true);
      }
      prevScrollY.current = currentScrollY;
    };

    const div = parentDivRef.current;
    if (div) {
      div.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      if (div) {
        div.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    if (actionBtnVisible) {
      setTimeout(() => {
        setDemounted(false);
      }, 100);
    } else {
      setDemounted(true);
    }
  }, [actionBtnVisible]);
  const isMobile = window.innerWidth < 768;
  const holdThreshold = isMobile ? 250 : 500;
  const handleDragStart = () => {
    suppressTap.current = true;
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    if (offset < -30) {
      setDemounted(true);
      setActionBtnVisible(false);
      onClickSecondary();
    }
    setIsDragging(false);
    setShowSecondary(false);
    setOffset(0);
  };
  const handleTap = (e) => {
    if (suppressTap.current || e.timeStamp - pressStartedAt.current >= holdThreshold) {
      return;
    }
    e.preventDefault();
    setActionBtnVisible(false);
    setTimeout(() => {
      onClick(e);
    }, 50);
  };

  // const [startTime, setStartTime] = useState(null);

  // const handleTapStart = () => {
  //   setShowSecondary(true);
  //   setStartTime(Date.now()); // Record the start time
  // };

  // const handleTap = (e) => {
  //   if (isDragging) return;
  //   const elapsedTime = Date.now() - startTime; // Calculate the elapsed time
  //   if (elapsedTime < 200) {
  //     // If less than 1 second has passed
  //     setTimeout(() => {
  //       handleClick(e);
  //     }, 300);
  //   }
  //   setShowSecondary(false);
  //   setStartTime(null); // Reset the start time
  // };
  const callback = React.useCallback(() => {
    suppressTap.current = true;
    setShowSecondary(true);
  }, []);
  const bind = useLongPress(callback, {
    onStart: (event) => {
      suppressTap.current = false;
      pressStartedAt.current = event.timeStamp;
    },
    onCancel: (event, { reason }) =>
      reason !== LongPressCallbackReason.CancelledByMovement &&
      reason !== LongPressCallbackReason.CancelledOutsideElement,
    onFinish: () => !isDragging && setShowSecondary(false),
    threshold: holdThreshold,

    detect: LongPressEventType.Pointer,
    cancelOnMovement: true,
  });
  return (
    <>
      {demounted != true && (
        <AnimatePresence>
          {actionBtnVisible && (
            <motion.div
              initial={{ x: isMobile ? 80 : 0, opacity: 0, scale: 0.6 }}
              animate={{
                x: 0,
                scale: 1.3,
                opacity: 1,
                transition: {
                  scale: {
                    delay: 0.3,
                    duration: 0.4,
                    type: "spring",
                    mass: 1,
                    damping: 25,
                    stiffness: 600,
                  },
                  opacity: {
                    duration: 0.1,
                    delay: 0.4,
                  },

                  x: { delay: 0.6 },
                },
              }}
              exit={{
                x: isMobile ? 80 : 0,
                transition: {
                  duration: 0.1,
                },
              }}
              className={" bottom-20 right-0 mb-8 mr-6 z-10 absolute"}
            >
              <div className="relative ">
                <AnimatePresence>
                  {showSecondary && (
                    <motion.div
                      initial={{ y: 0, opacity: 0 }}
                      animate={{ y: -50, opacity: 1 }}
                      exit={{ y: 0, opacity: 0 }}
                    >
                      <div
                        className="actionButton absolute top-0 right-0"
                        style={{
                          backdropFilter: "blur(0px)",
                          backgroundColor: "var(--action-secondary-bg, #ffffff08)",
                          boxShadow: offset < -30 ? "var(--action-secondary-glow, 0 0 4px #54bb74)" : "none",
                          borderColor: offset < -30
                            ? "var(--action-secondary-ready, #54bb74)"
                            : "var(--action-secondary-border, #80808073)",
                        }}
                      >
                        <LightningIcon />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.div
                  {...bind("test context")}
                  className="actionButton"
                  drag="y"
                  dragSnapToOrigin={true}
                  dragConstraints={{
                    top: -50,
                    bottom: 0,
                  }}
                  dragElastic={0.01}
                  onTap={handleTap}
                  whileTap={{
                    scale: 0.8,
                  }}
                  onDrag={(e, info) => setOffset(info.offset.y)}
                  onDragEnd={() => handleDragEnd()}
                  onDragStart={() => handleDragStart()}
                  onTapCancel={() => setShowSecondary(false)}
                >
                  <PlusIcon />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
};
