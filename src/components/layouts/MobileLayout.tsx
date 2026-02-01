import React from 'react';

interface MobileLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
  headerHeight?: string; // Optional header height for pages with fixed headers
}

/**
 * Global Mobile Layout for Driver App
 * - Ensures top safe area (status bar, notch, camera)
 * - Ensures bottom safe area (home indicator, nav buttons)
 * - Provides consistent spacing across all pages
 * - Responsive to any mobile screen size
 * - No hardcoded heights - all constraint-driven
 */
export function MobileLayout({ 
  children, 
  showBottomNav = false,
  headerHeight 
}: MobileLayoutProps) {
  // Calculate bottom padding based on navigation and safe area
  const bottomPadding = showBottomNav 
    ? `calc(64px + env(safe-area-inset-bottom, 0px))`
    : 'env(safe-area-inset-bottom, 0px)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh', // Use dvh (dynamic viewport height) instead of vh
        width: '100%',
        position: 'relative',
        // Top safe area for status bar, notch, camera
        paddingTop: headerHeight 
          ? `calc(${headerHeight} + env(safe-area-inset-top, 0px))`
          : 'env(safe-area-inset-top, 0px)',
        // Bottom safe area
        paddingBottom: bottomPadding,
        overflow: 'hidden',
      }}
    >
      {/* Main scrollable content */}
      <main
        style={{
          flex: 1,
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          // Additional bottom spacing if needed
          paddingBottom: showBottomNav ? 0 : 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {children}
      </main>
    </div>
  );
}

