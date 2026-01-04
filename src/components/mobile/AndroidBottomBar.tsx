import React from 'react';

/**
 * Android-style bottom navigation bar placeholder.
 * Matches the height of Android's system navigation bar (48px).
 * Used to ensure content doesn't get cut off by the system nav bar.
 */
export const AndroidBottomBar: React.FC = () => {
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-black z-50" 
      style={{ height: '48px' }} 
    />
  );
};

export default AndroidBottomBar;

