import React from "react";
import { MantineProvider, createTheme } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@root/index.css";
import "./orders-tablet.css";
import "./index.css";
import App from "./App";

const theme = createTheme({
  primaryColor: "orange",
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  defaultRadius: "md"
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
