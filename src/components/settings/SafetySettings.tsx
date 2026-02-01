/**
 * Crave'n Feeder App — Safety Settings (Enterprise Compact White)
 * ───────────────────────────────────────────────────────────────
 * Enterprise-grade compact white design matching Account/Ratings/Schedule pages
 */

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNativeNotification } from '@/hooks/useNativeNotification';
import SlideToConfirm from '@/components/SlideToConfirm';

// ─── THEME ──────────────────────────────────────────────────────────────────
const C = {
  orange:  "#E8622A",
  text:    "#111111",
  muted:   "#777777",
  muted2:  "#999999",
  border:  "#EEEEEE",
  track:   "#EEF1F6",
  bg:      "#FFFFFF",
  blue:    "#3A7BD5",
  blueBg:  "#EEF4FF",
  green:   "#2E7D32",
  greenBg: "#E6F4EA",
  red:     "#C62828",
  redBg:   "#FEF2F2",
} as const;

interface SafetySettingsProps {
  userId: string;
  currentSettings: {
    onFireGameEnabled: boolean;
    speedDetectionEnabled: boolean;
  };
  onSettingsUpdate?: () => void;
}

// ─── SVG ICONS ──────────────────────────────────────────────────────────────
function FlameIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}


export const SafetySettings: React.FC<SafetySettingsProps> = ({ 
  userId, 
  currentSettings,
  onSettingsUpdate 
}) => {
  const [onFireGameEnabled, setOnFireGameEnabled] = useState(currentSettings.onFireGameEnabled);
  const { showNotification } = useNativeNotification();

  const handleToggle = async (enabled: boolean) => {
    await updateSetting(enabled);
  };

  const updateSetting = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('driver_settings')
        .upsert({
          user_id: userId,
          on_fire_game_enabled: enabled,
          speed_detection_enabled: enabled,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setOnFireGameEnabled(enabled);
      
      showNotification(
        enabled ? 'ON FIRE Game Activated!' : 'ON FIRE Game Deactivated',
        enabled 
          ? 'Speed monitoring is now active. Drive safely to earn maximum points!' 
          : 'Game mode disabled. Speed monitoring turned off.',
        'success'
      );

      if (onSettingsUpdate) {
        onSettingsUpdate();
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      showNotification(
        'Settings Error',
        'Failed to update ON FIRE Game settings.',
        'error'
      );
    }
  };

  return (
    <div style={{
      background: C.bg,
      color: C.text,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      padding: '20px 16px 40px',
    }}>
      {/* ON FIRE Game Mode Card */}
      <div style={{
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '18px 16px',
        marginBottom: 20,
        borderLeft: `3px solid ${C.orange}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: C.bgMuted,
            border: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <FlameIcon />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>
              ON FIRE Game Mode
            </div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
              Gamified delivery experience
            </div>
          </div>
        </div>

        {/* Safety-First Gaming */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, paddingLeft: 56 }}>
          <div style={{ flexShrink: 0, marginTop: 2, opacity: 0.6 }}>
            <ShieldIcon />
          </div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            <strong style={{ fontWeight: 700 }}>Safety-First Gaming:</strong> Earn points by completing deliveries efficiently, but speed limits are strictly enforced.
          </div>
        </div>

        {/* Speed Penalty */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, paddingLeft: 56 }}>
          <div style={{ flexShrink: 0, marginTop: 2, opacity: 0.6 }}>
            <AlertTriangleIcon />
          </div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            <strong style={{ fontWeight: 700 }}>Speed Penalty:</strong> Driving 5+ MPH over the speed limit will reduce your points and could disable game mode if violations persist.
          </div>
        </div>

        {/* How to Win */}
        <div style={{
          background: C.bgMuted,
          borderRadius: 8,
          padding: '14px 16px',
          marginTop: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ opacity: 0.5 }}>
              <TrophyIcon />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.orange, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              How to Win:
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, paddingLeft: 28 }}>
            <div style={{ marginBottom: 6 }}>
              <strong style={{ fontWeight: 700 }}>Speed up pickups:</strong> Quick order gathering = bonus points
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong style={{ fontWeight: 700 }}>Fast photo uploads:</strong> Efficient delivery completion
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong style={{ fontWeight: 700 }}>High acceptance rate:</strong> Accept more orders for multipliers
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong style={{ fontWeight: 700 }}>Maintain streaks:</strong> Consecutive deliveries without rejection
            </div>
            <div>
              <strong style={{ fontWeight: 700 }}>Drive SAFELY:</strong> Stay within speed limits at all times
            </div>
          </div>
        </div>

        {/* Active Status Footer */}
        {onFireGameEnabled && (
          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            background: C.bgMuted,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: C.green,
              flexShrink: 0,
            }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
              Speed monitoring active — Drive safely and earn points
            </div>
          </div>
        )}
      </div>

      {/* Slide to Confirm Toggle - Just below ON FIRE card */}
      <div style={{ marginTop: -23, padding: '0 4px' }}>
        <SlideToConfirm
          label={onFireGameEnabled ? "Slide to disable" : "Slide to enable ON FIRE Game Mode"}
          onConfirm={async () => {
            await handleToggle(!onFireGameEnabled);
          }}
          disabled={false}
        />
      </div>
    </div>
  );
};
