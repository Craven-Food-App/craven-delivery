import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';

interface DriveTimeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (minutes: number) => void;
}

// Generate time options starting from next 30-minute increment
const generateTimeOptions = () => {
  const now = new Date();
  const options = [];
  
  // Round up to next 30-minute increment
  const currentMinutes = now.getMinutes();
  const currentHour = now.getHours();
  
  let nextHour = currentHour;
  let nextMinute = 0;
  
  if (currentMinutes > 30) {
    nextHour += 1;
    nextMinute = 0;
  } else if (currentMinutes > 0) {
    nextMinute = 30;
  }
  
  // Create 48 time slots (24 hours worth of 30-minute increments)
  for (let i = 0; i < 48; i++) {
    const timeSlot = new Date(now);
    timeSlot.setHours(nextHour, nextMinute, 0, 0);
    
    const minutesFromNow = Math.round((timeSlot.getTime() - now.getTime()) / (1000 * 60));
    
    const timeString = timeSlot.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    options.push({
      label: timeString,
      minutes: minutesFromNow,
      endTime: timeSlot
    });
    
    nextMinute += 30;
    if (nextMinute >= 60) {
      nextMinute = 0;
      nextHour += 1;
      if (nextHour >= 24) {
        nextHour = 0;
      }
    }
  }
  
  return options;
};

// Pre-initialize audio context for zero-latency playback
let audioContext: AudioContext | null = null;
let clickBuffer: AudioBuffer | null = null;

const initAudio = () => {
  if (audioContext) return;
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a short click sound buffer (mechanical click)
    const sampleRate = audioContext.sampleRate;
    const duration = 0.008; // 8ms - very short click
    const bufferSize = Math.floor(sampleRate * duration);
    clickBuffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const channelData = clickBuffer.getChannelData(0);
    
    // Generate a sharp click waveform
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      // Sharp attack, quick decay - mimics mechanical click
      const envelope = Math.exp(-t * 40);
      // Mix of noise and low frequency thump for realistic click
      const noise = (Math.random() * 2 - 1) * 0.3;
      const thump = Math.sin(t * Math.PI * 8) * 0.7;
      channelData[i] = (noise + thump) * envelope;
    }
  } catch (e) {
    // Audio not supported
  }
};

const playClickSound = () => {
  if (!audioContext || !clickBuffer) {
    initAudio();
    if (!audioContext || !clickBuffer) return;
  }
  
  // Resume context if suspended (required for some browsers)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  
  source.buffer = clickBuffer;
  gainNode.gain.value = 0.4;
  
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.start(0);
};

export const DriveTimeSelector: React.FC<DriveTimeSelectorProps> = ({ open, onClose, onSelect }) => {
  const [timeOptions] = useState(() => generateTimeOptions());
  const [selectedIndex, setSelectedIndex] = useState(7);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 56;
  
  // Touch tracking
  const touchStartY = useRef<number>(0);
  const touchStartIndex = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const lastSoundIndex = useRef<number>(7);

  // Scroll to selected index
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.offsetHeight;
      const targetScrollTop = index * itemHeight - (containerHeight / 2) + (itemHeight / 2);
      containerRef.current.scrollTo({ 
        top: targetScrollTop, 
        behavior: smooth ? 'smooth' : 'instant' 
      });
    }
  }, [itemHeight]);

  // Initialize scroll position and audio when opening
  useEffect(() => {
    if (open) {
      // Pre-initialize audio for zero latency
      initAudio();
      
      if (containerRef.current) {
        setTimeout(() => {
          scrollToIndex(selectedIndex, false);
        }, 100);
      }
    }
  }, [open, selectedIndex, scrollToIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartIndex.current = selectedIndex;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const deltaY = touchStartY.current - e.touches[0].clientY;
    const indexDelta = Math.round(deltaY / itemHeight);
    const newIndex = Math.max(0, Math.min(timeOptions.length - 1, touchStartIndex.current + indexDelta));
    
    if (newIndex !== selectedIndex) {
      // Play click sound when moving to a new item
      if (newIndex !== lastSoundIndex.current) {
        playClickSound();
        lastSoundIndex.current = newIndex;
      }
      setSelectedIndex(newIndex);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    // Snap to the selected index
    scrollToIndex(selectedIndex);
  };

  const handleItemClick = (index: number) => {
    if (index !== selectedIndex) {
      playClickSound();
      lastSoundIndex.current = index;
    }
    setSelectedIndex(index);
    scrollToIndex(index);
  };

  const handleSelect = () => {
    onSelect(timeOptions[selectedIndex].minutes);
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="safe-area-top">
            <DrawerTitle>When do you want to stop driving?</DrawerTitle>
            <DrawerDescription>Select your end time.</DrawerDescription>
          </DrawerHeader>
          
          <div className="relative h-64 overflow-hidden">
            {/* Scrollable container with touch handling */}
            <div
              ref={containerRef}
              className="h-full overflow-y-auto scrollbar-hide relative"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ 
                paddingTop: '104px', 
                paddingBottom: '104px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {timeOptions.map((option, index) => {
                const isSelected = index === selectedIndex;
                const distance = Math.abs(index - selectedIndex);
                const opacity = Math.max(0.3, 1 - (distance * 0.25));
                
                return (
                  <div
                    key={option.minutes}
                    onClick={() => handleItemClick(index)}
                    className={`h-14 mx-4 flex items-center justify-center text-lg font-medium cursor-pointer transition-all duration-150 rounded-lg ${
                      isSelected 
                        ? 'text-orange-600 font-bold text-xl bg-orange-50 border border-orange-200' 
                        : 'text-gray-500'
                    }`}
                    style={{ opacity: isSelected ? 1 : opacity }}
                  >
                    {option.label}
                  </div>
                );
              })}
            </div>

            {/* Fade overlays */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white to-transparent pointer-events-none z-20" />
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none z-20" />
          </div>
          
          <DrawerFooter>
            <Button onClick={handleSelect} className="w-full h-12 text-base font-semibold bg-orange-500 hover:bg-orange-600">
              Continue
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default DriveTimeSelector;
