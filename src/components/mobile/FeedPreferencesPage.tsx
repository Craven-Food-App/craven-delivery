/**
 * Crave'n Feeder App — Feed Preferences (Enterprise Compact White)
 * ───────────────────────────────────────────────────────────────
 * Allows drivers to customize their order feed preferences
 */

import React, { useState, useEffect } from 'react';
import { IconArrowLeft, IconMapPin, IconClock, IconCoin, IconRoute, IconStar, IconTruck, IconMoodSmile } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { Loader } from '@mantine/core';
import SlideToToggle from '@/components/SlideToToggle';

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

type FeedPreferencesPageProps = {
  onBack: () => void;
};

const FeedPreferencesPage: React.FC<FeedPreferencesPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Preferences state
  const [preferences, setPreferences] = useState({
    // Distance preferences
    maxDistance: 10, // miles
    preferShortTrips: true,
    
    // Order value preferences
    minOrderValue: 5, // dollars
    preferHighValue: true,
    
    // Delivery preferences
    preferNoStairs: false,
    preferApartments: false,
    preferBusinesses: false,
    
    // Time preferences
    avoidRushHour: false,
    preferQuickPickup: true,
    
    // Customer preferences
    preferHighRatedCustomers: true,
    showCustomerTips: true,
    
    // Route preferences
    preferFamiliarAreas: false,
    batchDeliveries: true,
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch from driver_preferences table
      const { data: prefs } = await supabase
        .from('driver_preferences')
        .select('*')
        .eq('driver_id', user.id)
        .maybeSingle();

      // Fetch from user metadata as fallback
      const metadata = user.user_metadata || {};
      const feedPrefs = metadata.feed_preferences || {};

      if (prefs || Object.keys(feedPrefs).length > 0) {
        setPreferences({
          maxDistance: prefs?.max_delivery_distance || feedPrefs.maxDistance || 10,
          preferShortTrips: prefs?.prefer_short_trips ?? feedPrefs.preferShortTrips ?? true,
          minOrderValue: prefs?.min_order_value || feedPrefs.minOrderValue || 5,
          preferHighValue: prefs?.prefer_high_value ?? feedPrefs.preferHighValue ?? true,
          preferNoStairs: prefs?.prefer_no_stairs ?? feedPrefs.preferNoStairs ?? false,
          preferApartments: prefs?.prefer_apartments ?? feedPrefs.preferApartments ?? false,
          preferBusinesses: prefs?.prefer_businesses ?? feedPrefs.preferBusinesses ?? false,
          avoidRushHour: prefs?.avoid_rush_hour ?? feedPrefs.avoidRushHour ?? false,
          preferQuickPickup: prefs?.prefer_quick_pickup ?? feedPrefs.preferQuickPickup ?? true,
          preferHighRatedCustomers: prefs?.prefer_high_rated_customers ?? feedPrefs.preferHighRatedCustomers ?? true,
          showCustomerTips: prefs?.show_customer_tips ?? feedPrefs.showCustomerTips ?? true,
          preferFamiliarAreas: prefs?.prefer_familiar_areas ?? feedPrefs.preferFamiliarAreas ?? false,
          batchDeliveries: prefs?.batch_deliveries_enabled ?? feedPrefs.batchDeliveries ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save to driver_preferences table
      const { data: existing } = await supabase
        .from('driver_preferences')
        .select('driver_id')
        .eq('driver_id', user.id)
        .maybeSingle();

      const prefsData = {
        driver_id: user.id,
        max_delivery_distance: preferences.maxDistance,
        prefer_short_trips: preferences.preferShortTrips,
        min_order_value: preferences.minOrderValue,
        prefer_high_value: preferences.preferHighValue,
        prefer_no_stairs: preferences.preferNoStairs,
        prefer_apartments: preferences.preferApartments,
        prefer_businesses: preferences.preferBusinesses,
        avoid_rush_hour: preferences.avoidRushHour,
        prefer_quick_pickup: preferences.preferQuickPickup,
        prefer_high_rated_customers: preferences.preferHighRatedCustomers,
        show_customer_tips: preferences.showCustomerTips,
        prefer_familiar_areas: preferences.preferFamiliarAreas,
        batch_deliveries_enabled: preferences.batchDeliveries,
      };

      if (existing) {
        await supabase
          .from('driver_preferences')
          .update(prefsData)
          .eq('driver_id', user.id);
      } else {
        await supabase
          .from('driver_preferences')
          .insert(prefsData);
      }

      // Also save to user metadata as backup
      await supabase.auth.updateUser({
        data: {
          feed_preferences: preferences
        }
      });

      notifications.show({
        title: 'Preferences saved',
        message: 'Your feed preferences have been updated',
        color: 'green',
      });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      notifications.show({
        title: 'Failed to save',
        message: error.message || 'Please try again',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof typeof preferences, value: any) => {
    setPreferences({ ...preferences, [key]: value });
  };

  if (loading) {
    return (
      <div style={{ 
        position: 'fixed',
        inset: 0,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: C.bg,
        zIndex: 2000,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <Loader size="lg" color="orange" />
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: C.bg,
      color: C.text,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      display: "flex",
      flexDirection: "column",
      zIndex: 2000,
      overflow: "hidden",
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
            <IconArrowLeft size={24} />
          </button>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Feed Preferences</div>
          <button onClick={handleSave} disabled={saving} style={{ background: saving ? C.bgMuted : C.orange, color: saving ? C.muted : '#FFFFFF', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: saving ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            {saving ? <><Loader size={12} color={C.muted} /><span>Saving...</span></> : <span>Save</span>}
          </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        WebkitOverflowScrolling: 'touch',
        padding: '12px 16px', 
        paddingBottom: `calc(24px + env(safe-area-inset-bottom, 0px))` 
      }}>
        
        {/* Distance Section */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>Distance Preferences</div>
          
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Max Delivery Distance (miles)
            </label>
            <input 
              type="number" 
              value={preferences.maxDistance} 
              onChange={(e) => updatePreference('maxDistance', parseInt(e.target.value) || 1)}
              min="1"
              max="50"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 500, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = C.orange}
              onBlur={(e) => e.target.style.borderColor = C.border}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Prefer Short Trips</div>
              <div style={{ fontSize: 11, color: C.muted }}>Prioritize deliveries under 3 miles</div>
            </div>
            <SlideToToggle width={100} enabled={preferences.preferShortTrips} onToggle={() => updatePreference('preferShortTrips', !preferences.preferShortTrips)} />
          </div>
        </div>

        {/* Order Value Section */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>Order Value Preferences</div>
          
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Minimum Order Value ($)
            </label>
            <input 
              type="number" 
              value={preferences.minOrderValue} 
              onChange={(e) => updatePreference('minOrderValue', parseInt(e.target.value) || 0)}
              min="0"
              max="100"
              step="0.5"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 500, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = C.orange}
              onBlur={(e) => e.target.style.borderColor = C.border}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Prefer High Value Orders</div>
              <div style={{ fontSize: 11, color: C.muted }}>Prioritize orders with higher payouts</div>
            </div>
            <SlideToToggle width={100} enabled={preferences.preferHighValue} onToggle={() => updatePreference('preferHighValue', !preferences.preferHighValue)} />
          </div>
        </div>

        {/* Delivery Type Section */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>Delivery Type Preferences</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Avoid Stairs</div>
                <div style={{ fontSize: 11, color: C.muted }}>Skip deliveries with stairs</div>
              </div>
              <SlideToToggle width={100} enabled={preferences.preferNoStairs} onToggle={() => updatePreference('preferNoStairs', !preferences.preferNoStairs)} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Prefer Apartments</div>
                <div style={{ fontSize: 11, color: C.muted }}>Show apartment deliveries</div>
              </div>
              <SlideToToggle width={100} enabled={preferences.preferApartments} onToggle={() => updatePreference('preferApartments', !preferences.preferApartments)} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Prefer Businesses</div>
                <div style={{ fontSize: 11, color: C.muted }}>Show business deliveries</div>
              </div>
              <SlideToToggle width={100} enabled={preferences.preferBusinesses} onToggle={() => updatePreference('preferBusinesses', !preferences.preferBusinesses)} />
            </div>
          </div>
        </div>

        {/* Time Preferences Section */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>Time Preferences</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Avoid Rush Hour</div>
                <div style={{ fontSize: 11, color: C.muted }}>Skip peak traffic times</div>
              </div>
              <SlideToToggle width={100} enabled={preferences.avoidRushHour} onToggle={() => updatePreference('avoidRushHour', !preferences.avoidRushHour)} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Quick Pickup</div>
                <div style={{ fontSize: 11, color: C.muted }}>Prefer ready-to-go orders</div>
              </div>
              <SlideToToggle width={100} enabled={preferences.preferQuickPickup} onToggle={() => updatePreference('preferQuickPickup', !preferences.preferQuickPickup)} />
            </div>
          </div>
        </div>

        {/* Customer Preferences Section */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>Customer Preferences</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>High-Rated Customers</div>
                <div style={{ fontSize: 11, color: C.muted }}>Prefer customers with 4+ stars</div>
              </div>
              <SlideToToggle width={100} enabled={preferences.preferHighRatedCustomers} onToggle={() => updatePreference('preferHighRatedCustomers', !preferences.preferHighRatedCustomers)} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Show Tip Estimates</div>
                <div style={{ fontSize: 11, color: C.muted }}>Display estimated tip amounts</div>
              </div>
              <SlideToToggle width={100} enabled={preferences.showCustomerTips} onToggle={() => updatePreference('showCustomerTips', !preferences.showCustomerTips)} />
            </div>
          </div>
        </div>

        {/* Route Preferences Section */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>Route Preferences</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Familiar Areas</div>
                <div style={{ fontSize: 11, color: C.muted }}>Stay in areas you know well</div>
              </div>
              <SlideToToggle width={100} enabled={preferences.preferFamiliarAreas} onToggle={() => updatePreference('preferFamiliarAreas', !preferences.preferFamiliarAreas)} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>Batch Deliveries</div>
                <div style={{ fontSize: 11, color: C.muted }}>Accept multiple orders at once</div>
              </div>
              <SlideToToggle width={100} enabled={preferences.batchDeliveries} onToggle={() => updatePreference('batchDeliveries', !preferences.batchDeliveries)} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FeedPreferencesPage;

