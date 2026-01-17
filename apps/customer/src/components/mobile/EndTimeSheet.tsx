import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Minus } from 'lucide-react';

interface EndTimeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onGoOnline: (endTime: Date, autoExtend: boolean, breakReminder: boolean) => void;
}

export const EndTimeSheet: React.FC<EndTimeSheetProps> = ({
  isOpen,
  onClose,
  onGoOnline
}) => {
  const [selectedHours, setSelectedHours] = useState<number>(4);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(0);
  const [autoExtend, setAutoExtend] = useState(true);
  const [breakReminder, setBreakReminder] = useState(true);

  if (!isOpen) return null;

  const quickHours = [1, 2, 3, 4, 6, 8, 12];

  const adjustHours = (increment: number) => {
    setSelectedHours(prev => Math.max(1, Math.min(12, prev + increment)));
  };

  const adjustMinutes = (increment: number) => {
    setSelectedMinutes(prev => {
      const newValue = prev + increment;
      if (newValue < 0) return 45;
      if (newValue > 45) return 0;
      return newValue;
    });
  };

  const formatDuration = () => {
    const hours = selectedHours;
    const minutes = selectedMinutes;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const getEndTimeDisplay = () => {
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + selectedHours);
    endTime.setMinutes(endTime.getMinutes() + selectedMinutes);
    return endTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleGoOnline = () => {
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + selectedHours);
    endTime.setMinutes(endTime.getMinutes() + selectedMinutes);
    onGoOnline(endTime, autoExtend, breakReminder);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed bottom-0 left-0 right-0 p-4">
        <Card className="w-full animate-slide-up">
          <CardHeader className="pb-4 safe-area-top">
            <CardTitle className="text-xl flex items-center gap-2">
              <Clock className="h-5 w-5" />
              How long do you want to drive?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Duration Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Quick Select</Label>
              <div className="flex flex-wrap gap-2">
                {quickHours.map((hours) => (
                  <Button
                    key={hours}
                    variant={selectedHours === hours && selectedMinutes === 0 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedHours(hours);
                      setSelectedMinutes(0);
                    }}
                    className="text-xs"
                  >
                    {hours}h
                  </Button>
                ))}
              </div>
            </div>

            {/* Time Selector */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Custom Duration</Label>
              <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => adjustHours(1)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <div className="my-2 text-2xl font-bold">{selectedHours}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => adjustHours(-1)}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="text-xs text-muted-foreground mt-1">hours</div>
                </div>
                
                <div className="text-2xl font-bold">:</div>
                
                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => adjustMinutes(15)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <div className="my-2 text-2xl font-bold">{selectedMinutes.toString().padStart(2, '0')}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => adjustMinutes(-15)}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="text-xs text-muted-foreground mt-1">mins</div>
                </div>
              </div>
              
              {/* Duration Preview */}
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Duration: {formatDuration()}</p>
                  <p className="text-xs text-muted-foreground">End time: {getEndTimeDisplay()}</p>
                </div>
                <Badge variant="secondary">
                  {formatDuration()}
                </Badge>
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-extend" className="text-sm">
                  Auto-extend if on delivery at end time
                </Label>
                <Switch id="auto-extend" checked={autoExtend} onCheckedChange={setAutoExtend} />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="break-reminder" className="text-sm">
                  Break reminder after 2 hrs
                </Label>
                <Switch id="break-reminder" checked={breakReminder} onCheckedChange={setBreakReminder} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleGoOnline} className="flex-1 bg-green-600 hover:bg-green-700">
                Go Online
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};