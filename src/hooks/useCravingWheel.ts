// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { speedDetectionService } from '@/services/speedDetectionService';
import { useNativeNotification } from '@/hooks/useNativeNotification';

interface CravingWheelState {
  currentPoints: number;
  maxPoints: number;
  deliveredToday: number;
  acceptanceRate: number;
  currentStreak: number;
  wheelsFilled: number;
  isOnFire: boolean;
  speedViolationsToday: number;
  gameEnabled: boolean;
}

interface DeliveryData {
  basePoints: number;
  tipAmount: number;
  deliveryTime: number;
  estimatedTime: number;
  accepted: boolean;
}

export const useCravingWheel = (userId: string) => {
  const [state, setState] = useState<CravingWheelState>({
    currentPoints: 0,
    maxPoints: 2000,
    deliveredToday: 0,
    acceptanceRate: 100,
    currentStreak: 0,
    wheelsFilled: 0,
    isOnFire: false,
    speedViolationsToday: 0,
    gameEnabled: false,
  });

  const { showNotification } = useNativeNotification();

  useEffect(() => {
    const loadProgress = async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data: settings } = await supabase
        .from('driver_settings')
        .select('on_fire_game_enabled')
        .eq('user_id', userId)
        .maybeSingle();

      const { data: progress } = await supabase
        .from('craving_wheel_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (progress) {
        setState(prev => ({
          ...prev,
          currentPoints: progress.current_points,
          deliveredToday: progress.deliveries_completed,
          wheelsFilled: progress.wheels_filled,
          currentStreak: progress.current_streak,
          speedViolationsToday: progress.speed_violations,
          acceptanceRate: parseFloat(progress.acceptance_rate),
          gameEnabled: settings?.on_fire_game_enabled || false,
        }));
      } else if (settings) {
        setState(prev => ({
          ...prev,
          gameEnabled: settings.on_fire_game_enabled || false,
        }));
      }

      if (settings?.on_fire_game_enabled && speedDetectionService.isSupported()) {
        startSpeedMonitoring();
      }
    };

    if (userId) {
      loadProgress();
    }

    return () => {
      speedDetectionService.stopMonitoring();
    };
  }, [userId]);

  const startSpeedMonitoring = () => {
    if (!userId || !speedDetectionService.isSupported()) {
      return;
    }

    speedDetectionService.startMonitoring(userId, {
      onSpeedUpdate: (speedData) => {
        console.log('Current speed:', speedData.currentSpeed, 'MPH');
      },
      onViolation: async (violation) => {
        const newPoints = Math.max(0, state.currentPoints - violation.pointsPenalty);

        setState(prev => ({
          ...prev,
          currentPoints: newPoints,
          speedViolationsToday: prev.speedViolationsToday + 1,
        }));

        await updateProgressInDatabase({
          current_points: newPoints,
          speed_violations: state.speedViolationsToday + 1,
        });

        showNotification(
          'Speed Violation! ⚠️',
          `${violation.excessSpeed} MPH over limit. -${violation.pointsPenalty} points!`,
          'error'
        );

        const shouldDisable = await speedDetectionService.checkViolationThreshold(userId);
        if (shouldDisable) {
          setState(prev => ({ ...prev, gameEnabled: false }));
          showNotification(
            'Game Mode Disabled',
            'Too many speed violations. Game mode suspended for 24 hours.',
            'error'
          );
        }
      },
    });
  };

  const addDeliveryPoints = async (delivery: DeliveryData) => {
    if (!state.gameEnabled) return;

    const BASE_POINTS = 100;

    const acceptanceMultiplier = state.acceptanceRate / 100;

    let speedBonus = 1.0;
    if (delivery.deliveryTime < delivery.estimatedTime * 0.8) {
      speedBonus = 1.5;
    } else if (delivery.deliveryTime < delivery.estimatedTime) {
      speedBonus = 1.2;
    }

    const streakMultiplier = Math.min(1 + state.currentStreak * 0.1, 2.0);

    const tipBonus = delivery.tipAmount * 10;

    const pointsEarned = Math.floor(
      BASE_POINTS * acceptanceMultiplier * speedBonus * streakMultiplier + tipBonus
    );

    const newPoints = state.currentPoints + pointsEarned;
    const newDeliveries = state.deliveredToday + 1;
    const newStreak = delivery.accepted ? state.currentStreak + 1 : 0;

    if (newPoints >= state.maxPoints) {
      const overflow = newPoints - state.maxPoints;
      const newWheelsFilled = state.wheelsFilled + 1;

      setState(prev => ({
        ...prev,
        currentPoints: overflow,
        wheelsFilled: newWheelsFilled,
        isOnFire: true,
        currentStreak: newStreak,
        deliveredToday: newDeliveries,
      }));

      await updateProgressInDatabase({
        current_points: overflow,
        deliveries_completed: newDeliveries,
        wheels_filled: newWheelsFilled,
        current_streak: newStreak,
      });

      await awardWheelCompletionBonus(userId);

      showNotification(
        'ON FIRE! 🔥',
        'Wheel filled! +$5 bonus earned!',
        'success'
      );

      setTimeout(() => {
        setState(prev => ({ ...prev, isOnFire: false }));
      }, 3000);
    } else {
      setState(prev => ({
        ...prev,
        currentPoints: newPoints,
        currentStreak: newStreak,
        deliveredToday: newDeliveries,
      }));

      await updateProgressInDatabase({
        current_points: newPoints,
        deliveries_completed: newDeliveries,
        current_streak: newStreak,
      });

      showNotification(
        `+${pointsEarned} Points!`,
        `${Math.floor((newPoints / state.maxPoints) * 100)}% to ON FIRE`,
        'success'
      );
    }
  };

  const updateProgressInDatabase = async (updates: Partial<{
    current_points: number;
    deliveries_completed: number;
    wheels_filled: number;
    current_streak: number;
    speed_violations: number;
  }>) => {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('craving_wheel_progress').upsert({
      user_id: userId,
      date: today,
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const awardWheelCompletionBonus = async (userIdParam: string) => {
    const BONUS_AMOUNT = 5.0;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: performance } = await supabase
        .from('daily_performance')
        .select('earnings')
        .eq('user_id', userIdParam)
        .eq('date', today)
        .maybeSingle();

      const currentEarnings = performance?.earnings || 0;

      await supabase.from('daily_performance').upsert({
        user_id: userIdParam,
        date: today,
        earnings: parseFloat(currentEarnings) + BONUS_AMOUNT,
      });
    } catch (error) {
      console.error('Failed to award bonus:', error);
    }
  };

  const updateAcceptanceRate = (newRate: number) => {
    setState(prev => ({ ...prev, acceptanceRate: newRate }));
  };

  return {
    state,
    addDeliveryPoints,
    updateAcceptanceRate,
    startSpeedMonitoring,
  };
};


