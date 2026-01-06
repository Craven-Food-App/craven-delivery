import React, { useState } from 'react';
import { FlamingText } from '@/components/ui/FlamingText';
import { CravingWheel } from '@/components/driver/CravingWheel';
import { NextShiftCountdown } from '@/components/driver/NextShiftCountdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export const TestOnFireGame: React.FC = () => {
  const [wheelProgress, setWheelProgress] = useState(75); // percent
  const [forceWheelOnFire, setForceWheelOnFire] = useState(false);

  const [countdownMinutes, setCountdownMinutes] = useState(30);
  const [forceCountdownOnFire, setForceCountdownOnFire] = useState(false);

  const now = new Date();
  const scheduledAt = new Date(now.getTime());
  const nextShiftTime = new Date(now.getTime() + countdownMinutes * 60 * 1000);

  const effectivePoints = forceWheelOnFire ? 2000 : Math.round((wheelProgress / 100) * 2000);

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
    </div>
  );
};


