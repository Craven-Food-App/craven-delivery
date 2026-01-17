/**
 * Scheduled Delivery Picker
 * Allows customers to schedule orders for future delivery
 * Competes with DoorDash scheduled orders feature
 */

import { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ScheduledDeliveryPickerProps {
  onScheduleChange: (scheduledTime: Date | null) => void;
}

export function ScheduledDeliveryPicker({ onScheduleChange }: ScheduledDeliveryPickerProps) {
  const [isScheduled, setIsScheduled] = useState(false);
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedTime, setSelectedTime] = useState('');

  const handleScheduleToggle = (checked: boolean) => {
    setIsScheduled(checked);
    if (!checked) {
      onScheduleChange(null);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    updateScheduledTime(date, selectedTime);
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    updateScheduledTime(selectedDate, time);
  };

  const updateScheduledTime = (date: string, time: string) => {
    if (!date || !time) return;

    const now = new Date();
    const scheduledDate = new Date();

    // Set date
    if (date === 'today') {
      // Keep today's date
    } else if (date === 'tomorrow') {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    // Set time
    const [hours, minutes] = time.split(':').map(Number);
    scheduledDate.setHours(hours, minutes, 0, 0);

    // Validate that it's in the future
    if (scheduledDate > now) {
      onScheduleChange(scheduledDate);
    }
  };

  // Generate time slots (every 15 minutes, 30min - 7 days in advance)
  const generateTimeSlots = () => {
    const slots: { value: string; label: string }[] = [];
    const now = new Date();
    const startHour = selectedDate === 'today' ? now.getHours() + 1 : 7; // Start from next hour today, or 7am for future
    const endHour = 23;

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const timeLabel = new Date(2000, 0, 1, hour, minute).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        slots.push({ value: timeValue, label: timeLabel });
      }
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Schedule Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-lg font-semibold">Schedule Delivery</Label>
            <p className="text-sm text-gray-600">Choose when you want your order delivered</p>
          </div>
          <Switch checked={isScheduled} onCheckedChange={handleScheduleToggle} />
        </div>

        {/* Date & Time Selectors */}
        {isScheduled && (
          <div className="space-y-3 pt-3 border-t">
            {/* Date Selection */}
            <div>
              <Label className="mb-2 block">Delivery Date</Label>
              <Select value={selectedDate} onValueChange={handleDateChange}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <SelectValue placeholder="Select date" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Selection */}
            <div>
              <Label className="mb-2 block">Delivery Time</Label>
              <Select value={selectedTime} onValueChange={handleTimeChange}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <SelectValue placeholder="Select time" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Confirmation Message */}
            {selectedDate && selectedTime && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✓ Your order will be delivered {selectedDate} at {
                    new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

