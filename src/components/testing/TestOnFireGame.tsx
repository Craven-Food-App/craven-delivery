import React, { useState, useEffect, useRef } from 'react';
import { FlamingText } from '@/components/ui/FlamingText';
import { CravingWheel } from '@/components/driver/CravingWheel';
import { NextShiftCountdown } from '@/components/driver/NextShiftCountdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OnlineDriver {
  driver_profile_id: string; // driver_profiles.id
  user_id: string; // auth.users.id (from driver_profiles.user_id)
  email: string;
  name?: string;
}

export const TestOnFireGame: React.FC = () => {
  const [wheelProgress, setWheelProgress] = useState(75); // percent
  const [forceWheelOnFire, setForceWheelOnFire] = useState(false);

  const [countdownMinutes, setCountdownMinutes] = useState(30);
  const [forceCountdownOnFire, setForceCountdownOnFire] = useState(false);

  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [sendingFire, setSendingFire] = useState<string | null>(null);
  const activeFireTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const now = new Date();
  const scheduledAt = new Date(now.getTime());
  const nextShiftTime = new Date(now.getTime() + countdownMinutes * 60 * 1000);

  const effectivePoints = forceWheelOnFire ? 2000 : Math.round((wheelProgress / 100) * 2000);

  useEffect(() => {
    fetchOnlineDrivers();
  }, []);

  const fetchOnlineDrivers = async () => {
    setLoadingDrivers(true);
    try {
      // Get online driver sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('driver_sessions')
        .select('driver_id')
        .eq('is_online', true);

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) {
        setOnlineDrivers([]);
        return;
      }

      // Get driver_profiles to map driver_id (profile.id) to user_id
      const driverProfileIds = sessions.map(s => s.driver_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('driver_profiles')
        .select('id, user_id')
        .in('id', driverProfileIds);

      if (profilesError) throw profilesError;

      // Build a map of driver_profile.id -> user_id
      const profileMap = new Map(profiles?.map(p => [p.id, p.user_id]) || []);

      // Build driver list with user_id from driver_profiles
      setOnlineDrivers(
        sessions
          .filter(s => profileMap.has(s.driver_id))
          .map(s => {
            const userId = profileMap.get(s.driver_id)!;
            return {
              driver_profile_id: s.driver_id,
              user_id: userId,
              email: userId.slice(0, 8) + '...' + userId.slice(-4)
            };
          })
      );
    } catch (error) {
      console.error('Error fetching online drivers:', error);
      toast.error('Failed to load online drivers');
    } finally {
      setLoadingDrivers(false);
    }
  };

  const sendFireToDriver = async (userId: string) => {
    setSendingFire(userId);
    try {
      // Clear any existing timer for this driver
      const existingTimer = activeFireTimersRef.current.get(userId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        activeFireTimersRef.current.delete(userId);
      }

      // Use RPC function to bypass RLS for testing
      // userId is the auth.users.id from driver_profiles.user_id
      const { error } = await supabase.rpc('admin_update_craving_progress', {
        p_user_id: userId,
        p_current_points: 2000,
        p_max_points: 2000,
        p_date: new Date().toISOString().split('T')[0]
      });

      if (error) {
        // Check if function doesn't exist
        if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
          throw new Error('RPC function admin_update_craving_progress not found. Please run the SQL migration in Supabase SQL Editor.');
        }
        throw error;
      }

      toast.success(`🔥 ON FIRE sent to driver! Will auto-reset in 60 seconds.`);
      
      // Set up 60-second timeout to reset the fire state
      const timer = setTimeout(async () => {
        try {
          // Reset points back to 0 (or a normal state)
          await supabase.rpc('admin_update_craving_progress', {
            p_user_id: userId,
            p_current_points: 0,
            p_max_points: 2000,
            p_date: new Date().toISOString().split('T')[0]
          });
          
          toast.info(`🔥 ON FIRE test ended for driver. Points reset.`);
          
          // Clean up timer
          activeFireTimersRef.current.delete(userId);
          
          // Refresh driver list
          fetchOnlineDrivers();
        } catch (error: any) {
          console.error('Error resetting fire state:', error);
          toast.error('Failed to reset fire state automatically');
        }
      }, 60000); // 60 seconds

      // Store the timer
      activeFireTimersRef.current.set(userId, timer);
      
      // Refresh driver list
      setTimeout(() => fetchOnlineDrivers(), 1000);
    } catch (error: any) {
      console.error('Error sending fire:', error);
      const errorMessage = error.message || 'Unknown error';
      toast.error(`Failed to send fire: ${errorMessage}`);
    } finally {
      setSendingFire(null);
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      activeFireTimersRef.current.forEach(timer => clearTimeout(timer));
      activeFireTimersRef.current.clear();
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-base font-semibold">ON FIRE Flame Demo</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This test harness lets you trigger the animated <code>FlamingText</code> states
            for both the Craving Wheel and the Next Shift countdown without needing live data.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Craving Wheel demo */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Craving Wheel</h3>
              <div className="flex items-center justify-center">
                <CravingWheel
                  currentPoints={effectivePoints}
                  maxPoints={2000}
                  isOnFire={forceWheelOnFire || wheelProgress >= 100}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Wheel progress ({wheelProgress}%)
                </Label>
                <Slider
                  value={[wheelProgress]}
                  min={0}
                  max={120}
                  step={5}
                  onValueChange={([v]) => setWheelProgress(v)}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={forceWheelOnFire}
                      onCheckedChange={setForceWheelOnFire}
                    />
                    <span className="text-xs">Force ON FIRE</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Points: {effectivePoints} / 2000
                  </span>
                </div>
              </div>
            </div>

            {/* Next Shift countdown demo */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Next Shift Countdown</h3>
              <div className="flex items-center justify-center">
                {forceCountdownOnFire ? (
                  <div className="flex flex-col items-center justify-center h-[120px] w-[120px]">
                    <FlamingText className="text-sm leading-tight">ON</FlamingText>
                    <FlamingText className="text-sm leading-tight">FIRE</FlamingText>
                  </div>
                ) : (
                  <NextShiftCountdown
                    nextShiftTime={nextShiftTime}
                    scheduledAt={scheduledAt}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Minutes until shift ({countdownMinutes}m)
                </Label>
                <Slider
                  value={[countdownMinutes]}
                  min={0}
                  max={120}
                  step={5}
                  onValueChange={([v]) => setCountdownMinutes(v)}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={forceCountdownOnFire}
                      onCheckedChange={setForceCountdownOnFire}
                    />
                    <span className="text-xs">Force ON FIRE</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    End time: {nextShiftTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Driver Testing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-base font-semibold">Send ON FIRE to Online Driver</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set an online driver's craving wheel to 100% (ON FIRE state) for testing on their earnings page.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Online Drivers</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOnlineDrivers}
                disabled={loadingDrivers}
              >
                {loadingDrivers ? 'Loading...' : 'Refresh'}
              </Button>
            </div>

            {onlineDrivers.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                No online drivers found. Make sure a driver is logged in and online.
              </div>
            ) : (
              <div className="space-y-2">
                {onlineDrivers.map((driver) => (
                  <div
                    key={driver.user_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">{driver.email}</p>
                      <p className="text-xs text-muted-foreground">
                        User ID: {driver.user_id.slice(0, 8)}...
                      </p>
                    </div>
                    <Button
                      onClick={() => sendFireToDriver(driver.user_id)}
                      disabled={sendingFire === driver.user_id}
                      size="sm"
                      variant="destructive"
                    >
                      {sendingFire === driver.user_id ? 'Sending...' : '🔥 Send ON FIRE'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


