import React from 'react';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  fullHeight?: boolean;
  className?: string;
}

/**
 * Shared safe area wrapper for all Feeder app pages.
 * Applies consistent env(safe-area-inset-*) padding for iOS/Android.
 */
const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({ 
  children, 
  fullHeight = true,
  className = '' 
}) => (
  <div 
    className={className}
    style={{
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      minHeight: fullHeight ? '100dvh' : undefined,
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
    }}
  >
    {children}
  </div>
);

export default SafeAreaWrapper;
