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

  useEffect(() => {
    // Detect if running in Capacitor native app
    const native = Capacitor.isNativePlatform();
    setIsNative(native);

    // Add class to body for CSS targeting
    if (native) {
      document.body.classList.add('capacitor-native');
    } else {
      document.body.classList.remove('capacitor-native');
    }

    // Cleanup
    return () => {
      document.body.classList.remove('capacitor-native');
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
      
      {/* Bottom safe area spacer - for home indicator, navigation bar */}
      <div className="safe-area-bottom-spacer" aria-hidden="true" />
    </div>
  );
}

