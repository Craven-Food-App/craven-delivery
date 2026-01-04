import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  IconCalendar,
  IconClock,
  IconPlus,
  IconChevronRight,
  IconPower,
  IconBolt,
  IconTrash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  Box,
  Stack,
  Text,
  Button,
  Group,
  Card,
  Title,
  ActionIcon,
  Modal,
  TextInput,
  Paper,
  Badge,
  Divider,
} from '@mantine/core';

interface ScheduleBlock {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  is_recurring: boolean;
  created_at: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ScheduleSection() {
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'offline' | 'online'>('offline');
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBlock, setNewBlock] = useState({
    start_time: '09:00',
    end_time: '17:00'
  });

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('driver_schedules')
        .select('*')
        .eq('driver_id', user.id)
        .order('day_of_week')
        .order('start_time');

      if (data) {
        setScheduleBlocks(data);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  const handleGoOnline = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('driver_profiles').update({
        status: 'online',
        is_available: true,
        last_location_update: new Date().toISOString()
      }).eq('user_id', user.id);

      await supabase.from('driver_sessions').upsert({
        driver_id: user.id,
        is_online: true,
        last_activity: new Date().toISOString(),
        session_data: { online_since: new Date().toISOString() }
      }, { onConflict: 'driver_id' });

      setCurrentStatus('online');
      notifications.show({
        title: 'You are now online',
        message: '',
        color: 'green',
      });
    } catch (error) {
      console.error('Error going online:', error);
      notifications.show({
        title: 'Failed to go online',
        message: '',
        color: 'red',
      });
    }
  };

  const handleGoOffline = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('driver_profiles').update({
        status: 'offline',
        is_available: false
      }).eq('user_id', user.id);

      await supabase.from('driver_sessions').upsert({
        driver_id: user.id,
        is_online: false,
        last_activity: new Date().toISOString()
      }, { onConflict: 'driver_id' });

      setCurrentStatus('offline');
      notifications.show({
        title: 'You are now offline',
        message: '',
        color: 'blue',
      });
    } catch (error) {
      console.error('Error going offline:', error);
    }
  };

  const handleQuickStart = async (hours: number) => {
    const now = new Date();
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    const block: ScheduleBlock = {
      id: Date.now().toString(),
      day_of_week: now.getDay(),
      start_time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      end_time: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
      is_active: true,
      is_recurring: false,
      created_at: new Date().toISOString()
    };

    await handleSaveBlock(block);
    await handleGoOnline();
  };

  const handleSaveBlock = async (block: ScheduleBlock) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('driver_schedules')
        .upsert({
          ...block,
          driver_id: user.id
        });

      if (error) throw error;

      await fetchSchedule();
      notifications.show({
        title: 'Schedule updated',
        message: '',
        color: 'green',
      });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error saving schedule:', error);
      notifications.show({
        title: 'Failed to save schedule',
        message: '',
        color: 'red',
      });
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      const { error } = await supabase
        .from('driver_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchSchedule();
      notifications.show({
        title: 'Schedule deleted',
        message: '',
        color: 'green',
      });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      notifications.show({
        title: 'Failed to delete schedule',
        message: '',
        color: 'red',
      });
    }
  };

  const handleAddSchedule = () => {
    if (selectedDay === null) return;

    const block: ScheduleBlock = {
      id: Date.now().toString(),
      day_of_week: selectedDay,
      start_time: newBlock.start_time,
      end_time: newBlock.end_time,
      is_active: true,
      is_recurring: true,
      created_at: new Date().toISOString()
    };

    handleSaveBlock(block);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const todayIndex = new Date().getDay();

  return (
    <Box h="100vh" bg="slate.0" style={{ paddingBottom: '96px', overflowY: 'auto' }}>
      <Box maw={768} mx="auto">
        {/* Header */}
        <Paper
          pos="sticky"
          top={0}
          bg="white"
          style={{ zIndex: 10, borderBottom: '1px solid var(--mantine-color-slate-2)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          className="safe-area-top"
        >
          <Box p="md">
            <Title order={1} fw={700} c="slate.9" style={{ textAlign: 'right' }}>Schedule</Title>
            <Text size="sm" c="slate.6" style={{ textAlign: 'right' }}>Manage when you're available</Text>
          </Box>
        </Paper>

        {/* Online Status Toggle */}
        <Paper px="md" py="xl" bg="white" style={{ borderBottom: '1px solid var(--mantine-color-slate-1)' }}>
          <Button
            fullWidth
            size="lg"
            radius="lg"
            onClick={currentStatus === 'online' ? handleGoOffline : handleGoOnline}
            color={currentStatus === 'online' ? 'red' : 'orange'}
            leftSection={currentStatus === 'online' ? <IconPower size={20} /> : <IconBolt size={20} />}
            style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
          >
            {currentStatus === 'online' ? 'Stop Driving' : 'Start Driving Now'}
          </Button>

          {currentStatus === 'online' && (
            <Group gap="xs" justify="center" mt="md" p="sm" bg="green.0" style={{ borderRadius: '8px' }}>
              <Box w={8} h={8} bg="green.5" style={{ borderRadius: '50%', animation: 'pulse 2s ease-in-out infinite' }} />
              <Text size="sm" fw={500} c="green.7">You're online and accepting orders</Text>
            </Group>
          )}
        </Paper>

        {/* Quick Start Options */}
        <Paper px="md" py="xl" bg="white">
          <Title order={3} fw={600} c="slate.9" mb="md">Quick Start</Title>
          <Group gap="md" mb="md">
            {[
              { hours: 2, label: '2 Hours' },
              { hours: 4, label: '4 Hours' },
              { hours: 8, label: '8 Hours' }
            ].map(({ hours, label }) => (
              <Button
                key={hours}
                variant="outline"
                onClick={() => handleQuickStart(hours)}
                style={{ flex: 1, border: '2px solid var(--mantine-color-slate-2)', height: 'auto', padding: '16px' }}
                styles={{
                  root: {
                    '&:hover': {
                      borderColor: 'var(--mantine-color-orange-5)',
                      backgroundColor: 'var(--mantine-color-orange-0)',
                    },
                  },
                }}
              >
                <Stack gap={4} align="center">
                  <Text size="3xl" fw={700} c="slate.9">{hours}</Text>
                  <Text size="xs" c="slate.6" fw={500}>hours</Text>
                </Stack>
              </Button>
            ))}
          </Group>
          <Text size="xs" c="slate.5" style={{ textAlign: 'center' }}>
            Start driving immediately for the selected duration
          </Text>
        </Paper>

        {/* Weekly Calendar View */}
        <Stack gap="xs" p="md">
          <Group justify="space-between" mb="md">
            <Title order={3} fw={600} c="slate.9">This Week</Title>
            <Button
              variant="subtle"
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => setShowAddModal(true)}
              color="orange"
            >
              Add Shift
            </Button>
          </Group>

          <Stack gap="xs">
            {DAYS_FULL.map((day, index) => {
              const dayBlocks = scheduleBlocks.filter(b => b.day_of_week === index && b.is_active);
              const isToday = index === todayIndex;

              return (
                <Card
                  key={index}
                  shadow="sm"
                  radius="lg"
                  withBorder
                  style={{
                    borderColor: isToday ? 'var(--mantine-color-orange-5)' : 'var(--mantine-color-slate-2)',
                    backgroundColor: isToday ? 'var(--mantine-color-orange-0)' : 'white',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedDay(index)}
                >
                  <Group justify="space-between">
                    <Group gap="md">
                      <Badge
                        size="xl"
                        radius="xl"
                        color={isToday ? 'orange' : dayBlocks.length > 0 ? 'green' : 'gray'}
                        variant={isToday ? 'filled' : 'light'}
                      >
                        {DAYS[index]}
                      </Badge>
                      <Box>
                        <Text fw={600} c="slate.9">{day}</Text>
                        <Text size="sm" c="slate.6">
                          {dayBlocks.length > 0
                            ? `${dayBlocks.length} shift${dayBlocks.length > 1 ? 's' : ''}`
                            : 'Not scheduled'}
                        </Text>
                      </Box>
                    </Group>
                    <IconChevronRight size={20} color="var(--mantine-color-slate-4)" />
                  </Group>

                  {dayBlocks.length > 0 && (
                    <>
                      <Divider my="md" />
                      <Stack gap="xs">
                        {dayBlocks.map((block) => (
                          <Group key={block.id} justify="space-between" p="sm" bg="slate.0" style={{ borderRadius: '8px' }}>
                            <Group gap="xs">
                              <IconClock size={16} color="var(--mantine-color-slate-5)" />
                              <Text size="sm" fw={500} c="slate.7">
                                {formatTime(block.start_time)} - {formatTime(block.end_time)}
                              </Text>
                            </Group>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBlock(block.id);
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        ))}
                      </Stack>
                    </>
                  )}
                </Card>
              );
            })}
          </Stack>
        </Stack>
      </Box>

      {/* Add Schedule Modal */}
      <Modal
        opened={showAddModal && selectedDay !== null}
        onClose={() => {
          setShowAddModal(false);
          setSelectedDay(null);
        }}
        title={`Add Shift for ${selectedDay !== null ? DAYS_FULL[selectedDay] : ''}`}
        centered
        styles={{
          content: {
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
          },
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Start Time"
            type="time"
            value={newBlock.start_time}
            onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })}
          />

          <TextInput
            label="End Time"
            type="time"
            value={newBlock.end_time}
            onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })}
          />

          <Button
            fullWidth
            onClick={handleAddSchedule}
            loading={loading}
            color="orange"
            size="lg"
            radius="lg"
          >
            {loading ? 'Saving...' : 'Add Shift'}
          </Button>
        </Stack>
      </Modal>

      {/* Android Bottom Bar */}
      <Box 
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          height: '48px', 
          backgroundColor: '#000',
          zIndex: 1000 
        }} 
      />
    </Box>
  );
}
