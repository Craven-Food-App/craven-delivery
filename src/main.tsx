import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme, MantineThemeOverride } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import 'dayjs/locale/en';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
// @ts-ignore - MUI optional dependency
import { ThemeProvider as MUIThemeProvider, createTheme as createMUITheme, CssBaseline } from '@mui/material';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/carousel/styles.css';
import App from './App.tsx';
import './index.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { initSentry } from '@/integrations/sentry';

// Initialize Sentry before React renders
initSentry();

// Suppress known harmless console warnings
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args.join(' ');
  // Suppress LockManager warnings from Supabase (known browser compatibility issue)
  if (message.includes('LockManager') || message.includes('@supabase/gotrue-js')) {
    return;
  }
  // Suppress CacheStorage errors from service worker (handled gracefully)
  if (message.includes('CacheStorage') || message.includes('Failed to open cache')) {
    return;
  }
  originalWarn.apply(console, args);
};

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

// Register Service Worker for Web Push notifications and PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(registration => {
        console.log('✅ Service Worker registered:', registration.scope);
        
        // Check for updates every hour
        setInterval(() => {
          registration.update().catch((err) => {
            // Silently handle update failures
            console.warn('Service worker update check failed:', err);
          });
        }, 60 * 60 * 1000);

        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 New service worker available - refresh to update');
                // Optionally show a notification to user about update
              }
            });
          }
        });

        // Handle push notification permission for iOS
        if ('PushManager' in window) {
          console.log('✅ Push Manager available');
        }
      })
      .catch(err => {
        // Only log if it's not a cache storage error (which can happen in private browsing)
        if (!err.message?.includes('CacheStorage') && !err.message?.includes('Unexpected internal error')) {
          console.error('❌ Service Worker registration failed:', err);
        } else {
          console.warn('⚠️ Service Worker registration skipped (cache storage unavailable):', err.message);
        }
      });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'push_notification_received') {
        console.log('📬 Push notification received:', event.data.data);
        // Handle notification in app if needed
      }
    });
  });
}
