import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Check, Menu, Bell, Filter, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type CravenDriverScheduleProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

type ScheduleRecord = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isRecurring: boolean;
};

type ScheduleMap = Record<string, ScheduleRecord>;

const SHIFT_SLOTS = [
  { id: 'slot-0', startTime: '06:00', endTime: '09:00', displayStart: '6:00 AM', displayEnd: '9:00 AM' },
  { id: 'slot-1', startTime: '09:00', endTime: '12:00', displayStart: '9:00 AM', displayEnd: '12:00 PM' },
  { id: 'slot-2', startTime: '10:00', endTime: '13:00', displayStart: '10:00 AM', displayEnd: '1:00 PM' },
  { id: 'slot-3', startTime: '12:00', endTime: '15:00', displayStart: '12:00 PM', displayEnd: '3:00 PM' },
  { id: 'slot-4', startTime: '14:00', endTime: '17:00', displayStart: '2:00 PM', displayEnd: '5:00 PM' },
  { id: 'slot-5', startTime: '15:00', endTime: '18:00', displayStart: '3:00 PM', displayEnd: '6:00 PM' },
  { id: 'slot-6', startTime: '17:30', endTime: '20:00', displayStart: '5:30 PM', displayEnd: '8:00 PM' },
  { id: 'slot-7', startTime: '18:00', endTime: '21:00', displayStart: '6:00 PM', displayEnd: '9:00 PM' },
  { id: 'slot-8', startTime: '20:30', endTime: '23:00', displayStart: '8:30 PM', displayEnd: '11:00 PM' },
  { id: 'slot-9', startTime: '21:00', endTime: '24:00', displayStart: '9:00 PM', displayEnd: '12:00 AM' }
];

type SlotId = typeof SHIFT_SLOTS[number]['id'];

const getScheduleKey = (dayOfWeek: number, startTime: string, endTime: string) =>
  `${dayOfWeek}-${startTime}-${endTime}`;

const normalizeTime = (time: string) => time.slice(0, 5);

const CravenDriverSchedule: React.FC<CravenDriverScheduleProps> = ({
  onOpenMenu,
  onOpenNotifications
}) => {
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [scheduleMap, setScheduleMap] = useState<ScheduleMap>({});
  const [loading, setLoading] = useState(true);
  const [processingShiftId, setProcessingShiftId] = useState<string | null>(null);
  const [authWarningShown, setAuthWarningShown] = useState(false);

  const today = useMemo(() => new Date(), []);

  const dates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() + i);
      return date;
    });
  }, [today]);

  const selectedDate = dates[selectedDateIndex] ?? today;
  const selectedDayOfWeek = selectedDate.getDay();

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        if (!authWarningShown) {
          toast.error('Please sign in to manage your schedule.');
          setAuthWarningShown(true);
        }
        setScheduleMap({});
        return;
      }

      const { data, error } = await supabase
        .from('driver_schedules')
        .select('id, day_of_week, start_time, end_time, is_active, is_recurring')
        .eq('driver_id', user.id);

      if (error) {
        throw error;
      }

      if (!data) {
        setScheduleMap({});
        return;
      }

      const nextMap: ScheduleMap = {};
      data.forEach((record) => {
        const startTime = normalizeTime(record.start_time);
        const endTime = normalizeTime(record.end_time === '00:00:00' ? '24:00:00' : record.end_time);
        const key = getScheduleKey(record.day_of_week, startTime, endTime);

        nextMap[key] = {
          id: record.id,
          dayOfWeek: record.day_of_week,
          startTime,
          endTime,
          isActive: record.is_active,
          isRecurring: record.is_recurring
        };
      });

      setScheduleMap(nextMap);
    } catch (error) {
      console.error('Error fetching schedule', error);
      toast.error('Unable to load your schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [authWarningShown]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const selectedShiftIds = useMemo(() => {
    return SHIFT_SLOTS.filter((slot) => {
      const key = getScheduleKey(selectedDayOfWeek, slot.startTime, slot.endTime);
      return scheduleMap[key]?.isActive;
    }).map((slot) => slot.id);
  }, [scheduleMap, selectedDayOfWeek]);

  const toggleShift = useCallback(async (shiftId: SlotId) => {
    const slot = SHIFT_SLOTS.find((s) => s.id === shiftId);
    if (!slot) {
      return;
    }

    try {
      setProcessingShiftId(shiftId);

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Please sign in to manage your schedule.');
        return;
      }

      const key = getScheduleKey(selectedDayOfWeek, slot.startTime, slot.endTime);
      const existingRecord = scheduleMap[key];
      const startTimeSql = `${slot.startTime}:00`;
      const endTimeSql = slot.endTime === '24:00' ? '00:00:00' : `${slot.endTime}:00`;

      const isCurrentlySelected = selectedShiftIds.includes(shiftId);

      if (isCurrentlySelected && existingRecord) {
        const { error } = await supabase
          .from('driver_schedules')
          .update({ is_active: false })
          .eq('id', existingRecord.id);

        if (error) {
          throw error;
        }

        setScheduleMap((prev) => ({
          ...prev,
          [key]: {
            ...existingRecord,
            isActive: false
          }
        }));

        toast.success('Shift removed from your schedule.');
      } else if (existingRecord) {
        const { error } = await supabase
          .from('driver_schedules')
          .update({ is_active: true })
          .eq('id', existingRecord.id);

        if (error) {
          throw error;
        }

        setScheduleMap((prev) => ({
          ...prev,
          [key]: {
            ...existingRecord,
            isActive: true
          }
        }));

        toast.success('Shift reactivated.');
      } else {
        const { data, error } = await supabase
          .from('driver_schedules')
          .insert({
            driver_id: user.id,
            day_of_week: selectedDayOfWeek,
            start_time: startTimeSql,
            end_time: endTimeSql,
            is_active: true,
            is_recurring: false
          })
          .select('id, day_of_week, start_time, end_time, is_active, is_recurring')
          .maybeSingle();

        if (error) {
          throw error;
        }

        const startTime = normalizeTime(data.start_time);
        const endTime = normalizeTime(data.end_time === '00:00:00' ? '24:00:00' : data.end_time);
        const newKey = getScheduleKey(data.day_of_week, startTime, endTime);

        setScheduleMap((prev) => ({
          ...prev,
          [newKey]: {
            id: data.id,
            dayOfWeek: data.day_of_week,
            startTime,
            endTime,
            isActive: data.is_active,
            isRecurring: data.is_recurring
          }
        }));

        toast.success('Shift added to your schedule.');
      }
    } catch (error) {
      console.error('Error updating shift', error);
      toast.error('Unable to update shift. Please try again.');
    } finally {
      setProcessingShiftId(null);
    }
  }, [scheduleMap, selectedDayOfWeek, selectedShiftIds]);

  const handleAddRecommendedShift = useCallback(async () => {
    const nextSlot = SHIFT_SLOTS.find((slot) => {
      const key = getScheduleKey(selectedDayOfWeek, slot.startTime, slot.endTime);
      return !scheduleMap[key]?.isActive;
    });

    if (!nextSlot) {
      toast.success('All available shifts are already scheduled for this day.');
      return;
    }

    await toggleShift(nextSlot.id);
  }, [scheduleMap, selectedDayOfWeek, toggleShift]);

  const handleFilterClick = useCallback(() => {
    toast.info('Filter options coming soon.');
  }, []);

  const formatDate = useCallback(
    (date: Date) => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return {
        day: days[date.getDay()].substring(0, 2),
        date: date.getDate(),
        isToday: date.toDateString() === today.toDateString()
      };
    },
    [today]
  );

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4" />
        <p className="text-sm text-gray-600">Loading your schedule…</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <div className="bg-white">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => {
                if (onOpenMenu) {
                  onOpenMenu();
                } else {
                  toast.info('Menu coming soon.');
                }
              }}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow flex items-center justify-center hover:bg-white transition"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (onOpenNotifications) {
                  onOpenNotifications();
                } else {
                  toast.info('Notifications coming soon.');
                }
              }}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow flex items-center justify-center hover:bg-white transition"
            >
              <Bell className="w-6 h-6 text-gray-700" />
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
        </div>
      </div>

      <div className="px-5 py-6 flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 gap-2 mb-6 flex-shrink-0">
          {dates.map((date, idx) => {
            const { day, date: dateNum } = formatDate(date);
            const isSelected = selectedDateIndex === idx;
            return (
              <button
                key={`${date.toISOString()}-${idx}`}
                onClick={() => setSelectedDateIndex(idx)}
                className="flex flex-col items-center justify-center"
              >
                <span className="text-sm font-medium text-gray-900 mb-2">{day}</span>
                <div
                  className={`w-12 h-12 flex items-center justify-center rounded-full text-lg font-bold transition-all ${
                    isSelected ? 'bg-orange-500 text-white' : 'text-gray-900'
                  }`}
                >
                  {dateNum}
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="flex-1 overflow-y-auto space-y-3 pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
            .overflow-y-auto::-webkit-scrollbar {
              display: none;
            }
          `
            }}
          />

          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Shifts</h2>
                <p className="text-sm text-gray-500">Tap a slot to add or remove it from your schedule.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleFilterClick}>
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
                <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700 text-white" onClick={handleAddRecommendedShift} disabled={processingShiftId !== null}>
                  <Plus className="h-4 w-4" />
                  Add Shift
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {SHIFT_SLOTS.map((shift) => {
                const key = getScheduleKey(selectedDayOfWeek, shift.startTime, shift.endTime);
                const isSelected = selectedShiftIds.includes(shift.id);
                const record = scheduleMap[key];
                const isConfirmed = Boolean(record?.isRecurring);
                const isProcessing = processingShiftId === shift.id;

                return (
                  <button
                    key={shift.id}
                    onClick={() => toggleShift(shift.id)}
                    disabled={isProcessing}
                    className={`w-full px-6 py-5 rounded-2xl transition-all text-left ${
                      isSelected ? 'bg-orange-500 shadow-lg' : 'bg-white border border-gray-200'
                    } ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {shift.displayStart}
                      </span>
                      <span className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {shift.displayEnd}
                      </span>
                    </div>
                    {(isConfirmed || isSelected) && (
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            isSelected ? 'bg-white' : 'bg-green-500'
                          }`}
                        >
                          <Check
                            className={`w-3 h-3 ${isSelected ? 'text-orange-500' : 'text-white'}`}
                          />
                        </div>
                        <span
                          className={`text-base font-semibold ${
                            isSelected ? 'text-white' : 'text-green-600'
                          }`}
                        >
                          {isConfirmed ? 'Confirmed' : isSelected ? 'Scheduled' : 'Active'}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CravenDriverSchedule;