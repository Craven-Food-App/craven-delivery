import React, { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Badge,
  Button,
  Stack,
  Modal,
  TextInput,
  Textarea,
  Select,
  Timeline,
  ThemeIcon,
  Skeleton,
  SimpleGrid,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconNote,
  IconPhone,
  IconMail,
  IconUsers,
  IconFileText,
  IconCheck,
  IconCalendar,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface Activity {
  id: string;
  partnership_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  performed_at: string;
  performed_by: string | null;
  partnerships?: { partner_name: string };
}

const ACTIVITY_TYPES = [
  { value: 'note', label: 'Note', icon: IconNote, color: 'blue' },
  { value: 'meeting', label: 'Meeting', icon: IconUsers, color: 'green' },
  { value: 'call', label: 'Phone Call', icon: IconPhone, color: 'orange' },
  { value: 'email', label: 'Email', icon: IconMail, color: 'violet' },
  { value: 'contract_signed', label: 'Contract Signed', icon: IconFileText, color: 'teal' },
  { value: 'onboarding', label: 'Onboarding', icon: IconCheck, color: 'cyan' },
  { value: 'status_change', label: 'Status Change', icon: IconCalendar, color: 'yellow' },
];

const ActivityLog: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [partnerships, setPartnerships] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);
  const [filterPartner, setFilterPartner] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    partnership_id: '',
    activity_type: 'note',
    title: '',
    description: '',
    performed_at: new Date(),
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [activitiesRes, partnersRes] = await Promise.all([
      supabase
        .from('partnership_activities')
        .select('*, partnerships(partner_name)')
        .order('performed_at', { ascending: false })
        .limit(100),
      supabase.from('partnerships').select('id, partner_name').order('partner_name'),
    ]);
    setActivities((activitiesRes.data as Activity[]) || []);
    setPartnerships((partnersRes.data || []).map(p => ({ value: p.id, label: p.partner_name })));
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!formData.partnership_id || !formData.title) {
      notifications.show({ title: 'Error', message: 'Partner and title are required', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('partnership_activities').insert({
        partnership_id: formData.partnership_id,
        activity_type: formData.activity_type,
        title: formData.title,
        description: formData.description || null,
        performed_at: formData.performed_at.toISOString(),
        performed_by: user?.id,
      });
      if (error) throw error;
      notifications.show({ title: 'Success', message: 'Activity logged', color: 'green' });
      close();
      setFormData({ partnership_id: '', activity_type: 'note', title: '', description: '', performed_at: new Date() });
      loadData();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const getActivityMeta = (type: string) =>
    ACTIVITY_TYPES.find(a => a.value === type) || ACTIVITY_TYPES[0];

  const filtered = filterPartner
    ? activities.filter(a => a.partnership_id === filterPartner)
    : activities;

  if (loading) return <Stack gap="md">{[1, 2, 3].map(i => <Skeleton key={i} height={80} radius="md" />)}</Stack>;

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="wrap">
        <Title order={3}>Activity Log</Title>
        <Group>
          <Select
            placeholder="Filter by partner"
            data={[{ value: '', label: 'All Partners' }, ...partnerships]}
            value={filterPartner || ''}
            onChange={v => setFilterPartner(v || null)}
            clearable
            size="sm"
            style={{ minWidth: 200 }}
          />
          <Button leftSection={<IconPlus size={16} />} color="orange" onClick={open}>
            Log Activity
          </Button>
        </Group>
      </Group>

      {/* Activity type summary */}
      <SimpleGrid cols={{ base: 2, sm: 4, lg: 7 }}>
        {ACTIVITY_TYPES.map(t => {
          const count = filtered.filter(a => a.activity_type === t.value).length;
          return (
            <Card key={t.value} shadow="xs" radius="md" padding="sm" withBorder>
              <Group gap="xs">
                <ThemeIcon size={24} radius="md" color={t.color} variant="light">
                  <t.icon size={14} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">{t.label}</Text>
                  <Text fw={700} size="sm">{count}</Text>
                </div>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>

      {/* Timeline */}
      <Card shadow="sm" radius="md" padding="lg" withBorder>
        {filtered.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">No activities logged yet. Click "Log Activity" to add one.</Text>
        ) : (
          <Timeline active={-1} bulletSize={32} lineWidth={2}>
            {filtered.map(act => {
              const meta = getActivityMeta(act.activity_type);
              const Icon = meta.icon;
              return (
                <Timeline.Item
                  key={act.id}
                  bullet={
                    <ThemeIcon size={32} radius="xl" color={meta.color} variant="light">
                      <Icon size={16} />
                    </ThemeIcon>
                  }
                  title={
                    <Group gap="xs">
                      <Text fw={600} size="sm">{act.title}</Text>
                      <Badge size="xs" variant="light" color={meta.color}>{meta.label}</Badge>
                    </Group>
                  }
                >
                  {act.description && (
                    <Text size="sm" c="dimmed" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
                      {act.description}
                    </Text>
                  )}
                  <Text size="xs" c="dimmed" mt={4}>
                    {act.partnerships?.partner_name} · {new Date(act.performed_at).toLocaleString()}
                  </Text>
                </Timeline.Item>
              );
            })}
          </Timeline>
        )}
      </Card>

      {/* Log Activity Modal */}
      <Modal opened={opened} onClose={close} title="Log Activity" size="md">
        <Stack gap="md">
          <Select
            label="Partner"
            data={partnerships}
            value={formData.partnership_id}
            onChange={v => setFormData(d => ({ ...d, partnership_id: v || '' }))}
            searchable
            required
          />
          <Select
            label="Activity Type"
            data={ACTIVITY_TYPES.map(t => ({ value: t.value, label: t.label }))}
            value={formData.activity_type}
            onChange={v => setFormData(d => ({ ...d, activity_type: v || 'note' }))}
          />
          <TextInput
            label="Title"
            required
            placeholder="e.g. Quarterly review meeting"
            value={formData.title}
            onChange={e => setFormData(d => ({ ...d, title: e.target.value }))}
          />
          <Textarea
            label="Description / Notes"
            placeholder="Meeting notes, action items, etc."
            value={formData.description}
            onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
            minRows={4}
          />
          <DateTimePicker
            label="Date & Time"
            value={formData.performed_at}
            onChange={v => setFormData(d => ({ ...d, performed_at: v ? new Date(v) : new Date() }))}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button color="orange" loading={saving} onClick={handleCreate}>Log Activity</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default ActivityLog;
