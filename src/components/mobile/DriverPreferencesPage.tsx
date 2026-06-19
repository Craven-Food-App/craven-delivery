import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  Bell,
  Map,
  Palette,
  Shield,
  Zap,
  Save,
  Info,
  Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CXDriverOptInCard } from '@/components/cx/CXDriverOptInCard';

export function DriverPreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [prefs, setPrefs] = useState<any>({
    // Delivery
    preferred_vehicle_type: 'car',
    max_delivery_distance_miles: 15,
    min_order_payout_cents: 600,
    auto_accept_enabled: false,
    auto_accept_min_payout_cents: 800,
    accept_stacked_orders: true,
    max_stacked_orders: 2,
    
    // Notifications
    push_notifications_enabled: true,
    notification_new_orders: true,
    notification_high_value: true,
    notification_surge_alerts: true,
    notification_rating_updates: true,
    notification_promo_alerts: true,
    notification_payment_received: true,
    sound_enabled: true,
    sound_order_alert: 'chime',
    sound_high_value_alert: 'fanfare',
    vibration_enabled: true,
    do_not_disturb: false,
    
    // Navigation
    preferred_nav_app: 'mapbox',
    avoid_highways: false,
    avoid_tolls: true,
    prefer_bike_lanes: false,
    smart_routing_enabled: true,
    
    // Display
    theme: 'auto',
    text_size: 'medium',
    map_style: 'standard',
    show_earnings_card: true,
    show_rating_card: true,
    show_streak_counter: true,
    compact_mode: false,
    
    // Privacy
    emergency_contact_name: '',
    emergency_contact_phone: '',
    share_location_with: 'nobody',
    auto_911_on_crash: true,
    
    // Performance
    battery_saver_enabled: true,
    battery_saver_threshold: 20,
    high_quality_maps: false,
    offline_map_cache_enabled: true,
    auto_update_cache: 'wifi_only',
    location_accuracy: 'high',
    location_update_interval_seconds: 5,
    background_tracking: true,
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingPreferences, error } = await supabase
        .from('driver_preferences')
        .select('*')
        .eq('driver_id', user.id)
        .maybeSingle();

      if (existingPreferences) {
        setPrefs(existingPreferences);
        // Save map_style to localStorage for immediate access
        if (existingPreferences.map_style) {
          localStorage.setItem('driver_map_style', existingPreferences.map_style);
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('driver_preferences')
        .upsert({
          ...prefs,
          driver_id: user.id,
        });

      if (error) throw error;

      toast.success('Preferences saved!');
      setHasChanges(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePref = (key: string, value: any) => {
    setPrefs({ ...prefs, [key]: value });
    setHasChanges(true);
    
    // Save map_style to localStorage immediately for instant UI updates
    if (key === 'map_style') {
      localStorage.setItem('driver_map_style', value);
      // Dispatch event to notify map to reload
      window.dispatchEvent(new CustomEvent('mapStyleChange', { detail: { style: value } }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Settings className="h-12 w-12 animate-pulse text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Preferences</h1>
            <p className="text-sm text-gray-600">Customize your driving experience</p>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Crave'N Express opt-in */}
        <CXDriverOptInCard driverId={prefs.driver_id} />

        {/* 1. Delivery Preferences */}
        <Card className="border-2 border-purple-200 bg-white/80 backdrop-blur">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Target className="h-5 w-5" />
              🎯 Delivery Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>🚗 Preferred Vehicle Type</Label>
              <div className="grid grid-cols-4 gap-2">
                {['car', 'bike', 'scooter', 'motorcycle'].map((type) => (
                  <button
                    key={type}
                    onClick={() => updatePref('preferred_vehicle_type', type)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      prefs.preferred_vehicle_type === type
                        ? 'border-purple-500 bg-purple-50 text-purple-900'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>📍 Maximum Delivery Distance</Label>
                <Badge variant="outline">{prefs.max_delivery_distance_miles} miles</Badge>
              </div>
              <Slider
                value={[prefs.max_delivery_distance_miles]}
                onValueChange={([value]) => updatePref('max_delivery_distance_miles', value)}
                min={1}
                max={30}
                step={0.5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>💵 Minimum Order Payout</Label>
                <Badge variant="outline">${(prefs.min_order_payout_cents / 100).toFixed(2)}</Badge>
              </div>
              <Slider
                value={[prefs.min_order_payout_cents / 100]}
                onValueChange={([value]) => updatePref('min_order_payout_cents', Math.round(value * 100))}
                min={3}
                max={20}
                step={0.50}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex-1">
                <Label className="font-semibold">⚡ Auto-Accept Orders</Label>
                <p className="text-xs text-gray-600 mt-1">
                  Only above ${(prefs.auto_accept_min_payout_cents / 100).toFixed(2)}
                </p>
              </div>
              <Switch
                checked={prefs.auto_accept_enabled}
                onCheckedChange={(checked) => updatePref('auto_accept_enabled', checked)}
              />
            </div>

            {prefs.auto_accept_enabled && (
              <div className="space-y-2 pl-4 border-l-2 border-blue-300">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Min. Auto-Accept Amount</Label>
                  <Badge>${(prefs.auto_accept_min_payout_cents / 100).toFixed(2)}</Badge>
                </div>
                <Slider
                  value={[prefs.auto_accept_min_payout_cents / 100]}
                  onValueChange={([value]) => updatePref('auto_accept_min_payout_cents', Math.round(value * 100))}
                  min={5}
                  max={25}
                  step={0.50}
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex-1">
                <Label className="font-semibold">🎲 Accept Stacked Orders</Label>
                <p className="text-xs text-gray-600 mt-1">
                  Max {prefs.max_stacked_orders} at once
                </p>
              </div>
              <Switch
                checked={prefs.accept_stacked_orders}
                onCheckedChange={(checked) => updatePref('accept_stacked_orders', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Notifications */}
        <Card className="border-2 border-blue-200 bg-white/80 backdrop-blur">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Bell className="h-5 w-5" />
              🔔 Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center justify-between">
              <Label>📱 Push Notifications</Label>
              <Switch
                checked={prefs.push_notifications_enabled}
                onCheckedChange={(checked) => updatePref('push_notifications_enabled', checked)}
              />
            </div>

            {prefs.push_notifications_enabled && (
              <div className="space-y-2 pl-4 border-l-2 border-blue-300">
                {[
                  { key: 'notification_new_orders', label: 'New Orders', icon: '📦' },
                  { key: 'notification_high_value', label: 'High-Value Orders', icon: '💎' },
                  { key: 'notification_surge_alerts', label: 'Surge Alerts', icon: '🔥' },
                  { key: 'notification_rating_updates', label: 'Rating Updates', icon: '⭐' },
                  { key: 'notification_promo_alerts', label: 'Promo Alerts', icon: '🎁' },
                  { key: 'notification_payment_received', label: 'Payment Received', icon: '💰' },
                ].map((notif) => (
                  <div key={notif.key} className="flex items-center justify-between py-2">
                    <Label className="text-sm">{notif.icon} {notif.label}</Label>
                    <Switch
                      checked={prefs[notif.key]}
                      onCheckedChange={(checked) => updatePref(notif.key, checked)}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t space-y-3">
              <div className="flex items-center justify-between">
                <Label>🔊 Sound Enabled</Label>
                <Switch
                  checked={prefs.sound_enabled}
                  onCheckedChange={(checked) => updatePref('sound_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>📳 Vibration</Label>
                <Switch
                  checked={prefs.vibration_enabled}
                  onCheckedChange={(checked) => updatePref('vibration_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>🌙 Do Not Disturb</Label>
                <Switch
                  checked={prefs.do_not_disturb}
                  onCheckedChange={(checked) => updatePref('do_not_disturb', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Navigation */}
        <Card className="border-2 border-green-200 bg-white/80 backdrop-blur">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Map className="h-5 w-5" />
              🗺️ Navigation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Preferred Navigation App</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'mapbox', label: '📱 In-App' },
                  { value: 'google_maps', label: '🗺️ Google' },
                  { value: 'waze', label: '🚗 Waze' },
                  { value: 'apple_maps', label: '🍎 Apple' },
                ].map((app) => (
                  <button
                    key={app.value}
                    onClick={() => updatePref('preferred_nav_app', app.value)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      prefs.preferred_nav_app === app.value
                        ? 'border-green-500 bg-green-50 text-green-900'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {app.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                💡 In-App provides turn-by-turn directions without leaving the app
              </p>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">🛣️ Route Preferences</Label>
              <div className="space-y-2">
                {[
                  { key: 'avoid_highways', label: 'Avoid Highways' },
                  { key: 'avoid_tolls', label: 'Avoid Tolls' },
                  { key: 'prefer_bike_lanes', label: 'Prefer Bike Lanes' },
                ].map((route) => (
                  <div key={route.key} className="flex items-center justify-between py-2">
                    <Label className="text-sm">{route.label}</Label>
                    <Switch
                      checked={prefs[route.key]}
                      onCheckedChange={(checked) => updatePref(route.key, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex-1">
                <Label className="font-semibold">🎯 Smart Routing (AI)</Label>
                <p className="text-xs text-gray-600 mt-1">Optimize multi-stop orders</p>
              </div>
              <Switch
                checked={prefs.smart_routing_enabled}
                onCheckedChange={(checked) => updatePref('smart_routing_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. Display */}
        <Card className="border-2 border-orange-200 bg-white/80 backdrop-blur">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Palette className="h-5 w-5" />
              🎨 Display & Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>🌓 Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'auto', label: 'Auto' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ].map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => updatePref('theme', theme.value)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      prefs.theme === theme.value
                        ? 'border-orange-500 bg-orange-50 text-orange-900'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>🗺️ Map Style</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'standard', label: 'Standard' },
                  { value: 'satellite', label: 'Satellite' },
                  { value: 'dark', label: 'Dark' },
                ].map((style) => (
                  <button
                    key={style.value}
                    onClick={() => updatePref('map_style', style.value)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      prefs.map_style === style.value
                        ? 'border-orange-500 bg-orange-50 text-orange-900'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">📊 Dashboard Layout</Label>
              <div className="space-y-2">
                {[
                  { key: 'show_earnings_card', label: 'Show Earnings Card' },
                  { key: 'show_rating_card', label: 'Show Rating Card' },
                  { key: 'show_streak_counter', label: 'Show Streak Counter' },
                  { key: 'compact_mode', label: 'Compact Mode' },
                ].map((layout) => (
                  <div key={layout.key} className="flex items-center justify-between py-2">
                    <Label className="text-sm">{layout.label}</Label>
                    <Switch
                      checked={prefs[layout.key]}
                      onCheckedChange={(checked) => updatePref(layout.key, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Privacy & Safety */}
        <Card className="border-2 border-red-200 bg-white/80 backdrop-blur">
          <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <Shield className="h-5 w-5" />
              🔐 Privacy & Safety
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>📞 Emergency Contact</Label>
              <Input
                placeholder="Contact Name"
                value={prefs.emergency_contact_name}
                onChange={(e) => updatePref('emergency_contact_name', e.target.value)}
              />
              <Input
                type="tel"
                placeholder="Phone Number"
                value={prefs.emergency_contact_phone}
                onChange={(e) => updatePref('emergency_contact_phone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>📍 Share Live Location</Label>
              <select
                value={prefs.share_location_with}
                onChange={(e) => updatePref('share_location_with', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="nobody">Nobody</option>
                <option value="family">Family Only</option>
                <option value="emergency_contact">Emergency Contact</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex-1">
                <Label className="font-semibold">🆘 Auto-911 on Crash</Label>
                <p className="text-xs text-gray-600 mt-1">Emergency services notified</p>
              </div>
              <Switch
                checked={prefs.auto_911_on_crash}
                onCheckedChange={(checked) => updatePref('auto_911_on_crash', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 6. Performance & Battery */}
        <Card className="border-2 border-yellow-200 bg-white/80 backdrop-blur">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <Zap className="h-5 w-5" />
              ⚡ Performance & Battery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>🔋 Battery Saver Mode</Label>
                <Switch
                  checked={prefs.battery_saver_enabled}
                  onCheckedChange={(checked) => updatePref('battery_saver_enabled', checked)}
                />
              </div>
              {prefs.battery_saver_enabled && (
                <div className="pl-4 border-l-2 border-yellow-300">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Activate below</Label>
                    <Badge>{prefs.battery_saver_threshold}%</Badge>
                  </div>
                  <Slider
                    value={[prefs.battery_saver_threshold]}
                    onValueChange={([value]) => updatePref('battery_saver_threshold', value)}
                    min={10}
                    max={50}
                    step={5}
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">📊 Data Usage</Label>
              <div className="space-y-2">
                {[
                  { key: 'high_quality_maps', label: 'High Quality Maps' },
                  { key: 'offline_map_cache_enabled', label: 'Offline Map Cache' },
                ].map((data) => (
                  <div key={data.key} className="flex items-center justify-between py-2">
                    <Label className="text-sm">{data.label}</Label>
                    <Switch
                      checked={prefs[data.key]}
                      onCheckedChange={(checked) => updatePref(data.key, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>📍 Location Accuracy</Label>
              <select
                value={prefs.location_accuracy}
                onChange={(e) => updatePref('location_accuracy', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="high">High (Best accuracy)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="low">Low (Save battery)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">💡 Tip:</p>
                <p>All preferences are saved automatically to the cloud and sync across your devices.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Save Button */}
      {hasChanges && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
            size="lg"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? 'Saving Changes...' : 'Save All Changes'}
          </Button>
        </div>
      )}
    </div>
  );
}

// Import Settings icon
import { Settings } from 'lucide-react';

