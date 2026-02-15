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
 * 
 * Also initializes the StatusBar plugin for black text on native.
 */
export function SafeAreaProvider({ children }: SafeAreaProviderProps) {
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();

    const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('android-test') === 'true';

    const isAndroidPlatform = platform === 'android';
    const isAndroidUA = /Android/i.test(navigator.userAgent);
    const android = (native && (isAndroidPlatform || isAndroidUA)) || isTestMode;

    setIsAndroid(android);

    if (isTestMode) {
      document.body.setAttribute('data-android-test', 'true');
    }

    if (native) {
      document.body.classList.add('capacitor-native');
    } else {
      document.body.classList.remove('capacitor-native');
    }

    if (android) {
      document.body.classList.add('capacitor-android');
      console.log('[SafeAreaProvider] Android detected - white navigation bar enabled');
    } else {
      document.body.classList.remove('capacitor-android');
    }

    // Initialize StatusBar plugin on native platforms
    if (native) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Light }).catch(() => {}); // Light = black text
        StatusBar.setBackgroundColor({ color: '#FFFFFF' }).catch(() => {}); // Android only
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
        console.log('[SafeAreaProvider] StatusBar configured: black text, white background');
      }).catch(() => {
        console.warn('[SafeAreaProvider] @capacitor/status-bar not available');
      });
    }

    return () => {
      document.body.classList.remove('capacitor-native');
      document.body.classList.remove('capacitor-android');
    };
  }, []);

  return (
    <div className="safe-area-container">
      {/* Top safe area spacer - for status bar, notch, camera */}
      <div className="safe-area-top-spacer" aria-hidden="true" />
      
      {/* Main content area */}
      <div className="safe-area-content">
        {children}
      </div>
      
      {/* Bottom safe area spacer - always render for both iOS and Android */}
      <div 
        className={`safe-area-bottom-spacer${isAndroid ? ' android-bottom' : ''}`}
        aria-hidden="true"
      />
    </div>
  );
}
