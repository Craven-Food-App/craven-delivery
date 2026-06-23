// App Store configuration and metadata

export interface AppStoreConfig {
  appName: string;
  bundleId: string;
  version: string;
  buildNumber: string;
  description: string;
  keywords: string[];
  category: string;
  ageRating: string;
  privacyPolicy: string;
  termsOfService: string;
  supportUrl: string;
  website: string;
  screenshots: string[];
  icon: string;
  splashScreen: string;
}

export const appStoreConfig: AppStoreConfig = {
  appName: 'Crave\'n Delivery Driver',
  bundleId: 'com.craven.delivery.driver',
  version: '1.0.0',
  buildNumber: '1',
  description: 'Join the Crave\'n Feeder network and earn money delivering across food, grocery, retail, convenience, and Crave\'n Express (CX) courier jobs. Flexible schedule, competitive pay, and professional support.',
  keywords: [
    'delivery',
    'driver',
    'food delivery',
    'gig work',
    'flexible schedule',
    'earn money',
    'delivery driver',
    'food courier',
    'gig economy',
    'side hustle'
  ],
  category: 'Business',
  ageRating: '17+',
  privacyPolicy: 'https://cravenusa.com/privacy-policy',
  termsOfService: 'https://cravenusa.com/terms-of-service',
  supportUrl: 'https://cravenusa.com/contact',
  website: 'https://cravenusa.com',
  screenshots: [
    '/screenshots/driver-dashboard.png',
    '/screenshots/order-acceptance.png',
    '/screenshots/delivery-flow.png',
    '/screenshots/earnings.png',
    '/screenshots/schedule.png'
  ],
  icon: '/icons/app-icon-1024.png',
  splashScreen: '/splash/splash-screen.png'
};

// iOS App Store specific configuration
export const iosAppStoreConfig = {
  ...appStoreConfig,
  bundleId: 'com.craven.delivery.driver.ios',
  appStoreId: '1234567890', // Will be assigned by Apple
  reviewNotes: 'This app allows drivers to accept delivery orders, navigate to restaurants and customers, and track their earnings.',
  testFlightNotes: 'Beta version for testing new features and improvements.',
  requiredDeviceCapabilities: [
    'location-services',
    'camera',
    'microphone'
  ],
  supportedOrientations: [
    'portrait',
    'landscape-left',
    'landscape-right'
  ],
  minimumOSVersion: '14.0',
  targetOSVersion: '17.0'
};

// Google Play Store specific configuration
export const androidPlayStoreConfig = {
  ...appStoreConfig,
  bundleId: 'com.craven.delivery.driver.android',
  packageName: 'com.craven.delivery.driver',
  playConsoleId: '1234567890', // Will be assigned by Google
  contentRating: 'Teen',
  targetSdkVersion: 34,
  minSdkVersion: 24,
  permissions: [
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.WAKE_LOCK',
    'android.permission.VIBRATE',
    'android.permission.RECEIVE_BOOT_COMPLETED'
  ],
  features: [
    'android.hardware.location',
    'android.hardware.location.gps',
    'android.hardware.camera',
    'android.hardware.camera.autofocus'
  ]
};

// App icons and splash screens configuration
export const appAssets = {
  icons: {
    // iOS App Icons
    ios: {
      '20x20': '/icons/ios/icon-20.png',
      '29x29': '/icons/ios/icon-29.png',
      '40x40': '/icons/ios/icon-40.png',
      '58x58': '/icons/ios/icon-58.png',
      '60x60': '/icons/ios/icon-60.png',
      '76x76': '/icons/ios/icon-76.png',
      '80x80': '/icons/ios/icon-80.png',
      '87x87': '/icons/ios/icon-87.png',
      '120x120': '/icons/ios/icon-120.png',
      '152x152': '/icons/ios/icon-152.png',
      '167x167': '/icons/ios/icon-167.png',
      '180x180': '/icons/ios/icon-180.png',
      '1024x1024': '/icons/ios/icon-1024.png'
    },
    // Android App Icons
    android: {
      '36x36': '/icons/android/icon-36.png',
      '48x48': '/icons/android/icon-48.png',
      '72x72': '/icons/android/icon-72.png',
      '96x96': '/icons/android/icon-96.png',
      '144x144': '/icons/android/icon-144.png',
      '192x192': '/icons/android/icon-192.png',
      '512x512': '/icons/android/icon-512.png'
    }
  },
  splashScreens: {
    ios: {
      '640x1136': '/splash/ios/splash-640x1136.png',
      '750x1334': '/splash/ios/splash-750x1334.png',
      '1125x2436': '/splash/ios/splash-1125x2436.png',
      '1242x2208': '/splash/ios/splash-1242x2208.png',
      '1536x2048': '/splash/ios/splash-1536x2048.png'
    },
    android: {
      '320x480': '/splash/android/splash-320x480.png',
      '480x800': '/splash/android/splash-480x800.png',
      '720x1280': '/splash/android/splash-720x1280.png',
      '1080x1920': '/splash/android/splash-1080x1920.png'
    }
  }
};

// App Store optimization keywords
export const asoKeywords = {
  primary: [
    'delivery driver',
    'food delivery',
    'gig work',
    'flexible schedule',
    'earn money'
  ],
  secondary: [
    'driver app',
    'delivery jobs',
    'food courier',
    'gig economy',
    'side hustle',
    'part time work',
    'delivery service',
    'food delivery app'
  ],
  longTail: [
    'food delivery driver jobs',
    'flexible delivery work',
    'earn money driving',
    'delivery driver app',
    'food courier jobs',
    'gig work delivery'
  ]
};

// App Store review guidelines compliance
export const complianceChecklist = {
  content: {
    noViolence: true,
    noHateSpeech: true,
    noDiscrimination: true,
    noHarassment: true,
    appropriateAgeRating: true
  },
  functionality: {
    noCrashes: true,
    responsiveUI: true,
    properNavigation: true,
    workingFeatures: true,
    noBrokenLinks: true
  },
  privacy: {
    privacyPolicy: true,
    dataCollection: true,
    userConsent: true,
    dataRetention: true,
    thirdPartySharing: true
  },
  security: {
    secureData: true,
    encryptedCommunication: true,
    secureAuthentication: true,
    noMalware: true,
    regularUpdates: true
  }
};

// App Store submission checklist
export const submissionChecklist = {
  metadata: {
    appName: true,
    description: true,
    keywords: true,
    category: true,
    ageRating: true,
    screenshots: true,
    appIcon: true
  },
  binary: {
    versionNumber: true,
    buildNumber: true,
    bundleId: true,
    codeSigning: true,
    provisioningProfile: true
  },
  testing: {
    deviceTesting: true,
    functionalityTesting: true,
    performanceTesting: true,
    securityTesting: true,
    accessibilityTesting: true
  },
  legal: {
    privacyPolicy: true,
    termsOfService: true,
    contentRights: true,
    thirdPartyLicenses: true,
    exportCompliance: true
  }
};
