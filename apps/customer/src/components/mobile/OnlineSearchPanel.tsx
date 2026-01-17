import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Pause, Play, Square, Clock, DollarSign, MapPin, Zap } from 'lucide-react';

type EarningMode = 'perHour' | 'perOffer';
type VehicleType = 'car' | 'bike' | 'scooter' | 'walk' | 'motorcycle';

interface OnlineSearchPanelProps {
  earningMode: EarningMode;
  vehicleType: VehicleType;
  endTime: Date | null;
  onlineTime: number;
  onPause: () => void;
  onEnd: () => void;
}

export const OnlineSearchPanel: React.FC<OnlineSearchPanelProps> = ({
  earningMode,
  vehicleType,
  endTime,
  onlineTime,
  onPause,
  onEnd
}) => {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatEndTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getProgress = (): number => {
    if (!endTime) return 0;
    const now = new Date();
    const start = new Date(now.getTime() - onlineTime * 1000);
    const total = endTime.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min((elapsed / total) * 100, 100);
  };

  const getVehicleIcon = () => {
    switch(vehicleType) {
      case 'car': return '🚗';
      case 'bike': return '🚲';
      case 'scooter': return '🛴';
      case 'motorcycle': return '🏍️';
      case 'walk': return '🚶';
      default: return '🚗';
    }
  };

  return (
    <>
      {/* Clean Status Indicator - Spark Style */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span className="font-semibold text-lg">Online</span>
        </div>
      </div>

      {/* Main Stats Display - Center */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-center">
        <div className="bg-background/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-border/20">
          <div className="space-y-6">
            {/* Today's Earnings */}
            <div>
              <p className="text-muted-foreground text-sm mb-1">Today's Earnings</p>
              <p className="text-4xl font-bold text-green-600">$0.00</p>
            </div>
            
            {/* Time Online */}
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold">{formatTime(onlineTime)}</p>
                <p className="text-sm text-muted-foreground">Time Online</p>
              </div>
              {endTime && (
                <div className="text-center">
                  <p className="text-lg font-semibold">{formatEndTime(endTime)}</p>
                  <p className="text-sm text-muted-foreground">Until</p>
                </div>
              )}
            </div>

            {/* Earning Mode Badge */}
            <div className="flex justify-center">
              <Badge variant="secondary" className="px-4 py-2">
                {earningMode === 'perHour' ? '🕐 $18/hour + tips' : '⚡ Per Offer Mode'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Go Offline Button - Bottom */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
        <Button 
          onClick={onEnd}
          variant="outline"
          className="bg-background/95 backdrop-blur-sm border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-12 py-6 text-lg font-semibold rounded-2xl shadow-lg"
        >
          Go Offline
        </Button>
      </div>

      {/* Pause Button - Top Right */}
      <div className="absolute top-8 right-6 z-10">
        <Button 
          onClick={onPause}
          variant="ghost"
          size="sm"
          className="bg-background/80 backdrop-blur-sm border border-border/20 rounded-full p-3 shadow-lg hover:bg-background/90"
        >
          <Pause className="h-5 w-5" />
        </Button>
      </div>

      {/* Subtle Bottom Stats */}
      <div className="absolute bottom-6 left-6 z-10">
        <div className="bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-md border border-border/20">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="text-xl">{getVehicleIcon()}</span>
              <span className="capitalize">{vehicleType}</span>
            </span>
            <span>•</span>
            <span>Toledo</span>
          </div>
        </div>
      </div>
    </>
  );
};