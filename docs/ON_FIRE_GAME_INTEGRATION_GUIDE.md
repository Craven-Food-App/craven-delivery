# ON FIRE Game System - Complete Integration Guide

## 📋 Overview

This guide provides all integration points where ON FIRE game hooks need to be added to your existing codebase.

---

## 🔗 Integration Point 1: Delivery Completion

**File:** `src/components/mobile/ActiveDeliveryFlow.tsx` (or wherever deliveries are completed)

**Location:** In the `onCompleteDelivery` handler

**Add this code:**

```typescript
import { useCravingWheel } from '@/hooks/useCravingWheel';

// Inside your component:
const { addDeliveryPoints } = useCravingWheel(user?.id || '');

// In your delivery completion handler:
const handleDeliveryComplete = async () => {
  // ... existing delivery completion logic ...
  
  // Calculate delivery metrics
  const deliveryStartTime = activeDelivery.started_at || activeDelivery.created_at;
  const deliveryEndTime = new Date();
  const deliveryTimeMs = deliveryEndTime.getTime() - new Date(deliveryStartTime).getTime();
  const deliveryTimeMinutes = deliveryTimeMs / (1000 * 60);
  const estimatedTimeMinutes = activeDelivery.estimated_time || 30;
  
  // Get tip amount (adjust based on your data structure)
  const tipAmount = (activeDelivery.tip_cents || 0) / 100;
  
  // Add points to craving wheel
  await addDeliveryPoints({
    basePoints: 100,
    tipAmount: tipAmount,
    deliveryTime: deliveryTimeMinutes,
    estimatedTime: estimatedTimeMinutes,
    accepted: true, // This delivery was accepted
  });
  
  // ... rest of existing logic ...
};
```

---

## 🔗 Integration Point 2: Order Acceptance/Rejection

**File:** `src/components/mobile/OrderAssignmentModal.tsx` (or wherever orders are accepted/declined)

**Location:** In the `onAccept` and `onDecline` handlers

**Add this code:**

```typescript
import { useCravingWheel } from '@/hooks/useCravingWheel';

// Inside your component:
const { updateAcceptanceRate } = useCravingWheel(user?.id || '');

// In your accept handler:
const handleAccept = async () => {
  // ... existing accept logic ...
  
  // Update acceptance rate (will be recalculated from database)
  // The hook will fetch the latest rate, but you can trigger a refresh
  const newRate = await calculateAcceptanceRateFromDB(user?.id);
  updateAcceptanceRate(newRate);
  
  // ... rest of existing logic ...
};

// In your decline handler:
const handleDecline = async () => {
  // ... existing decline logic ...
  
  // Update acceptance rate
  const newRate = await calculateAcceptanceRateFromDB(user?.id);
  updateAcceptanceRate(newRate);
  
  // ... rest of existing logic ...
};

// Helper function to calculate acceptance rate
const calculateAcceptanceRateFromDB = async (userId: string) => {
  const { data } = await supabase.rpc('calculate_acceptance_rate', {
    p_user_id: userId,
    p_days_back: 7
  });
  return data || 100.00;
};
```

---

## 🔗 Integration Point 3: Speed Detection Integration

**File:** `src/components/mobile/MobileDriverDashboard.tsx`

**Location:** In the `useEffect` that handles driver state changes

**Add this code:**

```typescript
import { useCravingWheel } from '@/hooks/useCravingWheel';
import { speedDetectionService } from '@/services/speedDetectionService';

// Inside your component:
const { state: cravingState, startSpeedMonitoring } = useCravingWheel(user?.id || '');

// In useEffect when driver goes online:
useEffect(() => {
  if (driverState === 'online_searching' && cravingState.gameEnabled) {
    // Start speed monitoring when going online
    startSpeedMonitoring();
  } else if (driverState === 'offline') {
    // Stop speed monitoring when going offline
    speedDetectionService.stopMonitoring();
  }
  
  return () => {
    // Cleanup on unmount
    speedDetectionService.stopMonitoring();
  };
}, [driverState, cravingState.gameEnabled]);
```

---

## 🔗 Integration Point 4: Earnings Dashboard Integration

**File:** `src/components/mobile/CorporateEarningsDashboard.tsx`

**Location:** Replace the existing craving wheel section

**The component is already updated, but ensure you're using the ON FIRE dashboard:**

```typescript
// In your earnings tab, you can show the ON FIRE dashboard:
import { OnFireDashboard } from '@/components/driver/OnFireDashboard';

// Then in your JSX:
{activeTab === 'earnings' && user && (
  <OnFireDashboard 
    userId={user.id}
    onOpenSettings={() => {
      // Open settings modal
      setShowSettings(true);
    }}
  />
)}
```

---

## 🔗 Integration Point 5: Settings Page Integration

**File:** `src/components/mobile/FeederAccountPage.tsx` (or your settings page)

**Location:** Add a new section for ON FIRE game settings

**Add this code:**

```typescript
import { SafetySettings } from '@/components/settings/SafetySettings';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Inside your component:
const [gameSettings, setGameSettings] = useState({
  onFireGameEnabled: false,
  speedDetectionEnabled: false,
});
const [showSafetySettings, setShowSafetySettings] = useState(false);

// Load settings on mount
useEffect(() => {
  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('driver_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (data) {
      setGameSettings({
        onFireGameEnabled: data.on_fire_game_enabled || false,
        speedDetectionEnabled: data.speed_detection_enabled || false,
      });
    }
  };
  
  loadSettings();
}, []);

// In your JSX, add a settings card:
<div className="bg-white rounded-lg p-4 mb-4">
  <h3 className="text-lg font-bold mb-2">ON FIRE Game</h3>
  <p className="text-sm text-gray-600 mb-4">
    Gamified delivery experience with safety-first speed monitoring
  </p>
  <button
    onClick={() => setShowSafetySettings(true)}
    className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-orange-600"
  >
    Configure Settings
  </button>
</div>

{/* Safety Settings Modal */}
{showSafetySettings && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Safety Settings</h2>
        <button
          onClick={() => setShowSafetySettings(false)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          ✕
        </button>
      </div>
      <SafetySettings
        userId={user?.id || ''}
        currentSettings={gameSettings}
        onSettingsUpdate={() => {
          // Reload settings
          loadSettings();
          setShowSafetySettings(false);
        }}
      />
    </div>
  </div>
)}
```

---

## 🔗 Integration Point 6: Real-time Updates

**File:** `src/components/mobile/MobileDriverDashboard.tsx`

**Location:** Add real-time subscription for craving wheel updates

**Add this code:**

```typescript
// Subscribe to craving wheel progress updates
useEffect(() => {
  if (!user?.id) return;
  
  const channel = supabase
    .channel(`craving_wheel_${user.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'craving_wheel_progress',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        // Refresh craving wheel state
        console.log('Craving wheel updated:', payload.new);
        // The useCravingWheel hook will handle the update
      }
    )
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id]);
```

---

## 🔗 Integration Point 7: Daily Reset Function

**File:** Create new file: `supabase/functions/daily-reset/index.ts`

**This edge function runs daily to reset progress (optional, can use cron job instead)**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all users with active craving wheel progress
    const { data: progressRecords, error } = await supabaseClient
      .from('craving_wheel_progress')
      .select('user_id, date')
      .lt('date', new Date().toISOString().split('T')[0]);

    if (error) throw error;

    // Reset old progress (optional - you might want to keep historical data)
    // For now, we'll just ensure today's record exists for active users
    
    console.log(`Daily reset check completed. ${progressRecords?.length || 0} records found.`);

    return new Response(
      JSON.stringify({ success: true, message: 'Daily reset check completed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
```

---

## 🔗 Integration Point 8: Finalize Delivery Edge Function Update

**File:** `supabase/functions/finalize-delivery/index.ts` (if it exists)

**Add ON FIRE game bonus logic:**

```typescript
// In your finalize-delivery function, after recording earnings:

// Check if ON FIRE game is enabled
const { data: settings } = await supabase
  .from('driver_settings')
  .select('on_fire_game_enabled')
  .eq('user_id', driverId)
  .single();

if (settings?.on_fire_game_enabled) {
  // Calculate delivery metrics for points
  const deliveryTime = /* calculate from start to end */;
  const estimatedTime = order.estimated_time || 30;
  const tipAmount = (order.tip_cents || 0) / 100;
  
  // Get current progress
  const { data: progress } = await supabase
    .from('craving_wheel_progress')
    .select('*')
    .eq('user_id', driverId)
    .eq('date', new Date().toISOString().split('T')[0])
    .single();
    
  // Calculate points (same formula as in useCravingWheel hook)
  const BASE_POINTS = 100;
  const acceptanceRate = progress?.acceptance_rate || 100;
  const acceptanceMultiplier = acceptanceRate / 100;
  
  let speedBonus = 1.0;
  if (deliveryTime < estimatedTime * 0.8) {
    speedBonus = 1.5;
  } else if (deliveryTime < estimatedTime) {
    speedBonus = 1.2;
  }
  
  const streakMultiplier = Math.min(1 + ((progress?.current_streak || 0) * 0.1), 2.0);
  const tipBonus = tipAmount * 10;
  
  const pointsEarned = Math.floor(
    (BASE_POINTS * acceptanceMultiplier * speedBonus * streakMultiplier) + tipBonus
  );
  
  const newPoints = (progress?.current_points || 0) + pointsEarned;
  const maxPoints = progress?.max_points || 2000;
  
  // Check if wheel is filled
  if (newPoints >= maxPoints) {
    const overflow = newPoints - maxPoints;
    const newWheelsFilled = (progress?.wheels_filled || 0) + 1;
    
    // Award bonus
    await supabase.rpc('award_wheel_completion_bonus', {
      p_user_id: driverId,
      p_bonus_amount: 5.00
    });
    
    // Update progress
    await supabase
      .from('craving_wheel_progress')
      .upsert({
        user_id: driverId,
        date: new Date().toISOString().split('T')[0],
        current_points: overflow,
        wheels_filled: newWheelsFilled,
        deliveries_completed: (progress?.deliveries_completed || 0) + 1,
        current_streak: (progress?.current_streak || 0) + 1,
        updated_at: new Date().toISOString(),
      });
  } else {
    // Normal update
    await supabase
      .from('craving_wheel_progress')
      .upsert({
        user_id: driverId,
        date: new Date().toISOString().split('T')[0],
        current_points: newPoints,
        deliveries_completed: (progress?.deliveries_completed || 0) + 1,
        current_streak: (progress?.current_streak || 0) + 1,
        updated_at: new Date().toISOString(),
      });
  }
}
```

---

## 📝 Summary Checklist

- [ ] Run SQL migrations (files provided above)
- [ ] Add delivery completion hook (Integration Point 1)
- [ ] Add order acceptance/rejection hooks (Integration Point 2)
- [ ] Add speed detection integration (Integration Point 3)
- [ ] Verify earnings dashboard shows ON FIRE dashboard (Integration Point 4)
- [ ] Add settings page integration (Integration Point 5)
- [ ] Add real-time updates subscription (Integration Point 6)
- [ ] (Optional) Set up daily reset function (Integration Point 7)
- [ ] (Optional) Update finalize-delivery function (Integration Point 8)
- [ ] Test on Android device with GPS
- [ ] Verify speed detection works
- [ ] Test point calculations
- [ ] Confirm database writes are working

---

## 🚨 Important Notes

1. **Speed Detection**: Requires actual GPS on device. Won't work in browser/emulator.
2. **Permissions**: Ensure Android permissions are granted (already in AndroidManifest.xml).
3. **Database**: All tables use Row Level Security - users can only see their own data.
4. **Formulas**: All point calculations match the formulas in `useCravingWheel.ts`.
5. **Testing**: Test with real deliveries to verify point calculations and wheel filling.

---

## 🔧 Troubleshooting

**Speed detection not working:**
- Check GPS permissions are granted
- Verify device has GPS enabled
- Test on actual device, not emulator

**Points not updating:**
- Check database connection
- Verify user_id matches auth.uid()
- Check RLS policies are correct

**Wheel not filling:**
- Verify point calculations in console logs
- Check max_points is 2000
- Ensure deliveries are being tracked

