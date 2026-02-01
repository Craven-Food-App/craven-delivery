import React, { useState, useEffect } from 'react';
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
import { TimeWheelPicker } from './TimeWheelPicker';

export interface EndTimePickerSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when sheet closes */
  onClose: () => void;
  /** Callback when Continue is clicked with selected time */
  onContinue: (time: string) => void;
  /** Initial selected time (optional) */
  initialTime?: string;
}

/**
 * EndTimePickerSheet - Demo screen matching the screenshot layout
 * 
 * Features:
 * - Title: "When do you want to stop driving?"
 * - Subtitle: "Select your end time."
 * - TimeWheelPicker in center
 * - Continue button (brand orange) and Cancel (outline) below
 */
export const EndTimePickerSheet: React.FC<EndTimePickerSheetProps> = ({
  open,
  onClose,
  onContinue,
  initialTime,
}) => {
  // Generate default time range: next 30-min increment to 12 hours ahead (same day range)
  const getDefaultTimeRange = () => {
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const currentHour = now.getHours();
    
    // Round up to next 30-minute increment
    let nextHour = currentHour;
    let nextMinute = 0;
    
    if (currentMinutes > 30) {
      nextHour += 1;
      nextMinute = 0;
    } else if (currentMinutes > 0) {
      nextMinute = 30;
    }
    
    // Handle hour overflow
    if (nextHour >= 24) {
      nextHour = 0;
    }
    
    // Start time: next 30-min increment
    const startTime = new Date(now);
    startTime.setHours(nextHour, nextMinute, 0, 0);
    
    // End time: 12 hours ahead (ensure it stays within the same day for display)
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 12);
    
    // Cap at 11:30 PM to avoid midnight crossover issues
    if (endTime.getHours() < startTime.getHours() || endTime.getDate() !== startTime.getDate()) {
      endTime.setHours(23, 30, 0, 0);
    }
    
    return {
      start: startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      end: endTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      default: initialTime || startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };
  
  const timeRange = getDefaultTimeRange();
  const [selectedTime, setSelectedTime] = useState<string>(timeRange.default);
  
  // Update selected time when initialTime changes
  useEffect(() => {
    if (initialTime) {
      setSelectedTime(initialTime);
    }
  }, [initialTime]);
  
  // Reset to default when sheet opens
  useEffect(() => {
    if (open) {
      const range = getDefaultTimeRange();
      setSelectedTime(range.default);
    }
  }, [open]);
  
  const handleContinue = () => {
    onContinue(selectedTime);
    onClose();
  };
  
  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="safe-area-top">
            <DrawerTitle className="text-xl font-semibold">
              When do you want to stop driving?
            </DrawerTitle>
            <DrawerDescription className="text-sm text-gray-500">
              Select your end time.
            </DrawerDescription>
          </DrawerHeader>
          
          {/* TimeWheelPicker */}
          <div className="px-4 py-6">
            {open && (
              <TimeWheelPicker
                value={selectedTime}
                onChange={setSelectedTime}
                startTime={timeRange.start}
                endTime={timeRange.end}
                stepMinutes={30}
                height={220}
                visibleCount={5}
              />
            )}
          </div>
          
          <DrawerFooter className="gap-3">
            <Button 
              onClick={handleContinue} 
              className="w-full h-12 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white"
            >
              Continue
            </Button>
            <DrawerClose asChild>
              <Button 
                variant="outline" 
                className="w-full h-12 text-base font-medium border-gray-300"
              >
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default EndTimePickerSheet;

