import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider, createTheme } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { ThemeProvider as MUIThemeProvider, createTheme as createMUITheme, CssBaseline } from '@mui/material';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initSentry } from '@/integrations/sentry';
import App from './App';
import { enforceSessionPreference } from './auth/desktopSessionPreference';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/carousel/styles.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@/index.css';
import './desktop.css';

initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const mantineTheme = createTheme({
  primaryColor: 'orange',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  defaultRadius: 'md',
});

const muiTheme = createMUITheme({
  palette: {
    primary: { main: '#ff5f1f' },
    secondary: { main: '#ff8147' },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

// Resolved before the first render so route guards never see a session the
// user asked not to keep.
void enforceSessionPreference().finally(() => {
  createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <MUIThemeProvider theme={muiTheme}>
            <CssBaseline />
            <MantineProvider theme={mantineTheme}>
              <DatesProvider settings={{ firstDayOfWeek: 0 }}>
                <ModalsProvider>
                  <Notifications />
                  <ThemeProvider defaultTheme="light">
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <App />
                    </TooltipProvider>
                  </ThemeProvider>
                </ModalsProvider>
              </DatesProvider>
            </MantineProvider>
          </MUIThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
});
