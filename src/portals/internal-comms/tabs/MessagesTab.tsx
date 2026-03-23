import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input, List, Avatar, Tag, Modal, Form, Select, Empty, Spin, message, Typography, Badge, Upload, Tooltip } from 'antd';
import { SendOutlined, UserOutlined, PlusOutlined, PaperClipOutlined, FileOutlined, FilePdfOutlined, FileImageOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import type { UploadFile } from 'antd/es/upload/interface';

const { TextArea } = Input;
const { Text } = Typography;

// --- Notification sound utility ---
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Two-tone chime
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.15);
    playTone(1320, now + 0.12, 0.2);
  } catch {
    // Audio not available
  }
};

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  file_type: string | null;
}

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
  attachments?: Attachment[];
}

interface Recipient {
  user_id: string;
  label: string;
}

const fileIcon = (type: string | null) => {
  if (!type) return <FileOutlined />;
  if (type.includes('pdf')) return <FilePdfOutlined style={{ color: '#ef4444' }} />;
  if (type.includes('image')) return <FileImageOutlined style={{ color: '#3b82f6' }} />;
  return <FileOutlined />;
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const AttachmentList: React.FC<{ attachments: Attachment[] }> = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {attachments.map((a) => (
        <a
          key={a.id}
          href={a.file_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#f3f4f6', borderRadius: 6, padding: '4px 8px',
            fontSize: 12, color: '#374151', textDecoration: 'none',
            border: '1px solid #e5e7eb',
          }}
        >
          {fileIcon(a.file_type)}
          <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.file_name}
          </span>
          {a.file_size_bytes && <span style={{ color: '#9ca3af' }}>({formatSize(a.file_size_bytes)})</span>}
          <DownloadOutlined style={{ color: '#FF6B35' }} />
        </a>
      ))}
    </div>
  );
};

const MessagesTab: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [composeFiles, setComposeFiles] = useState<UploadFile[]>([]);
  const [replyFiles, setReplyFiles] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  // Refs to access latest state inside realtime callback
  const selectedMessageRef = useRef<Message | null>(null);
  const currentUserRef = useRef<any>(null);

  useEffect(() => { selectedMessageRef.current = selectedMessage; }, [selectedMessage]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const getNameMap = useCallback(async (userIds: string[]): Promise<Map<string, string>> => {
    if (userIds.length === 0) return new Map();
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);
    const map = new Map<string, string>();
    (profiles || []).forEach((p: any) => {
      map.set(p.user_id, p.full_name || p.email || 'Unknown');
    });
    return map;
  }, []);

  const fetchAttachments = useCallback(async (messageIds: string[]): Promise<Map<string, Attachment[]>> => {
    const map = new Map<string, Attachment[]>();
    if (messageIds.length === 0) return map;
    const { data } = await supabase
      .from('internal_message_attachments')
      .select('id, message_id, file_name, file_url, file_size_bytes, file_type')
      .in('message_id', messageIds);
    (data || []).forEach((a: any) => {
      const list = map.get(a.message_id) || [];
      list.push(a);
      map.set(a.message_id, list);
    });
    return map;
  }, []);

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

      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
        const msgIds = data.map((m: any) => m.id);
        const [nameMap, attachMap] = await Promise.all([getNameMap(senderIds), fetchAttachments(msgIds)]);
        setMessages(data.map((m: any) => ({
          ...m,
          sender_name: nameMap.get(m.sender_id) || 'Unknown',
          attachments: attachMap.get(m.id) || [],
        })));
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [getNameMap, fetchAttachments]);

  // Refresh thread replies (called when realtime fires while a thread is open)
  const refreshThread = useCallback(async (parentId: string) => {
    const { data } = await supabase
      .from('internal_messages')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
      const msgIds = data.map((m: any) => m.id);
      const [nameMap, attachMap] = await Promise.all([getNameMap(senderIds), fetchAttachments(msgIds)]);
      setThreadMessages(data.map((m: any) => ({
        ...m,
        sender_name: nameMap.get(m.sender_id) || 'Unknown',
        attachments: attachMap.get(m.id) || [],
      })));
    } else {
      setThreadMessages([]);
    }
  }, [getNameMap, fetchAttachments]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: execs } = await supabase
        .from('exec_users')
        .select('user_id, role, title');

      if (execs && execs.length > 0) {
        const userIds = execs.map((e: any) => e.user_id);
        const nameMap = await getNameMap(userIds);
        setRecipients(execs.map((e: any) => ({
          user_id: e.user_id,
          label: `${nameMap.get(e.user_id) || e.role} (${e.title || e.role})`,
        })));
      }

      await fetchMessages();
    };
    init();

    const channel = supabase
      .channel('internal-messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_messages' }, (payload) => {
        const newMsg = payload.new as any;
        const me = currentUserRef.current;

        // Play sound if this message is from someone else
        if (me && newMsg.sender_id !== me.id) {
          playNotificationSound();
        }

        // Refresh inbox
        fetchMessages();

        // If a thread is open and this message belongs to it, refresh the thread
        const openThread = selectedMessageRef.current;
        if (openThread) {
          if (newMsg.parent_id === openThread.id || newMsg.id === openThread.id) {
            refreshThread(openThread.id);
          }
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'internal_messages' }, () => {
        fetchMessages();
        const openThread = selectedMessageRef.current;
        if (openThread) {
          refreshThread(openThread.id);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'internal_messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages, getNameMap, refreshThread]);

  const uploadFiles = async (files: UploadFile[], messageId: string, userId: string) => {
    for (const f of files) {
      const file = f.originFileObj as File;
      if (!file) continue;
      const filePath = `${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('internal-comms-files')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('internal-comms-files')
        .getPublicUrl(filePath);

      const { error: attachError } = await supabase.from('internal_message_attachments').insert([{
        message_id: messageId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size_bytes: file.size,
        file_type: file.type,
        uploaded_by: userId,
      }]);
      if (attachError) throw attachError;
    }
  };

  const handleSend = async (values: any) => {
    if (!currentUser) return;
    setSending(true);
    try {
      const { data: msgData, error } = await supabase.from('internal_messages').insert([{
        sender_id: currentUser.id,
        subject: values.subject || null,
        body: values.body,
        channel: (values.recipients?.length > 1 ? 'group' : 'direct') as 'direct' | 'group',
        recipient_ids: values.recipients,
        read_by: [currentUser.id],
      }]).select('id').single();
      if (error) throw error;

      if (composeFiles.length > 0) {
        await uploadFiles(composeFiles, msgData.id, currentUser.id);
      }

      message.success('Message sent');
      form.resetFields();
      setComposeFiles([]);
      setComposeOpen(false);
      // fetchMessages() will be triggered by realtime
    } catch (err: any) {
      message.error('Failed to send: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const openThread = async (msg: Message) => {
    setSelectedMessage(msg);
    if (currentUser && !msg.read_by.includes(currentUser.id)) {
      await supabase.from('internal_messages').update({
        read_by: [...msg.read_by, currentUser.id],
      }).eq('id', msg.id);
    }
    await refreshThread(msg.id);
  };

  const sendReply = async () => {
    if (!currentUser || !selectedMessage || (!replyBody.trim() && replyFiles.length === 0)) return;
    try {
      const { data: msgData, error } = await supabase.from('internal_messages').insert([{
        sender_id: currentUser.id,
        body: replyBody || '📎 Attachment',
        channel: selectedMessage.channel as 'direct' | 'group',
        parent_id: selectedMessage.id,
        recipient_ids: selectedMessage.recipient_ids,
        read_by: [currentUser.id],
      }]).select('id').single();
      if (error) throw error;

      if (replyFiles.length > 0) {
        await uploadFiles(replyFiles, msgData.id, currentUser.id);
      }

      setReplyBody('');
      setReplyFiles([]);
      // Thread will refresh via realtime subscription
    } catch (err: any) {
      message.error('Failed to reply');
    }
  };

  const handleDelete = async (msgId: string, isParent: boolean) => {
    Modal.confirm({
      title: 'Delete message?',
      content: isParent ? 'This will delete the message and all replies.' : 'This reply will be permanently deleted.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          if (isParent) {
            await supabase.from('internal_message_attachments')
              .delete().in('message_id',
                [msgId, ...(threadMessages.map(t => t.id))]
              );
            await supabase.from('internal_messages').delete().eq('parent_id', msgId);
            await supabase.from('internal_messages').delete().eq('id', msgId);
            setSelectedMessage(null);
            setThreadMessages([]);
          } else {
            await supabase.from('internal_message_attachments').delete().eq('message_id', msgId);
            await supabase.from('internal_messages').delete().eq('id', msgId);
          }
          message.success('Message deleted');
        } catch (err: any) {
          message.error('Delete failed: ' + err.message);
        }
      },
    });
  };

  const isUnread = (msg: Message) => currentUser && !msg.read_by.includes(currentUser.id);

  const hasAttachments = (msg: Message) => msg.attachments && msg.attachments.length > 0;

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {isUnread(msg) && <Badge dot color="#FF6B35" />}
                    <Text strong={!!isUnread(msg)}>{msg.subject || '(No subject)'}</Text>
                    <Tag color={msg.channel === 'group' ? 'blue' : 'default'} style={{ fontSize: 10 }}>
                      {msg.channel}
                    </Tag>
                    {hasAttachments(msg) && (
                      <Tooltip title={`${msg.attachments!.length} attachment(s)`}>
                        <PaperClipOutlined style={{ color: '#FF6B35', fontSize: 14 }} />
                      </Tooltip>
                    )}
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
      <Modal title="New Message" open={composeOpen} onCancel={() => { setComposeOpen(false); setComposeFiles([]); }} footer={null} width={600}>
        <Form form={form} onFinish={handleSend} layout="vertical">
          <Form.Item name="recipients" label="To" rules={[{ required: true, message: 'Select recipients' }]}>
            <Select
              mode="multiple"
              placeholder="Select recipients"
              options={recipients
                .filter(r => r.user_id !== currentUser?.id)
                .map(r => ({ value: r.user_id, label: r.label }))}
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
          <Form.Item label="Attachments">
            <Upload
              multiple
              beforeUpload={() => false}
              fileList={composeFiles}
              onChange={({ fileList }) => setComposeFiles(fileList)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.txt,.zip"
            >
              <Button icon={<PaperClipOutlined />} style={{ borderColor: '#FF6B35', color: '#FF6B35' }}>
                Attach Files
              </Button>
            </Upload>
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setComposeOpen(false); setComposeFiles([]); }}>Cancel</Button>
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
        onCancel={() => { setSelectedMessage(null); setThreadMessages([]); setReplyFiles([]); }}
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
                <div style={{ marginLeft: 'auto' }}>
                  {selectedMessage.sender_id === currentUser?.id && (
                    <Tooltip title="Delete conversation">
                      <Button type="text" size="small" danger icon={<DeleteOutlined />}
                        onClick={() => handleDelete(selectedMessage.id, true)} />
                    </Tooltip>
                  )}
                </div>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{selectedMessage.body}</div>
              <AttachmentList attachments={selectedMessage.attachments || []} />
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
                  {reply.sender_id === currentUser?.id && (
                    <Tooltip title="Delete reply">
                      <Button type="text" size="small" danger icon={<DeleteOutlined />}
                        onClick={() => handleDelete(reply.id, false)}
                        style={{ marginLeft: 'auto', padding: 0, height: 20 }} />
                    </Tooltip>
                  )}
                </div>
                <div style={{ fontSize: 13 }}>{reply.body}</div>
                <AttachmentList attachments={reply.attachments || []} />
              </div>
            ))}

            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <TextArea
                  rows={2}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Type a reply..."
                  style={{ flex: 1 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'flex-end' }}>
                  <Upload
                    multiple
                    beforeUpload={() => false}
                    fileList={replyFiles}
                    onChange={({ fileList }) => setReplyFiles(fileList)}
                    showUploadList={false}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.txt,.zip"
                  >
                    <Tooltip title="Attach files">
                      <Button icon={<PaperClipOutlined />} style={{ borderColor: '#FF6B35', color: '#FF6B35' }} />
                    </Tooltip>
                  </Upload>
                  <Button type="primary" icon={<SendOutlined />} onClick={sendReply}
                    disabled={!replyBody.trim() && replyFiles.length === 0}
                    style={{ background: '#FF6B35', borderColor: '#FF6B35' }}>
                    Reply
                  </Button>
                </div>
              </div>
              {replyFiles.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {replyFiles.map((f, i) => (
                    <Tag
                      key={i}
                      closable
                      onClose={() => setReplyFiles(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ fontSize: 11 }}
                    >
                      <PaperClipOutlined /> {f.name}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MessagesTab;
