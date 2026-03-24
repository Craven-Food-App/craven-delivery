import React, { useEffect, useState, useCallback } from 'react';
import {
  Drawer,
  Stack,
  Group,
  Title,
  Text,
  Badge,
  Button,
  Select,
  TextInput,
  Textarea,
  NumberInput,
  Divider,
  Paper,
  Timeline,
  ThemeIcon,
  Modal,
  Checkbox,
  ScrollArea,
  Table,
} from '@mantine/core';
import { DatePickerInput, DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconPhone,
  IconUsers,
  IconNote,
  IconPlus,
  IconClock,
} from '@tabler/icons-react';

import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

import { PIPELINE_STAGES, partnerTypeLabel, DEAL_TYPE_OPTIONS } from '../dealConstants';
import { pushSignedToOnboarding } from '../partnerOnboardingPush';

type PartnershipRow = Tables<'partnerships'>;
type ActivityRow = Tables<'partnership_activities'>;
type TaskRow = Tables<'partnership_tasks'>;
type ContactRow = Tables<'partnership_contacts'>;
type DocRow = Tables<'partnership_documents'>;

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Log call', icon: IconPhone, color: 'orange' },
  { value: 'meeting', label: 'Log meeting', icon: IconUsers, color: 'green' },
  { value: 'note', label: 'Add note', icon: IconNote, color: 'blue' },
  { value: 'email', label: 'Email', icon: IconNote, color: 'violet' },
  { value: 'text', label: 'Text / SMS', icon: IconNote, color: 'cyan' },
];

function stalenessProps(lastActivityAt: string | null): { color: string; label: string } {
  if (!lastActivityAt) return { color: 'gray', label: 'No activity logged' };
  const days = Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86400000);
  if (days >= 7) return { color: 'red', label: `Stale: ${days}d since activity` };
  if (days >= 3) return { color: 'yellow', label: `${days}d since activity` };
  return { color: 'green', label: 'Recent activity' };
}

function daysInStage(stageEnteredAt: string | null): number | null {
  if (!stageEnteredAt) return null;
  return Math.floor((Date.now() - new Date(stageEnteredAt).getTime()) / 86400000);
}

interface PartnerDealDrawerProps {
  opened: boolean;
  onClose: () => void;
  partnershipId: string | null;
  onUpdated: () => void;
}

const PartnerDealDrawer: React.FC<PartnerDealDrawerProps> = ({ opened, onClose, partnershipId, onUpdated }) => {
  const [row, setRow] = useState<PartnershipRow | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [logOpened, setLogOpened] = useState(false);
  const [logType, setLogType] = useState('call');
  const [logTitle, setLogTitle] = useState('');
  const [logBody, setLogBody] = useState('');
  const [logAt, setLogAt] = useState<Date>(new Date());

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState<Date | null>(null);

  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');

  const load = useCallback(async () => {
    if (!partnershipId) return;
    setLoading(true);
    try {
      const [pRes, cRes, aRes, tRes, dRes] = await Promise.all([
        supabase.from('partnerships').select('*').eq('id', partnershipId).single(),
        supabase.from('partnership_contacts').select('*').eq('partnership_id', partnershipId).order('is_primary', { ascending: false }),
        supabase.from('partnership_activities').select('*').eq('partnership_id', partnershipId).order('performed_at', { ascending: false }).limit(80),
        supabase.from('partnership_tasks').select('*').eq('partnership_id', partnershipId).order('due_at', { ascending: true, nullsFirst: false }),
        supabase.from('partnership_documents').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
      ]);
      setRow((pRes.data as PartnershipRow) || null);
      setContacts((cRes.data as ContactRow[]) || []);
      setActivities((aRes.data as ActivityRow[]) || []);
      setTasks((tRes.data as TaskRow[]) || []);
      setDocs((dRes.data as DocRow[]) || []);
    } finally {
      setLoading(false);
    }
  }, [partnershipId]);

  useEffect(() => {
    if (opened && partnershipId) void load();
  }, [opened, partnershipId, load]);

  const saveField = async (patch: Partial<PartnershipRow>) => {
    if (!partnershipId) return;
    setSaving(true);
    try {
      const prevStatus = row?.status;
      const { error } = await supabase.from('partnerships').update(patch).eq('id', partnershipId);
      if (error) throw error;
      if (patch.status && patch.status !== prevStatus && patch.status === 'signed') {
        const r = await pushSignedToOnboarding(partnershipId);
        if (r.ok && !r.skipped) {
          notifications.show({ title: 'Onboarding', message: 'Checklist created for Ops.', color: 'teal' });
        }
      }
      notifications.show({ title: 'Saved', message: 'Deal updated.', color: 'green' });
      await load();
      onUpdated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      notifications.show({ title: 'Error', message: msg, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const logActivity = async () => {
    if (!partnershipId || !logTitle.trim()) {
      notifications.show({ title: 'Title required', message: 'Add a short title for this activity.', color: 'red' });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('partnership_activities').insert({
      partnership_id: partnershipId,
      activity_type: logType,
      title: logTitle.trim(),
      description: logBody.trim() || null,
      performed_at: logAt.toISOString(),
      performed_by: user?.id ?? null,
    });
    if (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
      return;
    }
    notifications.show({ title: 'Logged', message: 'Activity added.', color: 'green' });
    setLogOpened(false);
    setLogTitle('');
    setLogBody('');
    setLogAt(new Date());
    await load();
    onUpdated();
  };

  const addTask = async () => {
    if (!partnershipId || !taskTitle.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('partnership_tasks').insert({
      partnership_id: partnershipId,
      title: taskTitle.trim(),
      due_at: taskDue ? taskDue.toISOString() : null,
      owner_user_id: user?.id ?? null,
      created_by: user?.id ?? null,
    });
    if (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
      return;
    }
    setTaskTitle('');
    setTaskDue(null);
    await load();
    onUpdated();
  };

  const toggleTask = async (t: TaskRow) => {
    const { error } = await supabase
      .from('partnership_tasks')
      .update({
        completed: !t.completed,
        completed_at: !t.completed ? new Date().toISOString() : null,
      })
      .eq('id', t.id);
    if (!error) {
      await load();
      onUpdated();
    }
  };

  const addDoc = async () => {
    if (!partnershipId || !docName.trim() || !docUrl.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('partnership_documents').insert({
      partnership_id: partnershipId,
      document_name: docName.trim(),
      document_type: 'other',
      file_url: docUrl.trim(),
      uploaded_by: user?.id ?? null,
    });
    if (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
      return;
    }
    setDocName('');
    setDocUrl('');
    await load();
    onUpdated();
  };

  const primary = contacts.find((c) => c.is_primary) || contacts[0];
  const stale = stalenessProps(row?.last_activity_at ?? null);
  const dis = daysInStage(row?.stage_entered_at ?? null);

  return (
    <>
      <Drawer
        opened={opened}
        onClose={onClose}
        position="right"
        size="xl"
        padding="lg"
        title={
          <Group gap="xs" wrap="nowrap">
            <Title order={4} lineClamp={1} maw={280}>
              {row?.partner_name || 'Partner'}
            </Title>
          </Group>
        }
      >
        {loading || !row ? (
          <Text c="dimmed">Loading…</Text>
        ) : (
          <ScrollArea h="calc(100vh - 100px)" type="auto">
            <Stack gap="md" pr="xs">
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <Stack gap={4}>
                  <Group gap="xs">
                    <Select
                      label="Stage"
                      data={PIPELINE_STAGES.map((s) => ({ value: s.value, label: s.label }))}
                      value={row.status}
                      onChange={(v) => v && saveField({ status: v as PartnershipRow['status'] })}
                      disabled={saving}
                      w={220}
                    />
                    <Select
                      label="Priority"
                      data={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'strategic', label: 'Strategic' },
                        { value: 'critical', label: 'Critical' },
                      ]}
                      value={row.priority || 'medium'}
                      onChange={(v) => saveField({ priority: v || 'medium' })}
                      w={160}
                    />
                    <Select
                      label="Leverage score"
                      data={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                      ]}
                      value={row.leverage_score || ''}
                      clearable
                      placeholder="Set"
                      onChange={(v) => saveField({ leverage_score: v || null })}
                      w={150}
                    />
                  </Group>
                  <Group gap="xs">
                    <Badge color={stale.color} variant="light">{stale.label}</Badge>
                    {dis !== null && (
                      <Badge leftSection={<IconClock size={12} />} variant="outline" color="gray">
                        {dis}d in stage
                      </Badge>
                    )}
                    <Badge variant="dot" color="orange">{partnerTypeLabel(row.partner_type)}</Badge>
                  </Group>
                </Stack>
                <TextInput
                  label="Assigned to"
                  description="Owner name (e.g. CPO)"
                  value={row.assigned_to || ''}
                  onBlur={(e) => saveField({ assigned_to: e.target.value || null })}
                  w={220}
                />
              </Group>

              <Divider />

              <Group align="flex-start" grow>
                <Paper withBorder p="md" radius="md" style={{ flex: 1, minWidth: 260 }}>
                  <Title order={6} mb="xs">Relationship intelligence</Title>
                  <Text size="xs" c="dimmed" mb={4}>Decision maker</Text>
                  <Text size="sm" mb="sm">
                    {primary
                      ? `${primary.full_name}${primary.title ? ` — ${primary.title}` : ''}`
                      : 'No contact on file'}
                  </Text>
                  <Textarea
                    label="Notes (leverage, politics, hesitation)"
                    minRows={5}
                    value={row.relationship_intel || ''}
                    onChange={(e) => setRow({ ...row, relationship_intel: e.target.value })}
                    onBlur={(e) => saveField({ relationship_intel: e.target.value || null })}
                  />
                </Paper>
                <Paper withBorder p="md" radius="md" style={{ flex: 1, minWidth: 260 }}>
                  <Title order={6} mb="xs">Deal snapshot</Title>
                  <NumberInput
                    label="Est. locations / reach"
                    value={row.estimated_locations_reach ?? undefined}
                    onChange={(v) => setRow({ ...row, estimated_locations_reach: typeof v === 'number' ? v : null })}
                    onBlur={() => saveField({ estimated_locations_reach: row.estimated_locations_reach })}
                    min={0}
                    mb="sm"
                  />
                  <TextInput
                    label="Est. monthly volume impact"
                    description="$ or orders — your call"
                    value={row.estimated_monthly_volume_impact || ''}
                    onChange={(e) => setRow({ ...row, estimated_monthly_volume_impact: e.target.value })}
                    onBlur={() => saveField({ estimated_monthly_volume_impact: row.estimated_monthly_volume_impact || null })}
                    mb="sm"
                  />
                  <Select
                    label="Deal type"
                    data={DEAL_TYPE_OPTIONS}
                    value={row.deal_type || ''}
                    clearable
                    onChange={(v) => saveField({ deal_type: v || null })}
                    mb="sm"
                  />
                  <DatePickerInput
                    label="Timeline to close"
                    value={row.timeline_to_close ? new Date(row.timeline_to_close) : null}
                    onChange={(d) => saveField({ timeline_to_close: d ? d.toISOString().slice(0, 10) : null })}
                    clearable
                    mb="sm"
                  />
                  <Textarea
                    label="Deal snapshot notes"
                    minRows={3}
                    value={row.deal_snapshot_notes || ''}
                    onChange={(e) => setRow({ ...row, deal_snapshot_notes: e.target.value })}
                    onBlur={(e) => saveField({ deal_snapshot_notes: e.target.value || null })}
                  />
                </Paper>
              </Group>

              <Divider label="Activity" labelPosition="center" />
              <Group gap="xs">
                {ACTIVITY_TYPES.slice(0, 3).map((a) => (
                  <Button
                    key={a.value}
                    size="xs"
                    variant="light"
                    leftSection={<a.icon size={14} />}
                    onClick={() => {
                      setLogType(a.value);
                      setLogOpened(true);
                    }}
                  >
                    {a.label}
                  </Button>
                ))}
              </Group>

              <Timeline active={-1} bulletSize={24} lineWidth={2}>
                {activities.map((act) => {
                  const meta = ACTIVITY_TYPES.find((x) => x.value === act.activity_type) || ACTIVITY_TYPES[2];
                  return (
                    <Timeline.Item
                      key={act.id}
                      bullet={<ThemeIcon size={22} variant="light" color={meta.color}><meta.icon size={12} /></ThemeIcon>}
                      title={act.title}
                    >
                      <Text size="xs" c="dimmed">
                        {new Date(act.performed_at).toLocaleString()} · {act.activity_type}
                      </Text>
                      {act.description && <Text size="sm">{act.description}</Text>}
                    </Timeline.Item>
                  );
                })}
              </Timeline>
              {activities.length === 0 && (
                <Text size="sm" c="dimmed" ta="center">No activity yet — log a call or note.</Text>
              )}

              <Divider label="Next steps" labelPosition="center" />
              <Group align="flex-end">
                <TextInput
                  placeholder="Task (e.g. Send pricing)"
                  style={{ flex: 1 }}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
                <DatePickerInput
                  placeholder="Due"
                  value={taskDue}
                  onChange={setTaskDue}
                  clearable
                />
                <Button leftSection={<IconPlus size={16} />} onClick={addTask}>
                  Add
                </Button>
              </Group>
              <Stack gap="xs">
                {tasks.map((t) => (
                  <Group key={t.id} justify="space-between" wrap="nowrap">
                    <Checkbox
                      checked={t.completed}
                      label={t.title}
                      onChange={() => toggleTask(t)}
                    />
                    <Text size="xs" c="dimmed">
                      {t.due_at ? new Date(t.due_at).toLocaleDateString() : 'No due date'}
                    </Text>
                  </Group>
                ))}
                {tasks.length === 0 && <Text size="xs" c="dimmed">No tasks — add a next step.</Text>}
              </Stack>

              <Divider label="Documents" labelPosition="center" />
              <Group align="flex-end" grow>
                <TextInput label="Name" value={docName} onChange={(e) => setDocName(e.target.value)} />
                <TextInput label="Link (URL)" placeholder="https://…" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
                <Button onClick={addDoc}>Add link</Button>
              </Group>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Document</Table.Th>
                    <Table.Th>Link</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {docs.map((d) => (
                    <Table.Tr key={d.id}>
                      <Table.Td>{d.document_name}</Table.Td>
                      <Table.Td>
                        {d.file_url ? (
                          <Text component="a" href={d.file_url} target="_blank" rel="noreferrer" size="sm" c="orange">
                            Open
                          </Text>
                        ) : (
                          '—'
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              {docs.length === 0 && <Text size="xs" c="dimmed">No documents linked.</Text>}
            </Stack>
          </ScrollArea>
        )}
      </Drawer>

      <Modal opened={logOpened} onClose={() => setLogOpened(false)} title="Log activity" size="md">
        <Stack gap="md">
          <Select label="Type" data={ACTIVITY_TYPES.map((a) => ({ value: a.value, label: a.label }))} value={logType} onChange={(v) => setLogType(v || 'note')} />
          <TextInput label="Title" required value={logTitle} onChange={(e) => setLogTitle(e.target.value)} />
          <Textarea label="Details" value={logBody} onChange={(e) => setLogBody(e.target.value)} />
          <DateTimePicker label="When" value={logAt} onChange={(d) => d && setLogAt(d)} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setLogOpened(false)}>Cancel</Button>
            <Button color="orange" onClick={logActivity}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default PartnerDealDrawer;
