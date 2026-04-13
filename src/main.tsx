// src/main.tsx

// @ts-nocheck
import React from 'react';
import { createRoot } from 'react-dom/client';

import 'barcode-detector/polyfill';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/carousel/styles.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'dayjs/locale/en';

import { MantineProvider, createTheme, type MantineThemeOverride } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';

// @ts-ignore - MUI optional dependency
import { ThemeProvider as MUIThemeProvider, createTheme as createMUITheme, CssBaseline } from '@mui/material';

import App from './App';
import './index.css';
import { initSentry } from '@/integrations/sentry';

/** -----------------------------
 * Sentry (must run before render)
 * ------------------------------ */
initSentry();

/** -----------------------------
 * Console noise suppression
 * ------------------------------ */
const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

console.warn = (...args: any[]) => {
  const msg = args.map(String).join(' ');

  if (msg.includes('LockManager') || msg.includes('@supabase/gotrue-js')) return;
  if (msg.includes('CacheStorage') || msg.includes('Failed to open cache')) return;
  if (msg.includes('Service Worker') && msg.includes('invalid state')) return;
  if (msg.includes('Stripe.js') && msg.includes('HTTP')) return;

  originalWarn(...args);
};

console.error = (...args: any[]) => {
  const strings = args.map(String);
  const full = strings.join(' ');

  if (
    full.includes('Service Worker') &&
    (full.includes('InvalidStateError') || full.includes('invalid state'))
  ) {
    return;
  }

  // Only suppress known MUI warning in production to avoid hiding real errors in dev
  if (import.meta.env.PROD) {
    const first = strings[0] ?? '';
    if (
      first.includes('Failed %s type') &&
      strings.some(
        (s) =>
          s.includes('ThemeProvider') ||
          s.includes('DefaultPropsProvider') ||
          s.includes('RtlProvider')
      )
    ) {
      return;
    }
  }

  // Mantine Notifications/TransitionGroup2 can pass empty array as children; PropTypes expects ReactNode
  if (full.includes('TransitionGroup2') && full.includes('Invalid prop `children`')) {
    return;
  }

  originalError(...args);
};

/** -----------------------------
 * Themes
 * ------------------------------ */
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
    primary: { main: '#ff5f1f' },
    secondary: { main: '#ff8147' },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
});

/** -----------------------------
 * Capacitor Push Notifications
 * All @capacitor/* imports are dynamic so builds (e.g. feeder) never need to resolve them.
 * ------------------------------ */
const initPush = async (Capacitor: { isNativePlatform: () => boolean } | null) => {
  if (!Capacitor?.isNativePlatform()) return;

  try {
    const { PushNotifications } = await import(/* @vite-ignore */ '@capacitor/push-notifications');
    const { LocalNotifications } = await import(/* @vite-ignore */ '@capacitor/local-notifications');

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return;

    // Create Android notification channel (REQUIRED for sound)
    await LocalNotifications.createChannel({
      id: 'default',
      name: 'Default',
      importance: 5, // HIGH importance
      sound: 'default',
    });

    PushNotifications.addListener('registration', (token) => {
      console.log('FCM TOKEN:', token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📬 Push received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('👉 Push action performed:', action);
    });

    await PushNotifications.register();
  } catch (err) {
    // Non-fatal: don't crash app if push init fails
    console.warn('Push init failed (non-critical):', err);
  }
};

/** -----------------------------
 * Capacitor + push init + service worker.
 * Dynamic import of @capacitor/core so it is never required at build time.
 * ------------------------------ */
(async () => {
  let Capacitor: { isNativePlatform: () => boolean } | null = null;
  try {
    const cap = await import('@capacitor/core');
    Capacitor = cap.Capacitor;
  } catch {
    // Not available (web or build-time) — skip native-only logic
  }

  if (Capacitor?.isNativePlatform()) {
    document.addEventListener('deviceready', () => {
      void initPush(Capacitor);
    }, { once: true });
  } else {
    void initPush(Capacitor);
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      initServiceWorker();
    }
  }
})();

/** -----------------------------
 * Render
 * ------------------------------ */
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <React.StrictMode>
    <MUIThemeProvider theme={muiTheme}>
      {/* MUI ThemeProvider PropTypes expect a single ReactNode; Fragment can fail validation in dev */}
      <div>
        <CssBaseline />
        <MantineProvider theme={theme}>
          <DatesProvider settings={{ firstDayOfWeek: 0 }}>
            <ModalsProvider>
              <Notifications />
              <App />
            </ModalsProvider>
          </DatesProvider>
        </MantineProvider>
      </div>
    </MUIThemeProvider>
  </React.StrictMode>
);

/** -----------------------------
 * Service Worker (PROD only, web only)
 * Runs only when Capacitor is not native (checked asynchronously below).
 * ------------------------------ */
const initServiceWorker = () => {
  const waitForLoad = () =>
    new Promise<void>((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', () => resolve(), { once: true });
    });

  const shouldSilentlyIgnore = (err: any) => {
    const name = String(err?.name ?? '');
    const message = String(err?.message ?? '');

    if (name === 'InvalidStateError') return true;
    if (message.includes('invalid state') || message.includes('InvalidStateError')) return true;
    if (message.includes('CacheStorage') || message.includes('Unexpected internal error')) return true;
    if (message.includes('Failed to fetch') || message.includes('404')) return true;

    return false;
  };

  const registerServiceWorker = async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length > 0) {
        console.log('✅ Service Worker already registered');
        return;
      }

      await waitForLoad();

      if (document.readyState !== 'complete' && document.readyState !== 'interactive') return;

      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('✅ Service Worker registered:', registration.scope);

      setInterval(() => {
        registration.update().catch((err) => {
          console.warn('Service worker update check failed:', err);
        });
      }, 60 * 60 * 1000);

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 New service worker available - refresh to update');
          }
        });
      });

      if ('PushManager' in window) {
        console.log('✅ Push Manager available');
      }
    } catch (err: any) {
      if (shouldSilentlyIgnore(err)) return;

      if (import.meta.env.DEV) {
        console.warn('⚠️ Service Worker registration failed (non-critical):', err?.message ?? err);
      }
    }
  };

  void registerServiceWorker();

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'push_notification_received') {
      console.log('📬 Push notification received:', event.data.data);
    }
  });
}