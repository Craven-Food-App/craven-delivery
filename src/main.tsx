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

// Suppress known harmless console warnings and errors
const originalWarn = console.warn;
const originalError = console.error;
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
  // Suppress Service Worker invalid state warnings (non-critical)
  if (message.includes('Service Worker') && message.includes('invalid state')) {
    return;
  }
  originalWarn.apply(console, args);
};
// Also suppress service worker errors
console.error = (...args: any[]) => {
  const message = args.join(' ');
  // Suppress Service Worker InvalidStateError (non-critical, happens during navigation)
  if (message.includes('Service Worker') && (message.includes('InvalidStateError') || message.includes('invalid state'))) {
    return; // Silently ignore
  }
  originalError.apply(console, args);
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
// Skip service worker registration in development to avoid MIME type issues
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Wait for document to be ready and check if already registered
  const registerServiceWorker = async () => {
    try {
      // Check if service worker is already registered
      const existingRegistrations = await navigator.serviceWorker.getRegistrations();
      if (existingRegistrations.length > 0) {
        console.log('✅ Service Worker already registered');
        return;
      }

      // Check if document is in a valid state
      if (document.readyState === 'loading' || document.readyState === 'uninitialized') {
        // Wait for document to be ready
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve(undefined);
          } else {
            window.addEventListener('load', resolve, { once: true });
          }
        });
      }

      // Only register if document is ready
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
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
              }
            });
          }
        });

        // Handle push notification permission for iOS
        if ('PushManager' in window) {
          console.log('✅ Push Manager available');
        }
      }
    } catch (err: any) {
      // Handle specific error types - all are non-critical
      const errorName = err?.name || '';
      const errorMessage = err?.message || '';
      
      if (
        errorName === 'InvalidStateError' || 
        errorMessage.includes('invalid state') ||
        errorMessage.includes('InvalidStateError')
      ) {
        // Document is in invalid state - this can happen during navigation or in iframes
        // This is non-critical, suppress completely
        return; // Silently ignore
      } else if (errorMessage.includes('CacheStorage') || errorMessage.includes('Unexpected internal error')) {
        // Cache storage unavailable (private browsing, etc.) - suppress
        return; // Silently ignore
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('404')) {
        // Service worker file doesn't exist - this is expected in development
        return; // Silently ignore
      } else {
        // Other errors - only log in development
        if (import.meta.env.DEV) {
          console.warn('⚠️ Service Worker registration failed (non-critical):', errorMessage || err);
        }
      }
    }
  };

  // Register when page loads
  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker, { once: true });
  }

  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'push_notification_received') {
      console.log('📬 Push notification received:', event.data.data);
    }
  });
}
