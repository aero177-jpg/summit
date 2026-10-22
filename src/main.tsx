import React from "react";
import ReactDOM from "react-dom/client";
import App, { ThemeProvider } from "./App";
// Self-hosted Poppins (Latin subset, same weights the Google Fonts link loaded) so the font works offline
import "@fontsource/poppins/latin-300.css";
import "@fontsource/poppins/latin-300-italic.css";
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-400-italic.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "./index.css";
import "./styles/tailwind.css";
import { BrowserRouter as Router } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Router>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </Router>
);
