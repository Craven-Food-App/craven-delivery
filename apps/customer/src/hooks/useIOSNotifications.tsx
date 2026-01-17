import { useState, useCallback } from 'react';

interface NotificationData {
  id: string;
  title: string;
  message: string;
  duration?: number;
}

export const useIOSNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const showNotification = useCallback((title: string, message: string, duration = 5000) => {
    const id = crypto.randomUUID();
    const notification: NotificationData = {
      id,
      title,
      message,
      duration
    };

    setNotifications(prev => [...prev, notification]);

    return id;
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    showNotification,
    dismissNotification,
    dismissAll
  };
};