import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@excalidraw/excalidraw/index.css";
import { App } from "./App.js";
import "./styles.css";

window.EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";

const root = document.getElementById("root");
if (!root) {
  throw new Error("System Canvas could not find its root element.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
