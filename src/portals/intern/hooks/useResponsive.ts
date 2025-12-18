import { useState, useEffect } from 'react';

interface ResponsiveState {
  isMobile: boolean; // < 640px
  isTablet: boolean; // >= 640px && < 1024px
  isDesktop: boolean; // >= 1024px
  screenWidth: number;
}

/**
 * Hook to detect responsive breakpoints for the Intern Portal
 * Mobile: < 640px
 * Tablet: 640px - 1023px
 * Desktop: >= 1024px
 */
export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isTablet: false, isDesktop: true, screenWidth: 1024 };
    }
    const width = window.innerWidth;
    return {
      isMobile: width < 640,
      isTablet: width >= 640 && width < 1024,
      isDesktop: width >= 1024,
      screenWidth: width,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setState({
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
        screenWidth: width,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
};

/**
 * Responsive grid helper - returns appropriate column count or template
 */
export const getResponsiveGrid = (
  columns: { mobile: number; tablet: number; desktop: number },
  screenWidth: number,
  minItemWidth: number = 280
): string => {
  if (screenWidth < 640) {
    return columns.mobile === 1 
      ? '1fr' 
      : `repeat(${columns.mobile}, 1fr)`;
  }
  if (screenWidth < 1024) {
    return `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`;
  }
  return columns.desktop === -1 
    ? `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`
    : `repeat(${columns.desktop}, 1fr)`;
};

export default useResponsive;

