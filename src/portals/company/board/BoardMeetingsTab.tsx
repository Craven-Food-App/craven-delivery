import React, { useState, useEffect } from 'react';
import {
  Stack,
  Title,
  Text,
  Button,
  Card,
  Table,
  Badge,
  Group,
  Modal,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Loader,
  Alert,
} from '@mantine/core';
import { IconPlus, IconCalendar, IconVideo, IconClock } from '@tabler/icons-react';
import { DatePickerInput, DateTimePicker } from '@mantine/dates';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

interface BoardMeeting {
  id: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url?: string;
  status: string;
  created_at: string;
}

const BoardMeetingsTab: React.FC = () => {
  const [meetings, setMeetings] = useState<BoardMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_at: null as Date | null,
    duration_minutes: 60,
    meeting_url: '',
  });

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('board_meetings')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('Error loading meetings:', error);
        setMeetings([]);
        return;
      }

      setMeetings(data || []);
    } catch (err) {
      console.error('Error loading meetings:', err);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    try {
      if (!formData.title || !formData.scheduled_at) {
        notifications.show({
          title: 'Error',
          message: 'Title and scheduled date are required',
          color: 'red',
        });
        return;
      }

      const { error } = await supabase.from('board_meetings').insert({
        title: formData.title,
        description: formData.description || null,
        scheduled_at: formData.scheduled_at.toISOString(),
        duration_minutes: formData.duration_minutes || 60,
        meeting_url: formData.meeting_url || null,
        status: 'scheduled',
      });

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Meeting scheduled successfully',
        color: 'green',
      });

      setModalOpen(false);
      setFormData({
        title: '',
        description: '',
        scheduled_at: null,
        duration_minutes: 60,
        meeting_url: '',
      });
      loadMeetings();
    } catch (err: any) {
      console.error('Error creating meeting:', err);
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to create meeting',
        color: 'red',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'blue',
      in_progress: 'green',
      completed: 'gray',
      cancelled: 'red',
    };
    return (
      <Badge color={colors[status] || 'gray'} variant="light">
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const upcomingMeetings = meetings.filter(
    (m) => m.status === 'scheduled' && dayjs(m.scheduled_at).isAfter(dayjs())
  );
  const pastMeetings = meetings.filter(
    (m) => m.status === 'completed' || dayjs(m.scheduled_at).isBefore(dayjs())
  );

  if (loading) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Loader size="lg" />
        <Text c="dimmed">Loading meetings...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>Board Meetings</Title>
          <Text c="dimmed">Schedule and manage board meetings</Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setModalOpen(true)}
        >
          Schedule Meeting
        </Button>
      </Group>

      {meetings.length === 0 ? (
        <Alert color="blue">
          No meetings scheduled. Click "Schedule Meeting" to create one.
        </Alert>
      ) : (
        <Card padding={0} radius="md" withBorder>
          <Table.ScrollContainer minWidth={800}>
            <Table highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Meeting</Table.Th>
                  <Table.Th>Date & Time</Table.Th>
                  <Table.Th>Duration</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Link</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {meetings.map((meeting) => (
                  <Table.Tr key={meeting.id}>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text fw={500}>{meeting.title}</Text>
                        {meeting.description && (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {meeting.description}
                          </Text>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {dayjs(meeting.scheduled_at).format('MMM D, YYYY')}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {dayjs(meeting.scheduled_at).format('h:mm A')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{meeting.duration_minutes} minutes</Text>
                    </Table.Td>
                    <Table.Td>{getStatusBadge(meeting.status)}</Table.Td>
                    <Table.Td>
                      {meeting.meeting_url ? (
                        <Button
                          component="a"
                          href={meeting.meeting_url}
                          target="_blank"
                          size="xs"
                          variant="light"
                          leftSection={<IconVideo size={14} />}
                        >
                          Join
                        </Button>
                      ) : (
                        <Text size="sm" c="dimmed">
                          In-person
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}

      {/* Create Meeting Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Board Meeting"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Meeting Title"
            placeholder="Q1 2025 Board Meeting"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            placeholder="Agenda items, discussion topics..."
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
          />
          <DateTimePicker
            label="Meeting Date & Time"
            value={formData.scheduled_at}
            onChange={(date) => setFormData({ ...formData, scheduled_at: date })}
            required
            placeholder="Select date and time"
          />
          <NumberInput
            label="Duration (minutes)"
            value={formData.duration_minutes}
            onChange={(value) =>
              setFormData({ ...formData, duration_minutes: value as number })
            }
            min={15}
            step={15}
          />
          <TextInput
            label="Meeting URL (Optional)"
            placeholder="https://zoom.us/j/..."
            value={formData.meeting_url}
            onChange={(e) =>
              setFormData({ ...formData, meeting_url: e.target.value })
            }
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMeeting}>Schedule Meeting</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default BoardMeetingsTab;

