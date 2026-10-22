import React, { createContext, useContext, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { CollectionList } from "./components/CollectionList";
import { CollectionPage } from "./pages/CollectionPage";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import fireWatch from "./assets/hillswide.webp";
// import snowtrees from "./assets/pexels-phot o-3634855.jpg";
import { ActionButtonProvider } from "./context/ActionButtonContext";
import useLocalStorage from "./actions";
const ThemeContext = createContext({
  theme: "",
  isDarkMode: false,
  setTheme: (i) => {
    i;
  },
  backgroundPattern: "waves",
  setBackgroundPattern: (i) => {
    i;
  },
});

export function ThemeProvider({ children }) {
  const [storedTheme, setTheme] = useLocalStorage("theme", "");
  const [backgroundPattern, setBackgroundPattern] = useLocalStorage("backgroundPattern", "waves");
  const theme = storedTheme === "truedark" ? "dark" : storedTheme === "light" ? "neutral" : storedTheme;

  // const [theme, setTheme] = useLocalStorage("theme", "");

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDarkMode: theme === "dark" || theme === "black",
        setTheme,
        backgroundPattern,
        setBackgroundPattern,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasRestoredCollection = React.useRef(false);
  const [currentCollection] = useLocalStorage("currentCollection", null);
  const isCollectionPage = location.pathname.includes("collection");
  const { theme, backgroundPattern } = useTheme();

  useEffect(() => {
    if (hasRestoredCollection.current) return;

    hasRestoredCollection.current = true;
    if (location.pathname === "/" && currentCollection) {
      navigate(`/collection/${currentCollection}`, { replace: true });
    }
  }, [location.pathname, currentCollection, navigate]);

  const bgImageURL = () => {
    switch (theme) {
      case "":
        return fireWatch;
      case "truedark":
        return "";
      case "dark":
      case "neutral":
        return "";
      default:
        return fireWatch;
    }
  };
  return (
    <div className="appShell" data-theme={`${theme}`} data-background-pattern={backgroundPattern}>
      <AnimatePresence mode="wait" initial={false}>
        <ActionButtonProvider>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<CollectionList />} />
            <Route path="/collection/:collectionId" element={<CollectionPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ActionButtonProvider>
      </AnimatePresence>

      {theme === "" && (
        <div
          className={`backgroundimg`}
          style={{
            transition: "background-position 0.5s ease-in-out",
            backgroundImage: `url(${bgImageURL()})`,
            backgroundPosition: `${isCollectionPage || theme?.length ? "80%" : "26%"}`,
          }}
        />
      )}
    </div>
  );
}

export default App;
