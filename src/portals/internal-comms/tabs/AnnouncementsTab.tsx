import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Tag, Modal, Form, Select, Empty, Spin, message, Typography, Card, Badge, Tooltip } from 'antd';
import { PushpinOutlined, PlusOutlined, EyeOutlined, CheckOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';

const { TextArea } = Input;
const { Text } = Typography;

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: string;
  author_id: string;
  read_by: string[];
  pinned: boolean;
  expires_at: string | null;
  created_at: string;
  author_name?: string;
}

const priorityColors: Record<string, string> = {
  normal: 'default',
  urgent: 'orange',
  critical: 'red',
};

const AnnouncementsTab: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [form] = Form.useForm();

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

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('internal_announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const authorIds = [...new Set(data.map((a: any) => a.author_id))];
        const nameMap = await getNameMap(authorIds);
        setAnnouncements(data.map((a: any) => ({ ...a, author_name: nameMap.get(a.author_id) || 'Unknown' })));
      } else {
        setAnnouncements([]);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  }, [getNameMap]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      await fetchAnnouncements();
    };
    init();

    const channel = supabase
      .channel('internal-announcements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_announcements' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAnnouncements]);

  const handleCreate = async (values: any) => {
    if (!currentUser) return;
    setSending(true);
    try {
      const { error } = await supabase.from('internal_announcements').insert([{
        title: values.title,
        body: values.body,
        priority: (values.priority || 'normal') as 'normal' | 'urgent' | 'critical',
        author_id: currentUser.id,
        pinned: values.pinned || false,
        read_by: [currentUser.id],
      }]);
      if (error) throw error;
      message.success('Announcement published');
      form.resetFields();
      setCreateOpen(false);
      fetchAnnouncements();
    } catch (err: any) {
      message.error('Failed to publish: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (announcement: Announcement) => {
    if (!currentUser || announcement.read_by.includes(currentUser.id)) return;
    await supabase.from('internal_announcements').update({
      read_by: [...announcement.read_by, currentUser.id],
    }).eq('id', announcement.id);
    fetchAnnouncements();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 16 }}>Company Announcements</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}
          style={{ background: '#FF6B35', borderColor: '#FF6B35' }}>
          New Announcement
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      ) : announcements.length === 0 ? (
        <Empty description="No announcements" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {announcements.map((a) => {
            const isRead = currentUser && a.read_by.includes(currentUser.id);
            return (
              <Card
                key={a.id}
                size="small"
                style={{
                  borderLeft: `4px solid ${a.priority === 'critical' ? '#ef4444' : a.priority === 'urgent' ? '#f59e0b' : '#d1d5db'}`,
                  background: isRead ? '#ffffff' : '#fffbf5',
                }}
                onClick={() => markAsRead(a)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      {a.pinned && <PushpinOutlined style={{ color: '#FF6B35' }} />}
                      <Text strong style={{ fontSize: 15 }}>{a.title}</Text>
                      <Tag color={priorityColors[a.priority]}>{a.priority}</Tag>
                      {!isRead && <Badge dot color="#FF6B35" />}
                    </div>
                    <div style={{ color: '#4b5563', fontSize: 13, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                      {a.body}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#9ca3af', flexWrap: 'wrap' }}>
                      <span>By {a.author_name}</span>
                      <span>{new Date(a.created_at).toLocaleString()}</span>
                      <Tooltip title="Read receipts">
                        <span><EyeOutlined /> {a.read_by.length} read</span>
                      </Tooltip>
                    </div>
                  </div>
                  {isRead && <CheckOutlined style={{ color: '#10b981', fontSize: 16 }} />}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal title="New Announcement" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null} width={600}>
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Enter title' }]}>
            <Input placeholder="Announcement title" />
          </Form.Item>
          <Form.Item name="body" label="Body" rules={[{ required: true, message: 'Enter body' }]}>
            <TextArea rows={5} placeholder="Announcement content..." />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="priority" label="Priority" style={{ flex: 1 }}>
              <Select defaultValue="normal" options={[
                { value: 'normal', label: 'Normal' },
                { value: 'urgent', label: '⚠️ Urgent' },
                { value: 'critical', label: '🚨 Critical' },
              ]} />
            </Form.Item>
            <Form.Item name="pinned" label="Pinned" style={{ flex: 1 }}>
              <Select defaultValue={false} options={[
                { value: false, label: 'No' },
                { value: true, label: '📌 Yes' },
              ]} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={sending}
              style={{ background: '#FF6B35', borderColor: '#FF6B35' }}>
              Publish
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AnnouncementsTab;
