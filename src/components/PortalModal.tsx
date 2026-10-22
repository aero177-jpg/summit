import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useTheme } from "../App";

export default function PortalModal({ children, showModal, handleCloseCB, drawerStyle = undefined }) {
  const { theme, isDarkMode } = useTheme();

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
