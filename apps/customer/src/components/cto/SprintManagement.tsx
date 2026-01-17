import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, Space, Badge, Tag, Progress, Row, Col, Statistic, Typography, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInDays } from 'date-fns';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;

export default function SprintManagement() {
  const [sprints, setSprints] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [developers, setDevelopers] = useState<any[]>([]);
  const [activeSprint, setActiveSprint] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sprintModalVisible, setSprintModalVisible] = useState(false);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [editingSprint, setEditingSprint] = useState<any>(null);
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [sprintForm] = Form.useForm();
  const [ticketForm] = Form.useForm();

  useEffect(() => {
    fetchSprints();
    fetchTickets();
    fetchDevelopers();
  }, []);

  const fetchSprints = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('cto_sprints')
        .select('*')
        .order('created_at', { ascending: false });

      setSprints(data || []);
      const active = (data || []).find(s => s.status === 'active');
      setActiveSprint(active);
    } catch (error) {
      console.error('Error fetching sprints:', error);
      message.error('Failed to load sprints');
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data } = await supabase
        .from('cto_sprint_tickets')
        .select('*, cto_sprints(sprint_name)')
        .order('created_at', { ascending: false });

      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchDevelopers = async () => {
    try {
      const { data } = await supabase
        .from('cto_developers')
        .select('id, full_name, email');

      setDevelopers(data || []);
    } catch (error) {
      console.error('Error fetching developers:', error);
    }
  };

  const handleCreateSprint = () => {
    setEditingSprint(null);
    sprintForm.resetFields();
    setSprintModalVisible(true);
  };

  const handleEditSprint = (sprint: any) => {
    setEditingSprint(sprint);
    sprintForm.setFieldsValue({
      ...sprint,
      start_date: sprint.start_date ? dayjs(sprint.start_date) : null,
      end_date: sprint.end_date ? dayjs(sprint.end_date) : null,
    });
    setSprintModalVisible(true);
  };

  const handleSaveSprint = async (values: any) => {
    try {
      const sprintData = {
        ...values,
        start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
      };

      if (editingSprint) {
        await supabase.from('cto_sprints').update(sprintData).eq('id', editingSprint.id);
        message.success('Sprint updated successfully');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('cto_sprints').insert({
          ...sprintData,
          created_by: user?.id,
        });
        message.success('Sprint created successfully');
      }
      setSprintModalVisible(false);
      fetchSprints();
    } catch (error: any) {
      message.error(error.message || 'Failed to save sprint');
    }
  };

  const handleCreateTicket = () => {
    setEditingTicket(null);
    ticketForm.resetFields();
    ticketForm.setFieldsValue({ sprint_id: activeSprint?.id });
    setTicketModalVisible(true);
  };

  const handleEditTicket = (ticket: any) => {
    setEditingTicket(ticket);
    ticketForm.setFieldsValue(ticket);
    setTicketModalVisible(true);
  };

  const handleSaveTicket = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingTicket) {
        await supabase.from('cto_sprint_tickets').update(values).eq('id', editingTicket.id);
        message.success('Ticket updated successfully');
      } else {
        const ticketNumber = `TICK-${Date.now()}`;
        await supabase.from('cto_sprint_tickets').insert({
          ...values,
          ticket_number: ticketNumber,
          created_by: user?.id,
        });
        message.success('Ticket created successfully');
      }
      setTicketModalVisible(false);
      fetchTickets();
    } catch (error: any) {
      message.error(error.message || 'Failed to save ticket');
    }
  };

  const handleDeleteTicket = async (id: string) => {
    try {
      await supabase.from('cto_sprint_tickets').delete().eq('id', id);
      message.success('Ticket deleted successfully');
      fetchTickets();
    } catch (error: any) {
      message.error(error.message || 'Failed to delete ticket');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      todo: 'default',
      in_progress: 'processing',
      review: 'warning',
      testing: 'cyan',
      done: 'success',
      blocked: 'error',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'default',
      normal: 'blue',
      high: 'orange',
      critical: 'red',
    };
    return colors[priority] || 'default';
  };

  const activeTickets = tickets.filter(t => t.sprint_id === activeSprint?.id);
  const doneTickets = activeTickets.filter(t => t.status === 'done').length;
  const totalTickets = activeTickets.length;
  const sprintProgress = totalTickets > 0 ? Math.round((doneTickets / totalTickets) * 100) : 0;

  return (
    <div>
      <Space className="mb-4" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Title level={4} className="m-0">Sprint Management</Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateSprint}>
            New Sprint
          </Button>
          <Button icon={<PlusOutlined />} onClick={handleCreateTicket} disabled={!activeSprint}>
            New Ticket
          </Button>
        </Space>
      </Space>

      {activeSprint && (
        <Card className="mb-4" style={{ background: '#f0f5ff' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="Active Sprint" value={activeSprint.sprint_name} />
            </Col>
            <Col span={6}>
              <Statistic title="Progress" value={sprintProgress} suffix="%" />
              <Progress percent={sprintProgress} size="small" />
            </Col>
            <Col span={6}>
              <Statistic title="Completed" value={doneTickets} suffix={`/ ${totalTickets}`} />
            </Col>
            <Col span={6}>
              <Statistic title="Days Remaining" value={differenceInDays(parseISO(activeSprint.end_date), new Date())} suffix="days" />
            </Col>
          </Row>
        </Card>
      )}

      <Card title="Sprints" className="mb-4">
        <Table
          dataSource={sprints}
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={[
            {
              title: 'Sprint Name',
              dataIndex: 'sprint_name',
              key: 'sprint_name',
              render: (text, record) => (
                <Space>
                  <Text strong={record.status === 'active'}>{text}</Text>
                  {record.status === 'active' && <Badge status="processing" text="Active" />}
                </Space>
              ),
            },
            {
              title: 'Start Date',
              dataIndex: 'start_date',
              key: 'start_date',
              render: (val) => format(parseISO(val), 'MMM dd, yyyy'),
            },
            {
              title: 'End Date',
              dataIndex: 'end_date',
              key: 'end_date',
              render: (val) => format(parseISO(val), 'MMM dd, yyyy'),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status) => (
                <Tag color={status === 'active' ? 'green' : status === 'completed' ? 'blue' : 'default'}>
                  {status}
                </Tag>
              ),
            },
            {
              title: 'Goal',
              dataIndex: 'goal',
              key: 'goal',
              ellipsis: true,
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => handleEditSprint(record)} />
                  {record.status === 'active' && (
                    <Button size="small" onClick={() => {
                      setActiveSprint(record);
                      fetchTickets();
                    }}>
                      View Tickets
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card title={activeSprint ? `${activeSprint.sprint_name} - Tickets` : 'Tickets'}>
        <Table
          dataSource={activeSprint ? tickets.filter(t => t.sprint_id === activeSprint.id) : tickets}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          columns={[
            {
              title: 'Ticket #',
              dataIndex: 'ticket_number',
              key: 'ticket_number',
              render: (text) => <Text code>{text}</Text>,
            },
            {
              title: 'Title',
              dataIndex: 'title',
              key: 'title',
            },
            {
              title: 'Type',
              dataIndex: 'ticket_type',
              key: 'ticket_type',
              render: (type) => <Tag>{type}</Tag>,
            },
            {
              title: 'Priority',
              dataIndex: 'priority',
              key: 'priority',
              render: (priority) => <Tag color={getPriorityColor(priority)}>{priority}</Tag>,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status) => <Badge status={getStatusColor(status) as any} text={status} />,
            },
            {
              title: 'Assigned To',
              dataIndex: 'assigned_to',
              key: 'assigned_to',
              render: (userId) => {
                const dev = developers.find(d => d.user_id === userId);
                return dev ? <Text>{dev.user?.email || 'Unknown'}</Text> : <Text type="secondary">Unassigned</Text>;
              },
            },
            {
              title: 'Story Points',
              dataIndex: 'story_points',
              key: 'story_points',
              render: (points) => points || '-',
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => handleEditTicket(record)} />
                  <Popconfirm title="Delete this ticket?" onConfirm={() => handleDeleteTicket(record.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Sprint Modal */}
      <Modal
        title={editingSprint ? 'Edit Sprint' : 'Create Sprint'}
        open={sprintModalVisible}
        onCancel={() => setSprintModalVisible(false)}
        onOk={() => sprintForm.submit()}
        width={600}
      >
        <Form form={sprintForm} onFinish={handleSaveSprint} layout="vertical">
          <Form.Item name="sprint_name" label="Sprint Name" rules={[{ required: true }]}>
            <Input placeholder="Sprint 2024-01" />
          </Form.Item>
          <Form.Item name="goal" label="Sprint Goal">
            <TextArea rows={3} placeholder="What are we trying to achieve this sprint?" />
          </Form.Item>
          <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="end_date" label="End Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="planning">Planning</Select.Option>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="completed">Completed</Select.Option>
              <Select.Option value="cancelled">Cancelled</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="velocity_target" label="Velocity Target">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Ticket Modal */}
      <Modal
        title={editingTicket ? 'Edit Ticket' : 'Create Ticket'}
        open={ticketModalVisible}
        onCancel={() => setTicketModalVisible(false)}
        onOk={() => ticketForm.submit()}
        width={700}
      >
        <Form form={ticketForm} onFinish={handleSaveTicket} layout="vertical">
          <Form.Item name="sprint_id" label="Sprint" rules={[{ required: true }]}>
            <Select>
              {sprints.map(s => (
                <Select.Option key={s.id} value={s.id}>{s.sprint_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Implement new feature" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Detailed description of the ticket" />
          </Form.Item>
          <Form.Item name="ticket_type" label="Type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="feature">Feature</Select.Option>
              <Select.Option value="bug">Bug</Select.Option>
              <Select.Option value="task">Task</Select.Option>
              <Select.Option value="epic">Epic</Select.Option>
              <Select.Option value="spike">Spike</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="low">Low</Select.Option>
              <Select.Option value="normal">Normal</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="critical">Critical</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="todo">To Do</Select.Option>
              <Select.Option value="in_progress">In Progress</Select.Option>
              <Select.Option value="review">Review</Select.Option>
              <Select.Option value="testing">Testing</Select.Option>
              <Select.Option value="done">Done</Select.Option>
              <Select.Option value="blocked">Blocked</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="assigned_to" label="Assign To">
            <Select placeholder="Select developer" allowClear>
              {developers.map(d => (
                <Select.Option key={d.user_id} value={d.user_id}>
                  {d.user?.email || 'Unknown'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="story_points" label="Story Points">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="estimated_hours" label="Estimated Hours">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="blocker_reason" label="Blocker Reason">
            <TextArea rows={2} placeholder="If blocked, explain why" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

