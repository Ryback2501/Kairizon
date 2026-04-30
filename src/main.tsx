import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app/globals.css";
import { DashboardClient } from "./components/DashboardClient";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DashboardClient />
  </StrictMode>
);
