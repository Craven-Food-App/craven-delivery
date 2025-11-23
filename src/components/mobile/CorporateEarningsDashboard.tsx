import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Box, Stack, Text, Group } from '@mantine/core';
import { ExclusiveOrdersFeed } from '@/components/diamond-orders/ExclusiveOrdersFeed';
import { DiamondPointsBadge } from '@/components/diamond-orders/DiamondPointsBadge';
import { useDriverTier } from '@/hooks/diamond-orders/useDriverTier';
import { useDiamondPoints } from '@/hooks/diamond-orders/useDiamondPoints';

type CorporateEarningsDashboardProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

const CorporateEarningsDashboard: React.FC<CorporateEarningsDashboardProps> = ({
  onOpenMenu,
  onOpenNotifications
}) => {
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
  const { isDiamond } = useDriverTier();
  const { points: diamondPoints } = useDiamondPoints();

  useEffect(() => {
    fetchEarningsData();
    const interval = setInterval(fetchEarningsData, 30000); // Refresh every 30 seconds
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
    <div className="h-screen w-full bg-gradient-to-b from-red-600 via-orange-600 to-orange-500 overflow-y-auto" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0 safe-area-top">
        <button 
          onClick={() => {
            if (onOpenMenu) {
              onOpenMenu();
            } else {
              toast.info('Menu coming soon.');
            }
          }}
          className="text-white text-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-white text-xl font-bold">Earnings</h1>
        <button 
          onClick={() => {
            if (onOpenNotifications) {
              onOpenNotifications();
            } else {
              toast.info('Notifications coming soon.');
            }
          }}
          className="text-white"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
          </svg>
        </button>
      </div>

      {/* ON FIRE Section */}
      <div className="px-5 mb-3">
        <div className="relative overflow-hidden">
          {/* Large ON FIRE Text */}
          <div className="relative mb-2">
            <h2 className="text-4xl font-black text-orange-400 leading-none tracking-tighter" style={{
              textShadow: '0 2px 0 rgba(0,0,0,0.1)',
              WebkitTextStroke: '1px rgba(255,255,255,0.1)'
            }}>
              ON FIRE
            </h2>
            <div className="absolute top-1 right-3 w-12 h-16 bg-gradient-to-b from-red-400 to-transparent rounded-full blur-2xl opacity-60"></div>
          </div>
          
          <p className="text-white text-sm font-semibold mb-4">
            {cravingLevel > 70 ? 'Cravings spike active!' : 'Normal activity'}
          </p>
          
          {/* Craving Circle, Graphs, and Buttons */}
          <div className="flex items-start gap-3 mb-4">
            {/* Circular Progress */}
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="50" fill="none" stroke="rgba(139, 0, 0, 0.3)" strokeWidth="12"/>
                <circle 
                  cx="56" 
                  cy="56" 
                  r="50" 
                  fill="none" 
                  stroke="url(#gradient)" 
                  strokeWidth="12" 
                  strokeDasharray="314" 
                  strokeDashoffset={314 - (314 * cravingLevel / 100)} 
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FCD34D" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs font-bold">CRAVING</span>
              </div>
            </div>
            
            {/* Earnings Graph - Two bars per day */}
            <div className="flex-1">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2">
                <p className="text-white text-[10px] font-semibold mb-1">Daily Earnings</p>
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
                          <span className="text-white text-[8px] mt-0.5">{['S', 'M', 'T', 'W', 'T', 'F', 'S'][idx]}</span>
                        </div>
                      );
                    });
                  })() : (
                    // Loading or empty state
                    Array.from({ length: 7 }).map((_, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-0.5" style={{ height: '100%' }}>
                        <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '100%' }}>
                          <div className="flex-1 bg-white/20 rounded-t" style={{ minHeight: '4px', height: '20%' }} />
                          <div className="flex-1 bg-white/20 rounded-t" style={{ minHeight: '4px', height: '20%' }} />
                        </div>
                        <span className="text-white text-[8px] mt-0.5">{['S', 'M', 'T', 'W', 'T', 'F', 'S'][idx]}</span>
                      </div>
                    ))
                  )}
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gradient-to-t from-orange-500 to-orange-600 rounded"></div>
                    <span className="text-white text-[8px]">Daily Earnings</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gradient-to-t from-yellow-400 to-yellow-500 rounded"></div>
                    <span className="text-white text-[8px]">Tips</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons - Side by Side */}
          <div className="flex gap-2 mb-4">
            <button className="flex-1 bg-white rounded-full py-2 px-4 font-bold text-red-700 text-xs shadow-lg">
              Go Online
            </button>
            <button className="flex-1 bg-white rounded-full py-2 px-4 font-bold text-red-700 text-xs shadow-lg">
              Payout Req
            </button>
          </div>
        </div>
      </div>

      {/* DIAMOND EXCLUSIVE ORDERS - UP FOR GRABS */}
      <Box px="md" mb="md">
        <Group justify="apart" mb="xs">
          <Text fw={700} size="sm" c="white" style={{ letterSpacing: '0.05em' }}>
            UP FOR GRABS
          </Text>
          {isDiamond && (
            <DiamondPointsBadge points={diamondPoints} tier="Diamond" />
          )}
        </Group>
        <Box
          style={{
            backgroundColor: 'hsl(14, 90%, 53%)', // Craven orange primary color
            borderRadius: '8px',
            padding: '16px',
            minHeight: 200,
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

      {/* EARNINGS SNAPSHOT */}
      <div className="px-5 mb-3">
        <h3 className="text-white text-sm font-bold mb-2 tracking-wide">EARNINGS SNAPSHOT</h3>
        <div className="bg-orange-50 rounded-2xl p-4 shadow-xl">
          <h4 
            className="font-black text-gray-900 mb-0.5 whitespace-nowrap overflow-hidden"
            style={{ 
              fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
              lineHeight: '1.2'
            }}
          >
            ${earnings.today.toFixed(2)}
          </h4>
          <p className="text-orange-800 text-xs font-semibold">Today</p>
        </div>
      </div>

      {/* TODAY'S FEED FLOW */}
      <div className="px-5" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        <h3 className="text-white text-sm font-bold mb-2 tracking-wide">Today's FEED FLOW</h3>
        <div className="grid grid-cols-3 gap-0 text-center">
          <div className="border-r border-white/30 py-2">
            <p 
              className="font-black text-white mb-0.5 whitespace-nowrap overflow-hidden"
              style={{ 
                fontSize: 'clamp(1rem, 3.5vw, 1.875rem)',
                lineHeight: '1.2'
              }}
            >
              {earnings.todayDeliveries}
            </p>
            <p className="text-white text-[10px] font-semibold">Delivered</p>
          </div>
          <div className="border-r border-white/30 py-2">
            <p 
              className="font-black text-white mb-0.5 whitespace-nowrap overflow-hidden"
              style={{ 
                fontSize: 'clamp(1rem, 3.5vw, 1.875rem)',
                lineHeight: '1.2'
              }}
            >
              {earnings.todayAcceptance}%
            </p>
            <p className="text-white text-[10px] font-semibold">Acceptance</p>
          </div>
          <div className="py-2">
            <p 
              className="font-black text-white mb-0.5 whitespace-nowrap overflow-hidden"
              style={{ 
                fontSize: 'clamp(1rem, 3.5vw, 1.875rem)',
                lineHeight: '1.2'
              }}
            >
              ${earnings.todayTips.toFixed(2)}
            </p>
            <p className="text-white text-[10px] font-semibold">Tips</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorporateEarningsDashboard;
