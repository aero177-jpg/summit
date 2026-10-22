import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useTheme } from "../App";

export default function PortalModal({ children, showModal, handleCloseCB, drawerStyle = undefined }) {
  const { theme, isDarkMode } = useTheme();
  const modalId = useId();
  const closeRef = useRef(handleCloseCB);
  closeRef.current = handleCloseCB;

  // Give each open modal its own history entry so the Android back gesture closes the modal instead of leaving the app
  useEffect(() => {
    if (!showModal) return;
    window.history.pushState({ ...window.history.state, portalModalId: modalId }, "");
    let closedByBack = false;
    const handlePopState = () => {
      // A nested modal popping back to this modal's entry must not close this one
      if (window.history.state?.portalModalId === modalId) return;
      closedByBack = true;
      closeRef.current(null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (!closedByBack && window.history.state?.portalModalId === modalId) window.history.back();
    };
  }, [showModal, modalId]);

  const handleClose = (e) => {
    // setTimeout(() => {
    handleCloseCB(e);
    // }, 600);
  };
  return (
    <>
      {createPortal(
        <>
          <AnimatePresence>
            {showModal && (
              <>
                <div className="modalContainer">
                  <motion.div
                    style={drawerStyle}
                    initial={{
                      opacity: 0,
                      y: -50,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      opacity: { delay: 0.2 },
                      y: { delay: 0.15 },
                      duration: 0.2,
                    }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    className={`${isDarkMode ? "dark" : ""} modalDrawer`}
                    data-theme={theme}
                  >
                    {children}
                    {/* <button onClick={(e) => handleClose(e)}>Close</button> */}
                  </motion.div>
                </div>
                <motion.div
                  className={`${isDarkMode ? "dark" : ""} modalOverlay`}
                  onClick={(e) => handleClose(e)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              </>
            )}
          </AnimatePresence>
        </>,
        document.getElementById("root"),
      )}
    </>
  );
}
