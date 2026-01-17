import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCravingWheel } from '@/hooks/useCravingWheel';
import { CravingWheel } from '@/components/driver/CravingWheel';
import { NextShiftCountdown } from '@/components/driver/NextShiftCountdown';
import { DailyEarningsGraph } from '@/components/driver/DailyEarningsGraph';
import { Settings } from 'lucide-react';

interface OnFireDashboardProps {
  userId: string;
  onOpenSettings: () => void;
}

export const OnFireDashboard: React.FC<OnFireDashboardProps> = ({ 
  userId,
  onOpenSettings 
}) => {
  const { state, addDeliveryPoints } = useCravingWheel(userId);
  const [nextShift, setNextShift] = useState<Date | null>(null);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  useEffect(() => {
    const loadShiftSchedule = async () => {
      const today = new Date();
      const shiftTime = new Date(today);
      shiftTime.setHours(18, 0, 0, 0);
      
      const scheduled = new Date(shiftTime);
      scheduled.setHours(15, 0, 0, 0);
      
      setNextShift(shiftTime);
      setScheduledAt(scheduled);
    };

    loadShiftSchedule();
  }, [userId]);

  const handleDeliveryComplete = async (deliveryData: {
    tipAmount: number;
    deliveryTime: number;
    estimatedTime: number;
  }) => {
    await addDeliveryPoints({
      basePoints: 100,
      tipAmount: deliveryData.tipAmount,
      deliveryTime: deliveryData.deliveryTime,
      estimatedTime: deliveryData.estimatedTime,
      accepted: true,
    });
  };

  if (!state.gameEnabled) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            ON FIRE Game Mode is currently disabled
          </p>
          <button
            onClick={onOpenSettings}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600"
          >
            Enable in Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">ON FIRE Dashboard</h2>
        <button
          onClick={onOpenSettings}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <Settings className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-lg flex flex-col items-center">
          <CravingWheel
            currentPoints={state.currentPoints}
            maxPoints={state.maxPoints}
            isOnFire={state.isOnFire}
          />
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">Points</p>
            <p className="text-lg font-bold text-gray-900">
              {state.currentPoints} / {state.maxPoints}
            </p>
          </div>
        </div>

        {nextShift && scheduledAt && (
          <div className="bg-white rounded-lg p-4 shadow-lg flex flex-col items-center">
            <NextShiftCountdown
              nextShiftTime={nextShift}
              scheduledAt={scheduledAt}
            />
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">Next Shift</p>
              <p className="text-lg font-bold text-gray-900">
                {nextShift.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-2xl font-bold text-gray-900">{state.deliveredToday}</p>
          <p className="text-sm text-gray-600">Delivered</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-2xl font-bold text-gray-900">{state.acceptanceRate}%</p>
          <p className="text-sm text-gray-600">Acceptance</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-2xl font-bold text-gray-900">{state.wheelsFilled}</p>
          <p className="text-sm text-gray-600">🔥 Today</p>
        </div>
      </div>

      <DailyEarningsGraph userId={userId} />

      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 border-2 border-orange-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Today's FEED FLOW</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{state.deliveredToday}</div>
            <div className="text-xs text-gray-600">Delivered</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{state.acceptanceRate}%</div>
            <div className="text-xs text-gray-600">Acceptance</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">$0.00</div>
            <div className="text-xs text-gray-600">Tips</div>
          </div>
        </div>
      </div>

      {state.currentStreak > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <p className="text-center text-yellow-800 font-semibold">
            🔥 {state.currentStreak} Delivery Streak! {state.currentStreak >= 5 ? 'Keep it up!' : ''}
          </p>
        </div>
      )}

      {state.speedViolationsToday > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <p className="text-center text-red-800 font-semibold">
            ⚠️ {state.speedViolationsToday} Speed Violation{state.speedViolationsToday > 1 ? 's' : ''} Today
          </p>
          <p className="text-center text-red-600 text-sm mt-1">
            {3 - state.speedViolationsToday} more will disable game mode
          </p>
        </div>
      )}
    </div>
  );
};


