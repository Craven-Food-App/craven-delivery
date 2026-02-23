/**
 * Crave'n Feeder App — App Settings (Enterprise Compact White)
 * ───────────────────────────────────────────────────────────────
 * Enterprise-grade compact white design with enhanced settings and legal access
 */

import React, { useState, useEffect } from 'react';
import { IconArrowLeft, IconBell, IconVolume, IconVolumeOff, IconMapPin, IconWifi, IconWifiOff, IconNavigation, IconMoon, IconSun, IconShield, IconLogout, IconTrash, IconFileText, IconLock, IconUsers, IconHelp } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { Loader } from '@mantine/core';
import SlideToToggle from '@/components/SlideToToggle';
import { useKeyboardAware, useScrollToInput } from '@/hooks/useKeyboardAware';

// ─── THEME ──────────────────────────────────────────────────────────────────
const C = {
  orange:  "#E8622A",
  text:    "#111111",
  muted:   "#777777",
  muted2:  "#999999",
  border:  "#EEEEEE",
  bg:      "#FFFFFF",
  bgMuted: "#F8F9FA",
  green:   "#2E7D32",
  red:     "#C62828",
  blue:    "#3A7BD5",
} as const;

type AppSettingsPageProps = {
  onBack: () => void;
};

const AppSettingsPage: React.FC<AppSettingsPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  
  // Keyboard awareness hooks (must be at top level)
  const keyboardState = useKeyboardAware();
  const { scrollToInput } = useScrollToInput();
  
  const [settings, setSettings] = useState({
    pushNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    locationServices: true,
    offlineMode: false,
    navigationApp: 'mapbox',
    darkMode: false,
    privacyMode: false,
    language: 'en',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch driver preferences
      const { data: preferences } = await supabase
        .from('driver_preferences')
        .select('*')
        .eq('driver_id', user.id)
        .maybeSingle();

      // Fetch from user metadata
      const metadata = user.user_metadata || {};
      const appSettings = metadata.app_settings || {};

      if (preferences) {
        setSettings({
          pushNotifications: preferences.push_notifications_enabled ?? true,
          soundEnabled: preferences.sound_enabled ?? true,
          vibrationEnabled: preferences.vibration_enabled ?? true,
          locationServices: appSettings.locationServices ?? true,
          offlineMode: appSettings.offlineMode ?? false,
          navigationApp: appSettings.navigationApp || 'mapbox',
          darkMode: appSettings.darkMode ?? false,
          privacyMode: appSettings.privacyMode ?? false,
          language: appSettings.language || 'en',
        });
      } else {
        setSettings({
          ...settings,
          pushNotifications: appSettings.pushNotifications ?? true,
          soundEnabled: appSettings.soundEnabled ?? true,
          vibrationEnabled: appSettings.vibrationEnabled ?? true,
          locationServices: appSettings.locationServices ?? true,
          offlineMode: appSettings.offlineMode ?? false,
          navigationApp: appSettings.navigationApp || 'mapbox',
          darkMode: appSettings.darkMode ?? false,
          privacyMode: appSettings.privacyMode ?? false,
          language: appSettings.language || 'en',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: boolean | string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: any = {};
      if (key === 'pushNotifications') updates.push_notifications_enabled = value;
      if (key === 'soundEnabled') updates.sound_enabled = value;
      if (key === 'vibrationEnabled') updates.vibration_enabled = value;

      // Update driver_preferences table
      if (updates.push_notifications_enabled !== undefined || 
          updates.sound_enabled !== undefined || 
          updates.vibration_enabled !== undefined) {
        await supabase
        .from('driver_preferences')
        .upsert({
          driver_id: user.id,
          ...updates,
        }, {
          onConflict: 'driver_id'
        });
      }

      // Update user metadata for app settings
      const currentMetadata = user.user_metadata || {};
      const currentAppSettings = currentMetadata.app_settings || {};
      const newAppSettings = {
        ...currentAppSettings,
        [key]: value,
      };

      await supabase.auth.updateUser({
        data: {
          app_settings: newAppSettings
        }
      });

      setSettings({ ...settings, [key]: value });
      notifications.show({
        title: 'Settings updated',
        message: 'Your preferences have been saved',
        color: 'green',
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      notifications.show({
        title: 'Failed to update settings',
        message: error.message || 'Please try again',
        color: 'red',
      });
    }
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out?')) return;
    await supabase.auth.signOut();
    notifications.show({
      title: 'Logged out',
      message: 'You have been successfully logged out',
      color: 'green',
    });
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    if (!confirm('This will permanently delete all your data. Type DELETE to confirm.')) return;
    
    notifications.show({
      title: 'Account deletion',
      message: 'Please contact support to delete your account',
      color: 'orange',
    });
  };

  if (loading) {
    return (
      <div style={{
        background: C.bg,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Loader size="lg" color={C.orange} />
      </div>
    );
  }

  const navigationOptions = [
    { value: 'mapbox', label: "Crave'n Navigation" },
    { value: 'google', label: 'Google Maps' },
    ...(/iPad|iPhone|iPod/.test(navigator.userAgent) ? [{ value: 'apple', label: 'Apple Maps' }] : []),
    ...(/Android/.test(navigator.userAgent) ? [{ value: 'waze', label: 'Waze' }] : []),
  ];

  return (
    <div style={{
      background: C.bg,
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      color: C.text,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    }}>
      {/* ── fixed header ── */}
      <div style={{
        flexShrink: 0,
        background: C.bg,
        zIndex: 10,
        borderBottom: `1px solid ${C.border}`,
        padding: "12px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.text,
            }}
          >
            <IconArrowLeft size={24} />
          </button>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.2, margin: 0 }}>
            App Settings
          </div>
          <div style={{ width: 40 }} /> {/* Spacer */}
        </div>
      </div>

      {/* ── scrollable content ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '12px 16px',
        paddingBottom: `calc(72px + env(safe-area-inset-bottom, 0px) + ${keyboardState.isOpen ? keyboardState.height : 0}px)`,
      }}>
        {/* Notifications Section */}
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '14px 12px',
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            color: C.text,
            marginBottom: 12,
          }}>
            Notifications
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Push Notifications */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <IconBell size={18} color={C.muted} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>
                    Push Notifications
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    Receive push notifications
                  </div>
                </div>
              </div>
              <SlideToToggle
                checked={settings.pushNotifications}
                onChange={(checked) => updateSetting('pushNotifications', checked)}
              />
            </div>

            {/* Sound */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                {settings.soundEnabled ? (
                  <IconVolume size={18} color={C.muted} />
                ) : (
                  <IconVolumeOff size={18} color={C.muted} />
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>
                    Sound
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    Notification sounds
                  </div>
                </div>
              </div>
              <SlideToToggle
                checked={settings.soundEnabled}
                onChange={(checked) => updateSetting('soundEnabled', checked)}
              />
            </div>

            {/* Vibration */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <IconBell size={18} color={C.muted} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>
                    Vibration
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    Vibrate on notifications
                  </div>
                </div>
              </div>
              <SlideToToggle
                checked={settings.vibrationEnabled}
                onChange={(checked) => updateSetting('vibrationEnabled', checked)}
              />
            </div>
          </div>
        </div>

        {/* Location & Data Section */}
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '14px 12px',
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            color: C.text,
            marginBottom: 12,
          }}>
            Location & Data
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Location Services */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <IconMapPin size={18} color={C.muted} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>
                    Location Services
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    Allow location tracking
                  </div>
                </div>
              </div>
              <SlideToToggle
                checked={settings.locationServices}
                onChange={(checked) => updateSetting('locationServices', checked)}
              />
            </div>

            {/* Offline Mode */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                {settings.offlineMode ? (
                  <IconWifiOff size={18} color={C.muted} />
                ) : (
                  <IconWifi size={18} color={C.muted} />
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>
                    Offline Mode
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    Work without internet
                  </div>
                </div>
              </div>
              <SlideToToggle
                checked={settings.offlineMode}
                onChange={(checked) => updateSetting('offlineMode', checked)}
              />
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '14px 12px',
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            color: C.text,
            marginBottom: 12,
          }}>
            Navigation
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 600,
              color: C.muted,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              Default Navigation App
            </label>
            <select
              value={settings.navigationApp}
              onChange={(e) => updateSetting('navigationApp', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                fontWeight: 500,
                color: C.text,
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                outline: 'none',
                transition: 'border-color 0.2s',
                cursor: 'pointer',
              }}
              onFocus={(e) => e.target.style.borderColor = C.orange}
              onBlur={(e) => e.target.style.borderColor = C.border}
            >
              {navigationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Display Section */}
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '14px 12px',
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            color: C.text,
            marginBottom: 12,
          }}>
            Display
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Dark Mode */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                {settings.darkMode ? (
                  <IconMoon size={18} color={C.muted} />
                ) : (
                  <IconSun size={18} color={C.muted} />
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>
                    Dark Mode
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    Dark theme appearance
                  </div>
                </div>
              </div>
              <SlideToToggle
                checked={settings.darkMode}
                onChange={(checked) => updateSetting('darkMode', checked)}
              />
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '14px 12px',
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            color: C.text,
            marginBottom: 12,
          }}>
            Privacy
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Privacy Mode */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <IconShield size={18} color={C.muted} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>
                    Privacy Mode
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    Limit data sharing
                  </div>
                </div>
              </div>
              <SlideToToggle
                checked={settings.privacyMode}
                onChange={(checked) => updateSetting('privacyMode', checked)}
              />
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '14px 12px',
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            color: C.text,
            marginBottom: 12,
          }}>
            Language
          </div>

          <div>
            <select
              value={settings.language}
              onChange={(e) => updateSetting('language', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                fontWeight: 500,
                color: C.text,
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                outline: 'none',
                transition: 'border-color 0.2s',
                cursor: 'pointer',
              }}
              onFocus={(e) => e.target.style.borderColor = C.orange}
              onBlur={(e) => e.target.style.borderColor = C.border}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>

        {/* Account Actions */}
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '14px 12px',
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            color: C.text,
            marginBottom: 12,
          }}>
            Account
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 6,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <IconLogout size={18} color={C.muted} />
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                Log Out
              </div>
            </button>

            <button
              onClick={handleDeleteAccount}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 6,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <IconTrash size={18} color={C.red} />
              <div style={{ fontSize: 13, fontWeight: 600, color: C.red }}>
                Delete Account
              </div>
            </button>
          </div>
        </div>

        {/* Legal Section */}
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '14px 12px',
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            color: C.text,
            marginBottom: 12,
          }}>
            Legal & Support
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => window.open('https://craven.app/terms', '_blank')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 6,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <IconFileText size={18} color={C.muted} />
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                Terms of Service
              </div>
            </button>

            <button
              onClick={() => window.open('https://craven.app/privacy', '_blank')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 6,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <IconLock size={18} color={C.muted} />
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                Privacy Policy
              </div>
            </button>

            <button
              onClick={() => window.open('https://craven.app/driver-agreement', '_blank')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 6,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <IconFileText size={18} color={C.muted} />
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                Driver Agreement
              </div>
            </button>

            <button
              onClick={() => window.open('https://craven.app/community-guidelines', '_blank')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 6,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <IconUsers size={18} color={C.muted} />
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                Community Guidelines
              </div>
            </button>

            <button
              onClick={() => window.open('mailto:support@craven.app', '_blank')}
        style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 6,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <IconHelp size={18} color={C.blue} />
              <div style={{ fontSize: 13, fontWeight: 600, color: C.blue }}>
                Contact Support
              </div>
            </button>
          </div>
        </div>
      </div> {/* Close Content - Scrollable */}
    </div>
  );
};

export default AppSettingsPage;
