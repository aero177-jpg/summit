import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import treesImage from "../assets/hillswide.webp";
import { App as CapacitorApp } from "@capacitor/app";

const animations = {
  initial: { opacity: 1, x: 100 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      duration: 0.8,
      mass: 1,
      damping: 25,
      stiffness: 600,
    },
  },
  onlyFade: { opacity: 0 },
  exit: { opacity: 0, x: -100 },
  reverseExit: { opacity: 0, x: 100 },
};

const AnimatedPage = ({ children }) => {
  const location = useLocation();
  const isFresh = location.pathname === window.history.state?.pathname;
  const isCollectionPage = location.pathname.includes("collection");
  location;

  CapacitorApp.addListener("backButton", ({ canGoBack }) => {
    if (!canGoBack) {
      CapacitorApp.exitApp();
    } else {
      window.history.back();
    }
  });
  // !isFresh ? "onlyFade" :
  return (
    <motion.div
      variants={animations}
      initial={!isCollectionPage ? "exit" : "initial"}
      animate="animate"
      exit={isCollectionPage ? "reverseExit" : "exit"}
      transition={{
        duration: 0.2,
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedPage;
