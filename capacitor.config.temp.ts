import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.craven.delivery.feeder',
  appName: "Crave'n",
  webDir: '../../dist',

  // COMMENT OUT OR REMOVE THIS SERVER SECTION for local development
   //server: {
   //  url: 'https://cravenusa.com/mobile',
   // cleartext: true
  // },

  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },

  plugins: {
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

