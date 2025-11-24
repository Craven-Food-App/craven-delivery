// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Card, List, Button, Modal, Form, Input, Select, Tag, Avatar, message as antdMessage, 
  Badge, Space, Typography, Divider, Empty, Spin, Tooltip, Alert, Tabs
} from 'antd';
import {
  MessageOutlined,
  SendOutlined,
  UserOutlined,
  WarningOutlined,
  CheckOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  MailOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  SafetyOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import BusinessEmailSystem from '@/components/executive/BusinessEmailSystem';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { TextArea } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

const sanitizeHandle = (handle: string) =>
  (handle || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();

const generateHandleFromTitle = (title?: string | null, role?: string | null) => {
  const base = title || role || '';
  if (!base) return '';
  return sanitizeHandle(
    base
      .split(/\s+/)
      .map((word, idx) => (idx === 0 ? word : word[0]))
      .join(''),
  );
};

interface Message {
  id: string;
  from_user_id: string;
  from_user?: {
    id: string;
    title: string;
    role: string;
    mention_handle?: string;
  };
  to_user_ids: string[];
  subject: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_confidential: boolean;
  read_by: string[];
  created_at: string;
  trashed_for?: string[];
  delete_mark_for?: string[];
}

interface Contact {
  id: string;
  name: string;
  title: string;
  role: string;
  type: 'executive' | 'admin';
  email?: string;
  mention_handle?: string | null;
  allow_direct_messages?: boolean | null;
}

export const ExecutiveComms: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentExecId, setCurrentExecId] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterUnread, setFilterUnread] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');

  useEffect(() => {
    initializeComms();
  }, []);

  useEffect(() => {
    if (currentExecId) {
      // Subscribe to real-time message updates
      const subscription = supabase
        .channel('exec_messages_channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'exec_messages',
          },
          (payload) => {
            console.log('Real-time message update:', payload);
            fetchMessages(); // Refresh messages on any change
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [currentExecId]);

  const initializeComms = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        antdMessage.error('Please log in to access communications');
        return;
      }

      setCurrentUserId(user.id);

      // Get current exec user record
      const { data: execData, error: execError } = await supabase
        .from('exec_users')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (execError) {
        // Try CEO bypass
        if (user.email === 'tstroman.ceo@cravenusa.com') {
          const { data: ceoExec } = await supabase
            .from('exec_users')
            .select('id')
            .eq('role', 'ceo')
            .single();
          
          if (ceoExec) {
            setCurrentExecId(ceoExec.id);
          }
        }
      } else if (execData) {
        setCurrentExecId(execData.id);
      }

      await Promise.all([
        fetchMessages(),
        fetchContacts()
      ]);

    } catch (error) {
      console.error('Error initializing comms:', error);
      antdMessage.error('Failed to initialize communications');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      // Fetch executives from exec_users
      let execData: any[] | null = null;
      const execResponse = await supabase
        .from('exec_users')
        .select('id, role, title, user_id, metadata');

      if (execResponse.error) {
        if (execResponse.error.code === '42703') {
          // metadata column missing – fallback to basic select
          const fallback = await supabase
            .from('exec_users')
            .select('id, role, title, user_id');
          if (fallback.error) throw fallback.error;
          execData = fallback.data || [];
        } else {
          throw execResponse.error;
        }
      } else {
        execData = execResponse.data || [];
      }

      // Fetch admin employees
      const { data: employeeData, error: empError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, position, email, department_id, departments(name)')
        .in('position', [
          'Chief Executive Officer',
          'Chief Financial Officer', 
          'Chief Operating Officer', 
          'Chief Technology Officer',
          'Chief Marketing Officer',
          'Chief Product Officer',
          'Administrator',
          'Senior Administrator'
        ])
        .eq('employment_status', 'active');

      if (empError) console.warn('Error fetching employees:', empError);

      // Map executives
      const executives: Contact[] = (execData || [])
        .map((exec) => {
          const communications = exec?.metadata?.communications || {};
          const allowDirect =
            communications?.allow_direct_messages ?? true;
          const mentionHandle =
            communications?.mention_handle ||
            generateHandleFromTitle(exec?.title, exec?.role) ||
            sanitizeHandle(exec?.id);

          return {
            id: exec.id,
            name: exec.title || exec.role?.toUpperCase() || exec.id,
            title: exec.title,
            role: exec.role,
            type: 'executive' as const,
            mention_handle: mentionHandle,
            allow_direct_messages: allowDirect,
          };
        })
        .filter((exec) => exec.allow_direct_messages ?? true);

      // Map employees
      const employees: Contact[] = (employeeData || []).map(emp => ({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        title: emp.position,
        role: (emp.departments as any)?.name || 'admin',
        type: 'admin' as const,
        email: emp.email
      }));

      const allContacts = [...executives, ...employees];
      setContacts(allContacts);

    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchMessages = async () => {
    if (!currentExecId) return;

    try {
      const { data, error } = await supabase
        .from('exec_messages')
        .select('*')
        .or(`from_user_id.eq.${currentExecId},to_user_ids.cs.{${currentExecId}}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching messages:', error);
        // Don't show error to user, just use empty array
        setMessages([]);
        return;
      }

      // Fetch sender details for each message
      const messagesWithSenders = await Promise.all(
        (data || []).map(async (msg) => {
          const senderResponse = await supabase
            .from('exec_users')
            .select('id, title, role, metadata')
            .eq('id', msg.from_user_id)
            .maybeSingle();

          if (senderResponse.error?.code === '42703') {
            // Retry without metadata
            const fallback = await supabase
              .from('exec_users')
              .select('id, title, role')
              .eq('id', msg.from_user_id)
              .maybeSingle();

            if (fallback.data) {
              return {
                ...msg,
                from_user: {
                  id: fallback.data.id,
                  title: fallback.data.title,
                  role: fallback.data.role,
                  mention_handle:
                    generateHandleFromTitle(fallback.data.title, fallback.data.role) ||
                    sanitizeHandle(fallback.data.id),
                },
              };
            }
            return msg;
          }

          if (!senderResponse.data) {
            return msg;
          }

          const communications =
            senderResponse.data?.metadata?.communications || {};
          const mentionHandle =
            communications?.mention_handle ||
            generateHandleFromTitle(senderResponse.data?.title, senderResponse.data?.role) ||
            sanitizeHandle(senderResponse.data?.id);

          return {
            ...msg,
            from_user: {
              id: senderResponse.data.id,
              title: senderResponse.data.title,
              role: senderResponse.data.role,
              mention_handle: mentionHandle,
            },
          };
        })
      );

      setMessages(messagesWithSenders);
    } catch (error) {
      console.error('Error in fetchMessages:', error);
      setMessages([]);
    }
  };

  const sendMessage = async (values: any) => {
    if (!currentExecId) {
      antdMessage.error('Unable to send message: User not found');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('exec_messages')
        .insert({
          from_user_id: currentExecId,
          to_user_ids: values.recipients,
          subject: values.subject,
          message: values.message,
          priority: values.priority || 'normal',
          is_confidential: values.is_confidential || false,
          trashed_for: [],
          delete_mark_for: []
        })
        .select()
        .single();

      if (error) throw error;

      // Log to audit trail
      await logAuditTrail('message_sent', {
        message_id: data.id,
        recipients: values.recipients.length,
        priority: values.priority,
        subject: values.subject
      });

      antdMessage.success('Message sent successfully');
      setModalVisible(false);
      form.resetFields();
      fetchMessages();

    } catch (error) {
      console.error('Error sending message:', error);
      antdMessage.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    if (!currentExecId) return;

    try {
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;

      const updatedReadBy = [...(msg.read_by || [])];
      if (!updatedReadBy.includes(currentExecId)) {
        updatedReadBy.push(currentExecId);
      }

      const { error } = await supabase
        .from('exec_messages')
        .update({ read_by: updatedReadBy })
        .eq('id', messageId);

      if (error) throw error;

      fetchMessages();

    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const logAuditTrail = async (action: string, details: any) => {
    try {
      await supabase
        .from('exec_audit_logs')
        .insert({
          user_id: currentExecId,
          action_type: action,
          action_category: 'communications',
          target_type: 'message',
          details: details,
          severity: 'normal'
        });
    } catch (error) {
      console.error('Error logging audit trail:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'default',
      normal: 'blue',
      high: 'orange',
      urgent: 'red',
    };
    return colors[priority] || 'default';
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'urgent') return <WarningOutlined />;
    if (priority === 'high') return <ClockCircleOutlined />;
    return null;
  };

  const moveMessageToTrash = async (msg: Message) => {
    if (!currentExecId) return;
    const updatedTrashed = Array.from(
      new Set([...(msg.trashed_for || []), currentExecId]),
    );

    try {
      const { error } = await supabase
        .from('exec_messages')
        .update({ trashed_for: updatedTrashed })
        .eq('id', msg.id);

      if (error) throw error;

      await logAuditTrail('message_trashed', {
        message_id: msg.id,
      });

      antdMessage.success('Message moved to trash');
      fetchMessages();
    } catch (error) {
      console.error('Error moving message to trash:', error);
      antdMessage.error('Failed to move message to trash');
    }
  };

  const permanentlyDeleteMessage = async (msg: Message) => {
    if (!currentExecId) return;
    const updatedDeleteMark = Array.from(
      new Set([...(msg.delete_mark_for || []), currentExecId]),
    );

    try {
      const { error } = await supabase
        .from('exec_messages')
        .update({ delete_mark_for: updatedDeleteMark })
        .eq('id', msg.id);

      if (error) throw error;

      await logAuditTrail('message_delete_marked', {
        message_id: msg.id,
      });

      antdMessage.success('Message deleted. CEO review pending for purge.');
      fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      antdMessage.error('Failed to delete message');
    }
  };

  const isTrashedForUser = (msg: Message) => msg.trashed_for?.includes(currentExecId) ?? false;
  const isDeletedForUser = (msg: Message) => msg.delete_mark_for?.includes(currentExecId) ?? false;

  const matchesSearchFilter = (msg: Message) =>
    !searchText ||
    msg.subject.toLowerCase().includes(searchText.toLowerCase()) ||
    msg.message.toLowerCase().includes(searchText.toLowerCase()) ||
    (msg.from_user?.mention_handle &&
      `@${msg.from_user.mention_handle}`.toLowerCase().includes(searchText.toLowerCase()));

  const matchesPriorityFilter = (msg: Message) =>
    filterPriority === 'all' || msg.priority === filterPriority;

  const matchesUnreadFilter = (msg: Message) => {
    if (!filterUnread) return true;
    return !msg.read_by || !msg.read_by.includes(currentExecId);
  };

  const inboxMessages = messages.filter(
    (msg) =>
      msg.to_user_ids?.includes(currentExecId) &&
      !isTrashedForUser(msg) &&
      !isDeletedForUser(msg) &&
      matchesSearchFilter(msg) &&
      matchesPriorityFilter(msg) &&
      matchesUnreadFilter(msg),
  );

  const sentMessages = messages.filter(
    (msg) =>
      msg.from_user_id === currentExecId &&
      !isTrashedForUser(msg) &&
      !isDeletedForUser(msg) &&
      matchesSearchFilter(msg) &&
      matchesPriorityFilter(msg) &&
      matchesUnreadFilter(msg),
  );

  const trashMessages = messages.filter(
    (msg) =>
      isTrashedForUser(msg) &&
      !isDeletedForUser(msg) &&
      matchesSearchFilter(msg) &&
      matchesPriorityFilter(msg),
  );

  const unreadCount = inboxMessages.filter(
    (msg) => !msg.read_by || !msg.read_by.includes(currentExecId),
  ).length;

  const trashCount = trashMessages.length;

  const viewMessage = (msg: Message) => {
    setSelectedMessage(msg);
    setDetailModalVisible(true);
    if (!msg.read_by || !msg.read_by.includes(currentExecId)) {
      markAsRead(msg.id);
    }
  };

  return (
    <div style={{ padding: window.innerWidth < 768 ? '12px' : '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
          gap: '16px'
        }}>
          <div>
            <Title level={2} style={{ 
              margin: 0, 
              color: '#262626',
              fontSize: window.innerWidth < 768 ? '20px' : '24px',
              wordBreak: 'normal'
            }}>
              <MessageOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              Executive Communications
            </Title>
            <Text type="secondary" style={{ fontSize: window.innerWidth < 768 ? '14px' : '16px' }}>
              Secure messaging for board members and administrators
            </Text>
          </div>
          <Space direction={window.innerWidth < 768 ? 'vertical' : 'horizontal'}>
            <Badge count={unreadCount} offset={[-5, 5]}>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchMessages} 
                loading={loading}
                size={window.innerWidth < 768 ? 'small' : 'middle'}
              >
                Refresh
              </Button>
            </Badge>
            <Button 
              type="primary" 
              icon={<SendOutlined />}
              onClick={() => setModalVisible(true)}
              size={window.innerWidth < 768 ? 'small' : 'large'}
            >
              New Message
            </Button>
          </Space>
        </div>

        {/* Search and Filters */}
        <Card style={{ borderRadius: '12px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              placeholder="Search messages..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: '100%' }}
            />
            <Space 
              direction={window.innerWidth < 768 ? 'vertical' : 'horizontal'}
              style={{ width: '100%' }}
              size="small"
            >
              <Select
                value={filterPriority}
                onChange={setFilterPriority}
                style={{ 
                  width: window.innerWidth < 768 ? '100%' : 150,
                  maxWidth: '100%'
                }}
                suffixIcon={<FilterOutlined />}
              >
                <Option value="all">All Priorities</Option>
                <Option value="urgent">Urgent</Option>
                <Option value="high">High</Option>
                <Option value="normal">Normal</Option>
                <Option value="low">Low</Option>
              </Select>
              <Button
                type={filterUnread ? 'primary' : 'default'}
                onClick={() => setFilterUnread(!filterUnread)}
                icon={<MailOutlined />}
                style={{ width: window.innerWidth < 768 ? '100%' : 'auto' }}
              >
                {filterUnread ? 'Unread Only' : 'All Messages'}
              </Button>
            </Space>
          </Space>
        </Card>

        {/* Messages List */}
        <Card style={{ borderRadius: '12px' }}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={[
              {
                key: 'inbox',
                label: (
                  <span>
                    <MailOutlined />
                    Inbox
                    {unreadCount > 0 && <Badge count={unreadCount} style={{ marginLeft: 8 }} />}
                  </span>
                ),
                children: loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                  </div>
                ) : inboxMessages.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No messages in your inbox"
                  />
                ) : (
                  <List
                    dataSource={inboxMessages}
                    renderItem={(msg) => {
                      const isUnread = !msg.read_by || !msg.read_by.includes(currentExecId);
                      return (
                        <List.Item
                          key={msg.id}
                          style={{
                            cursor: 'pointer',
                            background: isUnread ? '#f0f9ff' : 'transparent',
                            padding: window.innerWidth < 768 ? '12px' : '16px',
                            borderRadius: '8px',
                            marginBottom: '8px',
                            border: isUnread ? '1px solid #91d5ff' : '1px solid #f0f0f0'
                          }}
                          onClick={() => viewMessage(msg)}
                        >
                          <List.Item.Meta
                            avatar={
                              <Badge dot={isUnread} offset={[-5, 5]}>
                                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                              </Badge>
                            }
                            title={
                              <Space wrap size={[4, 8]} style={{ width: '100%' }}>
                                <Text strong style={{ 
                                  fontSize: window.innerWidth < 768 ? '14px' : '16px',
                                  wordBreak: 'normal'
                                }}>{msg.subject}</Text>
                                <Tag color={getPriorityColor(msg.priority)} style={{ margin: 0 }}>
                                  {getPriorityIcon(msg.priority)} {msg.priority.toUpperCase()}
                                </Tag>
                                {msg.is_confidential && (
                                  <Tag color="gold" icon={<SafetyOutlined />} style={{ margin: 0 }}>
                                    CONFIDENTIAL
                                  </Tag>
                                )}
                              </Space>
                            }
                            description={
                              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                                <Text type="secondary" style={{ wordBreak: 'normal' }}>
                                  From: {msg.from_user?.title || 'Unknown'}
                                  {msg.from_user?.mention_handle && (
                                    <span style={{ marginLeft: 4 }}>
                                      (@{msg.from_user.mention_handle})
                                    </span>
                                  )}
                                </Text>
                                <Text type="secondary" ellipsis style={{ 
                                  maxWidth: '100%',
                                  wordBreak: 'normal',
                                  fontSize: window.innerWidth < 768 ? '13px' : '14px'
                                }}>
                                  {msg.message.substring(0, window.innerWidth < 768 ? 50 : 100)}...
                                </Text>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  <ClockCircleOutlined /> {dayjs(msg.created_at).fromNow()}
                                </Text>
                              </Space>
                            }
                          />
                        </List.Item>
                      );
                    }}
                  />
                )
              },
              {
                key: 'sent',
                label: (
                  <span>
                    <SendOutlined />
                    Sent ({sentMessages.length})
                  </span>
                ),
                children: sentMessages.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No sent messages"
                  />
                ) : (
                  <List
                    dataSource={sentMessages}
                    renderItem={(msg) => (
                      <List.Item
                        key={msg.id}
                        style={{
                          cursor: 'pointer',
                          padding: '16px',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          border: '1px solid #f0f0f0'
                        }}
                        onClick={() => viewMessage(msg)}
                      >
                        <List.Item.Meta
                          avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#52c41a' }} />}
                          title={
                            <Space>
                              <Text strong style={{ fontSize: '16px' }}>{msg.subject}</Text>
                              <Tag color={getPriorityColor(msg.priority)}>
                                {msg.priority.toUpperCase()}
                              </Tag>
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size={0}>
                              <Text type="secondary">
                                To: {msg.to_user_ids?.length} recipient(s)
                              </Text>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                <ClockCircleOutlined /> {dayjs(msg.created_at).fromNow()}
                              </Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )
              },
              {
                key: 'email',
                label: (
                  <span>
                    <MailOutlined />
                    Executive Communications
                  </span>
                ),
                children: <BusinessEmailSystem />
              },
              {
                key: 'trash',
                label: (
                  <span>
                    <DeleteOutlined />
                    Trash {trashCount > 0 && <Badge count={trashCount} style={{ marginLeft: 8 }} />}
                  </span>
                ),
                children: trashMessages.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Trash is empty"
                  />
                ) : (
                  <List
                    dataSource={trashMessages}
                    renderItem={(msg) => (
                      <List.Item
                        key={msg.id}
                        style={{
                          cursor: 'pointer',
                          padding: '16px',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          border: '1px solid #f0f0f0'
                        }}
                        onClick={() => viewMessage(msg)}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#fa8c16' }} />
                          }
                          title={
                            <Space>
                              <Text strong style={{ fontSize: '16px' }}>{msg.subject}</Text>
                              <Tag color={getPriorityColor(msg.priority)}>
                                {msg.priority.toUpperCase()}
                              </Tag>
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size={0}>
                              <Text type="secondary">
                                From: {msg.from_user?.title || 'Unknown'}
                                {msg.from_user?.mention_handle && (
                                  <span style={{ marginLeft: 4 }}>
                                    (@{msg.from_user.mention_handle})
                                  </span>
                                )}
                              </Text>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                <ClockCircleOutlined /> {dayjs(msg.created_at).fromNow()}
                              </Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )
              }
            ]}
          />
        </Card>
      </Space>

      {/* New Message Modal */}
      <Modal
        title={
          <Space wrap>
            <SendOutlined />
            <span style={{ fontSize: window.innerWidth < 768 ? '14px' : '16px' }}>New Message</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={window.innerWidth < 768 ? '95%' : 700}
        style={{ top: window.innerWidth < 768 ? 10 : 100 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={sendMessage}
        >
          <Form.Item
            label="Recipients"
            name="recipients"
            rules={[{ required: true, message: 'Please select recipients' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select recipients"
              showSearch
              filterOption={(input, option) => {
                const contact: Contact | undefined = option?.data?.contact;
                if (!contact) return false;
                const haystack = `${contact.name} ${contact.title || ''} ${
                  contact.mention_handle ? `@${contact.mention_handle}` : ''
                }`.toLowerCase();
                return haystack.includes(input.toLowerCase());
              }}
              options={contacts.map(contact => ({
                value: contact.id,
                label: contact.mention_handle
                  ? `@${contact.mention_handle}`
                  : contact.name,
                type: contact.type,
                contact,
              }))}
              optionRender={(option) => {
                const contact: Contact | undefined = option.data.contact;
                if (!contact) {
                  return option.label;
                }

                return (
                  <Space direction="vertical" size={0}>
                    <Space>
                      <TeamOutlined
                        style={{
                          color: contact.type === 'executive' ? '#1890ff' : '#52c41a',
                        }}
                      />
                      <span>{contact.name}</span>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {contact.mention_handle
                        ? `@${contact.mention_handle}`
                        : contact.title || contact.role.toUpperCase()}
                    </Text>
                  </Space>
                );
              }}
            />
          </Form.Item>

          <Form.Item
            label="Subject"
            name="subject"
            rules={[{ required: true, message: 'Please enter a subject' }]}
          >
            <Input placeholder="Message subject" />
          </Form.Item>

          <Form.Item
            label="Message"
            name="message"
            rules={[{ required: true, message: 'Please enter your message' }]}
          >
            <TextArea 
              rows={6} 
              placeholder="Type your message here..."
              showCount
              maxLength={2000}
            />
          </Form.Item>

          <Form.Item label="Priority" name="priority" initialValue="normal">
            <Select>
              <Option value="low">Low</Option>
              <Option value="normal">Normal</Option>
              <Option value="high">High</Option>
              <Option value="urgent">Urgent</Option>
            </Select>
          </Form.Item>

          <Form.Item name="is_confidential" valuePropName="checked">
            <Space>
              <input type="checkbox" />
              <Text>Mark as confidential</Text>
            </Space>
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={sending} icon={<SendOutlined />}>
                Send Message
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Message Detail Modal */}
      <Modal
        title={
          <Space wrap>
            <MessageOutlined />
            <span style={{ fontSize: window.innerWidth < 768 ? '14px' : '16px' }}>
              {selectedMessage?.subject}
            </span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedMessage(null);
        }}
        footer={[
          selectedMessage && !isTrashedForUser(selectedMessage) ? (
            <Button
              key="trash"
              danger
              onClick={() => {
                moveMessageToTrash(selectedMessage);
                setDetailModalVisible(false);
              }}
              size={window.innerWidth < 768 ? 'small' : 'middle'}
            >
              Move to Trash
            </Button>
          ) : null,
          selectedMessage && isTrashedForUser(selectedMessage) ? (
            <Button
              key="delete"
              danger
              onClick={() => {
                permanentlyDeleteMessage(selectedMessage);
                setDetailModalVisible(false);
              }}
              size={window.innerWidth < 768 ? 'small' : 'middle'}
            >
              Delete Permanently
            </Button>
          ) : null,
          <Button
            key="close"
            onClick={() => setDetailModalVisible(false)}
            size={window.innerWidth < 768 ? 'small' : 'middle'}
          >
            Close
          </Button>,
        ].filter(Boolean)}
        width={window.innerWidth < 768 ? '95%' : 700}
        style={{ top: window.innerWidth < 768 ? 10 : 100 }}
      >
        {selectedMessage && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <Text strong style={{ fontSize: window.innerWidth < 768 ? '13px' : '14px' }}>From:</Text>
                <Text style={{ fontSize: window.innerWidth < 768 ? '13px' : '14px' }}>
                  {selectedMessage.from_user?.title || 'Unknown'}
                  {selectedMessage.from_user?.mention_handle && (
                    <span style={{ marginLeft: 4 }}>
                      (@{selectedMessage.from_user.mention_handle})
                    </span>
                  )}
                </Text>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <Text strong style={{ fontSize: window.innerWidth < 768 ? '13px' : '14px' }}>Priority:</Text>
                <Tag color={getPriorityColor(selectedMessage.priority)} style={{ margin: 0 }}>
                  {selectedMessage.priority.toUpperCase()}
                </Tag>
                {selectedMessage.is_confidential && (
                  <Tag color="gold" icon={<SafetyOutlined />} style={{ margin: 0 }}>
                    CONFIDENTIAL
                  </Tag>
                )}
              </div>
            </Space>
            
            <div style={{ 
              padding: window.innerWidth < 768 ? '12px' : '16px', 
              background: '#f5f5f5', 
              borderRadius: '8px' 
            }}>
              <Text style={{ 
                whiteSpace: 'pre-wrap', 
                fontSize: window.innerWidth < 768 ? '13px' : '14px',
                wordBreak: 'normal'
              }}>
                {selectedMessage.message}
              </Text>
            </div>

            <div style={{ textAlign: window.innerWidth < 768 ? 'center' : 'right' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <ClockCircleOutlined /> {dayjs(selectedMessage.created_at).format('MMMM D, YYYY [at] h:mm A')}
              </Text>
            </div>

            {selectedMessage.read_by && selectedMessage.read_by.length > 0 && (
              <Alert
                message={
                  <Space>
                    <CheckOutlined style={{ color: '#52c41a' }} />
                    <Text>Read by {selectedMessage.read_by.length} recipient(s)</Text>
                  </Space>
                }
                type="success"
              />
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};
