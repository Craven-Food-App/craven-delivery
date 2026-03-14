import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, Tag, Modal, Form, Input, Select, DatePicker, Empty, Spin, message, Typography, Segmented } from 'antd';
import { PlusOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';

const { TextArea } = Input;
const { Text } = Typography;

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

interface ExecUser {
  user_id: string;
  full_name: string;
  role: string;
}

const statusColors: Record<string, string> = {
  pending: 'default',
  in_progress: 'processing',
  completed: 'success',
};

const priorityColors: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

const TasksTab: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [execUsers, setExecUsers] = useState<ExecUser[]>([]);
  const [filter, setFilter] = useState<string>('assigned_to_me');
  const [form] = Form.useForm();

  const fetchTasks = useCallback(async (userId?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('internal_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set([...data.map((t: any) => t.assigned_to), ...data.map((t: any) => t.assigned_by)])];
        const { data: profiles } = await supabase
          .from('exec_users')
          .select('user_id, full_name')
          .in('user_id', userIds);
        const nameMap = new Map(profiles?.map((p: any) => [p.user_id, p.full_name]) || []);
        setTasks(data.map((t: any) => ({
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
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: execs } = await supabase
        .from('exec_users')
        .select('user_id, full_name, role');
      setExecUsers(execs || []);

      await fetchTasks(user?.id);
    };
    init();
  }, [fetchTasks]);

  const handleCreate = async (values: any) => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('internal_tasks').insert({
        title: values.title,
        description: values.description || null,
        assigned_to: values.assigned_to,
        assigned_by: currentUser.id,
        priority: values.priority || 'medium',
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
      });
      if (error) throw error;
      message.success('Task created');
      form.resetFields();
      setCreateOpen(false);
      fetchTasks(currentUser.id);
    } catch (err: any) {
      message.error('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (taskId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from('internal_tasks').update(updates).eq('id', taskId);
      if (error) throw error;
      message.success('Status updated');
      fetchTasks(currentUser?.id);
    } catch (err: any) {
      message.error('Update failed');
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (!currentUser) return true;
    if (filter === 'assigned_to_me') return t.assigned_to === currentUser.id;
    if (filter === 'assigned_by_me') return t.assigned_by === currentUser.id;
    return true;
  });

  const columns = [
    {
      title: 'Task',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Task) => (
        <div>
          <Text strong>{title}</Text>
          {record.description && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {record.description.length > 80 ? record.description.slice(0, 80) + '...' : record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (p: string) => <Tag color={priorityColors[p]}>{p}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string, record: Task) => (
        <Select
          value={s}
          size="small"
          style={{ width: 110 }}
          onChange={(val) => updateStatus(record.id, val)}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
      ),
    },
    {
      title: 'Assignee',
      dataIndex: 'assignee_name',
      key: 'assignee',
      width: 140,
      responsive: ['md'] as any,
    },
    {
      title: 'Due',
      dataIndex: 'due_date',
      key: 'due',
      width: 100,
      responsive: ['md'] as any,
      render: (d: string | null) => {
        if (!d) return '-';
        const isOverdue = new Date(d) < new Date() ;
        return <Text type={isOverdue ? 'danger' : undefined}>{new Date(d).toLocaleDateString()}</Text>;
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Segmented
          value={filter}
          onChange={(val) => setFilter(val as string)}
          options={[
            { value: 'assigned_to_me', label: 'Assigned to Me' },
            { value: 'assigned_by_me', label: 'Assigned by Me' },
            { value: 'all', label: 'All' },
          ]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}
          style={{ background: '#FF6B35', borderColor: '#FF6B35' }}>
          New Task
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      ) : filteredTasks.length === 0 ? (
        <Empty description="No tasks" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table
          columns={columns}
          dataSource={filteredTasks}
          rowKey="id"
          pagination={{ pageSize: 15 }}
          size="small"
          scroll={{ x: 500 }}
        />
      )}

      <Modal
        title="Create Task"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Enter title' }]}>
            <Input placeholder="Task title" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Optional description..." />
          </Form.Item>
          <Form.Item name="assigned_to" label="Assign To" rules={[{ required: true, message: 'Select assignee' }]}>
            <Select
              placeholder="Select person"
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={execUsers.map(e => ({ value: e.user_id, label: `${e.full_name} (${e.role})` }))}
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="priority" label="Priority" style={{ flex: 1 }}>
              <Select defaultValue="medium" options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]} />
            </Form.Item>
            <Form.Item name="due_date" label="Due Date" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}
              style={{ background: '#FF6B35', borderColor: '#FF6B35' }}>
              Create
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TasksTab;
