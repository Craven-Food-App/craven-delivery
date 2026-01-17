import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.craven.delivery.customer',
  appName: "Crave'N Delivery",
  webDir: '../../dist',
  
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
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

