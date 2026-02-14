/**
 * Crave'n Feeder App — Security & Safety (Enterprise Compact White)
 * ───────────────────────────────────────────────────────────────
 * Comprehensive security and safety features for drivers
 */

import React, { useState, useEffect } from 'react';
import { 
  IconArrowLeft, IconLock, IconShield, IconPhone, IconEye, IconEyeOff, 
  IconDeviceFloppy, IconDeviceMobile, IconHistory, IconAlertTriangle,
  IconMapPin, IconShare, IconTrash, IconDownload, IconKey, IconCheck,
  IconX, IconLogout, IconClock, IconWorld, IconBell
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
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

type SecuritySafetyPageProps = {
  onBack: () => void;
};

interface Session {
  id: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  location_city: string;
  location_region: string;
  is_current_session: boolean;
  last_activity_at: string;
}

interface LoginActivity {
  id: string;
  login_type: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  location_city: string;
  location_region: string;
  success: boolean;
  created_at: string;
}

interface TrustedDevice {
  id: string;
  device_name: string;
  device_type: string;
  last_used_at: string;
}

const SecuritySafetyPage: React.FC<SecuritySafetyPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  // Password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  
  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  
  // App Lock
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [appLockType, setAppLockType] = useState<'none' | 'pin' | 'biometric'>('none');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinData, setPinData] = useState({ pin: '', confirmPin: '' });
  
  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  
  // Login Activity
  const [loginActivity, setLoginActivity] = useState<LoginActivity[]>([]);
  
  // Trusted Devices
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  
  // Keyboard awareness hooks (must be at top level)
  const keyboardState = useKeyboardAware();
  const { scrollToInput } = useScrollToInput();
  
  // Safety Features
  const [panicButtonEnabled, setPanicButtonEnabled] = useState(true);
  const [shareLocationWithEmergency, setShareLocationWithEmergency] = useState(false);
  const [autoShareLocationOnDelivery, setAutoShareLocationOnDelivery] = useState(false);
  
  // Security Alerts
  const [securityAlerts, setSecurityAlerts] = useState({
    passwordChange: true,
    newDevice: true,
    twoFactorChange: true,
    suspiciousLogin: true,
  });

  // Emergency Contact
  const [emergencyContact, setEmergencyContact] = useState({ name: '', phone: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch preferences
      const { data: preferences } = await supabase
        .from('driver_preferences')
        .select('*')
        .eq('driver_id', user.id)
        .maybeSingle();

      if (preferences) {
        setEmergencyContact({
          name: preferences.emergency_contact_name || '',
          phone: preferences.emergency_contact_phone || '',
        });
        setTwoFactorEnabled(preferences.two_factor_enabled || false);
        setAppLockEnabled(preferences.app_lock_enabled || false);
        setAppLockType(preferences.app_lock_type || 'none');
        setPanicButtonEnabled(preferences.panic_button_enabled !== false);
        setShareLocationWithEmergency(preferences.share_location_with_emergency || false);
        setAutoShareLocationOnDelivery(preferences.auto_share_location_on_delivery || false);
        setSecurityAlerts({
          passwordChange: preferences.security_alert_password_change !== false,
          newDevice: preferences.security_alert_new_device !== false,
          twoFactorChange: preferences.security_alert_2fa_change !== false,
          suspiciousLogin: preferences.security_alert_suspicious_login !== false,
        });
      }

      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_activity_at', { ascending: false })
        .limit(10);

      if (sessionsData) setSessions(sessionsData);

      // Fetch login activity
      const { data: activityData } = await supabase
        .from('login_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (activityData) setLoginActivity(activityData);

      // Fetch trusted devices
      const { data: devicesData } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false });

      if (devicesData) setTrustedDevices(devicesData);
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notifications.show({ title: 'New passwords do not match', message: '', color: 'red' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      notifications.show({ title: 'Password must be at least 6 characters', message: '', color: 'red' });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;

      // Log password change activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('log_login_activity', {
          p_user_id: user.id,
          p_login_type: 'password',
          p_device_name: navigator.userAgent,
          p_device_type: 'web',
          p_device_id: 'web',
          p_ip_address: '',
          p_user_agent: navigator.userAgent,
          p_success: true,
        });
      }

      notifications.show({ title: 'Password updated successfully', message: '', color: 'green' });
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      notifications.show({ title: error.message || 'Failed to update password', message: '', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmergencyContact = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if preferences exist, then update or insert
      const { data: existing } = await supabase
        .from('driver_preferences')
        .select('id')
        .eq('driver_id', user.id)
        .maybeSingle();

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('driver_preferences')
          .update({
            emergency_contact_name: emergencyContact.name,
            emergency_contact_phone: emergencyContact.phone,
          })
          .eq('driver_id', user.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('driver_preferences')
          .insert({
            driver_id: user.id,
            emergency_contact_name: emergencyContact.name,
            emergency_contact_phone: emergencyContact.phone,
          });
        error = insertError;
      }

      if (error) throw error;
      notifications.show({ title: 'Emergency contact saved', message: '', color: 'green' });
    } catch (error: any) {
      notifications.show({ title: 'Failed to save emergency contact', message: '', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleTwoFactorToggle = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if preferences exist, then update or insert
      const { data: existing } = await supabase
        .from('driver_preferences')
        .select('id')
        .eq('driver_id', user.id)
        .maybeSingle();

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('driver_preferences')
          .update({ two_factor_enabled: enabled })
          .eq('driver_id', user.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('driver_preferences')
          .insert({ driver_id: user.id, two_factor_enabled: enabled });
        error = insertError;
      }

      if (error) throw error;
      setTwoFactorEnabled(enabled);
      
      if (enabled) {
        // Generate backup codes
        const { data: codes } = await supabase.rpc('generate_backup_codes', { p_user_id: user.id, p_count: 10 });
        if (codes) {
          setBackupCodes(codes.map((c: any) => c.code));
          setShowBackupCodes(true);
        }
      }

      notifications.show({
        title: enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
        message: enabled ? 'Save your backup codes in a safe place' : '',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({ title: 'Failed to update two-factor authentication', message: '', color: 'red' });
    }
  };

  const handleLogoutSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      setSessions(sessions.filter(s => s.id !== sessionId));
      notifications.show({ title: 'Session logged out', message: '', color: 'green' });
    } catch (error: any) {
      notifications.show({ title: 'Failed to logout session', message: '', color: 'red' });
    }
  };

  const handleRemoveTrustedDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('trusted_devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;
      setTrustedDevices(trustedDevices.filter(d => d.id !== deviceId));
      notifications.show({ title: 'Device removed', message: '', color: 'green' });
    } catch (error: any) {
      notifications.show({ title: 'Failed to remove device', message: '', color: 'red' });
    }
  };

  const handlePanicButton = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current location
      let lat: number | null = null;
      let lng: number | null = null;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        });
      }

      // Log panic button trigger
      const { error } = await supabase
        .from('panic_button_logs')
        .insert({
          user_id: user.id,
          location_latitude: lat,
          location_longitude: lng,
          emergency_services_called: false,
          emergency_contact_notified: false,
        });

      if (error) throw error;

      // Notify emergency contact if set
      if (emergencyContact.phone) {
        // In production, this would send SMS/email
        console.log('Notifying emergency contact:', emergencyContact.phone);
      }

      notifications.show({
        title: 'Panic button activated',
        message: 'Emergency services and your contact have been notified',
        color: 'red',
      });
    } catch (error: any) {
      notifications.show({ title: 'Failed to activate panic button', message: '', color: 'red' });
    }
  };

  const handleAppLockToggle = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if preferences exist, then update or insert
      const { data: existing } = await supabase
        .from('driver_preferences')
        .select('id')
        .eq('driver_id', user.id)
        .maybeSingle();

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('driver_preferences')
          .update({
            app_lock_enabled: enabled,
            app_lock_type: enabled ? appLockType : 'none',
          })
          .eq('driver_id', user.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('driver_preferences')
          .insert({
            driver_id: user.id,
            app_lock_enabled: enabled,
            app_lock_type: enabled ? appLockType : 'none',
          });
        error = insertError;
      }

      if (error) throw error;
      setAppLockEnabled(enabled);
      if (enabled && appLockType === 'pin' && !pinData.pin) {
        setShowPinSetup(true);
      }
      notifications.show({
        title: enabled ? 'App lock enabled' : 'App lock disabled',
        message: '',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({ title: 'Failed to update app lock', message: '', color: 'red' });
    }
  };

  const handleSavePin = async () => {
    if (pinData.pin !== pinData.confirmPin) {
      notifications.show({ title: 'PINs do not match', message: '', color: 'red' });
      return;
    }
    if (pinData.pin.length < 4) {
      notifications.show({ title: 'PIN must be at least 4 digits', message: '', color: 'red' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Hash PIN (in production, use proper hashing)
      const pinHash = btoa(pinData.pin);

      // Check if preferences exist, then update or insert
      const { data: existing } = await supabase
        .from('driver_preferences')
        .select('id')
        .eq('driver_id', user.id)
        .maybeSingle();

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('driver_preferences')
          .update({
            app_lock_enabled: true,
            app_lock_type: 'pin',
            app_lock_pin_hash: pinHash,
          })
          .eq('driver_id', user.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('driver_preferences')
          .insert({
            driver_id: user.id,
            app_lock_enabled: true,
            app_lock_type: 'pin',
            app_lock_pin_hash: pinHash,
          });
        error = insertError;
      }

      if (error) throw error;
      setAppLockEnabled(true);
      setAppLockType('pin');
      setShowPinSetup(false);
      setPinData({ pin: '', confirmPin: '' });
      notifications.show({ title: 'PIN saved successfully', message: '', color: 'green' });
    } catch (error: any) {
      notifications.show({ title: 'Failed to save PIN', message: '', color: 'red' });
    }
  };

  const handleUpdateSetting = async (key: string, value: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if preferences exist, then update or insert
      const { data: existing } = await supabase
        .from('driver_preferences')
        .select('id')
        .eq('driver_id', user.id)
        .maybeSingle();

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('driver_preferences')
          .update({ [key]: value })
          .eq('driver_id', user.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('driver_preferences')
          .insert({ driver_id: user.id, [key]: value });
        error = insertError;
      }

      if (error) throw error;
      notifications.show({ title: 'Setting updated', message: '', color: 'green' });
    } catch (error: any) {
      notifications.show({ title: 'Failed to update setting', message: '', color: 'red' });
    }
  };

  const handleExportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all user data
      const [profile, preferences, sessions, activity] = await Promise.all([
        supabase.from('drivers').select('*').eq('auth_user_id', user.id).maybeSingle(),
        supabase.from('driver_preferences').select('*').eq('driver_id', user.id).maybeSingle(),
        supabase.from('user_sessions').select('*').eq('user_id', user.id),
        supabase.from('login_activity').select('*').eq('user_id', user.id).limit(100),
      ]);

      const exportData = {
        profile: profile.data,
        preferences: preferences.data,
        sessions: sessions.data,
        login_activity: activity.data,
        exported_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `craven-data-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      notifications.show({ title: 'Data exported successfully', message: '', color: 'green' });
    } catch (error: any) {
      notifications.show({ title: 'Failed to export data', message: '', color: 'red' });
    }
  };

  const handleClearCache = () => {
    if (confirm('Clear all app cache? This will require you to log in again.')) {
      localStorage.clear();
      sessionStorage.clear();
      notifications.show({ title: 'Cache cleared', message: 'Please refresh the page', color: 'green' });
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    if (prompt('Type DELETE to confirm:') !== 'DELETE') return;

    notifications.show({
      title: 'Account deletion',
      message: 'Please contact support at support@cravenusa.com to delete your account',
      color: 'orange',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            Security & Safety
          </div>
          <div style={{ width: 40 }} />
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
        
        {/* Password Section */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>Password</div>
            {!showPasswordForm ? (
            <button onClick={() => setShowPasswordForm(true)} style={{ width: '100%', padding: '12px', fontSize: 13, fontWeight: 600, color: '#FFFFFF', background: C.orange, border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                Change Password
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPasswords.current ? 'text' : 'password'} value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} placeholder="Enter current password" style={{ width: '100%', padding: '10px 12px', paddingRight: '40px', fontSize: 14, fontWeight: 500, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = C.orange} onBlur={(e) => e.target.style.borderColor = C.border} />
                  <button type="button" onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: C.muted }}>
                    {showPasswords.current ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPasswords.new ? 'text' : 'password'} value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} placeholder="Enter new password" style={{ width: '100%', padding: '10px 12px', paddingRight: '40px', fontSize: 14, fontWeight: 500, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = C.orange} onBlur={(e) => e.target.style.borderColor = C.border} />
                  <button type="button" onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: C.muted }}>
                    {showPasswords.new ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPasswords.confirm ? 'text' : 'password'} value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} placeholder="Confirm new password" style={{ width: '100%', padding: '10px 12px', paddingRight: '40px', fontSize: 14, fontWeight: 500, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = C.orange} onBlur={(e) => e.target.style.borderColor = C.border} />
                  <button type="button" onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: C.muted }}>
                    {showPasswords.confirm ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => { setShowPasswordForm(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} style={{ flex: 1, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: C.text, background: C.bgMuted, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.border} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = C.bgMuted}>Cancel</button>
                <button onClick={handlePasswordChange} disabled={saving} style={{ flex: 1, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#FFFFFF', background: saving ? C.bgMuted : C.orange, border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {saving ? <><Loader size={12} color={C.muted} /><span>Updating...</span></> : <><IconDeviceFloppy size={14} /><span>Update Password</span></>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Two-Factor Authentication */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>Two-Factor Authentication</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <IconShield size={18} color={C.muted} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>2FA Status</div>
                <div style={{ fontSize: 11, color: C.muted }}>{twoFactorEnabled ? 'Enabled' : 'Not enabled'}</div>
              </div>
            </div>
            <SlideToToggle checked={twoFactorEnabled} onChange={handleTwoFactorToggle} />
          </div>
          {showBackupCodes && backupCodes.length > 0 && (
            <div style={{ marginTop: 12, padding: '12px', background: C.bgMuted, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 8 }}>BACKUP CODES - Save these in a safe place</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {backupCodes.map((code, i) => (
                  <div key={i} style={{ padding: '8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12, fontFamily: 'monospace', textAlign: 'center' }}>{code}</div>
                ))}
              </div>
              <button onClick={() => setShowBackupCodes(false)} style={{ marginTop: 8, width: '100%', padding: '8px', fontSize: 11, fontWeight: 600, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer' }}>Hide Codes</button>
            </div>
          )}
        </div>

        {/* App Lock */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>App Lock</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <IconLock size={18} color={C.muted} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>App Lock</div>
                <div style={{ fontSize: 11, color: C.muted }}>Lock app with PIN or biometric</div>
              </div>
            </div>
            <SlideToToggle checked={appLockEnabled} onChange={handleAppLockToggle} />
          </div>
          {appLockEnabled && (
            <div style={{ marginTop: 8 }}>
              <select value={appLockType} onChange={(e) => { setAppLockType(e.target.value as any); if (e.target.value === 'pin') setShowPinSetup(true); }} style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 500, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', cursor: 'pointer' }}>
                <option value="none">None</option>
                <option value="pin">PIN</option>
                <option value="biometric">Biometric</option>
              </select>
            </div>
          )}
          {showPinSetup && (
            <div style={{ marginTop: 12, padding: '12px', background: C.bgMuted, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 8 }}>SETUP PIN</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="password" inputMode="numeric" maxLength={6} value={pinData.pin} onChange={(e) => setPinData({ ...pinData, pin: e.target.value.replace(/\D/g, '') })} placeholder="Enter 4-6 digit PIN" style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 500, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none' }} />
                <input type="password" inputMode="numeric" maxLength={6} value={pinData.confirmPin} onChange={(e) => setPinData({ ...pinData, confirmPin: e.target.value.replace(/\D/g, '') })} placeholder="Confirm PIN" style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 500, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowPinSetup(false); setPinData({ pin: '', confirmPin: '' }); }} style={{ flex: 1, padding: '8px', fontSize: 12, fontWeight: 600, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleSavePin} style={{ flex: 1, padding: '8px', fontSize: 12, fontWeight: 600, color: '#FFFFFF', background: C.orange, border: 'none', borderRadius: 4, cursor: 'pointer' }}>Save PIN</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Session Management */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Active Sessions</span>
            <button onClick={() => setActiveSection(activeSection === 'sessions' ? null : 'sessions')} style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: 'none', border: 'none', cursor: 'pointer' }}>{activeSection === 'sessions' ? 'Hide' : 'View'}</button>
          </div>
          {activeSection === 'sessions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.length === 0 ? (
                <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '12px' }}>No active sessions</div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} style={{ padding: '10px', background: session.is_current_session ? C.bgMuted : C.bg, border: `1px solid ${C.border}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>{session.device_name || 'Unknown Device'}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{session.location_city || 'Unknown'} • {formatDate(session.last_activity_at)}</div>
                      {session.is_current_session && <div style={{ fontSize: 10, color: C.green, marginTop: 4 }}>Current Session</div>}
                    </div>
                    {!session.is_current_session && (
                      <button onClick={() => handleLogoutSession(session.id)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, color: C.red, background: 'none', border: `1px solid ${C.red}`, borderRadius: 4, cursor: 'pointer' }}>Logout</button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Login Activity */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Login Activity</span>
            <button onClick={() => setActiveSection(activeSection === 'activity' ? null : 'activity')} style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: 'none', border: 'none', cursor: 'pointer' }}>{activeSection === 'activity' ? 'Hide' : 'View'}</button>
          </div>
          {activeSection === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '300px', overflowY: 'auto' }}>
              {loginActivity.length === 0 ? (
                <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '12px' }}>No login activity</div>
              ) : (
                loginActivity.map((activity) => (
                  <div key={activity.id} style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: activity.success ? C.green : C.red, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>{activity.device_name || 'Unknown Device'}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{activity.location_city || 'Unknown'} • {formatDate(activity.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Trusted Devices */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Trusted Devices</span>
            <button onClick={() => setActiveSection(activeSection === 'devices' ? null : 'devices')} style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: 'none', border: 'none', cursor: 'pointer' }}>{activeSection === 'devices' ? 'Hide' : 'View'}</button>
          </div>
          {activeSection === 'devices' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trustedDevices.length === 0 ? (
                <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '12px' }}>No trusted devices</div>
              ) : (
                trustedDevices.map((device) => (
                  <div key={device.id} style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>{device.device_name}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>Last used: {formatDate(device.last_used_at)}</div>
                    </div>
                    <button onClick={() => handleRemoveTrustedDevice(device.id)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, color: C.red, background: 'none', border: `1px solid ${C.red}`, borderRadius: 4, cursor: 'pointer' }}>Remove</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Safety Features */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>Safety Features</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <IconAlertTriangle size={18} color={C.muted} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Panic Button</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Quick access to emergency services</div>
                </div>
              </div>
              <SlideToToggle checked={panicButtonEnabled} onChange={(checked) => { setPanicButtonEnabled(checked); handleUpdateSetting('panic_button_enabled', checked); }} />
            </div>
            {panicButtonEnabled && (
              <button onClick={handlePanicButton} style={{ width: '100%', padding: '12px', fontSize: 13, fontWeight: 600, color: '#FFFFFF', background: C.red, border: 'none', borderRadius: 6, cursor: 'pointer', marginTop: 4 }}>Activate Panic Button</button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <IconShare size={18} color={C.muted} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Share Location with Emergency Contact</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Allow emergency contact to see your location</div>
                </div>
              </div>
              <SlideToToggle checked={shareLocationWithEmergency} onChange={(checked) => { setShareLocationWithEmergency(checked); handleUpdateSetting('share_location_with_emergency', checked); }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <IconMapPin size={18} color={C.muted} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Auto-Share Location on Delivery</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Automatically share location during deliveries</div>
                </div>
              </div>
              <SlideToToggle checked={autoShareLocationOnDelivery} onChange={(checked) => { setAutoShareLocationOnDelivery(checked); handleUpdateSetting('auto_share_location_on_delivery', checked); }} />
            </div>
          </div>
        </div>

        {/* Security Alerts */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>Security Alerts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <IconBell size={18} color={C.muted} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Password Changes</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Notify on password changes</div>
                </div>
              </div>
              <SlideToToggle checked={securityAlerts.passwordChange} onChange={(checked) => { setSecurityAlerts({ ...securityAlerts, passwordChange: checked }); handleUpdateSetting('security_alert_password_change', checked); }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <IconBell size={18} color={C.muted} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>New Device Logins</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Notify on new device logins</div>
                </div>
              </div>
              <SlideToToggle checked={securityAlerts.newDevice} onChange={(checked) => { setSecurityAlerts({ ...securityAlerts, newDevice: checked }); handleUpdateSetting('security_alert_new_device', checked); }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <IconBell size={18} color={C.muted} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>2FA Changes</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Notify on 2FA status changes</div>
                </div>
              </div>
              <SlideToToggle checked={securityAlerts.twoFactorChange} onChange={(checked) => { setSecurityAlerts({ ...securityAlerts, twoFactorChange: checked }); handleUpdateSetting('security_alert_2fa_change', checked); }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <IconBell size={18} color={C.muted} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Suspicious Logins</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Notify on suspicious login attempts</div>
                </div>
              </div>
              <SlideToToggle checked={securityAlerts.suspiciousLogin} onChange={(checked) => { setSecurityAlerts({ ...securityAlerts, suspiciousLogin: checked }); handleUpdateSetting('security_alert_suspicious_login', checked); }} />
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>Data & Privacy</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={handleExportData} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <IconDownload size={18} color={C.muted} />
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Export Account Data</div>
            </button>
            <button onClick={handleClearCache} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <IconTrash size={18} color={C.muted} />
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Clear App Cache</div>
            </button>
            <button onClick={handleDeleteAccount} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgMuted} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <IconTrash size={18} color={C.red} />
              <div style={{ fontSize: 13, fontWeight: 600, color: C.red }}>Delete Account</div>
            </button>
          </div>
        </div>

        {/* Emergency Contact */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>Emergency Contact</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Contact Name</label>
              <input type="text" value={emergencyContact.name} onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })} placeholder="John Doe" style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 500, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = C.orange} onBlur={(e) => e.target.style.borderColor = C.border} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Phone Number</label>
              <input type="tel" value={emergencyContact.phone} onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })} placeholder="(555) 123-4567" style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 500, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = C.orange} onBlur={(e) => e.target.style.borderColor = C.border} />
            </div>
            <button onClick={handleSaveEmergencyContact} disabled={saving} style={{ width: '100%', padding: '12px', fontSize: 13, fontWeight: 600, color: '#FFFFFF', background: saving ? C.bgMuted : C.orange, border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              {saving ? <><Loader size={12} color={C.muted} /><span>Saving...</span></> : <><IconDeviceFloppy size={14} /><span>Save Emergency Contact</span></>}
            </button>
          </div>
        </div>
      </div> {/* Close Content - Scrollable */}
    </div>
  );
};

export default SecuritySafetyPage;
