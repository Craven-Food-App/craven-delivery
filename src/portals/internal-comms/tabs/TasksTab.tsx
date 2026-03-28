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
  Loader,
  Center,
  Badge,
  SegmentedControl,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { MantineTable } from '@/components/cfo/MantineTable';
import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  assignee_name?: string;
  assigner_name?: string;
}

interface Recipient {
  user_id: string;
  label: string;
}

const priorityBadgeColor = (p: string) => {
  if (p === 'urgent') return 'red';
  if (p === 'high') return 'orange';
  if (p === 'medium') return 'blue';
  return 'gray';
};

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const TasksTab: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [filter, setFilter] = useState<string>('assigned_to_me');

  const form = useForm({
    initialValues: {
      title: '',
      description: '',
      assigned_to: '',
      priority: 'medium',
      due_date: null as Date | null,
    },
    validate: {
      title: (v) => (!v?.trim() ? 'Enter title' : null),
      assigned_to: (v) => (!v ? 'Select assignee' : null),
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

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('internal_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set([
          ...data.map((t: Task) => t.assigned_to),
          ...data.map((t: Task) => t.assigned_by),
        ])];
        const nameMap = await getNameMap(userIds);
        setTasks(data.map((t: Task) => ({
          ...t,
          assignee_name: nameMap.get(t.assigned_to) || 'Unknown',
          assigner_name: nameMap.get(t.assigned_by) || 'Unknown',
        })));
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [getNameMap]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: execs } = await supabase
        .from('exec_users')
        .select('user_id, role, title');

      if (execs && execs.length > 0) {
        const userIds = execs.map((e: { user_id: string }) => e.user_id);
        const nameMap = await getNameMap(userIds);
        setRecipients(execs.map((e: { user_id: string; role: string; title: string | null }) => ({
          user_id: e.user_id,
          label: `${nameMap.get(e.user_id) || e.role} (${e.title || e.role})`,
        })));
      }

      await fetchTasks();
    };
    void init();
  }, [fetchTasks, getNameMap]);

  const handleCreate = form.onSubmit(async (values) => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('internal_tasks').insert([{
        title: values.title,
        description: values.description.trim() ? values.description : null,
        assigned_to: values.assigned_to,
        assigned_by: currentUser.id,
        priority: (values.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
        due_date: values.due_date ? values.due_date.toISOString().split('T')[0] : null,
      }]);
      if (error) throw error;
      notifications.show({ title: 'Created', message: 'Task created', color: 'green' });
      form.reset();
      setCreateOpen(false);
      fetchTasks();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed';
      notifications.show({ title: 'Error', message, color: 'red' });
    } finally {
      setSaving(false);
    }
  });

  const updateStatus = async (taskId: string, newStatus: string) => {
    try {
      const updates: { status: string; completed_at?: string } = { status: newStatus };
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from('internal_tasks').update(updates).eq('id', taskId);
      if (error) throw error;
      notifications.show({ message: 'Status updated', color: 'green' });
      fetchTasks();
    } catch {
      notifications.show({ message: 'Update failed', color: 'red' });
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (!currentUser) return true;
    if (filter === 'assigned_to_me') return t.assigned_to === currentUser.id;
    if (filter === 'assigned_by_me') return t.assigned_by === currentUser.id;
    return true;
  });

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          data={[
            { value: 'assigned_to_me', label: 'Assigned to Me' },
            { value: 'assigned_by_me', label: 'Assigned by Me' },
            { value: 'all', label: 'All' },
          ]}
        />
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => setCreateOpen(true)}
          styles={{ root: { backgroundColor: '#FF6B35' } }}
        >
          New Task
        </Button>
      </Group>

      {loading ? (
        <Center py={40}>
          <Loader size="lg" />
        </Center>
      ) : filteredTasks.length === 0 ? (
        <Text c="dimmed" ta="center" py={40}>No tasks</Text>
      ) : (
        <MantineTable
          data={filteredTasks}
          rowKey="id"
          size="small"
          scroll={{ x: 500 }}
          pagination={{ pageSize: 15 }}
          columns={[
            {
              title: 'Task',
              dataIndex: 'title',
              render: (title: string, record: Task) => (
                <Stack gap={4}>
                  <Text fw={700} size="sm">{title}</Text>
                  {record.description && (
                    <Text size="xs" c="dimmed">
                      {record.description.length > 80 ? `${record.description.slice(0, 80)}…` : record.description}
                    </Text>
                  )}
                </Stack>
              ),
            },
            {
              title: 'Priority',
              dataIndex: 'priority',
              width: 100,
              render: (p: string) => <Badge color={priorityBadgeColor(p)} variant="light" size="sm">{p}</Badge>,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 140,
              render: (s: string, record: Task) => (
                <Select
                  size="xs"
                  w={130}
                  value={s}
                  onChange={(val) => val && updateStatus(record.id, val)}
                  data={statusOptions}
                />
              ),
            },
            {
              title: 'Assignee',
              dataIndex: 'assignee_name',
              width: 140,
            },
            {
              title: 'Due',
              dataIndex: 'due_date',
              width: 110,
              render: (d: string | null) => {
                if (!d) return '-';
                const isOverdue = new Date(d) < new Date();
                return (
                  <Text size="sm" c={isOverdue ? 'red' : undefined}>
                    {new Date(d).toLocaleDateString()}
                  </Text>
                );
              },
            },
          ]}
        />
      )}

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Create Task" size="md">
        <form onSubmit={handleCreate}>
          <Stack gap="md">
            <TextInput label="Title" placeholder="Task title" {...form.getInputProps('title')} />
            <Textarea label="Description" placeholder="Optional description..." minRows={3} {...form.getInputProps('description')} />
            <Select
              label="Assign To"
              placeholder="Select person"
              searchable
              data={recipients.map((r) => ({ value: r.user_id, label: r.label }))}
              {...form.getInputProps('assigned_to')}
            />
            <Group grow align="flex-start">
              <Select
                label="Priority"
                data={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
                {...form.getInputProps('priority')}
              />
              <DatePickerInput
                label="Due Date"
                placeholder="Optional"
                clearable
                value={form.values.due_date}
                onChange={(d) => form.setFieldValue('due_date', d)}
              />
            </Group>
            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" loading={saving} styles={{ root: { backgroundColor: '#FF6B35' } }}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};

export default TasksTab;
