import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const useNativeNotification = () => {
  const showNotification = async (
    title: string, 
    body: string, 
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    // Only use native notifications on mobile
    if (Capacitor.getPlatform() === 'web') {
      console.log(`[${type}] ${title}: ${body}`);
      return;
    }

    try {
      // Request permissions first
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display !== 'granted') {
        console.error('Notification permission denied');
        return;
      }

      // Schedule notification
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 100) }, // Show immediately
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  };

  return { showNotification };
};


