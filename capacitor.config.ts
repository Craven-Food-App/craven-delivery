import { CapacitorConfig } from '@capacitor/cli';

// Default config - points to feeder app
// For customer app, use: npm run customer:sync (temporarily uses apps/customer/capacitor.config.ts)
const config: CapacitorConfig = {
  appId: 'com.craven.delivery.feeder',
  appName: "Crave'N Feeder",
  webDir: 'dist',

  // COMMENT OUT OR REMOVE THIS SERVER SECTION for local development
  // server: {
  //   url: 'https://cravenusa.com/mobile',
  //   cleartext: true
  // },

  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },

  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
    },
    SplashScreen: {
      launchShowDuration: 0
    },
    Geolocation: {
      requestPermission: true,
      enableHighAccuracy: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
      sound: 'craven-notification.caf'
    }
  }
};

export default config;