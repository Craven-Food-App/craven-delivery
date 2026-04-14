import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Typography, Tag, Space, Button } from 'antd';
import { SoundOutlined, CloseOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';

const { Title, Text, Paragraph } = Typography;

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: string;
  author_id: string;
  read_by: string[];
  pinned: boolean;
  created_at: string;
}

interface AnnouncementPopupProps {
  userId: string;
  /** Set to true only once right after PIN verification */
  triggerCheck: boolean;
}

const priorityColor = (p: string) => {
  if (p === 'critical') return '#ff4d4f';
  if (p === 'urgent') return '#fa8c16';
  return '#8c8c8c';
};

const priorityTag = (p: string) => {
  if (p === 'critical') return <Tag color="red" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Critical</Tag>;
  if (p === 'urgent') return <Tag color="orange" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Urgent</Tag>;
  return <Tag color="default" style={{ textTransform: 'uppercase' }}>Normal</Tag>;
};

const AnnouncementPopup: React.FC<AnnouncementPopupProps> = ({ userId, triggerCheck }) => {
  const [unseen, setUnseen] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  const fetchUnseen = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('internal_announcements')
        .select('id, title, body, priority, author_id, read_by, pinned, created_at')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const unseenAnnouncements = (data || []).filter(
        (a: any) => !a.read_by?.includes(userId)
      ) as Announcement[];

      if (unseenAnnouncements.length > 0) {
        setUnseen(unseenAnnouncements);
        setCurrentIndex(0);
        setVisible(true);
      }
    } catch (err) {
      console.error('Error fetching unseen announcements:', err);
    }
  }, [userId]);

  // Only fetch once when triggerCheck flips to true
  useEffect(() => {
    if (triggerCheck && !checked && userId) {
      setChecked(true);
      fetchUnseen();
    }
  }, [triggerCheck, checked, userId, fetchUnseen]);

  const markCurrentAsRead = async () => {
    const current = unseen[currentIndex];
    if (!current) return;

    try {
      const updatedReadBy = [...(current.read_by || []), userId];
      await supabase
        .from('internal_announcements')
        .update({ read_by: updatedReadBy })
        .eq('id', current.id);
    } catch (err) {
      console.error('Error marking announcement as read:', err);
    }
  };

  const handleDismiss = async () => {
    await markCurrentAsRead();

    if (currentIndex < unseen.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setVisible(false);
    }
  };

  const current = unseen[currentIndex];
  if (!current || !visible) return null;

  const borderColor = priorityColor(current.priority);

  return (
    <Modal
      open={visible}
      footer={null}
      closable={false}
      centered
      width={520}
      maskClosable={false}
      styles={{
        body: { padding: 0 },
        mask: { backdropFilter: 'blur(3px)' },
      }}
    >
      <div style={{
        borderLeft: `5px solid ${borderColor}`,
        padding: '24px 28px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <Space direction="vertical" size={4}>
            <Space size={8} align="center">
              <SoundOutlined style={{ fontSize: 20, color: '#ff7a45' }} />
              <Title level={4} style={{ margin: 0 }}>Company Announcement</Title>
            </Space>
            {unseen.length > 1 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {currentIndex + 1} of {unseen.length} unread announcements
              </Text>
            )}
          </Space>
        </div>

        {/* Content */}
        <div style={{
          background: '#fafafa',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 20,
        }}>
          <Space size={8} align="center" style={{ marginBottom: 8 }}>
            <Text strong style={{ fontSize: 16 }}>{current.title}</Text>
            {priorityTag(current.priority)}
          </Space>
          <Paragraph style={{ margin: 0, color: '#595959', fontSize: 14, lineHeight: 1.7 }}>
            {current.body}
          </Paragraph>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 12 }}>
            Posted {new Date(current.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </Text>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            size="large"
            onClick={handleDismiss}
            style={{
              background: '#ff7a45',
              borderColor: '#ff7a45',
              borderRadius: 8,
              fontWeight: 600,
              minWidth: 160,
            }}
          >
            {currentIndex < unseen.length - 1
              ? `Acknowledge & Next (${unseen.length - currentIndex - 1} left)`
              : 'Acknowledge'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AnnouncementPopup;
