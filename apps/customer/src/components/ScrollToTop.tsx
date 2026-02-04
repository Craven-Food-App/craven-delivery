import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Ensures that every page starts at the top when navigating
 * This component scrolls to top on every route change
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      // Scroll window to top
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      
      // Scroll document element to top (for some browsers)
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Handle MobileLayout main scroll container
      const mainContent = document.querySelector('main[style*="overflow"]');
      if (mainContent) {
        mainContent.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      
      // Handle any other scrollable containers with overflow
      const scrollableContainers = document.querySelectorAll('[style*="overflow-y: auto"], [style*="overflow-y: scroll"]');
      scrollableContainers.forEach((container) => {
        if (container.scrollTop > 0) {
          container.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
      });
    });
  }, [pathname]);

  return null;
}

