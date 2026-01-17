import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, Badge, Tag, Typography, message, Popconfirm, Tabs, Descriptions, Divider } from 'antd';
import { PlusOutlined, MessageOutlined, CheckCircleOutlined, CloseCircleOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { useITHelpDeskTickets, useITHelpDeskMessages } from '@/hooks/useTechSupport';
import type { ITHelpDeskTicket, ITHelpDeskMessage } from '@/types/tech-support';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

export default function ITHelpDeskDashboard() {
  const [tickets, setTickets] = useState<ITHelpDeskTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ITHelpDeskTicket | null>(null);
  const [editingTicket, setEditingTicket] = useState<ITHelpDeskTicket | null>(null);
  const [form] = Form.useForm();
  const [messageForm] = Form.useForm();
  const { tickets: fetchedTickets, loading: ticketsLoading, refetch } = useITHelpDeskTickets();
  const [messages, setMessages] = useState<ITHelpDeskMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    setTickets(fetchedTickets);
  }, [fetchedTickets]);

  const handleCreate = () => {
    setEditingTicket(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (ticket: ITHelpDeskTicket) => {
    setEditingTicket(ticket);
    form.setFieldsValue(ticket);
    setModalVisible(true);
  };

  const handleViewMessages = async (ticket: ITHelpDeskTicket) => {
    setSelectedTicket(ticket);
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('it_help_desk_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as ITHelpDeskMessage[]);
      setMessageModalVisible(true);
    } catch (error: any) {
      message.error(error.message || 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (values: any) => {
    if (!selectedTicket) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('it_help_desk_messages').insert({
        ticket_id: selectedTicket.id,
        sender_id: user?.id,
        message: values.message,
        is_internal: values.is_internal || false,
      });

      if (error) throw error;
      message.success('Message sent successfully');
      messageForm.resetFields();
      handleViewMessages(selectedTicket);
    } catch (error: any) {
      message.error(error.message || 'Failed to send message');
    }
  };

  const handleSave = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingTicket) {
        const { error } = await supabase
          .from('it_help_desk_tickets')
          .update({
            ...values,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTicket.id);

        if (error) throw error;
        message.success('Ticket updated successfully');
      } else {
        // Generate ticket number
        let ticketNumber = `IT-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
        // Try to use RPC function if available, otherwise use generated number
        try {
          const { data: rpcNumber, error: numError } = await supabase.rpc('generate_ticket_number');
          if (!numError && rpcNumber) ticketNumber = rpcNumber;
        } catch (e) {
          // Use generated number if RPC fails
        }

        const { error } = await supabase.from('it_help_desk_tickets').insert({
          ...values,
          requester_id: user?.id,
          ticket_number: ticketNumber,
        });

        if (error) throw error;
        message.success('Ticket created successfully');
      }
      setModalVisible(false);
      refetch();
    } catch (error: any) {
      message.error(error.message || 'Failed to save ticket');
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'resolved' || newStatus === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('it_help_desk_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;
      message.success('Ticket status updated');
      refetch();
    } catch (error: any) {
      message.error(error.message || 'Failed to update status');
    }
  };

  const handleAssign = async (ticketId: string, assigneeId: string) => {
    try {
      const { error } = await supabase
        .from('it_help_desk_tickets')
        .update({
          assigned_to: assigneeId,
          status: 'in_progress',
        })
        .eq('id', ticketId);

      if (error) throw error;
      message.success('Ticket assigned successfully');
      refetch();
    } catch (error: any) {
      message.error(error.message || 'Failed to assign ticket');
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (activeTab === 'all') return true;
    return ticket.status === activeTab;
  });

  const priorityColors: Record<string, string> = {
    low: 'default',
    medium: 'processing',
    high: 'warning',
    urgent: 'error',
  };

  const statusColors: Record<string, string> = {
    open: 'default',
    in_progress: 'processing',
    waiting_user: 'warning',
    resolved: 'success',
    closed: 'default',
  };

  const columns = [
    {
      title: 'Ticket #',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      width: 120,
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => <Tag>{category}</Tag>,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => <Badge status={priorityColors[priority] as any} text={priority} />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => <Badge status={statusColors[status] as any} text={status} />,
    },
    {
      title: 'Requester',
      dataIndex: ['requester', 'email'],
      key: 'requester',
      width: 150,
    },
    {
      title: 'Assigned To',
      dataIndex: ['assignee', 'email'],
      key: 'assignee',
      width: 150,
      render: (email: string) => email || <Text type="secondary">Unassigned</Text>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: ITHelpDeskTicket) => (
        <Space>
          <Button size="small" icon={<MessageOutlined />} onClick={() => handleViewMessages(record)}>
            Messages
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            Edit
          </Button>
          {record.status !== 'resolved' && record.status !== 'closed' && (
            <Select
              size="small"
              style={{ width: 120 }}
              value={record.status}
              onChange={(value) => handleStatusChange(record.id, value)}
            >
              <Select.Option value="open">Open</Select.Option>
              <Select.Option value="in_progress">In Progress</Select.Option>
              <Select.Option value="waiting_user">Waiting User</Select.Option>
              <Select.Option value="resolved">Resolved</Select.Option>
              <Select.Option value="closed">Closed</Select.Option>
            </Select>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <Title level={4} className="m-0">IT Help Desk</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          New Ticket
        </Button>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={`All (${tickets.length})`} key="all" />
          <TabPane tab={`Open (${tickets.filter(t => t.status === 'open').length})`} key="open" />
          <TabPane tab={`In Progress (${tickets.filter(t => t.status === 'in_progress').length})`} key="in_progress" />
          <TabPane tab={`Resolved (${tickets.filter(t => t.status === 'resolved').length})`} key="resolved" />
        </Tabs>

        <Table
          loading={ticketsLoading}
          dataSource={filteredTickets}
          rowKey="id"
          columns={columns}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* Create/Edit Ticket Modal */}
      <Modal
        title={editingTicket ? 'Edit Ticket' : 'New IT Help Desk Ticket'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} onFinish={handleSave} layout="vertical">
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input placeholder="Brief description of the issue" />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="hardware">Hardware</Select.Option>
              <Select.Option value="software">Software</Select.Option>
              <Select.Option value="access">Access Request</Select.Option>
              <Select.Option value="password_reset">Password Reset</Select.Option>
              <Select.Option value="network">Network</Select.Option>
              <Select.Option value="email">Email</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="low">Low</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="urgent">Urgent</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <TextArea rows={6} placeholder="Detailed description of the issue..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Messages Modal */}
      <Modal
        title={`Messages - ${selectedTicket?.ticket_number}`}
        open={messageModalVisible}
        onCancel={() => setMessageModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedTicket && (
          <>
            <Descriptions column={2} bordered size="small" className="mb-4">
              <Descriptions.Item label="Subject">{selectedTicket.subject}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status={statusColors[selectedTicket.status] as any} text={selectedTicket.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Category">{selectedTicket.category}</Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Badge status={priorityColors[selectedTicket.priority] as any} text={selectedTicket.priority} />
              </Descriptions.Item>
            </Descriptions>

            <Divider>Conversation</Divider>

            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
              {messagesLoading ? (
                <div className="text-center p-4">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center p-4 text-gray-400">No messages yet</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="mb-4 p-3 bg-gray-50 rounded">
                    <div className="flex justify-between mb-2">
                      <Text strong>{msg.sender?.email || 'Unknown'}</Text>
                      <Text type="secondary">{new Date(msg.created_at).toLocaleString()}</Text>
                    </div>
                    {msg.is_internal && <Tag color="orange" className="mb-2">Internal Note</Tag>}
                    <Text>{msg.message}</Text>
                  </div>
                ))
              )}
            </div>

            <Form form={messageForm} onFinish={handleSendMessage} layout="vertical">
              <Form.Item name="message" rules={[{ required: true }]}>
                <TextArea rows={3} placeholder="Type your message..." />
              </Form.Item>
              <Form.Item name="is_internal" valuePropName="checked">
                <input type="checkbox" /> Internal Note (not visible to requester)
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  Send Message
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}

