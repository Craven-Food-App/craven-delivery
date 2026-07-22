import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface SafeAreaProviderProps {
  children: React.ReactNode;
}

/**
 * SafeAreaProvider ensures the app respects device safe areas
 * - Top: Status bar, notch, camera cutout (iOS/Android)
 * - Bottom: Home indicator (iOS), navigation bar (Android)
 * - Left/Right: Landscape safe areas
 */
export function SafeAreaProvider({ children }: SafeAreaProviderProps) {
  const [isNative, setIsNative] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect if running in Capacitor native app
    const native = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    
    // Check for test mode (add ?android-test=true to URL for testing)
    const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('android-test') === 'true';
    
    // Android detection: Check Capacitor platform or user agent as fallback
    const isAndroidPlatform = platform === 'android';
    const isAndroidUA = /Android/i.test(navigator.userAgent);
    const android = (native && (isAndroidPlatform || isAndroidUA)) || isTestMode;
    
    setIsNative(native);
    setIsAndroid(android);
    
    // Set test mode attribute for CSS
    if (isTestMode) {
      document.body.setAttribute('data-android-test', 'true');
    }

    // Add class to body for CSS targeting
    if (native) {
      document.body.classList.add('capacitor-native');
    } else {
      document.body.classList.remove('capacitor-native');
    }

    if (android) {
      document.body.classList.add('capacitor-android');
      // Debug log (remove in production if needed)
      console.log('[SafeAreaProvider] Android detected - white navigation bar enabled');
    } else {
      document.body.classList.remove('capacitor-android');
    }

    // Cleanup
    return () => {
      document.body.classList.remove('capacitor-native');
      document.body.classList.remove('capacitor-android');
    };
  }, []);

  return (
    <div className="safe-area-container">
      {/* Top safe area spacer - for status bar, notch, camera */}
      <div className="safe-area-top-spacer" aria-hidden="true" />

      {/* Main content — bottom safe-area is handled by the fixed bottom nav.
          A flex bottom spacer shortens this box and overflow:hidden clips fixed nav. */}
      <div className="safe-area-content">
        {children}
      </div>
    </div>
  );
}
