import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Box, Stack, Text, Group } from '@mantine/core';
import { ExclusiveOrdersFeed } from '@/components/diamond-orders/ExclusiveOrdersFeed';
import { Flame, Info, X } from 'lucide-react';
import { useDriverTier } from '@/hooks/diamond-orders/useDriverTier';
import { useDiamondPoints } from '@/hooks/diamond-orders/useDiamondPoints';
import { CravingWheel } from '@/components/driver/CravingWheel';
import { FlamingText } from '@/components/ui/FlamingText';
import { useCravingWheel } from '@/hooks/useCravingWheel';
import onfireTextImage from '@/assets/onfire-text.png';
import onfire2ndStateImage from '@/assets/onfire2ndstate.png';
import { useFeederDarkMode } from '@/contexts/FeederDarkModeContext';

type OnFireDashboardProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

const OnFireDashboard: React.FC<OnFireDashboardProps> = ({
  onOpenMenu,
  onOpenNotifications
}) => {
  const { isDark, colors: C } = useFeederDarkMode();
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({
    today: 0,
    week: 0,
    todayDeliveries: 0,
    todayAcceptance: 0,
    todayTips: 0
  });
  const [weeklyData, setWeeklyData] = useState<Array<{ payments: number; tips: number }>>([]);
  const [availableOrder, setAvailableOrder] = useState<any>(null);
  const [cravingLevel, setCravingLevel] = useState(70); // Percentage for craving meter
  const [userId, setUserId] = useState<string>('');
  const [showPageInfo, setShowPageInfo] = useState(false);
  const { isDiamond } = useDriverTier();
  const { points: diamondPoints } = useDiamondPoints();
  
  // Get ON FIRE game state
  const { state: cravingState } = useCravingWheel(userId);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    fetchEarningsData();
    // Set up auto-refresh every 30 seconds - COMPONENT-LEVEL DATA REFRESH ONLY
    // This only updates component state, NEVER causes page reloads
    const interval = setInterval(() => {
      // Wrap in try-catch to prevent any errors from causing issues
      try {
        fetchEarningsData();
      } catch (error) {
        console.error('Error in auto-refresh interval:', error);
        // Silently handle - don't cause page reload or navigation
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchEarningsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

      // Fetch today's earnings
      const { data: todayEarnings } = await supabase
        .from('driver_earnings')
        .select('amount_cents, tip_cents, total_cents, earned_at')
        .eq('driver_id', user.id)
        .gte('earned_at', todayStart.toISOString());

      // Fetch week's earnings
      const { data: weekEarnings } = await supabase
        .from('driver_earnings')
        .select('amount_cents, tip_cents, total_cents')
        .eq('driver_id', user.id)
        .gte('earned_at', weekStart.toISOString());

      // Calculate totals
      const todayTotal = todayEarnings?.reduce((sum, e) => sum + (e.total_cents || e.amount_cents + (e.tip_cents || 0)), 0) || 0;
      const weekTotal = weekEarnings?.reduce((sum, e) => sum + (e.total_cents || e.amount_cents + (e.tip_cents || 0)), 0) || 0;
      const todayTips = todayEarnings?.reduce((sum, e) => sum + (e.tip_cents || 0), 0) || 0;
      const todayDeliveries = todayEarnings?.length || 0;

      // Fetch last 7 days of earnings (Sunday to Saturday)
      const weeklyEarningsData: Array<{ payments: number; tips: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(weekStart);
        dayStart.setDate(dayStart.getDate() + (6 - i));
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const { data: dayEarnings } = await supabase
          .from('driver_earnings')
          .select('amount_cents, tip_cents')
          .eq('driver_id', user.id)
          .gte('earned_at', dayStart.toISOString())
          .lt('earned_at', dayEnd.toISOString());

        // Calculate total daily earnings (base pay + tips) and tips separately
        const dayTotalEarnings = dayEarnings?.reduce((sum, e) => {
          const total = (e.amount_cents || 0) + (e.tip_cents || 0);
          return sum + total;
        }, 0) / 100 || 0;
        const dayTips = dayEarnings?.reduce((sum, e) => sum + (e.tip_cents || 0), 0) / 100 || 0;
        
        // Debug logging for each day
        console.log(`Day ${i} (${dayStart.toLocaleDateString()}):`, {
          earningsCount: dayEarnings?.length || 0,
          totalEarnings: dayTotalEarnings,
          tips: dayTips,
          rawTotalCents: dayEarnings?.reduce((sum, e) => sum + ((e.amount_cents || 0) + (e.tip_cents || 0)), 0) || 0,
          rawTipCents: dayEarnings?.reduce((sum, e) => sum + (e.tip_cents || 0), 0) || 0
        });

        weeklyEarningsData.push({
          payments: dayTotalEarnings, // Total daily earnings (orange bar)
          tips: dayTips // Tips (yellow bar)
        });
      }

      setWeeklyData(weeklyEarningsData);
      
      // Debug logging
      console.log('Weekly earnings data:', weeklyEarningsData);
      console.log('Weekly data totals:', weeklyEarningsData.map(d => ({ payments: d.payments, tips: d.tips })));

      // Calculate acceptance rate
      const { data: assignments } = await supabase
        .from('order_assignments')
        .select('status')
        .eq('driver_id', user.id)
        .gte('created_at', todayStart.toISOString());

      const totalAssignments = assignments?.length || 0;
      const acceptedAssignments = assignments?.filter(a => a.status === 'accepted').length || 0;
      const acceptanceRate = totalAssignments > 0 ? Math.round((acceptedAssignments / totalAssignments) * 100) : 100;

      // Check if user is a test user
      const { data: settings } = await supabase
        .from('driver_settings')
        .select('is_test_user')
        .eq('user_id', user.id)
        .single();
      
      const isTestUser = settings?.is_test_user || false;

      // Keep legacy available order fetch for fallback
      const { data: allOrders } = await supabase
        .from('orders')
        .select(`
          id, 
          estimated_delivery_time, 
          delivery_fee_cents, 
          tip_cents, 
          restaurant:restaurants(name),
          order_assignments!left(id, status)
        `)
        .in('order_status', ['pending', 'confirmed', 'preparing', 'ready'])
        .eq('exclusive_type', 'none')
        .eq('is_test', isTestUser) // Filter by test status
        .order('created_at', { ascending: false })
        .limit(1);

      const availableOrders = allOrders?.filter(order => {
        const assignments = order.order_assignments || [];
        return !assignments.some((a: any) => a.status === 'accepted');
      }) || [];

      if (availableOrders.length > 0) {
        const order = availableOrders[0];
        const deliveryFee = (order.delivery_fee_cents || 0) / 100;
        const tip = (order.tip_cents || 0) / 100;
        const totalPay = deliveryFee + tip;

        const eta = order.estimated_delivery_time 
          ? Math.max(1, Math.round((new Date(order.estimated_delivery_time).getTime() - now.getTime()) / 60000))
          : 15;

        setAvailableOrder({
          id: order.id,
          eta: `${eta}m`,
          pay: totalPay,
          distance: '3.2mi',
          restaurant: order.restaurant?.name || 'Restaurant'
        });
      } else {
        setAvailableOrder(null);
      }

      // Calculate craving level based on recent activity
      const recentOrders = todayEarnings?.filter(e => {
        const earnedAt = new Date(e.earned_at || 0);
        return (now.getTime() - earnedAt.getTime()) < 60 * 60 * 1000; // Last hour
      }).length || 0;
      setCravingLevel(Math.min(100, Math.max(0, recentOrders * 15 + 30)));

      setEarnings({
        today: todayTotal / 100,
        week: weekTotal / 100,
        todayDeliveries,
        todayAcceptance: acceptanceRate,
        todayTips: todayTips / 100
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full overflow-y-auto" style={{ 
      background: C.bg,
      paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' 
    }}>
      {/* Header - Level with hamburger menu */}
      <div className="border-b sticky top-0 z-10 px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', background: C.bg, borderColor: C.border }}>
        <button 
          onClick={() => {
            if (onOpenMenu) {
              onOpenMenu();
            } else {
              toast.info('Menu coming soon.');
            }
          }}
          className="text-lg p-2" style={{ color: C.text }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-base font-black" style={{ letterSpacing: '0.2px', color: C.text }}>On Fire</h1>
        <button 
          onClick={() => setShowPageInfo(true)}
          className="p-2" style={{ color: C.text }}
        >
          <Info className="w-6 h-6" />
        </button>
      </div>

      {/* ON FIRE Section */}
      <div className="px-5 mb-3">
        <div className="relative overflow-hidden">
          {/* Large ON FIRE Text */}
          <div className="relative mb-2 flex items-center gap-3">
            <div 
              className="relative"
              style={{ 
                height: 'auto',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-start'
              }}
            >
              <img 
                src={(cravingState.currentPoints / cravingState.maxPoints >= 1.0) ? onfire2ndStateImage : onfireTextImage}
                alt="ON FIRE" 
                className="object-contain"
                style={{ 
                  height: '3.5rem',
                  width: 'auto',
                  display: 'block',
                  objectPosition: 'left bottom'
                }}
              />
            </div>
            <p className="text-sm font-semibold whitespace-nowrap" style={{ color: C.text }}>
              {cravingLevel > 70 ? 'Cravings spike active!' : 'Normal activity'}
            </p>
            <div className="absolute top-1 right-3 w-12 h-16 bg-gradient-to-b from-red-400 to-transparent rounded-full blur-2xl opacity-60"></div>
          </div>
          
          {/* Craving Circle, Graphs, and Buttons */}
          <div className="flex items-start gap-3 mb-4">
            {/* Craving Wheel */}
            <div className="flex-shrink-0">
              <CravingWheel
                currentPoints={cravingState.currentPoints}
                maxPoints={cravingState.maxPoints}
                isOnFire={cravingState.currentPoints / cravingState.maxPoints >= 1.0}
              />
            </div>
            
            {/* Earnings Graph - Two bars per day */}
            <div className="flex-1">
              <div className="rounded-xl p-2" style={{ background: C.bgMuted, border: `1px solid ${C.border}` }}>
                <p className="text-[10px] font-semibold mb-1" style={{ color: C.text }}>Daily Earnings</p>
                <div className="flex items-end gap-0.5" style={{ height: '80px', minHeight: '80px' }}>
                  {weeklyData.length > 0 ? (() => {
                    // Calculate max value across all days (use total earnings for scaling)
                    const allTotalEarnings = weeklyData.map(d => d.payments); // payments now contains total earnings
                    const maxValue = Math.max(1, ...allTotalEarnings); // Ensure at least 1 to avoid division by zero
                    
                    return weeklyData.map((day, idx) => {
                      // Orange bar = total daily earnings (payments + tips)
                      const totalEarningsHeight = maxValue > 0 ? Math.max((day.payments / maxValue) * 100, 5) : 5;
                      // Yellow bar = tips only
                      // Ensure tips are always visible when they exist - use a minimum height
                      let tipsHeight = 0;
                      if (day.tips > 0) {
                        // Calculate proportional height
                        const proportionalHeight = maxValue > 0 ? (day.tips / maxValue) * 100 : 0;
                        // Use at least 10% height if tips exist, or proportional if larger
                        tipsHeight = Math.max(proportionalHeight, 10);
                      }
                      
                      // Debug logging for Friday specifically (index 5: S=0, M=1, T=2, W=3, T=4, F=5, S=6)
                      if (idx === 5) {
                        console.log('Friday chart data:', {
                          totalEarnings: day.payments,
                          tips: day.tips,
                          totalEarningsHeight: `${totalEarningsHeight}%`,
                          tipsHeight: `${tipsHeight}%`,
                          maxValue,
                          proportionalHeight: maxValue > 0 ? `${(day.tips / maxValue) * 100}%` : '0%'
                        });
                      }
                      
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-0.5" style={{ height: '100%' }}>
                          <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '100%' }}>
                            {/* Orange bar - Total Daily Earnings */}
                            <div 
                              className="flex-1 bg-gradient-to-t from-orange-500 to-orange-600 rounded-t"
                              style={{ 
                                height: `${totalEarningsHeight}%`,
                                minHeight: '4px',
                                transition: 'height 0.3s ease'
                              }}
                            />
                            {/* Yellow bar - Tips */}
                            <div 
                              className="flex-1 bg-gradient-to-t from-yellow-400 to-yellow-500 rounded-t"
                              style={{ 
                                height: `${tipsHeight}%`,
                                minHeight: '4px',
                                transition: 'height 0.3s ease'
                              }}
                            />
                          </div>
                          <span className="text-[8px] mt-0.5" style={{ color: C.text }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][idx]}</span>
                        </div>
                      );
                    });
                  })() : (
                    // Loading or empty state
                    Array.from({ length: 7 }).map((_, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-0.5" style={{ height: '100%' }}>
                        <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '100%' }}>
                          <div className="flex-1 rounded-t" style={{ minHeight: '4px', height: '20%', background: C.track }} />
                          <div className="flex-1 rounded-t" style={{ minHeight: '4px', height: '20%', background: C.track }} />
                        </div>
                        <span className="text-[8px] mt-0.5" style={{ color: C.muted2 }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][idx]}</span>
                      </div>
                    ))
                  )}
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gradient-to-t from-orange-500 to-orange-600 rounded"></div>
                    <span className="text-[8px]" style={{ color: C.text }}>Daily Earnings</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gradient-to-t from-yellow-400 to-yellow-500 rounded"></div>
                    <span className="text-[8px]" style={{ color: C.text }}>Tips</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DIAMOND EXCLUSIVE ORDERS - UP FOR GRABS - White background section */}
      <Box style={{ backgroundColor: C.bg, borderTopLeftRadius: '24px', borderTopRightRadius: '24px', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))', marginTop: '16px' }}>
        <Box px="md" pt="md">
          <Group justify="apart" mb="xs">
            <Text fw={700} size="sm" c={C.text} style={{ letterSpacing: '0.05em' }}>
              UP FOR GRABS
            </Text>
            <Group gap="xs" align="center">
              <Flame size={16} color="#FF6A00" />
              <Text fw={700} size="sm" style={{ color: '#FF6A00' }}>
                {diamondPoints || 0} POINTS
              </Text>
            </Group>
          </Group>
          <Box
            style={{
              backgroundColor: C.card,
              borderRadius: '8px',
              padding: '12px',
            }}
          >
          <ExclusiveOrdersFeed
            onClaim={async (orderId: string, type: string) => {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Not authenticated');

                // Create order assignment
                const { error: assignError } = await supabase
                  .from('order_assignments')
                  .insert({
                    order_id: orderId,
                    driver_id: user.id,
                    status: 'accepted',
                    expires_at: new Date(Date.now() + 300000).toISOString(), // 5 minutes
                  });

                if (assignError) throw assignError;

                // Add diamond points based on type
                const pointsMap: Record<string, number> = {
                  flash_drop: 10,
                  mystery: 15,
                  batch: 25,
                  hotspot: 5,
                  arena: 20,
                  vault: 10,
                };

                const points = pointsMap[type] || 0;
                if (points > 0) {
                  await supabase.rpc('add_diamond_points', {
                    p_driver_id: user.id,
                    p_points: points,
                    p_source: type,
                    p_order_id: orderId,
                  });
                }

                toast.success('Order claimed successfully!');
              } catch (error: any) {
                console.error('Error claiming order:', error);
                throw error;
              }
            }}
          />
          </Box>
        </Box>
      </Box>

      {/* Page Info Modal */}
      {showPageInfo && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPageInfo(false)}
        >
           <div 
            className="rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            style={{ background: C.bg }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 border-b p-4" style={{ background: C.bg, borderColor: C.border }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold" style={{ color: C.text }}>On Fire Page Guide</h2>
                <button
                  onClick={() => setShowPageInfo(false)}
                  className="p-2 rounded-lg transition-colors" style={{ color: C.muted2 }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: C.text }}>
                  <Flame className="w-4 h-4 text-orange-600" />
                  The ON FIRE Game
                </h3>
                <p className="text-xs" style={{ color: C.muted }}>
                  Get "On Fire" by completing deliveries quickly and consistently. The more you deliver, the higher your flame meter rises!
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: C.text }}>
                  🎯 Craving Wheel
                </h3>
                <p className="text-xs" style={{ color: C.muted }}>
                  Your activity fuels the craving wheel. As you complete orders, the wheel fills up, unlocking exclusive bonuses and high-value orders.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  🚗 Speed Detection
                </h3>
                <p className="text-xs text-gray-600">
                  The app tracks your movement speed to detect when you're actively delivering, helping optimize order assignments.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  💎 Diamond Orders
                </h3>
                <p className="text-xs text-gray-600">
                  Exclusive high-value orders for top performers. Build your streak, earn diamond points, and unlock premium deliveries.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  📊 Weekly Performance
                </h3>
                <p className="text-xs text-gray-600">
                  Track your earnings across the week with the bar chart. See daily payments and tips to optimize your feeding schedule.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  ⚡ Real-Time Orders
                </h3>
                <p className="text-xs text-gray-600">
                  When ON FIRE, you get priority access to incoming orders with instant notifications for maximum earnings.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  🏆 Pro Tip
                </h3>
                <p className="text-xs text-gray-600">
                  Stay ON FIRE by maintaining a high acceptance rate and completing deliveries quickly. Consistency is key to unlocking the best orders!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnFireDashboard;
