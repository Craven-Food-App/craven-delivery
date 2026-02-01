import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Haptics } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Enterprise-grade Time Wheel Picker Component
 * 
 * Features:
 * - Scroll-snap per notch with smooth inertial scrolling
 * - Haptic feedback per notch (Capacitor or fallback)
 * - High-contrast, readable design
 * - Tap to center and select
 * - Disabled time support
 * - Accessibility compliant
 */
export interface TimeWheelPickerProps {
  /** Current selected time value (e.g., "2:30 PM") */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Start time for range (e.g., "6:00 AM") */
  startTime: string;
  /** End time for range (e.g., "11:00 PM") */
  endTime: string;
  /** Minutes between each time option (default: 15) */
  stepMinutes?: number;
  /** Optional function to disable specific times */
  disabledTimes?: (time: string) => boolean;
  /** Height of the picker container in pixels (default: 220) */
  height?: number;
  /** Number of visible items (must be odd, default: 5) */
  visibleCount?: number;
}

/**
 * Parse time string (e.g., "2:30 PM") to minutes since midnight
 * Exported for testing
 */
export const parseTimeToMinutes = (timeStr: string): number => {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;
  if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
  if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60;
  return totalMinutes;
};

/**
 * Format minutes since midnight to time string (e.g., "2:30 PM")
 * Exported for testing
 */
export const formatMinutesToTime = (minutes: number): string => {
  const hours24 = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  return `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
};

/**
 * Generate time options from startTime to endTime at stepMinutes intervals
 * Exported for testing
 */
export const generateTimeOptions = (
  startTime: string,
  endTime: string,
  stepMinutes: number
): string[] => {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const options: string[] = [];
  
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += stepMinutes) {
    options.push(formatMinutesToTime(minutes));
  }
  
  return options;
};

/**
 * Trigger haptic feedback with fallback
 */
const triggerHapticFeedback = async (): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Use Capacitor Haptics on native platforms
      await Haptics.selectionChanged();
    } else if (navigator.vibrate) {
      // Fallback to Web Vibration API
      navigator.vibrate(5);
    }
  } catch (error) {
    // Silently fail if haptics unavailable
    console.debug('Haptics not available:', error);
  }
};

export const TimeWheelPicker: React.FC<TimeWheelPickerProps> = ({
  value,
  onChange,
  startTime,
  endTime,
  stepMinutes = 15,
  disabledTimes,
  height = 220,
  visibleCount = 5,
}) => {
  // Ensure visibleCount is odd
  const actualVisibleCount = visibleCount % 2 === 0 ? visibleCount + 1 : visibleCount;
  const itemHeight = 44; // Fixed row height for consistent snapping
  
  // Generate time options
  const timeOptions = useRef<string[]>(
    generateTimeOptions(startTime, endTime, stepMinutes)
  ).current;
  
  // Find initial index from value
  const getInitialIndex = useCallback(() => {
    const index = timeOptions.findIndex(opt => opt === value);
    return index >= 0 ? index : Math.floor(timeOptions.length / 2);
  }, [value, timeOptions]);
  
  const initialIndex = getInitialIndex();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [hoverIndex, setHoverIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);
  const lastHapticIndex = useRef<number>(initialIndex);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef<boolean>(false);
  
  // Calculate padding to center items
  const paddingTop = (actualVisibleCount - 1) / 2 * itemHeight;
  const paddingBottom = (actualVisibleCount - 1) / 2 * itemHeight;
  
  /**
   * Find the index closest to the center based on scroll position
   */
  const getCenterIndex = useCallback((): number => {
    if (!containerRef.current) return currentIndex;
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.offsetHeight;
    const centerY = scrollTop + containerHeight / 2;
    
    // Account for padding
    const adjustedY = centerY - paddingTop;
    const index = Math.round(adjustedY / itemHeight);
    
    return Math.max(0, Math.min(timeOptions.length - 1, index));
  }, [currentIndex, itemHeight, paddingTop, timeOptions.length]);
  
  /**
   * Scroll to a specific index
   */
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const targetScrollTop = index * itemHeight - (container.offsetHeight / 2) + (itemHeight / 2);
    
    container.scrollTo({
      top: targetScrollTop,
      behavior: smooth ? 'smooth' : 'instant',
    });
  }, [itemHeight]);
  
  /**
   * Handle scroll event - update hover index and trigger haptics
   */
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const newHoverIndex = getCenterIndex();
    
    // Update hover index for visual feedback
    if (newHoverIndex !== hoverIndex) {
      setHoverIndex(newHoverIndex);
      
      // Trigger haptic feedback when dragging and index changes
      if (isDragging && newHoverIndex !== lastHapticIndex.current) {
        triggerHapticFeedback();
        lastHapticIndex.current = newHoverIndex;
      }
    }
    
    // Debounce scroll end detection
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    isScrollingRef.current = true;
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      
      // Snap to nearest item
      const nearestIndex = getCenterIndex();
      const enabledIndex = findNearestEnabledIndex(nearestIndex);
      
      scrollToIndex(enabledIndex, true);
      setCurrentIndex(enabledIndex);
      setHoverIndex(enabledIndex);
      onChange(timeOptions[enabledIndex]);
    }, 100);
  }, [hoverIndex, isDragging, getCenterIndex, scrollToIndex, onChange, timeOptions]);
  
  /**
   * Find nearest enabled index (skip disabled times)
   */
  const findNearestEnabledIndex = useCallback((startIndex: number): number => {
    if (!disabledTimes) return startIndex;
    
    // Check if current index is enabled
    if (!disabledTimes(timeOptions[startIndex])) {
      return startIndex;
    }
    
    // Search for nearest enabled index
    const maxDistance = Math.max(startIndex, timeOptions.length - 1 - startIndex);
    for (let distance = 1; distance <= maxDistance; distance++) {
      const lowerIndex = startIndex - distance;
      const upperIndex = startIndex + distance;
      
      if (lowerIndex >= 0 && !disabledTimes(timeOptions[lowerIndex])) {
        return lowerIndex;
      }
      if (upperIndex < timeOptions.length && !disabledTimes(timeOptions[upperIndex])) {
        return upperIndex;
      }
    }
    
    return startIndex; // Fallback if all disabled
  }, [disabledTimes, timeOptions]);
  
  /**
   * Handle item click - scroll to center and select
   */
  const handleItemClick = useCallback((index: number) => {
    if (disabledTimes && disabledTimes(timeOptions[index])) {
      // If disabled, find nearest enabled
      const enabledIndex = findNearestEnabledIndex(index);
      scrollToIndex(enabledIndex, true);
      setCurrentIndex(enabledIndex);
      setHoverIndex(enabledIndex);
      onChange(timeOptions[enabledIndex]);
    } else {
      scrollToIndex(index, true);
      setCurrentIndex(index);
      setHoverIndex(index);
      onChange(timeOptions[index]);
      triggerHapticFeedback();
    }
  }, [disabledTimes, timeOptions, findNearestEnabledIndex, scrollToIndex, onChange]);
  
  /**
   * Handle touch/mouse start
   */
  const handlePointerDown = useCallback(() => {
    setIsDragging(true);
    lastHapticIndex.current = hoverIndex;
  }, [hoverIndex]);
  
  /**
   * Handle touch/mouse end
   */
  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Initialize scroll position when value changes externally
  useEffect(() => {
    const newIndex = timeOptions.findIndex(opt => opt === value);
    if (newIndex >= 0 && newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      setHoverIndex(newIndex);
      scrollToIndex(newIndex, false);
    }
  }, [value, timeOptions, currentIndex, scrollToIndex]);
  
  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);
  
  // Calculate visual properties for each item
  const getItemStyle = (index: number) => {
    const isSelected = index === currentIndex;
    const distance = Math.abs(index - currentIndex);
    const maxDistance = Math.floor(actualVisibleCount / 2);
    
    // Opacity: selected = 1.0, others fade but never below 0.55
    const opacity = isSelected 
      ? 1.0 
      : Math.max(0.55, 1.0 - (distance / maxDistance) * 0.3);
    
    // Font size: selected larger, others standard
    const fontSize = isSelected ? '20px' : '16px';
    const fontWeight = isSelected ? '600' : '400';
    
    // Color: selected darker, others readable
    const color = isSelected ? '#111' : '#444';
    
    const isDisabled = disabledTimes && disabledTimes(timeOptions[index]);
    
    return {
      opacity: isDisabled ? opacity * 0.4 : opacity,
      fontSize,
      fontWeight,
      color: isDisabled ? '#999' : color,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
    };
  };
  
  return (
    <>
      {/* Hide webkit scrollbar */}
      <style>{`
        .time-wheel-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div 
        className="relative w-full bg-white overflow-hidden"
        style={{ height: `${height}px` }}
      >
        {/* Center window highlight */}
      <div 
        className="absolute left-0 right-0 pointer-events-none z-10"
        style={{
          top: `${(height - itemHeight) / 2}px`,
          height: `${itemHeight}px`,
        }}
      >
        {/* Top hairline */}
        <div className="absolute top-0 left-4 right-4 h-px bg-gray-200" />
        {/* Bottom hairline */}
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gray-200" />
        {/* Optional subtle background highlight */}
        <div className="absolute inset-0 mx-4 rounded-lg bg-gray-50/50" />
      </div>
      
      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll scrollbar-hide time-wheel-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: `${paddingTop}px`,
          paddingBottom: `${paddingBottom}px`,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        
        {timeOptions.map((time, index) => {
          const isSelected = index === currentIndex;
          const isDisabled = disabledTimes && disabledTimes(time);
          
          return (
            <div
              key={`${time}-${index}`}
              onClick={() => !isDisabled && handleItemClick(index)}
              className="flex items-center justify-center transition-all duration-150"
              style={{
                height: `${itemHeight}px`,
                scrollSnapAlign: 'center',
                ...getItemStyle(index),
              }}
              role="option"
              aria-selected={isSelected}
              aria-disabled={isDisabled}
              aria-label={`${isSelected ? 'Selected: ' : ''}${time}${isDisabled ? ' (disabled)' : ''}`}
            >
              {time}
            </div>
          );
        })}
      </div>
      
      {/* Top fade mask */}
      <div 
        className="absolute top-0 left-0 right-0 pointer-events-none z-20"
        style={{
          height: `${paddingTop}px`,
          background: 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
        }}
      />
      
      {/* Bottom fade mask */}
      <div 
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-20"
        style={{
          height: `${paddingBottom}px`,
          background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
        }}
      />
      </div>
    </>
  );
};

