import React from "react";
import { MantineProvider, createTheme } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
// Root app styles: Tailwind + design tokens so portal (customers, insights, reports, business hours, etc.) render correctly
import "@root/index.css";
import "./merchant-tablet.css";
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
  shadows: {
    glow: "0 0 16px rgba(255,106,0,0.6)",
    glowStrong: "0 0 24px rgba(255,106,0,0.8)",
  },
  other: {
    cravenOrangeGradient: "linear-gradient(135deg, #FF6A00 0%, #D45400 100%)",
    neonGlow: "0 0 16px rgba(255,106,0,0.6)",
    pulsingShadow: "0 0 20px rgba(255,106,0,0.4)",
  },
});

export function AppWithProviders() {
  return (
    <MantineProvider theme={theme}>
      <DatesProvider settings={{ firstDayOfWeek: 0 }}>
        <ModalsProvider>
          <Notifications />
          <App />
        </ModalsProvider>
      </DatesProvider>
    </MantineProvider>
  );
}

export default AppWithProviders;