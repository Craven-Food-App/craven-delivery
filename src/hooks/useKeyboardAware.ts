import { useEffect, useState, useRef } from 'react';

interface KeyboardState {
  isOpen: boolean;
  height: number;
}

/**
 * Hook to detect keyboard state and adjust layout accordingly
 * Works on both iOS and Android
 */
export function useKeyboardAware() {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isOpen: false,
    height: 0,
  });
  const viewportHeightRef = useRef<number>(window.innerHeight);

  useEffect(() => {
    // Track initial viewport height
    viewportHeightRef.current = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = viewportHeightRef.current - currentHeight;

      // If viewport shrunk significantly (more than 150px), keyboard is likely open
      if (heightDiff > 150) {
        setKeyboardState({
          isOpen: true,
          height: heightDiff,
        });
      } else {
        setKeyboardState({
          isOpen: false,
          height: 0,
        });
      }
    };

    // Visual Viewport API (better for mobile keyboards)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    } else {
      // Fallback to window resize
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return keyboardState;
}

/**
 * Hook to scroll focused input into view when keyboard opens
 */
export function useScrollToInput() {
  const scrollToInput = (inputElement: HTMLElement | null) => {
    if (!inputElement) return;

    // Small delay to ensure keyboard animation has started
    setTimeout(() => {
      inputElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }, 100);
  };

  return { scrollToInput };
}

