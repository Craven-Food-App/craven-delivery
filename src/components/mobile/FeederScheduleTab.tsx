import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { IconMenu2, IconMapPin, IconPencil, IconX, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import {
  Box,
  Stack,
  Text,
  Button,
  Group,
  ActionIcon,
  Loader,
  Paper,
  Title,
  Modal,
  TextInput,
  Grid,
} from '@mantine/core';
import { NextShiftCountdown } from '@/components/driver/NextShiftCountdown';

type FeederScheduleTabProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

type ScheduleRecord = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  is_recurring: boolean;
};

type SurgeZone = {
  id: string;
  zone_name: string;
  city?: string;
  surge_multiplier: number;
};

const FeederScheduleTab: React.FC<FeederScheduleTabProps> = ({
  onOpenMenu,
  onOpenNotifications
}) => {
  const today = useMemo(() => new Date(), []);
  const [activeDay, setActiveDay] = useState(0);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [surgeZones, setSurgeZones] = useState<SurgeZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeToNextShift, setTimeToNextShift] = useState<{ hours: number; minutes: number } | null>(null);
  const [nextShiftDateTime, setNextShiftDateTime] = useState<Date | null>(null);
  const [nextShiftScheduledAt, setNextShiftScheduledAt] = useState<Date | null>(null);
  const prevShiftTimeRef = useRef<number | null>(null);
  const [viewMode, setViewMode] = useState<'schedule' | 'available' | 'scheduled'>('available');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ zone: string; city: string; startTime: string; endTime: string; displayStart: string; displayEnd: string } | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState('09:00');
  const [selectedEndTime, setSelectedEndTime] = useState('17:00');
  const [userCity, setUserCity] = useState<string>('');

  const weekDays = useMemo(() => {
    const days = [];
    // Get Sunday of the current week
    const sunday = new Date(today);
    const dayOfWeek = sunday.getDay(); // 0 = Sunday, 1 = Monday, etc.
    sunday.setDate(today.getDate() - dayOfWeek); // Go back to Sunday
    sunday.setHours(0, 0, 0, 0);
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Generate 7 days starting from Sunday
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      days.push({
        day: dayNames[i], // Use index to ensure correct order
        date: date.getDate().toString().padStart(2, '0'),
        dayOfWeek: i, // 0 = Sunday, 1 = Monday, etc.
        fullDate: date
      });
    }
    return days;
  }, [today]);

  const fetchSchedules = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSchedules([]);
        return;
      }

      const { data, error } = await supabase
        .from('driver_schedules')
        .select('id, day_of_week, start_time, end_time, is_active, is_recurring')
        .eq('driver_id', user.id)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');

      if (error) {
        console.error('Error fetching schedules:', error);
        throw error;
      }
      
      const fetchedSchedules = data || [];
      console.log('📅 [Schedule] Fetched schedules:', fetchedSchedules.length);
      if (fetchedSchedules.length > 0) {
        console.log('📅 [Schedule] Schedule details:', fetchedSchedules.map(s => ({
          id: s.id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          is_active: s.is_active,
          is_recurring: s.is_recurring
        })));
      }
      
      // Immediately clear countdown if no schedules
      if (fetchedSchedules.length === 0) {
        console.log('📅 [Schedule] No schedules found, clearing countdown immediately');
        setTimeToNextShift(null);
        setNextShiftDateTime(null);
        setNextShiftScheduledAt(null);
        prevShiftTimeRef.current = null;
      }
      
      setSchedules(fetchedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      notifications.show({
        title: 'Failed to load schedule',
        message: '',
        color: 'red',
      });
    }
  }, []);

  const fetchUserCity = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to get city from drivers table first
      const { data: driverData } = await supabase
        .from('drivers')
        .select('city')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (driverData?.city) {
        setUserCity(driverData.city);
        return;
      }

      // Fallback: try to get from driver_profiles or use geolocation
      // For now, we'll use a generic fallback if no city is found
      setUserCity('');
    } catch (error) {
      console.error('Error fetching user city:', error);
      setUserCity('');
    }
  }, []);

  const fetchSurgeZones = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('driver_surge_zones')
        .select('id, zone_name, city, surge_multiplier')
        .eq('is_active', true)
        .order('surge_multiplier', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Ensure city has a default value - use user's city if available
      const zonesWithCity = (data || []).map(zone => ({
        ...zone,
        city: zone.city || userCity || '' // Use zone city, then user city, then empty
      }));
      
      setSurgeZones(zonesWithCity);
    } catch (error) {
      console.error('Error fetching surge zones:', error);
    }
  }, [userCity]);

  useEffect(() => {
    if (loading) {
      return;
    }

    // Strict check: if no schedules or empty array, clear everything
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      setTimeToNextShift(null);
      setNextShiftDateTime(null);
      setNextShiftScheduledAt(null);
      prevShiftTimeRef.current = null;
      return;
    }

    // Double-check: filter for active schedules only
    const activeSchedules = schedules.filter(s => s && s.is_active === true);
    if (activeSchedules.length === 0) {
      setTimeToNextShift(null);
      setNextShiftDateTime(null);
      setNextShiftScheduledAt(null);
      prevShiftTimeRef.current = null;
      return;
    }

    const calculateTimeToNextShift = () => {
      // Strict validation: ensure we have valid active schedules
      if (!schedules || !Array.isArray(schedules) || schedules.length === 0 || activeSchedules.length === 0) {
        setTimeToNextShift(null);
        setNextShiftDateTime(null);
        setNextShiftScheduledAt(null);
        prevShiftTimeRef.current = null;
        return;
      }

      // Get CURRENT time from feeder's device (precise to the millisecond)
      const now = new Date();
      const nowMs = now.getTime();

      const parseTime = (timeStr: string): { hour: number; minute: number; second: number } => {
        const parts = timeStr.split(':');
        return {
          hour: parseInt(parts[0], 10),
          minute: parseInt(parts[1] || '0', 10),
          second: parseInt(parts[2] || '0', 10)
        };
      };

      let nextShiftDateTime: Date | null = null;
      let minDiffMs = Infinity;

      // Look ahead 14 days for the next shift
      for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        // Create a new date for this day offset
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + dayOffset);
        checkDate.setHours(0, 0, 0, 0); // Reset to midnight
        const checkDay = checkDate.getDay(); // 0-6 (Sun-Sat)
        
        // Find all shifts scheduled for this day of the week
        const dayShifts = activeSchedules
          .filter(s => s.day_of_week === checkDay)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
        
        for (const shift of dayShifts) {
          const { hour: startHour, minute: startMin, second: startSec } = parseTime(shift.start_time);
          
          // Create precise shift time with year, month, day, hour, minute, second
          const shiftDateTime = new Date(checkDate);
          shiftDateTime.setHours(startHour, startMin, startSec, 0);
          const shiftMs = shiftDateTime.getTime();
          
          // Calculate PRECISE time difference from NOW
          const diffMs = shiftMs - nowMs;
          
          // Only consider future shifts
          if (diffMs > 0 && diffMs < minDiffMs) {
            console.log('📅 [Schedule] Found potential shift:', {
              dayOfWeek: checkDay,
              dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][checkDay],
              shiftTime: shiftDateTime.toISOString(),
              shiftTimeLocal: shiftDateTime.toLocaleString(),
              currentTime: now.toISOString(),
              currentTimeLocal: now.toLocaleString(),
              startTime: shift.start_time,
              endTime: shift.end_time,
              diffMs,
              diffHours: Math.floor(diffMs / (1000 * 60 * 60)),
              diffMinutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
              scheduleId: shift.id
            });
            minDiffMs = diffMs;
            nextShiftDateTime = shiftDateTime;
          }
        }
      }
      

      // Removed fallback logic - if we checked 14 days and found nothing, there are no future shifts
      // The fallback was creating false positives when no shifts exist

      // Only proceed if we found a valid future shift
      if (nextShiftDateTime) {
        // Recalculate from current time for precision
        const currentNow = new Date();
        const diffMs = nextShiftDateTime.getTime() - currentNow.getTime();
        
        console.log('📅 [Schedule] Selected next shift:', {
          shiftTime: nextShiftDateTime.toISOString(),
          shiftTimeLocal: nextShiftDateTime.toLocaleString(),
          currentTime: currentNow.toISOString(),
          currentTimeLocal: currentNow.toLocaleString(),
          diffMs,
          diffHours: Math.floor(diffMs / (1000 * 60 * 60)),
          diffMinutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
          activeSchedulesCount: activeSchedules.length
        });
        
        // Ensure the shift is actually in the future (at least 1 minute away)
        if (diffMs > 60000) { // More than 1 minute in the future
          // Calculate precise time remaining
          const totalSeconds = Math.floor(diffMs / 1000);
          const totalMinutes = Math.floor(totalSeconds / 60);
          const diffHours = Math.floor(totalMinutes / 60);
          const diffMinutes = totalMinutes % 60;
          
          console.log('✅ [Schedule] Setting countdown:', {
            hours: diffHours,
            minutes: diffMinutes,
            totalSeconds
          });
          
          setTimeToNextShift({ hours: diffHours, minutes: diffMinutes });
          
          // Check if this is a different shift than before
          const currentShiftTime = nextShiftDateTime.getTime();
          const isNewShift = prevShiftTimeRef.current === null || 
            prevShiftTimeRef.current !== currentShiftTime;
          
          if (isNewShift) {
            console.log('📅 [Schedule] New shift detected, setting scheduledAt');
            setNextShiftScheduledAt(new Date());
            prevShiftTimeRef.current = currentShiftTime;
          }
          
          setNextShiftDateTime(nextShiftDateTime);
        } else {
          // Shift is in the past or too close, clear everything
          console.log('⚠️ [Schedule] Shift is in past or too close, clearing');
          setTimeToNextShift(null);
          setNextShiftDateTime(null);
          setNextShiftScheduledAt(null);
          prevShiftTimeRef.current = null;
        }
      } else {
        // No shift found, clear everything
        console.log('📅 [Schedule] No future shift found after checking 14 days, clearing countdown');
        setTimeToNextShift(null);
        setNextShiftDateTime(null);
        setNextShiftScheduledAt(null);
        prevShiftTimeRef.current = null;
      }
    };

    if (activeSchedules.length > 0) {
      calculateTimeToNextShift();
      const interval = setInterval(calculateTimeToNextShift, 60000);
      return () => clearInterval(interval);
    } else {
      setTimeToNextShift(null);
      return () => {};
    }
  }, [schedules, loading]);

  useEffect(() => {
    setLoading(true);
    fetchUserCity().then(() => {
      Promise.all([fetchSchedules(), fetchSurgeZones()]).finally(() => {
        setLoading(false);
      });
    });

    const handleScheduleUpdate = () => {
      fetchSchedules();
    };

    window.addEventListener('scheduleUpdated', handleScheduleUpdate);
    return () => {
      window.removeEventListener('scheduleUpdated', handleScheduleUpdate);
    };
  }, [fetchSchedules, fetchSurgeZones, fetchUserCity]);

  useEffect(() => {
    if (!loading && (!schedules || schedules.length === 0)) {
      setTimeToNextShift(null);
    } else if (!loading && schedules.length > 0) {
      const activeSchedules = schedules.filter(s => s && s.is_active === true);
      if (activeSchedules.length === 0) {
        setTimeToNextShift(null);
      }
    }
  }, [loading, schedules]);

  const getShiftsForDay = (dayOfWeek: number) => {
    return schedules
      .filter(s => s.day_of_week === dayOfWeek)
      .map(shift => {
        const formatTime = (timeStr: string) => {
          const [hours, minutes] = timeStr.split(':');
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          return `${displayHour}:${minutes} ${ampm}`;
        };

        const zone = surgeZones.length > 0 ? surgeZones[0] : null;
        const location = zone?.zone_name || 'Downtown';
        const city = zone?.city || userCity || ''; // Use zone city, then user city

        return {
          time: `${formatTime(shift.start_time)} – ${formatTime(shift.end_time)}`,
          location: location,
          city: city,
          id: shift.id,
          scheduleRecord: shift
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const handleClearAllSchedules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifications.show({
          title: 'Please sign in',
          message: '',
          color: 'red',
        });
        return;
      }

      console.log('🗑️ [Schedule] Clearing all schedules for user:', user.id);

      const { error } = await supabase
        .from('driver_schedules')
        .delete()
        .eq('driver_id', user.id);

      if (error) throw error;

      console.log('✅ [Schedule] All schedules cleared');
      
      // Immediately clear state
      setSchedules([]);
      setTimeToNextShift(null);
      setNextShiftDateTime(null);
      setNextShiftScheduledAt(null);
      prevShiftTimeRef.current = null;

      notifications.show({
        title: 'All schedules cleared',
        message: '',
        color: 'green',
      });

      await fetchSchedules();
    } catch (error) {
      console.error('❌ [Schedule] Error clearing schedules:', error);
      notifications.show({
        title: 'Failed to clear schedules',
        message: '',
        color: 'red',
      });
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifications.show({
          title: 'Please sign in to delete shifts',
          message: '',
          color: 'red',
        });
        return;
      }

      const { error } = await supabase
        .from('driver_schedules')
        .delete()
        .eq('id', shiftId)
        .eq('driver_id', user.id);

      if (error) throw error;

      notifications.show({
        title: 'Shift removed successfully',
        message: '',
        color: 'green',
      });
      await fetchSchedules();
    } catch (error) {
      console.error('Error deleting shift:', error);
      notifications.show({
        title: 'Failed to remove shift',
        message: '',
        color: 'red',
      });
    }
  };

  const selectedDayShifts = getShiftsForDay(weekDays[activeDay]?.dayOfWeek || today.getDay());

  const handleStartShift = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifications.show({
          title: 'Please sign in to start a shift',
          message: '',
          color: 'red',
        });
        return;
      }

      const { error: profileError } = await supabase
        .from('driver_profiles')
        .update({
          status: 'online',
          is_available: true,
          last_location_update: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      await supabase
        .from('driver_sessions')
        .upsert({
          driver_id: user.id,
          is_online: true,
          last_activity: new Date().toISOString()
        }, {
          onConflict: 'driver_id'
        });

      notifications.show({
        title: 'Shift started! You are now online.',
        message: '',
        color: 'green',
      });
      window.dispatchEvent(new CustomEvent('driverStatusChange', { detail: { status: 'online' } }));
    } catch (error) {
      console.error('Error starting shift:', error);
      notifications.show({
        title: 'Failed to start shift',
        message: '',
        color: 'red',
      });
    }
  };

  // DoorDash-style predefined shift slots (3-hour blocks aligned to meal times)
  const SHIFT_SLOTS = useMemo(() => [
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
  ], []);

  const timeSlots = SHIFT_SLOTS;

  const getAvailableShifts = useMemo(() => {
    const selectedDayOfWeek = weekDays[activeDay]?.dayOfWeek || today.getDay();
    const availableShifts = [];
    
    // Get primary zone (first/highest priority surge zone) or use fallback
    const primaryZone = surgeZones.length > 0 ? surgeZones[0] : null;
    const defaultZone = primaryZone?.zone_name || 'Downtown';
    const defaultCity = primaryZone?.city || userCity || '';
    
    // Check each predefined slot for conflicts
    timeSlots.forEach(slot => {
      const conflicts = schedules.some(s => {
        if (s.day_of_week !== selectedDayOfWeek || !s.is_active) return false;
        
        // Normalize times for comparison
        const [sStartHour, sStartMin] = s.start_time.split(':').map(Number);
        const [sEndHour, sEndMin] = s.end_time.split(':').map(Number);
        const [slotStartHour, slotStartMin] = slot.startTime.split(':').map(Number);
        const [slotEndHour, slotEndMin] = slot.endTime.split(':').map(Number);
        
        const sStartMinutes = sStartHour * 60 + (sStartMin || 0);
        const sEndMinutes = sEndHour * 60 + (sEndMin || 0);
        const slotStartMinutes = slotStartHour * 60 + (slotStartMin || 0);
        const slotEndMinutes = slotEndHour * 60 + (slotEndMin || 0);
        
        // Check for overlap
        return (slotStartMinutes < sEndMinutes && slotEndMinutes > sStartMinutes);
      });
      
      if (!conflicts) {
        availableShifts.push({
          zone: defaultZone,
          city: defaultCity,
          startTime: slot.startTime,
          endTime: slot.endTime,
          displayStart: slot.displayStart,
          displayEnd: slot.displayEnd,
          slotId: slot.id
        });
      }
    });
    
    return availableShifts;
  }, [surgeZones, timeSlots, schedules, activeDay, weekDays, today, userCity]);

  const handleAvailable = () => {
    setViewMode('available');
  };

  const handleScheduled = () => {
    setViewMode('scheduled');
  };

  const handleEditTimeSlot = (slot: { zone: string; city: string; startTime: string; endTime: string; displayStart: string; displayEnd: string; slotId?: string }) => {
    setSelectedSlot(slot);
    setSelectedStartTime(slot.startTime);
    setSelectedEndTime(slot.endTime);
    setShowTimePicker(true);
  };

  const handleScheduleShift = async () => {
    if (!selectedSlot) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifications.show({
          title: 'Please sign in to schedule a shift',
          message: '',
          color: 'red',
        });
        return;
      }

      const selectedDayOfWeek = weekDays[activeDay]?.dayOfWeek || today.getDay();
      const startTimeSql = `${selectedStartTime}:00`;
      const endTimeSql = selectedEndTime === '24:00' ? '00:00:00' : `${selectedEndTime}:00`;

      const { error } = await supabase
        .from('driver_schedules')
        .insert({
          driver_id: user.id,
          day_of_week: selectedDayOfWeek,
          start_time: startTimeSql,
          end_time: endTimeSql,
          is_active: true,
          is_recurring: false
        });

      if (error) throw error;

      notifications.show({
        title: 'Shift scheduled successfully!',
        message: '',
        color: 'green',
      });
      setShowTimePicker(false);
      setSelectedSlot(null);
      await fetchSchedules();
      setViewMode('schedule');
    } catch (error) {
      console.error('Error scheduling shift:', error);
      notifications.show({
        title: 'Failed to schedule shift',
        message: '',
        color: 'red',
      });
    }
  };

  const formatTimeRemaining = () => {
    // Strict check: if no schedules or no active schedules, show no shifts
    const activeSchedules = schedules.filter(s => s && s.is_active === true);
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0 || activeSchedules.length === 0) {
      // Also clear state if it exists but schedules are empty
      if (timeToNextShift) {
        setTimeToNextShift(null);
        setNextShiftDateTime(null);
        setNextShiftScheduledAt(null);
        prevShiftTimeRef.current = null;
      }
      return (
        <Text c="white" size="sm" opacity={0.8}>No Shift Scheduled</Text>
      );
    }
    
    // If timeToNextShift is null, show no shifts
    if (!timeToNextShift) {
      return (
        <Text c="white" size="sm" opacity={0.8}>No Shift Scheduled</Text>
      );
    }
    
    const { hours, minutes } = timeToNextShift;
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      if (remainingHours === 0) {
        return (
          <Text c="white" style={{ fontSize: '2.5rem' }} fw={900}>
            {days}<Text span style={{ fontSize: '1.75rem' }} fw={700}>d</Text>
          </Text>
        );
      }
      return (
        <Text c="white" style={{ fontSize: '2.5rem' }} fw={900}>
          {days}<Text span style={{ fontSize: '1.75rem' }} fw={700}>d</Text> {remainingHours}<Text span style={{ fontSize: '1.75rem' }} fw={700}>h</Text>
        </Text>
      );
    }
    
    if (hours === 0) {
      return (
        <Text c="white" style={{ fontSize: '2.25rem' }} fw={900}>
          {minutes}<Text span style={{ fontSize: '1.5rem' }} fw={700}>m</Text>
        </Text>
      );
    }
    return (
      <Text c="white" style={{ fontSize: '2.5rem' }} fw={900}>
        {hours}<Text span style={{ fontSize: '1.75rem' }} fw={700}>h</Text> {minutes}<Text span style={{ fontSize: '1.5rem' }} fw={700}>m</Text>
      </Text>
    );
  };


  const handleNextShiftClick = () => {
    // Find the next shift and scroll to it or highlight it
    if (schedules.length === 0) {
      notifications.show({
        title: 'No shifts scheduled',
        message: 'Schedule a shift to see it here',
        color: 'blue',
      });
      setViewMode('available');
      return;
    }

    // Find the day with the next shift
    const activeSchedules = schedules.filter(s => s && s.is_active === true);
    if (activeSchedules.length === 0) {
      notifications.show({
        title: 'No active shifts',
        message: 'Schedule a shift to see it here',
        color: 'blue',
      });
      setViewMode('available');
      return;
    }

    // Calculate which day has the next shift
    const now = new Date();
    const currentDay = now.getDay();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    let nextShiftDay = -1;
    let minDiffMs = Infinity;

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + dayOffset);
      checkDate.setHours(0, 0, 0, 0);
      const checkDay = checkDate.getDay();
      
      const dayShifts = activeSchedules
        .filter(s => s.day_of_week === checkDay)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      
      for (const shift of dayShifts) {
        const [startHour, startMin] = shift.start_time.split(':').map(Number);
        const shiftDateTime = new Date(checkDate);
        shiftDateTime.setHours(startHour, startMin, 0, 0);
        
        const diffMs = shiftDateTime.getTime() - now.getTime();
        
        if (diffMs > 0 && diffMs < minDiffMs) {
          minDiffMs = diffMs;
          nextShiftDay = dayOffset;
        }
      }
    }

    if (nextShiftDay >= 0 && nextShiftDay < weekDays.length) {
      setActiveDay(nextShiftDay);
      setViewMode('schedule');
      notifications.show({
        title: 'Next shift highlighted',
        message: '',
        color: 'green',
      });
    } else {
      setViewMode('schedule');
    }
  };

  const highDemandZone = surgeZones.length > 0 
    ? { name: surgeZones[0].zone_name }
    : { name: 'Downtown' };

  if (loading) {
    return (
      <Box h="100vh" w="100%" style={{ 
        background: 'linear-gradient(to bottom, #dc2626 0%, #ea580c 15%, #f97316 25%, #fb923c 35%, #fdba74 45%, #fed7aa 55%, #ffedd5 65%, #fff7ed 75%, #ffffff 80%, #ffffff 100%)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Loader size="lg" color="orange" />
      </Box>
    );
  }

  return (
    <Box h="100vh" w="100%" style={{ 
      background: 'linear-gradient(to bottom, #dc2626 0%, #ea580c 15%, #f97316 25%, #fb923c 35%, #fdba74 45%, #fed7aa 55%, #ffedd5 65%, #fff7ed 75%, #ffffff 80%, #ffffff 100%)',
      display: 'flex', 
      flexDirection: 'column',
      overflowY: 'auto',
      paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))'
    }}>
      {/* Header - Level with hamburger menu */}
      <Group px="xl" pb="md" justify="space-between" align="center" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 43px)' }}>
        <ActionIcon
          onClick={() => {
            if (onOpenMenu) {
              onOpenMenu();
            } else {
              notifications.show({
                title: 'Menu coming soon.',
                message: '',
                color: 'blue',
              });
            }
          }}
          variant="subtle"
          color="white"
        >
          <IconMenu2 size={24} />
        </ActionIcon>
        <Title order={1} c="orange.3" fw={700} style={{ letterSpacing: '0.05em' }}>SCHEDULE</Title>
        <ActionIcon
          onClick={() => {
            window.location.href = '/mobile?tab=messages';
          }}
          variant="subtle"
          color="white"
        >
          <img src="/app-chat.png" alt="Messages" style={{ width: '28px', height: '28px' }} />
        </ActionIcon>
      </Group>

      {/* Container */}
      <Box px="xl">
        {/* Next Shift Row - Always show, with fallback when no shift */}
        <Box mb="md">
          <Group gap="md" mb="md">
            <Box
              onClick={handleNextShiftClick}
              style={{
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {(() => {
                // Only show countdown if we have valid future shift data
                const activeSchedules = schedules.filter(s => s && s.is_active === true);
                const hasValidShift = schedules && Array.isArray(schedules) && schedules.length > 0 && 
                                     activeSchedules.length > 0 && 
                                     timeToNextShift && 
                                     nextShiftDateTime && 
                                     nextShiftScheduledAt;
                
                // Double-check: ensure the shift is actually in the future
                if (hasValidShift) {
                  const now = new Date();
                  const shiftTime = new Date(nextShiftDateTime);
                  if (shiftTime.getTime() <= now.getTime()) {
                    // Shift is in the past, show fallback
                    return (
                      <Box style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text c="white" size="12px" fw={700} ta="center" style={{ lineHeight: 1.2 }}>
                          NEXT<br/>SHIFT
                        </Text>
                      </Box>
                    );
                  }
                  
                  // Valid future shift - show countdown
                  return (
                    <NextShiftCountdown
                      nextShiftTime={nextShiftDateTime}
                      scheduledAt={nextShiftScheduledAt}
                    />
                  );
                }
                
                // No valid shift - show fallback
                return (
                  <Box style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text c="white" size="12px" fw={700} ta="center" style={{ lineHeight: 1.2 }}>
                      NEXT<br/>SHIFT
                    </Text>
                  </Box>
                );
              })()}
            </Box>
            <Box style={{ flex: 1 }}>
              <Text c="white" size="lg" fw={600}>Time To Next Shift</Text>
              {formatTimeRemaining()}
            </Box>
          </Group>
        </Box>
        
        <Group gap="xs">
          <Button
            onClick={handleAvailable}
            flex={1}
            color="white"
            c="red.7"
            size="sm"
            radius="xl"
            fw={700}
          >
            Available
          </Button>
          <Button
            onClick={handleScheduled}
            flex={1}
            color="white"
            c="red.7"
            size="sm"
            radius="xl"
            fw={700}
          >
            Scheduled
          </Button>
          {schedules.length > 0 && (
            <Button
              onClick={handleClearAllSchedules}
              color="red"
              size="sm"
              radius="xl"
              fw={700}
            >
              Clear All
            </Button>
          )}
        </Group>

        {/* Zone Banner */}
        <Paper p="sm" radius="xl" bg="orange.0" mb="xl" shadow="md">
          <Text c="red.8" fw={700} size="md" ta="center">🔥 High Demand Zone: {highDemandZone.name}</Text>
        </Paper>

        {/* Week Strip - Cool Compact Design */}
        <Box 
          mb="xl" 
          px="xs"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden'
          }}
        >
          {weekDays.map((item, index) => {
            const isToday = item.fullDate.toDateString() === today.toDateString();
            const isSelected = activeDay === index;
            return (
              <Box
                key={index}
                onClick={() => {
                  setActiveDay(index);
                  if (viewMode === 'available' || viewMode === 'scheduled') {
                    // Keep current view mode
                  } else {
                    setViewMode('schedule');
                  }
                }}
                style={{
                  aspectRatio: '1',
                  minHeight: '64px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: isSelected ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
                  background: isSelected
                    ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                    : 'rgba(255, 255, 255, 0.15)',
                  border: isSelected 
                    ? '2px solid rgba(255, 255, 255, 0.4)' 
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: isSelected
                    ? '0 4px 12px rgba(220, 38, 38, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1)'
                    : '0 2px 4px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(8px)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Subtle glow effect for selected */}
                {isSelected && (
                  <Box
                    style={{
                      position: 'absolute',
                      top: '-50%',
                      left: '-50%',
                      width: '200%',
                      height: '200%',
                      background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
                      pointerEvents: 'none'
                    }}
                  />
                )}
                <Text 
                  size="xs" 
                  fw={700} 
                  c="white" 
                  style={{ 
                    lineHeight: 1, 
                    fontSize: '10px', 
                    letterSpacing: '0.5px',
                    opacity: isSelected ? 1 : 0.9,
                    marginBottom: '2px'
                  }}
                >
                  {item.day}
                </Text>
                <Text 
                  size="lg" 
                  fw={900} 
                  c="white" 
                  style={{ 
                    lineHeight: 1, 
                    fontSize: isSelected ? '20px' : '18px',
                    textShadow: isSelected ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none'
                  }}
                >
                  {item.date}
                </Text>
                {/* Today indicator dot */}
                {isToday && !isSelected && (
                  <Box
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: 'white',
                      opacity: 0.8
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        {/* Section Title */}
        {viewMode === 'schedule' && (
          <Title order={3} c="white" fw={700} mb="md">
            {weekDays[activeDay]?.day === weekDays[0]?.day ? "Today's Shifts" : `${weekDays[activeDay]?.day}'s Shifts`}
          </Title>
        )}

        {viewMode === 'available' && (
          <Group justify="space-between" mb="md">
            <Title order={3} c="black" fw={700}>
              Available Shifts - {weekDays[activeDay]?.day}
            </Title>
            <Button variant="subtle" color="dark" onClick={() => setViewMode('schedule')} size="sm" c="black">
              Back
            </Button>
          </Group>
        )}

        {viewMode === 'scheduled' && (
          <Group justify="space-between" mb="md">
            <Title order={3} c="black" fw={700}>
              Scheduled Shifts - {weekDays[activeDay]?.day}
            </Title>
            <Button variant="subtle" color="dark" onClick={() => setViewMode('schedule')} size="sm" c="black">
              Back
            </Button>
          </Group>
        )}
      </Box>

      {/* Scrollable Content Area */}
      <Box style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        {viewMode === 'schedule' && (
          <Stack gap={0}>
            {selectedDayShifts.length > 0 ? (
              selectedDayShifts.map((shift, index) => (
                <Paper key={shift.id || index} p="md" radius={0} style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e5e5' }}>
                  <Group justify="space-between" align="flex-start" px="md">
                    <Box style={{ flex: 1 }}>
                      <Text c="dark" fw={700} size="lg" mb="xs">{shift.time}</Text>
                      <Group gap="xs">
                        <IconMapPin size={16} color="var(--mantine-color-orange-6)" />
                        <Text c="orange.8" fw={600}>{shift.location}{shift.city ? `, ${shift.city}` : ''}</Text>
                      </Group>
                    </Box>
                    <ActionIcon
                      onClick={() => {
                        if (shift.id && confirm('Are you sure you want to remove this shift?')) {
                          handleDeleteShift(shift.id);
                        }
                      }}
                      color="red"
                      variant="subtle"
                      size="lg"
                    >
                      <IconTrash size={20} />
                    </ActionIcon>
                  </Group>
                </Paper>
              ))
            ) : (
              <Paper p="md" radius={0} style={{ backgroundColor: '#ffffff' }}>
                <Text c="orange.8" fw={600} ta="center">No shifts scheduled for this day</Text>
              </Paper>
            )}
          </Stack>
        )}

        {viewMode === 'available' && (
          <Stack gap={0}>
            {getAvailableShifts.length > 0 ? (
              getAvailableShifts.map((shift, index) => (
                <Paper key={index} p="md" radius={0} style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e5e5' }}>
                  <Group justify="space-between" px="md">
                    <Box style={{ flex: 1 }}>
                      <Text c="dark" fw={700} size="lg" mb="xs">
                        {shift.displayStart} – {shift.displayEnd}
                      </Text>
                      <Group gap="xs">
                        <IconMapPin size={16} color="var(--mantine-color-orange-6)" />
                        <Text c="orange.8" fw={600}>{shift.zone}{shift.city ? `, ${shift.city}` : ''}</Text>
                      </Group>
                    </Box>
                    <ActionIcon
                      onClick={() => handleEditTimeSlot(shift)}
                      color="white"
                      variant="filled"
                      size="lg"
                      radius="xl"
                    >
                      <IconPencil size={20} color="var(--mantine-color-red-7)" />
                    </ActionIcon>
                  </Group>
                </Paper>
              ))
            ) : (
              <Paper p="md" radius={0} style={{ backgroundColor: '#ffffff' }}>
                <Text c="orange.8" fw={600} ta="center">No available shifts for this day</Text>
              </Paper>
            )}
          </Stack>
        )}

        {viewMode === 'scheduled' && (
          <Stack gap={0}>
            {selectedDayShifts.length > 0 ? (
              selectedDayShifts.map((shift, index) => (
                <Paper key={shift.id || index} p="md" radius={0} style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e5e5' }}>
                  <Group justify="space-between" align="flex-start" px="md">
                    <Box style={{ flex: 1 }}>
                      <Text c="dark" fw={700} size="lg" mb="xs">{shift.time}</Text>
                      <Group gap="xs">
                        <IconMapPin size={16} color="var(--mantine-color-orange-6)" />
                        <Text c="orange.8" fw={600}>{shift.location}{shift.city ? `, ${shift.city}` : ''}</Text>
                      </Group>
                    </Box>
                    <ActionIcon
                      onClick={() => {
                        if (shift.id && confirm('Are you sure you want to remove this shift?')) {
                          handleDeleteShift(shift.id);
                        }
                      }}
                      color="red"
                      variant="subtle"
                      size="lg"
                    >
                      <IconTrash size={20} />
                    </ActionIcon>
                  </Group>
                </Paper>
              ))
            ) : (
              <Paper p="md" radius={0} style={{ backgroundColor: '#ffffff' }}>
                <Text c="orange.8" fw={600} ta="center">No shifts scheduled for this day</Text>
              </Paper>
            )}
          </Stack>
        )}
      </Box>

      {/* Time Picker Modal */}
      <Modal
        opened={showTimePicker}
        onClose={() => {
          setShowTimePicker(false);
          setSelectedSlot(null);
        }}
        title="Select Time Slot"
        radius="xl"
        centered
      >
        {selectedSlot && (
          <Stack gap="md">
            <Box>
              <Text size="sm" c="dimmed" mb="xs">Zone: <Text component="span" fw={600} c="dark">{selectedSlot.zone}</Text></Text>
              <Text size="sm" c="dimmed" mb="xs">City: <Text component="span" fw={600} c="dark">{selectedSlot.city}</Text></Text>
              <Text size="sm" c="dimmed" mb="md">Time Slot: {selectedSlot.displayStart} – {selectedSlot.displayEnd}</Text>
            </Box>

            <TextInput
              label="Start Time"
              type="time"
              value={selectedStartTime}
              onChange={(e) => setSelectedStartTime(e.target.value)}
              description="Predefined 3-hour shift slot"
            />

            <TextInput
              label="End Time"
              type="time"
              value={selectedEndTime}
              onChange={(e) => setSelectedEndTime(e.target.value)}
              description="Predefined 3-hour shift slot"
            />

            <Group gap="md" mt="md">
              <Button
                variant="light"
                color="gray"
                flex={1}
                onClick={() => {
                  setShowTimePicker(false);
                  setSelectedSlot(null);
                }}
              >
                Cancel
              </Button>
              <Button
                color="red.9"
                flex={1}
                onClick={handleScheduleShift}
              >
                Schedule Shift
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
};

export default FeederScheduleTab;
