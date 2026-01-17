// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, Badge, Typography, List, Tag, Button, Space, Modal, Empty, Spin } from 'antd';
import {
  DollarOutlined,
  WarningOutlined,
  FileTextOutlined,
  UserOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface Notification {
  id: string;
  type: 'approval' | 'alert' | 'task' | 'legal' | 'security';
  title: string;
  description: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  actionUrl?: string;
  actionText?: string;
  timestamp: string;
  metadata?: any;
}

interface ExecutiveNotificationsProps {
  role?: 'ceo' | 'cfo' | 'coo' | 'cto' | 'board';
}

export const ExecutiveNotifications: React.FC<ExecutiveNotificationsProps> = ({ role = 'ceo' }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('exec_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ceo_financial_approvals',
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [role]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const allNotifications: Notification[] = [];

      // Fetch pending financial approvals
      const { data: approvals } = await supabase
        .from('ceo_financial_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (approvals) {
        approvals.forEach(approval => {
          allNotifications.push({
            id: approval.id,
            type: 'approval',
            title: `Pending Approval: ${approval.title}`,
            description: approval.description || `$${approval.amount.toLocaleString()} - ${approval.request_type}`,
            urgency: approval.priority === 'urgent' ? 'critical' : approval.priority as any,
            actionUrl: '/ceo#financial',
            actionText: 'Review',
            timestamp: approval.requested_at,
            metadata: approval,
          });
        });
      }

      // Fetch overdue tasks
      const { data: overdueTasks } = await supabase
        .from('ceo_financial_approvals')
        .select('*')
        .eq('status', 'pending')
        .lt('deadline', new Date().toISOString());

      if (overdueTasks && overdueTasks.length > 0) {
        allNotifications.push({
          id: 'overdue-' + Date.now(),
          type: 'task',
          title: `${overdueTasks.length} Overdue Approval${overdueTasks.length > 1 ? 's' : ''}`,
          description: `Review and approve overdue financial requests`,
          urgency: 'high',
          actionUrl: '/ceo#financial',
          actionText: 'Review Overdue',
          timestamp: new Date().toISOString(),
          metadata: { count: overdueTasks.length },
        });
      }

      // Sort by urgency and timestamp
      allNotifications.sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'red';
      case 'high':
        return 'orange';
      case 'normal':
        return 'blue';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <DollarOutlined className="text-blue-500" />;
      case 'alert':
        return <WarningOutlined className="text-red-500" />;
      case 'task':
        return <FileTextOutlined className="text-orange-500" />;
      case 'legal':
        return <FileTextOutlined className="text-purple-500" />;
      case 'security':
        return <ExclamationCircleOutlined className="text-red-600" />;
      default:
        return <BellOutlined />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setModalVisible(true);
  };

  const handleAction = (notification: Notification) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    setModalVisible(false);
  };

  const criticalCount = notifications.filter(n => n.urgency === 'critical').length;
  const highCount = notifications.filter(n => n.urgency === 'high').length;
  const totalUnread = notifications.length;

  return (
    <div>
      <Card
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellOutlined className="text-xl" />
              <Title level={5} className="m-0">Executive Inbox</Title>
            </div>
            {totalUnread > 0 && (
              <Badge count={totalUnread} overflowCount={99} className="ml-2">
                <span className="text-sm text-gray-600">Unread</span>
              </Badge>
            )}
          </div>
        }
        extra={
          criticalCount > 0 && (
            <Tag color="red">
              {criticalCount} Critical
            </Tag>
          )
        }
      >
        {loading ? (
          <div className="text-center py-8">
            <Spin size="large" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications"
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notification, index) => (
              <List.Item
                key={notification.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleNotificationClick(notification)}
              >
                <List.Item.Meta
                  avatar={
                    <Badge
                      count={index === 0 ? 'NEW' : null}
                      className="mb-2"
                      style={{ backgroundColor: '#52c41a' }}
                    >
                      {getTypeIcon(notification.type)}
                    </Badge>
                  }
                  title={
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{notification.title}</span>
                      <Tag color={getUrgencyColor(notification.urgency)} size="small">
                        {notification.urgency.toUpperCase()}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Text className="text-sm text-gray-600">
                        {notification.description}
                      </Text>
                      <div className="flex items-center gap-2 mt-1">
                        <Text className="text-xs text-gray-400">
                          {dayjs(notification.timestamp).fromNow()}
                        </Text>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title="Notification Details"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            Close
          </Button>,
          selectedNotification?.actionText && (
            <Button
              key="action"
              type="primary"
              onClick={() => handleAction(selectedNotification)}
            >
              {selectedNotification.actionText}
            </Button>
          ),
        ]}
      >
        {selectedNotification && (
          <div className="space-y-4">
            <div>
              <Text strong>Type:</Text>
              <Tag className="ml-2">{selectedNotification.type}</Tag>
            </div>
            <div>
              <Text strong>Urgency:</Text>
              <Tag color={getUrgencyColor(selectedNotification.urgency)} className="ml-2">
                {selectedNotification.urgency.toUpperCase()}
              </Tag>
            </div>
            <div>
              <Text strong>Description:</Text>
              <p className="mt-1">{selectedNotification.description}</p>
            </div>
            <div>
              <Text strong>Timestamp:</Text>
              <p className="mt-1">{dayjs(selectedNotification.timestamp).format('MMMM D, YYYY h:mm A')}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

