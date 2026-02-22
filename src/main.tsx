// src/main.tsx

// @ts-nocheck
import React from 'react';
import { createRoot } from 'react-dom/client';

import { LocalNotifications } from '@capacitor/local-notifications';

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

import { PushNotifications } from '@capacitor/push-notifications';

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
 * ------------------------------ */
const initPush = async () => {
  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return;

     // 🔊 Create Android notification channel (REQUIRED for sound)
    await LocalNotifications.createChannel({
      id: 'default',
      name: 'Default',
      importance: 5, // HIGH importance
      sound: 'default',
    });

    // Listener FIRST is fine (it will fire when register completes)
    PushNotifications.addListener('registration', (token) => {
      console.log('FCM TOKEN:', token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    // (Optional) notification received while app is foregrounded
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📬 Push received:', notification);
    });

    // (Optional) user tapped a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('👉 Push action performed:', action);
    });

    await PushNotifications.register();
  } catch (err) {
    // Non-fatal: don't crash app if push init fails
    console.warn('Push init failed (non-critical):', err);
  }
};

void initPush();

/** -----------------------------
 * Render
 * ------------------------------ */
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
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

/** -----------------------------
 * Service Worker (PROD only)
 * ------------------------------ */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
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

      // safe states
      if (document.readyState !== 'complete' && document.readyState !== 'interactive') return;

      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('✅ Service Worker registered:', registration.scope);

      // hourly update check
      setInterval(() => {
        registration.update().catch((err) => {
          console.warn('Service worker update check failed:', err);
        });
      }, 60 * 60 * 1000);

      // update listener
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
