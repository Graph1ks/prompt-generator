import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@vgine/ui/styles.css";
import "@vgine/motion/styles.css";
import "./app.css";
import { App } from "./app.js";

const root = document.getElementById("root");
if (!root) throw new Error("Studio root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
