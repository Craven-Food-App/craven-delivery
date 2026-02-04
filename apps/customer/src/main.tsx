import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme, MantineThemeOverride } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import 'dayjs/locale/en';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { ThemeProvider as MUIThemeProvider, createTheme as createMUITheme, CssBaseline } from '@mui/material';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/carousel/styles.css';
import App from './App.tsx';
import './index.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const theme: MantineThemeOverride = createTheme({
  primaryColor: 'orange',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  defaultRadius: 'md',
  colors: {
    orange: [
      '#fff5f0',
      '#ffe0d1',
      '#ffc5a3',
      '#ffa375',
      '#ff8147',
      '#ff5f1f',
      '#e64a0c',
      '#cc3300',
      '#b32d00',
      '#992600',
    ],
  },
  shadows: {
    glow: '0 0 16px rgba(255,106,0,0.6)',
    glowStrong: '0 0 24px rgba(255,106,0,0.8)',
  },
  other: {
    cravenOrangeGradient: 'linear-gradient(135deg, #FF6A00 0%, #D45400 100%)',
    neonGlow: '0 0 16px rgba(255,106,0,0.6)',
    pulsingShadow: '0 0 20px rgba(255,106,0,0.4)',
  },
});

const muiTheme = createMUITheme({
  palette: {
    primary: {
      main: '#ff5f1f',
    },
    secondary: {
      main: '#ff8147',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MUIThemeProvider theme={muiTheme}>
      <CssBaseline />
      <MantineProvider theme={theme}>
        <DatesProvider settings={{ firstDayOfWeek: 0 }}>
          <ModalsProvider>
            <Notifications />
            <App />
          </ModalsProvider>
        </DatesProvider>
      </MantineProvider>
    </MUIThemeProvider>
  </React.StrictMode>
);

