import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.craven.delivery.customer',
  appName: "Crave'N Delivery",
  webDir: 'dist', // Points to local dist, not shared
  
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },

  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000
    },
    Geolocation: {
      requestPermission: true,
      enableHighAccuracy: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;

