import { CapacitorConfig } from '@capacitor/cli';
import path from 'path';

const config: CapacitorConfig = {
  appId: 'com.craven.delivery.feeder',
  appName: "Crave'n Feeder",
  // Absolute path so it resolves correctly regardless of where the build is invoked from
  webDir: path.resolve(__dirname, '../../dist'),

  // Uncomment and set URL for live reload against a dev server:
  // server: {
  //   url: 'http://YOUR_LOCAL_IP:8080',
  //   cleartext: true
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