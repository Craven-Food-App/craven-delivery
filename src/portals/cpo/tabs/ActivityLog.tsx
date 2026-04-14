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
  ThemeIcon,
  Skeleton,
  SimpleGrid,
  Divider,
  Box,
  Paper,
  ActionIcon,
  Tooltip,
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
  IconClock,
  IconBuilding,
  IconUser,
  IconChevronRight,
  IconX,
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
  created_at?: string;
  partnerships?: { partner_name: string; status?: string; partner_type?: string };
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

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const ActivityLog: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [partnerships, setPartnerships] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);
  const [filterPartner, setFilterPartner] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);

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
        .select('*, partnerships(partner_name, status, partner_type)')
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

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity);
    openDetail();
  };

  if (loading) return <Stack gap="md">{[1, 2, 3].map(i => <Skeleton key={i} height={80} radius="md" />)}</Stack>;

  const detailMeta = selectedActivity ? getActivityMeta(selectedActivity.activity_type) : null;

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

      {/* Activity List */}
      <Card shadow="sm" radius="md" padding={0} withBorder>
        {filtered.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl" px="md">No activities logged yet. Click "Log Activity" to add one.</Text>
        ) : (
          <Stack gap={0}>
            {filtered.map((act, index) => {
              const meta = getActivityMeta(act.activity_type);
              const Icon = meta.icon;
              const performedDate = new Date(act.performed_at);
              return (
                <React.Fragment key={act.id}>
                  {index > 0 && <Divider />}
                  <Box
                    px="md"
                    py="sm"
                    style={{
                      cursor: 'pointer',
                      transition: 'background-color 150ms ease',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f8f9fa'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    onClick={() => handleActivityClick(act)}
                  >
                    <Group gap="md" wrap="nowrap" align="flex-start">
                      <ThemeIcon size={36} radius="xl" color={meta.color} variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
                        <Icon size={18} />
                      </ThemeIcon>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="xs" align="center" wrap="nowrap" mb={2}>
                          <Text fw={600} size="sm" truncate style={{ flex: 1 }}>{act.title}</Text>
                          <Badge size="xs" variant="light" color={meta.color} style={{ flexShrink: 0 }}>{meta.label}</Badge>
                        </Group>
                        {act.description && (
                          <Text size="xs" c="dimmed" lineClamp={1} mb={4} style={{ whiteSpace: 'pre-wrap' }}>
                            {act.description}
                          </Text>
                        )}
                        <Group gap="sm" wrap="wrap">
                          {act.partnerships?.partner_name && (
                            <Group gap={4}>
                              <IconBuilding size={12} style={{ color: '#868e96', flexShrink: 0 }} />
                              <Text size="xs" c="dimmed">{act.partnerships.partner_name}</Text>
                            </Group>
                          )}
                          <Group gap={4}>
                            <IconClock size={12} style={{ color: '#868e96', flexShrink: 0 }} />
                            <Text size="xs" c="dimmed">
                              {performedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {' · '}
                              {performedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </Text>
                          </Group>
                          <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                            {formatRelativeTime(act.performed_at)}
                          </Text>
                        </Group>
                      </div>
                      <IconChevronRight size={16} style={{ color: '#ced4da', flexShrink: 0, marginTop: 8 }} />
                    </Group>
                  </Box>
                </React.Fragment>
              );
            })}
          </Stack>
        )}
      </Card>

      {/* Activity Detail Modal */}
      <Modal
        opened={detailOpened}
        onClose={closeDetail}
        title={null}
        size="lg"
        padding={0}
        withCloseButton={false}
      >
        {selectedActivity && detailMeta && (() => {
          const DetailIcon = detailMeta.icon;
          const performedDate = new Date(selectedActivity.performed_at);
          return (
            <Stack gap={0}>
              {/* Header */}
              <Box px="lg" py="md" style={{ borderBottom: '1px solid #e9ecef' }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group gap="md" align="flex-start" wrap="nowrap" style={{ flex: 1 }}>
                    <ThemeIcon size={44} radius="xl" color={detailMeta.color} variant="light" style={{ flexShrink: 0 }}>
                      <DetailIcon size={22} />
                    </ThemeIcon>
                    <div style={{ minWidth: 0 }}>
                      <Text fw={700} size="lg">{selectedActivity.title}</Text>
                      <Badge size="sm" variant="light" color={detailMeta.color} mt={4}>{detailMeta.label}</Badge>
                    </div>
                  </Group>
                  <ActionIcon variant="subtle" color="gray" onClick={closeDetail} size="lg">
                    <IconX size={18} />
                  </ActionIcon>
                </Group>
              </Box>

              {/* Body */}
              <Box px="lg" py="md">
                <Stack gap="md">
                  {/* Metadata grid */}
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Paper p="sm" radius="md" withBorder>
                      <Group gap="sm" wrap="nowrap">
                        <ThemeIcon size={28} radius="md" color="gray" variant="light">
                          <IconBuilding size={14} />
                        </ThemeIcon>
                        <div>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Partner</Text>
                          <Text size="sm" fw={500}>{selectedActivity.partnerships?.partner_name || 'Unknown'}</Text>
                        </div>
                      </Group>
                    </Paper>
                    <Paper p="sm" radius="md" withBorder>
                      <Group gap="sm" wrap="nowrap">
                        <ThemeIcon size={28} radius="md" color="gray" variant="light">
                          <IconClock size={14} />
                        </ThemeIcon>
                        <div>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Date & Time</Text>
                          <Text size="sm" fw={500}>
                            {performedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {performedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                            {' · '}
                            {formatRelativeTime(selectedActivity.performed_at)}
                          </Text>
                        </div>
                      </Group>
                    </Paper>
                    {selectedActivity.partnerships?.partner_type && (
                      <Paper p="sm" radius="md" withBorder>
                        <Group gap="sm" wrap="nowrap">
                          <ThemeIcon size={28} radius="md" color="gray" variant="light">
                            <IconFileText size={14} />
                          </ThemeIcon>
                          <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Partner Type</Text>
                            <Text size="sm" fw={500} tt="capitalize">{selectedActivity.partnerships.partner_type}</Text>
                          </div>
                        </Group>
                      </Paper>
                    )}
                    {selectedActivity.partnerships?.status && (
                      <Paper p="sm" radius="md" withBorder>
                        <Group gap="sm" wrap="nowrap">
                          <ThemeIcon size={28} radius="md" color="gray" variant="light">
                            <IconCheck size={14} />
                          </ThemeIcon>
                          <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Partner Status</Text>
                            <Text size="sm" fw={500} tt="capitalize">{selectedActivity.partnerships.status}</Text>
                          </div>
                        </Group>
                      </Paper>
                    )}
                  </SimpleGrid>

                  {/* Description */}
                  {selectedActivity.description ? (
                    <>
                      <Divider label="Notes & Description" labelPosition="left" />
                      <Paper p="md" radius="md" style={{ backgroundColor: '#f8f9fa' }}>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {selectedActivity.description}
                        </Text>
                      </Paper>
                    </>
                  ) : (
                    <>
                      <Divider label="Notes & Description" labelPosition="left" />
                      <Text size="sm" c="dimmed" fs="italic">No additional notes recorded for this activity.</Text>
                    </>
                  )}

                  {/* Footer metadata */}
                  <Divider />
                  <Group gap="lg" wrap="wrap">
                    <Text size="xs" c="dimmed">
                      <strong>Activity ID:</strong> {selectedActivity.id.slice(0, 8)}…
                    </Text>
                    <Text size="xs" c="dimmed">
                      <strong>Partnership ID:</strong> {selectedActivity.partnership_id.slice(0, 8)}…
                    </Text>
                    {selectedActivity.performed_by && (
                      <Text size="xs" c="dimmed">
                        <strong>Logged by:</strong> {selectedActivity.performed_by.slice(0, 8)}…
                      </Text>
                    )}
                  </Group>
                </Stack>
              </Box>
            </Stack>
          );
        })()}
      </Modal>

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
