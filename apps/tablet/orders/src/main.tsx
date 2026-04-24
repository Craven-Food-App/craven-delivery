import React from "react";
import { createRoot } from "react-dom/client";
import { AppWithProviders } from "./AppWithProviders";

createRoot(document.getElementById("root") as HTMLElement).render(
  <AppWithProviders />
);
