import React, { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';
import { useLocation } from 'react-router-dom';

interface MobileLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

/**
 * Global Mobile Layout
 * - Ensures top safe area (status bar, notch, camera)
 * - Ensures bottom safe area (home indicator, nav buttons)
 * - Provides consistent spacing across all pages
 * - Responsive to any mobile screen size
 * - No background colors - transparent layout
 */
export function MobileLayout({ children, showBottomNav = true }: MobileLayoutProps) {
  const location = useLocation();
  const mainScrollRef = useRef<HTMLDivElement>(null);
  
  // Pages where we hide bottom navigation
  const hideNavPaths = [
    '/auth',
    '/checkout',
    '/driver',
    '/enhanced-onboarding',
    '/restaurant-dashboard',
    '/merchant',
    '/admin',
    '/ceo',
    '/cfo',
    '/coo',
    '/cto',
    '/cxo',
    '/hub',
    '/finance',
    '/hr-portal',
    '/marketing-portal',
  ];
  
  const shouldShowNav = showBottomNav && !hideNavPaths.some(path => 
    location.pathname.startsWith(path)
  );
  
  // Bottom navigation height including safe area
  const bottomNavHeight = shouldShowNav ? '64px' : '0px';
  
  // Scroll to top on route change
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname]);
  
  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        width: '100%',
        position: 'relative',
        // No top padding - let individual headers position themselves below safe area
        paddingTop: 0,
        // No bottom padding - handled by fixed nav
        paddingBottom: 0,
        overflow: 'hidden',
      }}
    >
      {/* Main scrollable content */}
      <Box
        ref={mainScrollRef}
        component="main"
        style={{
          flex: 1,
          width: '100%',
          overflowY: 'auto',
          overflowX: 'auto', // Allow horizontal scrolling for horizontal restaurant rows
          WebkitOverflowScrolling: 'touch',
          // Space for bottom navigation
          paddingBottom: shouldShowNav 
            ? `calc(${bottomNavHeight} + env(safe-area-inset-bottom, 0px))`
            : 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

