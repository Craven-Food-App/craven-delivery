import { useState, useEffect, useRef } from 'react';

export const useScrollDirection = (threshold: number = 10, hideDelay: number = 150) => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      
      // Always show at the top
      if (scrollY < 10) {
        setScrollDirection('up');
        setIsScrolling(false);
        setLastScrollY(scrollY);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
        return;
      }
      
      // Ignore small scrolls
      if (Math.abs(scrollY - lastScrollY) < threshold) {
        return;
      }
      
      const direction = scrollY > lastScrollY ? 'down' : 'up';
      setScrollDirection(direction);
      setIsScrolling(true);
      setLastScrollY(scrollY);
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Set timeout to detect when scrolling stops
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        // When scrolling stops, show nav if we're not at the bottom
        if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 50) {
          setScrollDirection('up');
        }
      }, hideDelay);
    };

    window.addEventListener('scroll', updateScrollDirection, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScrollDirection);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [lastScrollY, threshold, hideDelay]);

  return { scrollDirection, isScrolling };
};

