import React, { useRef, useState, useCallback } from 'react';

interface SwipeToDeleteProps {
  children: React.ReactNode;
  onDelete: () => void;
  /** Threshold in px to trigger delete (default: 80) */
  threshold?: number;
}

/**
 * Wraps a list item to enable swipe-left-to-delete gesture.
 * Reveals a red "Delete" zone behind the content as the user swipes.
 * If the swipe exceeds the threshold the item animates out and onDelete fires.
 */
export function SwipeToDelete({ children, onDelete, threshold = 80 }: SwipeToDeleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);
  const currentXRef = useRef(0);
  const [translateX, setTranslateX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isDeleting) return;
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    setIsSwiping(false);
  }, [isDeleting, translateX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null || isDeleting) return;
    const diff = e.touches[0].clientX - startXRef.current;
    // Only allow swiping left (negative direction)
    const newTranslate = Math.min(0, currentXRef.current + diff);
    // Cap the swipe at 150px
    const capped = Math.max(-150, newTranslate);
    setTranslateX(capped);
    if (Math.abs(diff) > 10) {
      setIsSwiping(true);
    }
  }, [isDeleting]);

  const handleTouchEnd = useCallback(() => {
    if (startXRef.current === null || isDeleting) return;
    startXRef.current = null;

    if (Math.abs(translateX) >= threshold) {
      // Animate out fully and delete
      setIsDeleting(true);
      setTranslateX(-window.innerWidth);
      setTimeout(() => {
        onDelete();
      }, 250);
    } else {
      // Snap back
      setTranslateX(0);
    }
    // Delay resetting isSwiping to prevent click events during swipe
    setTimeout(() => setIsSwiping(false), 50);
  }, [translateX, threshold, onDelete, isDeleting]);

  // Mouse support for desktop testing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isDeleting) return;
    startXRef.current = e.clientX;
    currentXRef.current = translateX;
    setIsSwiping(false);

    const handleMouseMove = (ev: MouseEvent) => {
      if (startXRef.current === null) return;
      const diff = ev.clientX - startXRef.current;
      const newTranslate = Math.min(0, currentXRef.current + diff);
      const capped = Math.max(-150, newTranslate);
      setTranslateX(capped);
      if (Math.abs(diff) > 10) {
        setIsSwiping(true);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (startXRef.current === null) return;
      startXRef.current = null;

      if (Math.abs(translateX) >= threshold) {
        setIsDeleting(true);
        setTranslateX(-window.innerWidth);
        setTimeout(() => onDelete(), 250);
      } else {
        setTranslateX(0);
      }
      setTimeout(() => setIsSwiping(false), 50);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isDeleting, translateX, threshold, onDelete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        maxHeight: isDeleting ? '0px' : '200px',
        opacity: isDeleting ? 0 : 1,
        transition: isDeleting
          ? 'max-height 250ms ease-out, opacity 200ms ease-out'
          : 'none',
      }}
    >
      {/* Red delete background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '150px',
          background: 'linear-gradient(90deg, #ef4444, #dc2626)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 600,
          fontSize: '14px',
          gap: '6px',
          borderRadius: '8px',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
        Delete
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: startXRef.current !== null ? 'none' : 'transform 200ms ease-out',
          position: 'relative',
          zIndex: 1,
          backgroundColor: 'white',
          cursor: 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onClick={(e) => {
          // Prevent click propagation if user was swiping
          if (isSwiping) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}















