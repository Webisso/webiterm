import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "@xterm/xterm/css/xterm.css";
import "./styles/tokens.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element is missing.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
