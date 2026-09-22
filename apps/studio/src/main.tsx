import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@vgine/ui/styles.css";
import "@vgine/motion/styles.css";
import "./app.css";
import { App } from "./app.js";
import { I18nProvider } from "./i18n.js";

const root = document.getElementById("root");
if (!root) throw new Error("Studio root element not found");

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
