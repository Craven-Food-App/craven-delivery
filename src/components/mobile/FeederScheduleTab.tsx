import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  RingProgress,
} from '@mantine/core';

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
  const [viewMode, setViewMode] = useState<'schedule' | 'available' | 'scheduled'>('available');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ zone: string; city: string; startTime: string; endTime: string; displayStart: string; displayEnd: string } | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState('09:00');
  const [selectedEndTime, setSelectedEndTime] = useState('17:00');

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
      setSchedules(fetchedSchedules);
      
      if (fetchedSchedules.length === 0) {
        setTimeToNextShift(null);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      notifications.show({
        title: 'Failed to load schedule',
        message: '',
        color: 'red',
      });
    }
  }, []);

  const fetchSurgeZones = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('driver_surge_zones')
        .select('id, zone_name, surge_multiplier')
        .eq('is_active', true)
        .order('surge_multiplier', { ascending: false })
        .limit(1);

      if (error) throw error;
      setSurgeZones(data || []);
    } catch (error) {
      console.error('Error fetching surge zones:', error);
    }
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      setTimeToNextShift(null);
      return;
    }

    const activeSchedules = schedules.filter(s => s && s.is_active === true);
    if (activeSchedules.length === 0) {
      setTimeToNextShift(null);
      return;
    }

    const calculateTimeToNextShift = () => {
      if (!schedules || schedules.length === 0 || activeSchedules.length === 0) {
        setTimeToNextShift(null);
        return;
      }

      const now = new Date();
      const currentDay = now.getDay();
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

      const parseTime = (timeStr: string): { hour: number; minute: number } => {
        const parts = timeStr.split(':');
        return {
          hour: parseInt(parts[0], 10),
          minute: parseInt(parts[1] || '0', 10)
        };
      };

      let nextShiftDateTime: Date | null = null;
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
          const { hour: startHour, minute: startMin } = parseTime(shift.start_time);
          const shiftDateTime = new Date(checkDate);
          shiftDateTime.setHours(startHour, startMin, 0, 0);
          
          const diffMs = shiftDateTime.getTime() - now.getTime();
          
          if (diffMs > 0 && diffMs < minDiffMs) {
            minDiffMs = diffMs;
            nextShiftDateTime = shiftDateTime;
          }
        }
      }

      if (!nextShiftDateTime && activeSchedules.length > 0) {
        const sortedSchedules = [...activeSchedules].sort((a, b) => {
          if (a.day_of_week !== b.day_of_week) {
            return a.day_of_week - b.day_of_week;
          }
          return a.start_time.localeCompare(b.start_time);
        });
        
        if (sortedSchedules.length > 0) {
          const earliestShift = sortedSchedules[0];
          const { hour: startHour, minute: startMin } = parseTime(earliestShift.start_time);
          nextShiftDateTime = new Date(now);
          
          let daysUntil = (earliestShift.day_of_week - currentDay + 7) % 7;
          if (daysUntil === 0) {
            const shiftTimeMinutes = startHour * 60 + startMin;
            if (shiftTimeMinutes <= currentTimeMinutes) {
              daysUntil = 7;
            }
          }
          
          nextShiftDateTime.setDate(now.getDate() + daysUntil);
          nextShiftDateTime.setHours(startHour, startMin, 0, 0);
        }
      }

      if (nextShiftDateTime) {
        const diffMs = nextShiftDateTime.getTime() - now.getTime();
        
        if (diffMs > 0) {
          const totalMinutes = Math.floor(diffMs / (1000 * 60));
          const diffHours = Math.floor(totalMinutes / 60);
          const diffMinutes = totalMinutes % 60;
          
          setTimeToNextShift({ hours: diffHours, minutes: diffMinutes });
        } else {
          setTimeToNextShift(null);
        }
      } else {
        setTimeToNextShift(null);
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
    Promise.all([fetchSchedules(), fetchSurgeZones()]).finally(() => {
      setLoading(false);
    });

    const handleScheduleUpdate = () => {
      fetchSchedules();
    };

    window.addEventListener('scheduleUpdated', handleScheduleUpdate);
    return () => {
      window.removeEventListener('scheduleUpdated', handleScheduleUpdate);
    };
  }, [fetchSchedules, fetchSurgeZones]);

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

        const location = surgeZones.length > 0 ? surgeZones[0].zone_name : 'Downtown';

        return {
          time: `${formatTime(shift.start_time)} – ${formatTime(shift.end_time)}`,
          location: location,
          id: shift.id,
          scheduleRecord: shift
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));
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

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      const startHour = hour.toString().padStart(2, '0');
      const endHour = ((hour + 1) % 24).toString().padStart(2, '0');
      const formatTime = (h: string) => {
        const hNum = parseInt(h);
        const ampm = hNum >= 12 ? 'PM' : 'AM';
        const displayHour = hNum % 12 || 12;
        return `${displayHour}:00 ${ampm}`;
      };
      slots.push({
        start: `${startHour}:00`,
        end: `${endHour}:00`,
        displayStart: formatTime(startHour),
        displayEnd: formatTime(endHour)
      });
    }
    return slots;
  }, []);

  const getAvailableShifts = useMemo(() => {
    const selectedDayOfWeek = weekDays[activeDay]?.dayOfWeek || today.getDay();
    const availableShifts = [];
    
    surgeZones.forEach(zone => {
      timeSlots.forEach(slot => {
        const conflicts = schedules.some(s => {
          if (s.day_of_week !== selectedDayOfWeek || !s.is_active) return false;
          const [sStartHour] = s.start_time.split(':').map(Number);
          const [sEndHour] = s.end_time.split(':').map(Number);
          const [slotStartHour] = slot.start.split(':').map(Number);
          const [slotEndHour] = slot.end.split(':').map(Number);
          
          return (slotStartHour >= sStartHour && slotStartHour < sEndHour) ||
                 (slotEndHour > sStartHour && slotEndHour <= sEndHour) ||
                 (slotStartHour <= sStartHour && slotEndHour >= sEndHour);
        });
        
        if (!conflicts) {
          availableShifts.push({
            zone: zone.zone_name,
            startTime: slot.start,
            endTime: slot.end,
            displayStart: slot.displayStart,
            displayEnd: slot.displayEnd
          });
        }
      });
    });
    
    if (availableShifts.length === 0) {
      timeSlots.forEach(slot => {
        const conflicts = schedules.some(s => {
          if (s.day_of_week !== selectedDayOfWeek || !s.is_active) return false;
          const [sStartHour] = s.start_time.split(':').map(Number);
          const [sEndHour] = s.end_time.split(':').map(Number);
          const [slotStartHour] = slot.start.split(':').map(Number);
          const [slotEndHour] = slot.end.split(':').map(Number);
          return (slotStartHour >= sStartHour && slotStartHour < sEndHour) ||
                 (slotEndHour > sStartHour && slotEndHour <= sEndHour) ||
                 (slotStartHour <= sStartHour && slotEndHour >= sEndHour);
        });
        
        if (!conflicts) {
          availableShifts.push({
            zone: 'Downtown',
            startTime: slot.start,
            endTime: slot.end,
            displayStart: slot.displayStart,
            displayEnd: slot.displayEnd
          });
        }
      });
    }
    
    return availableShifts;
  }, [surgeZones, timeSlots, schedules, activeDay, weekDays, today]);

  const handleAvailable = () => {
    setViewMode('available');
  };

  const handleScheduled = () => {
    setViewMode('scheduled');
  };

  const handleEditTimeSlot = (slot: { zone: string; city: string; startTime: string; endTime: string; displayStart: string; displayEnd: string }) => {
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
    const activeSchedules = schedules.filter(s => s && s.is_active === true);
    if (!schedules || schedules.length === 0 || activeSchedules.length === 0) {
      return 'No upcoming shifts';
    }
    
    if (!timeToNextShift) {
      return 'No upcoming shifts';
    }
    
    const { hours, minutes } = timeToNextShift;
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      if (remainingHours === 0) {
        return `${days}d remaining`;
      }
      return `${days}d ${remainingHours}h remaining`;
    }
    
    if (hours === 0) {
      return `${minutes}m remaining`;
    }
    return `${hours}h ${minutes}m remaining`;
  };

  const progressPercentage = useMemo(() => {
    if (!timeToNextShift) return 0;
    
    const totalMinutes = timeToNextShift.hours * 60 + timeToNextShift.minutes;
    // Calculate progress: 0% when 24 hours away, 100% when shift starts (0 minutes away)
    // More intuitive: as time decreases, progress increases
    const maxMinutes = 24 * 60; // 24 hours in minutes
    const progress = Math.min(100, Math.max(0, ((maxMinutes - totalMinutes) / maxMinutes) * 100));
    
    return Math.round(progress);
  }, [timeToNextShift]);

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
      <Box h="100vh" w="100%" style={{ background: 'linear-gradient(to bottom, var(--mantine-color-red-6), var(--mantine-color-orange-6), var(--mantine-color-pink-6))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" color="white" />
      </Box>
    );
  }

  return (
    <Box h="100vh" w="100%" style={{ background: 'linear-gradient(to bottom, var(--mantine-color-red-6), var(--mantine-color-orange-6), var(--mantine-color-pink-6))', display: 'flex', flexDirection: 'column' }}>
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
        {/* Next Shift Row */}
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
              <RingProgress
                size={130}
                thickness={10}
                sections={timeToNextShift ? [{ value: progressPercentage, color: 'white' }] : []}
                label={
                  <Text c="white" size="12px" fw={700} ta="center" style={{ lineHeight: 1.2 }}>
                    NEXT<br/>SHIFT
                  </Text>
                }
                styles={{
                  curve: {
                    stroke: 'rgba(255,255,255,0.3)',
                  },
                }}
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text c="white" size="lg" fw={600}>Time To Next Shift</Text>
              <Text c="white" size="sm" opacity={0.8}>{formatTimeRemaining()}</Text>
            </Box>
          </Group>
          
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
          </Group>
        </Box>

        {/* Zone Banner */}
        <Paper p="sm" radius="xl" bg="orange.0" mb="xl" shadow="md">
          <Text c="red.8" fw={700} size="md" ta="center">🔥 High Demand Zone: {highDemandZone.name}</Text>
        </Paper>

        {/* Week Strip */}
        <Group gap="xs" mb="xl" justify="space-between" wrap="nowrap" style={{ width: '100%' }}>
          {weekDays.map((item, index) => {
            const isToday = item.fullDate.toDateString() === today.toDateString();
            return (
              <Button
                key={index}
                onClick={() => {
                  setActiveDay(index);
                  if (viewMode === 'available' || viewMode === 'scheduled') {
                    // Keep current view mode
                  } else {
                    setViewMode('schedule');
                  }
                }}
                variant={activeDay === index ? 'filled' : 'light'}
                color={activeDay === index ? 'red.9' : 'transparent'}
                c="white"
                radius="md"
                style={{
                  flex: 1,
                  maxWidth: 'calc((100% - 24px) / 7)',
                  height: '48px',
                  padding: '4px 2px',
                  transform: activeDay === index ? 'scale(1.05)' : 'scale(1)',
                  backgroundColor: activeDay === index 
                    ? 'var(--mantine-color-red-9)' 
                    : 'rgba(255, 255, 255, 0.25)',
                  border: activeDay === index ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                }}
              >
                <Stack gap={2} align="center" justify="center" style={{ height: '100%', width: '100%' }}>
                  <Text size="xs" fw={700} c="white" style={{ lineHeight: 1, opacity: 0.95, fontSize: '9px', letterSpacing: '0.3px' }}>{item.day}</Text>
                  <Text size="lg" fw={900} c="white" style={{ lineHeight: 1, fontSize: '16px' }}>{item.date}</Text>
                </Stack>
              </Button>
            );
          })}
        </Group>

        {/* Section Title */}
        {viewMode === 'schedule' && (
          <Title order={3} c="white" fw={700} mb="md">
            {weekDays[activeDay]?.day === weekDays[0]?.day ? "Today's Shifts" : `${weekDays[activeDay]?.day}'s Shifts`}
          </Title>
        )}

        {viewMode === 'available' && (
          <Group justify="space-between" mb="md">
            <Title order={3} c="white" fw={700}>
              Available Shifts - {weekDays[activeDay]?.day}
            </Title>
            <Button variant="subtle" color="white" onClick={() => setViewMode('schedule')} size="sm">
              Back
            </Button>
          </Group>
        )}

        {viewMode === 'scheduled' && (
          <Group justify="space-between" mb="md">
            <Title order={3} c="white" fw={700}>
              Scheduled Shifts - {weekDays[activeDay]?.day}
            </Title>
            <Button variant="subtle" color="white" onClick={() => setViewMode('schedule')} size="sm">
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
                        <Text c="orange.8" fw={600}>{shift.location}</Text>
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
                        <Text c="orange.8" fw={600}>{shift.zone}</Text>
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
                        <Text c="orange.8" fw={600}>{shift.location}</Text>
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
              <Text size="sm" c="dimmed">Available: {selectedSlot.displayStart} – {selectedSlot.displayEnd}</Text>
            </Box>

            <TextInput
              label="Start Time"
              type="time"
              value={selectedStartTime}
              onChange={(e) => setSelectedStartTime(e.target.value)}
            />

            <TextInput
              label="End Time"
              type="time"
              value={selectedEndTime}
              onChange={(e) => setSelectedEndTime(e.target.value)}
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
