import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.craven.delivery.tablet.merchant',
  appName: "Crave'n Merchant",
  webDir: 'dist-build',

  // Native Capacitor app — loads from bundled file:// assets.
  // No server.url, no hostname override. Capacitor handles the bridge internally.
  // If you ever see "localhost/assets" errors it means cap sync was not run
  // after build, or the dist/ folder is stale.
  server: {
    androidScheme: 'https',
  },

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;