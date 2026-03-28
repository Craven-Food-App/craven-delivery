import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  TextInput,
  Textarea,
  Modal,
  Select,
  Stack,
  Group,
  Text,
  Paper,
  Badge,
  Tooltip,
  Loader,
  Center,
  Switch,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPin, IconPlus, IconEye, IconCheck } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: string;
  author_id: string;
  read_by: string[];
  pinned: boolean;
  expires_at: string | null;
  created_at: string;
  author_name?: string;
}

const priorityBadgeColor = (p: string) => {
  if (p === 'critical') return 'red';
  if (p === 'urgent') return 'orange';
  return 'gray';
};

const AnnouncementsTab: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  const form = useForm({
    initialValues: {
      title: '',
      body: '',
      priority: 'normal',
      pinned: false,
    },
    validate: {
      title: (v) => (!v?.trim() ? 'Enter title' : null),
      body: (v) => (!v?.trim() ? 'Enter body' : null),
    },
  });

  const getNameMap = useCallback(async (userIds: string[]): Promise<Map<string, string>> => {
    if (userIds.length === 0) return new Map();
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);
    const map = new Map<string, string>();
    (profiles || []).forEach((p: { user_id: string; full_name: string | null; email: string | null }) => {
      map.set(p.user_id, p.full_name || p.email || 'Unknown');
    });
    return map;
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('internal_announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const authorIds = [...new Set(data.map((a: Announcement) => a.author_id))];
        const nameMap = await getNameMap(authorIds);
        setAnnouncements(data.map((a: Announcement) => ({ ...a, author_name: nameMap.get(a.author_id) || 'Unknown' })));
      } else {
        setAnnouncements([]);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  }, [getNameMap]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      await fetchAnnouncements();
    };
    void init();

    const channel = supabase
      .channel('internal-announcements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_announcements' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAnnouncements]);

  const handleCreate = form.onSubmit(async (values) => {
    if (!currentUser) return;
    setSending(true);
    try {
      const { error } = await supabase.from('internal_announcements').insert([{
        title: values.title,
        body: values.body,
        priority: (values.priority || 'normal') as 'normal' | 'urgent' | 'critical',
        author_id: currentUser.id,
        pinned: values.pinned,
        read_by: [currentUser.id],
      }]);
      if (error) throw error;
      notifications.show({ title: 'Published', message: 'Announcement published', color: 'green' });
      form.reset();
      setCreateOpen(false);
      fetchAnnouncements();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      notifications.show({ title: 'Error', message: `Failed to publish: ${message}`, color: 'red' });
    } finally {
      setSending(false);
    }
  });

  const markAsRead = async (announcement: Announcement) => {
    if (!currentUser || announcement.read_by.includes(currentUser.id)) return;
    await supabase.from('internal_announcements').update({
      read_by: [...announcement.read_by, currentUser.id],
    }).eq('id', announcement.id);
    fetchAnnouncements();
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text fw={700} size="md">Company Announcements</Text>
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => setCreateOpen(true)}
          styles={{ root: { backgroundColor: '#FF6B35' } }}
        >
          New Announcement
        </Button>
      </Group>

      {loading ? (
        <Center py={40}>
          <Loader size="lg" />
        </Center>
      ) : announcements.length === 0 ? (
        <Text c="dimmed" ta="center" py={40}>No announcements</Text>
      ) : (
        <Stack gap="sm">
          {announcements.map((a) => {
            const isRead = currentUser && a.read_by.includes(currentUser.id);
            const borderColor = a.priority === 'critical' ? '#ef4444' : a.priority === 'urgent' ? '#f59e0b' : '#d1d5db';
            return (
              <Paper
                key={a.id}
                p="md"
                withBorder
                radius="sm"
                onClick={() => markAsRead(a)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void markAsRead(a);
                  }
                }}
                style={{
                  cursor: 'pointer',
                  borderLeftWidth: 4,
                  borderLeftColor: borderColor,
                  background: isRead ? undefined : '#fffbf5',
                }}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={8} wrap="wrap">
                      {a.pinned && <IconPin size={18} style={{ color: '#FF6B35', flexShrink: 0 }} />}
                      <Text fw={700} size="sm">{a.title}</Text>
                      <Badge color={priorityBadgeColor(a.priority)} variant="light" size="sm">{a.priority}</Badge>
                      {!isRead && <Badge size="xs" color="#FF6B35" variant="dot">New</Badge>}
                    </Group>
                    <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>{a.body}</Text>
                    <Group gap="md">
                      <Text size="xs" c="dimmed">By {a.author_name}</Text>
                      <Text size="xs" c="dimmed">{new Date(a.created_at).toLocaleString()}</Text>
                      <Tooltip label="Read receipts">
                        <Group gap={4} style={{ cursor: 'help' }}>
                          <IconEye size={14} />
                          <Text size="xs" c="dimmed">{a.read_by.length} read</Text>
                        </Group>
                      </Tooltip>
                    </Group>
                  </Stack>
                  {isRead && <IconCheck size={20} color="#10b981" style={{ flexShrink: 0 }} />}
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="New Announcement" size="lg">
        <form onSubmit={handleCreate}>
          <Stack gap="md">
            <TextInput label="Title" placeholder="Announcement title" {...form.getInputProps('title')} />
            <Textarea label="Body" placeholder="Announcement content..." minRows={5} {...form.getInputProps('body')} />
            <Group grow align="flex-start">
              <Select
                label="Priority"
                data={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'urgent', label: '⚠️ Urgent' },
                  { value: 'critical', label: '🚨 Critical' },
                ]}
                {...form.getInputProps('priority')}
              />
              <Switch
                label="Pinned"
                mt="lg"
                checked={form.values.pinned}
                onChange={(e) => form.setFieldValue('pinned', e.currentTarget.checked)}
              />
            </Group>
            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" loading={sending} styles={{ root: { backgroundColor: '#FF6B35' } }}>
                Publish
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};

export default AnnouncementsTab;
