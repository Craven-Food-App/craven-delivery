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
  colors: {
    orange: [
      "#fff5f0",
      "#ffe0d1",
      "#ffc5a3",
      "#ffa375",
      "#ff8147",
      "#ff5f1f",
      "#e64a0c",
      "#cc3300",
      "#b32d00",
      "#992600",
    ],
  },
});

// Android orientation lock - NO PORTRAIT ALLOWED
const lockOrientation = () => {
  try {
    const anyScreen: any = window.screen;
    if (anyScreen?.orientation?.lock) {
      anyScreen.orientation.lock("landscape").catch(() => {});
    }
    const scr: any = (window as any).screen;
    if (scr?.orientation?.lock) {
      scr.orientation.lock("landscape").catch(() => {});
    }
  } catch {
    // Fail silently on unsupported platforms
  }
};

lockOrientation();

window.addEventListener("orientationchange", () => {
  setTimeout(lockOrientation, 100);
});

window.addEventListener("resize", () => {
  setTimeout(lockOrientation, 100);
});

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









































