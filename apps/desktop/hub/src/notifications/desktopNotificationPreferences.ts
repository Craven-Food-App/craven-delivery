export type DesktopNotificationPreferences = {
  enabled: boolean;
  internalComms: boolean;
  supportConversations: boolean;
  showPreviews: boolean;
};

const STORAGE_KEY = 'craven-hub:desktop-notifications';

export const DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES: DesktopNotificationPreferences = {
  enabled: true,
  internalComms: true,
  supportConversations: true,
  showPreviews: true,
};

export function readDesktopNotificationPreferences(): DesktopNotificationPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES;
    return {
      ...DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES,
      ...(JSON.parse(raw) as Partial<DesktopNotificationPreferences>),
    };
  } catch {
    return DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES;
  }
}

export function writeDesktopNotificationPreferences(preferences: DesktopNotificationPreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Notifications continue with the in-memory setting for this session.
  }
  window.dispatchEvent(new CustomEvent('craven:desktop-notification-preferences', { detail: preferences }));
}
