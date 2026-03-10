import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import App from "./App";
import "./index.css";

const theme = createTheme({
  primaryColor: "orange",
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  defaultRadius: "md",
  defaultColorScheme: "light",
});

const lockOrientation = () => {
  try {
    const anyScreen: any = window.screen;
    if (anyScreen?.orientation?.lock) {
      anyScreen.orientation.lock("landscape").catch(() => {});
    }
  } catch {}
};

lockOrientation();
window.addEventListener("orientationchange", () => setTimeout(lockOrientation, 100));
window.addEventListener("resize", () => setTimeout(lockOrientation, 100));

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <DatesProvider settings={{ firstDayOfWeek: 0 }}>
        <ModalsProvider>
          <Notifications />
          <App />
        </ModalsProvider>
      </DatesProvider>
    </MantineProvider>
  </React.StrictMode>
);

