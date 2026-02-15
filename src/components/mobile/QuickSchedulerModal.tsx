import React, { useState } from 'react';
import { X, Calendar, Clock, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface QuickSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS = ['Today', 'Tomorrow'];
const TIME_SLOTS = [
  { label: '6:00 AM', value: '06:00' },
  { label: '7:00 AM', value: '07:00' },
  { label: '8:00 AM', value: '08:00' },
  { label: '9:00 AM', value: '09:00' },
  { label: '10:00 AM', value: '10:00' },
  { label: '11:00 AM', value: '11:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '1:00 PM', value: '13:00' },
  { label: '2:00 PM', value: '14:00' },
  { label: '3:00 PM', value: '15:00' },
  { label: '4:00 PM', value: '16:00' },
  { label: '5:00 PM', value: '17:00' },
  { label: '6:00 PM', value: '18:00' },
  { label: '7:00 PM', value: '19:00' },
  { label: '8:00 PM', value: '20:00' },
  { label: '9:00 PM', value: '21:00' },
  { label: '10:00 PM', value: '22:00' },
  { label: '11:00 PM', value: '23:00' },
];

const DURATIONS = [
  { label: '2 hrs', value: 2 },
  { label: '4 hrs', value: 4 },
  { label: '6 hrs', value: 6 },
  { label: '8 hrs', value: 8 },
];

const QuickSchedulerModal: React.FC<QuickSchedulerModalProps> = ({ isOpen, onClose }) => {
  const [selectedDay, setSelectedDay] = useState<string>('Today');
  const [selectedStart, setSelectedStart] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(4);

  if (!isOpen) return null;

  // Filter out past time slots for "Today"
  const now = new Date();
  const currentHour = now.getHours();
  const availableSlots = selectedDay === 'Today'
    ? TIME_SLOTS.filter(s => parseInt(s.value) > currentHour)
    : TIME_SLOTS;

  const handleSchedule = () => {
    if (!selectedStart) {
      toast.error('Please select a start time');
      return;
    }
    const endHour = parseInt(selectedStart) + selectedDuration;
    const endLabel = endHour > 23 ? '11:59 PM' : TIME_SLOTS.find(s => parseInt(s.value) === endHour)?.label || `${endHour % 12 || 12}:00 ${endHour >= 12 ? 'PM' : 'AM'}`;
    const startLabel = TIME_SLOTS.find(s => s.value === selectedStart)?.label || selectedStart;
    toast.success(`Shift scheduled: ${selectedDay} ${startLabel} – ${endLabel}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal Sheet */}
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">Quick Schedule</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Day Selector */}
        <div className="px-5 pb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Day</p>
          <div className="flex gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => { setSelectedDay(day); setSelectedStart(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedDay === day
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Start Time */}
        <div className="px-5 pb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Start Time</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {availableSlots.map((slot) => (
              <button
                key={slot.value}
                onClick={() => setSelectedStart(slot.value)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedStart === slot.value
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="px-5 pb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Duration</p>
          <div className="flex gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setSelectedDuration(d.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedDuration === d.value
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Button */}
        <div className="px-5">
          <Button
            onClick={handleSchedule}
            disabled={!selectedStart}
            className="w-full h-12 rounded-2xl text-base font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg disabled:opacity-50"
          >
            <Check className="h-5 w-5 mr-2" />
            Schedule Shift
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickSchedulerModal;
