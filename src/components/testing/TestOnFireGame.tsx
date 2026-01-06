import React, { useState, useEffect } from 'react';
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
  driver_id: string;
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
      const { data: sessions, error } = await supabase
        .from('driver_sessions')
        .select('driver_id')
        .eq('is_online', true);

      if (error) throw error;

      if (!sessions || sessions.length === 0) {
        setOnlineDrivers([]);
        return;
      }

      // Get driver profile info for display
      const driverIds = sessions.map(s => s.driver_id);
      const { data: profiles } = await supabase
        .from('driver_profiles')
        .select('user_id')
        .in('user_id', driverIds);

      // Build driver list with available info
      const driverMap = new Map(profiles?.map(p => [p.user_id, true]) || []);
      
      setOnlineDrivers(
        sessions.map(s => ({
          driver_id: s.driver_id,
          email: s.driver_id.slice(0, 8) + '...' + s.driver_id.slice(-4)
        }))
      );
    } catch (error) {
      console.error('Error fetching online drivers:', error);
      toast.error('Failed to load online drivers');
    } finally {
      setLoadingDrivers(false);
    }
  };

  const sendFireToDriver = async (driverId: string) => {
    setSendingFire(driverId);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Set wheel to ON FIRE (2000 points = 100%)
      const { error } = await supabase
        .from('craving_wheel_progress')
        .upsert({
          user_id: driverId,
          date: today,
          current_points: 2000,
          max_points: 2000,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;

      toast.success(`🔥 ON FIRE sent to driver! They should see it on their earnings page.`);
      
      // Refresh driver list
      setTimeout(() => fetchOnlineDrivers(), 1000);
    } catch (error: any) {
      console.error('Error sending fire:', error);
      toast.error(`Failed to send fire: ${error.message}`);
    } finally {
      setSendingFire(null);
    }
  };

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
                    key={driver.driver_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">{driver.email}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {driver.driver_id.slice(0, 8)}...
                      </p>
                    </div>
                    <Button
                      onClick={() => sendFireToDriver(driver.driver_id)}
                      disabled={sendingFire === driver.driver_id}
                      size="sm"
                      variant="destructive"
                    >
                      {sendingFire === driver.driver_id ? 'Sending...' : '🔥 Send ON FIRE'}
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


