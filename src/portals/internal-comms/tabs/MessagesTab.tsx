import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, List, Avatar, Tag, Modal, Form, Select, Upload, Empty, Spin, message, Typography, Badge } from 'antd';
import { SendOutlined, PaperClipOutlined, UserOutlined, PlusOutlined, InboxOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';

const { TextArea } = Input;
const { Text } = Typography;

interface Message {
  id: string;
  sender_id: string;
  subject: string | null;
  body: string;
  channel: string;
  parent_id: string | null;
  recipient_ids: string[];
  read_by: string[];
  created_at: string;
  sender_name?: string;
}

interface ExecUser {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  email: string;
}

const MessagesTab: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [execUsers, setExecUsers] = useState<ExecUser[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [form] = Form.useForm();

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('internal_messages')
        .select('*')
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch sender names
      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
        const { data: profiles } = await supabase
          .from('exec_users')
          .select('user_id, full_name')
          .in('user_id', senderIds);

        const nameMap = new Map(profiles?.map((p: any) => [p.user_id, p.full_name]) || []);
        const enriched = data.map((m: any) => ({
          ...m,
          sender_name: nameMap.get(m.sender_id) || 'Unknown',
        }));
        setMessages(enriched);
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
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
        .select('id, user_id, full_name, role, email');
      setExecUsers(execs || []);

      await fetchMessages();
    };
    init();

    // Realtime subscription
    const channel = supabase
      .channel('internal-messages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages]);

  const handleSend = async (values: any) => {
    if (!currentUser) return;
    setSending(true);
    try {
      const { error } = await supabase.from('internal_messages').insert({
        sender_id: currentUser.id,
        subject: values.subject || null,
        body: values.body,
        channel: values.recipients?.length > 1 ? 'group' : 'direct',
        recipient_ids: values.recipients,
        read_by: [currentUser.id],
      });
      if (error) throw error;
      message.success('Message sent');
      form.resetFields();
      setComposeOpen(false);
      fetchMessages();
    } catch (err: any) {
      message.error('Failed to send: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const openThread = async (msg: Message) => {
    setSelectedMessage(msg);
    // Mark as read
    if (currentUser && !msg.read_by.includes(currentUser.id)) {
      await supabase.from('internal_messages').update({
        read_by: [...msg.read_by, currentUser.id],
      }).eq('id', msg.id);
    }
    // Fetch thread replies
    const { data } = await supabase
      .from('internal_messages')
      .select('*')
      .eq('parent_id', msg.id)
      .order('created_at', { ascending: true });

    if (data) {
      const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase
        .from('exec_users')
        .select('user_id, full_name')
        .in('user_id', senderIds.length > 0 ? senderIds : ['none']);
      const nameMap = new Map(profiles?.map((p: any) => [p.user_id, p.full_name]) || []);
      setThreadMessages(data.map((m: any) => ({ ...m, sender_name: nameMap.get(m.sender_id) || 'Unknown' })));
    }
  };

  const sendReply = async () => {
    if (!currentUser || !selectedMessage || !replyBody.trim()) return;
    try {
      const { error } = await supabase.from('internal_messages').insert({
        sender_id: currentUser.id,
        body: replyBody,
        channel: selectedMessage.channel,
        parent_id: selectedMessage.id,
        recipient_ids: selectedMessage.recipient_ids,
        read_by: [currentUser.id],
      });
      if (error) throw error;
      setReplyBody('');
      openThread(selectedMessage);
    } catch (err: any) {
      message.error('Failed to reply');
    }
  };

  const isUnread = (msg: Message) => currentUser && !msg.read_by.includes(currentUser.id);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 16 }}>Inbox</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setComposeOpen(true)}
          style={{ background: '#FF6B35', borderColor: '#FF6B35' }}>
          Compose
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      ) : messages.length === 0 ? (
        <Empty description="No messages yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item
              onClick={() => openThread(msg)}
              style={{
                cursor: 'pointer',
                background: isUnread(msg) ? '#fff7f0' : '#ffffff',
                padding: '12px 16px',
                borderRadius: 6,
                marginBottom: 4,
                border: '1px solid #f0f0f0',
              }}
            >
              <List.Item.Meta
                avatar={
                  <Avatar style={{ background: '#FF6B35' }} icon={<UserOutlined />}>
                    {msg.sender_name?.charAt(0)}
                  </Avatar>
                }
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isUnread(msg) && <Badge dot color="#FF6B35" />}
                    <Text strong={!!isUnread(msg)}>{msg.subject || '(No subject)'}</Text>
                    <Tag color={msg.channel === 'group' ? 'blue' : 'default'} style={{ fontSize: 10 }}>
                      {msg.channel}
                    </Tag>
                  </div>
                }
                description={
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{msg.sender_name}</Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                      {new Date(msg.created_at).toLocaleString()}
                    </Text>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#4b5563' }}>
                      {msg.body.length > 120 ? msg.body.slice(0, 120) + '...' : msg.body}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}

      {/* Compose Modal */}
      <Modal
        title="New Message"
        open={composeOpen}
        onCancel={() => setComposeOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleSend} layout="vertical">
          <Form.Item name="recipients" label="To" rules={[{ required: true, message: 'Select recipients' }]}>
            <Select
              mode="multiple"
              placeholder="Select recipients"
              options={execUsers
                .filter(e => e.user_id !== currentUser?.id)
                .map(e => ({ value: e.user_id, label: `${e.full_name} (${e.role})` }))}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="subject" label="Subject">
            <Input placeholder="Subject (optional)" />
          </Form.Item>
          <Form.Item name="body" label="Message" rules={[{ required: true, message: 'Enter a message' }]}>
            <TextArea rows={5} placeholder="Type your message..." />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={sending}
              icon={<SendOutlined />} style={{ background: '#FF6B35', borderColor: '#FF6B35' }}>
              Send
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Thread Modal */}
      <Modal
        title={selectedMessage?.subject || 'Message Thread'}
        open={!!selectedMessage}
        onCancel={() => { setSelectedMessage(null); setThreadMessages([]); }}
        footer={null}
        width={650}
      >
        {selectedMessage && (
          <div>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Avatar size="small" style={{ background: '#FF6B35' }}>
                  {selectedMessage.sender_name?.charAt(0)}
                </Avatar>
                <Text strong>{selectedMessage.sender_name}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(selectedMessage.created_at).toLocaleString()}
                </Text>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{selectedMessage.body}</div>
            </div>

            {threadMessages.map((reply) => (
              <div key={reply.id} style={{
                background: reply.sender_id === currentUser?.id ? '#fff7f0' : '#f3f4f6',
                borderRadius: 8, padding: 10, marginBottom: 8,
                marginLeft: reply.sender_id === currentUser?.id ? 40 : 0,
                marginRight: reply.sender_id !== currentUser?.id ? 40 : 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Text strong style={{ fontSize: 12 }}>{reply.sender_name}</Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {new Date(reply.created_at).toLocaleString()}
                  </Text>
                </div>
                <div style={{ fontSize: 13 }}>{reply.body}</div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <TextArea
                rows={2}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Type a reply..."
                style={{ flex: 1 }}
              />
              <Button type="primary" icon={<SendOutlined />} onClick={sendReply}
                disabled={!replyBody.trim()}
                style={{ background: '#FF6B35', borderColor: '#FF6B35', alignSelf: 'flex-end' }}>
                Reply
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MessagesTab;
