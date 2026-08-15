import React from "react";
import { MantineProvider, createTheme } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { Toaster } from "sonner";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@root/index.css";
import "./cx-tablet.css";
import "./index.css";
import App from "./App";

const theme = createTheme({
  primaryColor: "orange",
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  defaultRadius: "md",
});

export function AppWithProviders() {
  return (
    <MantineProvider theme={theme} forceColorScheme="dark">
      <ModalsProvider>
        <Notifications />
        <Toaster richColors position="top-center" />
        <App />
      </ModalsProvider>
    </MantineProvider>
  );
}

export default AppWithProviders;
