import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { PrivyRoot } from "./auth";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

createRoot(root).render(
  <React.StrictMode>
    <PrivyRoot>
      <App />
    </PrivyRoot>
  </React.StrictMode>,
);
