// @ts-nocheck
/**
 * Security Utilities
 * Helper functions for security features
 */

import { supabase } from '@/integrations/supabase/client';

export interface DeviceInfo {
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'web';
  deviceId: string;
  userAgent: string;
}

/**
 * Get device information from browser
 */
export const getDeviceInfo = (): DeviceInfo => {
  const userAgent = navigator.userAgent;
  let deviceType: DeviceInfo['deviceType'] = 'web';
  let deviceName = 'Web Browser';

  // Detect device type
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    deviceType = 'mobile';
    deviceName = /iPad/.test(userAgent) ? 'iPad' : 'iPhone';
  } else if (/Android/.test(userAgent)) {
    deviceType = /Mobile/.test(userAgent) ? 'mobile' : 'tablet';
    const match = userAgent.match(/Android\s([0-9\.]*)/);
    deviceName = match ? `Android ${match[1]}` : 'Android Device';
  } else if (/Windows/.test(userAgent)) {
    deviceType = 'desktop';
    deviceName = 'Windows PC';
  } else if (/Mac/.test(userAgent)) {
    deviceType = 'desktop';
    deviceName = 'Mac';
  } else if (/Linux/.test(userAgent)) {
    deviceType = 'desktop';
    deviceName = 'Linux';
  }

  // Generate device ID (fingerprint)
  const deviceId = generateDeviceId();

  return {
    deviceName,
    deviceType,
    deviceId,
    userAgent,
  };
};

/**
 * Generate a unique device ID based on browser fingerprint
 */
const generateDeviceId = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('Device ID', 2, 2);
  const canvasFingerprint = canvas.toDataURL();

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvasFingerprint,
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Get approximate location from IP (client-side approximation)
 */
export const getLocationInfo = async (): Promise<{ city: string | null; region: string | null; country: string | null }> => {
  try {
    // In production, use a geolocation API service
    // For now, return null values
    return { city: null, region: null, country: null };
  } catch (error) {
    console.error('Error getting location:', error);
    return { city: null, region: null, country: null };
  }
};

/**
 * Create or update user session
 */
export const createUserSession = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const deviceInfo = getDeviceInfo();
    const locationInfo = await getLocationInfo();

    // Get IP address (would need backend service in production)
    const ipAddress = '';

    await supabase.rpc('upsert_user_session', {
      p_user_id: user.id,
      p_session_token: user.id + '-' + Date.now(), // In production, use actual session token
      p_device_name: deviceInfo.deviceName,
      p_device_type: deviceInfo.deviceType,
      p_device_id: deviceInfo.deviceId,
      p_ip_address: ipAddress,
      p_user_agent: deviceInfo.userAgent,
      p_location_city: locationInfo.city,
      p_location_region: locationInfo.region,
      p_location_country: locationInfo.country,
      p_is_current_session: true,
    });
  } catch (error) {
    console.error('Error creating user session:', error);
  }
};

/**
 * Log login activity
 */
export const logLoginActivity = async (
  loginType: 'password' | '2fa' | 'biometric' | 'session_refresh',
  success: boolean = true,
  failureReason?: string
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const deviceInfo = getDeviceInfo();
    const locationInfo = await getLocationInfo();
    const ipAddress = '';

    await supabase.rpc('log_login_activity', {
      p_user_id: user.id,
      p_login_type: loginType,
      p_device_name: deviceInfo.deviceName,
      p_device_type: deviceInfo.deviceType,
      p_device_id: deviceInfo.deviceId,
      p_ip_address: ipAddress,
      p_user_agent: deviceInfo.userAgent,
      p_location_city: locationInfo.city,
      p_location_region: locationInfo.region,
      p_location_country: locationInfo.country,
      p_success: success,
      p_failure_reason: failureReason || null,
    });
  } catch (error) {
    console.error('Error logging login activity:', error);
  }
};

/**
 * Check if device is trusted
 */
export const isDeviceTrusted = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const deviceInfo = getDeviceInfo();
    const { data } = await supabase
      .from('trusted_devices')
      .select('id')
      .eq('user_id', user.id)
      .eq('device_id', deviceInfo.deviceId)
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.error('Error checking trusted device:', error);
    return false;
  }
};

/**
 * Add current device as trusted
 */
export const addTrustedDevice = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const deviceInfo = getDeviceInfo();
    const locationInfo = await getLocationInfo();
    const ipAddress = '';

    await supabase
      .from('trusted_devices')
      .upsert({
        user_id: user.id,
        device_name: deviceInfo.deviceName,
        device_type: deviceInfo.deviceType,
        device_id: deviceInfo.deviceId,
        device_fingerprint: deviceInfo.deviceId,
        ip_address: ipAddress,
        user_agent: deviceInfo.userAgent,
        bypass_2fa: true,
        last_used_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,device_id'
      });
  } catch (error) {
    console.error('Error adding trusted device:', error);
  }
};

