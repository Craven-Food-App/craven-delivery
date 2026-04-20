import type { CapacitorConfig } from '@capacitor/cli';

const isProd = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  // IMPORTANT:
  // Use your real reverse-domain package name.
  // Do not change this after production unless you are intentionally publishing a new app.
  appId: 'com.craven.delivery.customer',

  // App display name (what users see on the home screen in many contexts)
  appName: "Crave'n Delivery",

  // Your web build output folder.
  // If you use Vite, this is usually "dist".
  // If you use CRA, it is usually "build".
  webDir: 'dist',

  // Keep this false for Android release builds to prevent any unexpected web routing issues.
  // If you rely on history routing, keep it false and ensure your router handles it.
  // If you need hash routing, change your router strategy instead.
  server: {
    cleartext: false, // do NOT allow http in production
  },

  android: {
    // Security: do not allow mixed content unless you have a hard requirement.
    allowMixedContent: false,

    // Input handling: safe to keep on
    captureInput: true,

    // MUST be false for Play Store production builds
    webContentsDebuggingEnabled: !isProd,
  },

  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },

  plugins: {
    // OS Splash (Android 12+) should be instant.
    // Your branded 2000ms splash should be implemented IN-APP (React) using a splash component.
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,

      // Match in-app loading / shell (light theme)
      backgroundColor: '#ffffff',

      // No spinner; looks cheap and inconsistent
      showSpinner: false,

      // Helps image scale if you use Capacitor splash assets
      androidScaleType: 'CENTER_CROP',
    },

    // Location: do NOT request permission on launch.
    // Ask at the moment you need it (checkout/track order).
    Geolocation: {
      requestPermission: false,
      enableHighAccuracy: true,
    },

    // Note: presentationOptions is iOS-only; harmless to keep.
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
