import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, ChevronDown, ChevronRight, Calendar, DollarSign, TrendingUp, Clock, MapPin, Receipt } from 'lucide-react';
import feederCardBackground from '@/assets/feeder-card-background.png';
import feederCardImage from '@/assets/feeder-card-image.png';
import { Box, Stack, Text, Title, Group } from '@mantine/core';

type EarningsDashboardProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

type TimeRange = 'today' | 'thisWeek' | 'lastWeek' | 'custom';

interface EarningsBreakdown {
  basePay: number;
  distancePay: number;
  tips: number;
  bonuses: number;
  adjustments: number;
  totalEarned: number;
}


interface PayoutStatus {
  available: number;
  pending: number;
  paid: number;
}

interface EarningsMetrics {
  earningsPerHour: number;
  earningsPerMile: number;
  activeTime: number; // in hours
  totalTrips: number;
}

interface Transaction {
  id: string;
  date: string;
  time: string;
  orderId: string;
  restaurantName: string;
  grossEarnings: number;
  tipAmount: number;
  netEarnings: number;
  status: 'completed' | 'refunded' | 'paid';
  orderData?: any; // Full order data for detail view
}

interface TransactionDetail {
  orderTotal: number;
  platformFee: number;
  restaurantShare: number;
  driverShare: number;
  tip: number;
  finalDriverPayout: number;
  stripePayoutId?: string;
  payoutDate?: string;
}

const EarningsDashboard: React.FC<EarningsDashboardProps> = ({
  onOpenMenu,
  onOpenNotifications
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('thisWeek');
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [breakdown, setBreakdown] = useState<EarningsBreakdown>({
    basePay: 0,
    distancePay: 0,
    tips: 0,
    bonuses: 0,
    adjustments: 0,
    totalEarned: 0,
  });
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>({
    available: 0,
    pending: 0,
    paid: 0,
  });
  const [metrics, setMetrics] = useState<EarningsMetrics>({
    earningsPerHour: 0,
    earningsPerMile: 0,
    activeTime: 0,
    totalTrips: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionDetail, setTransactionDetail] = useState<TransactionDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Feeder Card state
  const [cardExpanded, setCardExpanded] = useState(false); // Start collapsed (peeking)
  const [cardHeight, setCardHeight] = useState(60); // Start collapsed (peeking)
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardBalance, setCardBalance] = useState(0);
  const [driverName, setDriverName] = useState('');
  const cardNumber = '5399283309390129';
  const expiryDate = '12/28';
  const cvv = '847';
  const [showCardDetails, setShowCardDetails] = useState(false);

  useEffect(() => {
    fetchEarningsData();
    fetchCardData();
  }, [timeRange]);

  const fetchCardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch driver balance from Stripe
      const { data: balanceData, error: balanceError } = await supabase.functions.invoke('get-driver-balance', {
        body: { driver_id: user.id }
      });

      if (!balanceError && balanceData?.available_balance) {
        setCardBalance(balanceData.available_balance / 100);
      }

      // Fetch driver name
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (profile?.full_name) {
        setDriverName(profile.full_name);
      }
    } catch (error) {
      console.error('Error fetching card data:', error);
    }
  };

  const formatCardNumber = (number: string, showFull: boolean): string => {
    const digitsOnly = number.replace(/\D/g, '');
    const normalized = digitsOnly.slice(0, 16).padEnd(16, '0');
    
    if (showFull) {
      return `${normalized.slice(0, 4)} ${normalized.slice(4, 8)} ${normalized.slice(8, 12)} ${normalized.slice(12, 16)}`;
    } else {
      return `**** **** **** ${normalized.slice(12, 16)}`;
    }
  };

  const handleCardClick = () => {
    setCardExpanded(!cardExpanded);
    setCardHeight(cardExpanded ? 60 : 240); // Toggle between peek (60px) and full (240px)
  };

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (timeRange) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'thisWeek':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Sunday
        return { start: weekStart, end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) };
      case 'lastWeek':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        return { start: lastWeekStart, end: new Date(lastWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000) };
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    }
  };

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { start, end } = getDateRange();

      // Fetch driver earnings
      const { data: earnings } = await supabase
        .from('driver_earnings')
        .select(`
          *,
          orders:order_id(
            id,
            subtotal_cents,
            delivery_fee_cents,
            tip_cents,
            restaurant_id,
            restaurants:restaurant_id(name),
            created_at,
            order_status
          )
        `)
        .eq('driver_id', user.id)
        .gte('earned_at', start.toISOString())
        .lt('earned_at', end.toISOString())
        .order('earned_at', { ascending: false });

      if (!earnings) return;

      // Calculate breakdown
      let basePay = 0;
      let distancePay = 0;
      let tips = 0;
      let bonuses = 0;
      let adjustments = 0;

      earnings.forEach((earning: any) => {
        basePay += (earning.amount_cents || 0) / 100;
        tips += (earning.tip_cents || 0) / 100;
        // Distance pay would come from a separate field if available
        // For now, we'll use amount_cents as base pay
      });

      const totalEarned = basePay + distancePay + tips + bonuses + adjustments;
      setTotalEarnings(totalEarned);
      setBreakdown({
        basePay,
        distancePay,
        tips,
        bonuses,
        adjustments,
        totalEarned,
      });


      // Fetch payout status from Stripe balance API
      try {
        const { data: balanceData } = await supabase.functions.invoke('get-driver-balance', {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (balanceData) {
          setPayoutStatus({
            available: parseFloat(balanceData.available_dollars || '0'),
            pending: parseFloat(balanceData.pending_dollars || '0'),
            paid: 0, // Would calculate from completed payouts
          });
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
      }

      // Calculate metrics (simplified - would need more data)
      const totalTrips = earnings.length;
      const activeTime = totalTrips * 0.5; // Estimate 30 min per trip
      const earningsPerHour = activeTime > 0 ? totalEarned / activeTime : 0;
      const earningsPerMile = 0; // Would need distance data

      setMetrics({
        earningsPerHour,
        earningsPerMile,
        activeTime,
        totalTrips,
      });

      // Format transactions
      const formattedTransactions: Transaction[] = earnings.map((earning: any) => {
        const earnedDate = new Date(earning.earned_at || earning.created_at);
        const order = earning.orders || {};
        const restaurant = order.restaurants || {};
        
        return {
          id: earning.id,
          date: earnedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          time: earnedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          orderId: earning.order_id?.substring(0, 8) || 'N/A',
          restaurantName: restaurant.name || 'Restaurant',
          grossEarnings: (earning.amount_cents || 0) / 100,
          tipAmount: (earning.tip_cents || 0) / 100,
          netEarnings: ((earning.amount_cents || 0) + (earning.tip_cents || 0)) / 100,
          status: order.order_status === 'delivered' ? 'completed' : 'pending',
          orderData: order,
        };
      });

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionClick = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    
    // Fetch detailed transaction data
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !transaction.orderData) return;

      const order = transaction.orderData;
      const driverShare = transaction.grossEarnings;
      const tip = transaction.tipAmount;
      const finalDriverPayout = driverShare + tip;

      // Try to fetch Stripe payout info
      let stripePayoutId: string | undefined;
      let payoutDate: string | undefined;

      const { data: payout } = await supabase
        .from('driver_payouts')
        .select('stripe_payout_id, created_at, arrival_date')
        .eq('driver_id', user.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (payout) {
        stripePayoutId = payout.stripe_payout_id;
        payoutDate = payout.arrival_date || payout.created_at;
      }

      setTransactionDetail({
        orderTotal: 0, // Not relevant for driver
        platformFee: 0, // Not relevant for driver
        restaurantShare: 0, // Not relevant for driver
        driverShare,
        tip,
        finalDriverPayout,
        stripePayoutId,
        payoutDate,
      });

      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching transaction detail:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="h-screen w-full overflow-y-auto bg-gray-50" style={{ 
      paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' 
    }}>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 43px)' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => onOpenMenu?.()}
            className="text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Earnings</h1>
          <button 
            onClick={() => onOpenNotifications?.()}
            className="text-gray-700"
          >
            <Bell className="w-6 h-6" />
          </button>
        </div>
        
        {/* Time Range Selector */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            {(['today', 'thisWeek', 'lastWeek'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {range === 'today' ? 'Today' : range === 'thisWeek' ? 'This Week' : 'Last Week'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="px-4 py-6">
          {/* Slideable Feeder Card */}
          <div
            ref={cardRef}
            className="relative w-full overflow-hidden rounded-2xl cursor-pointer mb-2.5"
            onClick={handleCardClick}
            style={{
              height: `${cardHeight}px`,
              transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Card Container */}
            <Box
              style={{
                height: '310px',
                paddingTop: '2px',
                paddingBottom: '2px',
                paddingLeft: '1rem',
                paddingRight: '1rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              
              {/* Card Display */}
              <Box style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                <Box
                  onClick={() => setShowCardDetails(!showCardDetails)}
                  style={{
                    backgroundImage: `url(${feederCardImage})`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    aspectRatio: "1.586 / 1",
                    width: "100%",
                    maxWidth: "420px",
                    overflow: 'hidden',
                    borderRadius: '16px',
                    paddingTop: '5px',
                    paddingBottom: '5px',
                    paddingLeft: '2rem',
                    paddingRight: '2rem',
                    imageRendering: 'high-quality',
                    WebkitImageRendering: 'high-quality',
                    cursor: 'pointer'
                  }}
                >
                  <Stack justify="space-between" style={{ height: '100%', position: 'relative', zIndex: 2 }} gap="xs">
                    {/* Top Section - Balance */}
                    <Box>
                      <Text size="xs" c="white" style={{ opacity: 0.9 }} mb={4}>Available Balance</Text>
                      <Title order={2} c="white" fw={900} style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                        ${cardBalance.toFixed(2)}
                      </Title>
                    </Box>

                    {/* Middle Section - Card Number */}
                    <Box style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '-20px',
                      width: '100%',
                      overflow: 'hidden'
                    }}>
                      <Text
                        c="white"
                        ff="monospace"
                        fw={900}
                        style={{
                          fontSize: 'clamp(1rem, 4vw, 1.25rem)',
                          letterSpacing: '0.15em',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          fontVariantNumeric: 'tabular-nums',
                          fontFeatureSettings: '"tnum"',
                          width: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.3',
                          textShadow: `
                            -1px -1px 0 rgba(255, 255, 255, 0.4),
                            0 -1px 0 rgba(255, 255, 255, 0.5),
                            1px -1px 0 rgba(255, 255, 255, 0.3),
                            -1px 0 0 rgba(255, 255, 255, 0.3),
                            0 0 0 rgba(255, 255, 255, 0.4),
                            1px 0 0 rgba(255, 255, 255, 0.3),
                            -1px 1px 0 rgba(0, 0, 0, 0.2),
                            0 1px 0 rgba(0, 0, 0, 0.3),
                            1px 1px 0 rgba(0, 0, 0, 0.2),
                            0 2px 2px rgba(0, 0, 0, 0.3),
                            0 3px 3px rgba(0, 0, 0, 0.2),
                            0 4px 4px rgba(0, 0, 0, 0.1),
                            inset 0 -1px 1px rgba(0, 0, 0, 0.3),
                            inset 0 1px 1px rgba(255, 255, 255, 0.2)
                          `,
                          filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5))',
                          transform: 'perspective(1000px) translateZ(2px)',
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                          textRendering: 'optimizeLegibility'
                        }}
                      >
                        {formatCardNumber(cardNumber, showCardDetails)}
                      </Text>
                    </Box>

                    {/* Bottom Section - Expiry, CVV, Name */}
                    <Group justify="space-between" align="flex-end" style={{ marginTop: '-30px' }}>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="md" mb={4}>
                          <Box>
                            <Text size="xs" c="white" style={{ opacity: 0.9 }} mb={2}>EXP</Text>
                            <Text size="xs" c="white" ff="monospace" fw={600} style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                              {showCardDetails ? expiryDate : "**/**"}
                            </Text>
                          </Box>
                          <Box>
                            <Text size="xs" c="white" style={{ opacity: 0.9 }} mb={2}>CVV</Text>
                            <Text size="xs" c="white" ff="monospace" fw={600} style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                              {showCardDetails ? cvv : "***"}
                            </Text>
                          </Box>
                        </Group>
                        <Text size="xs" fw={700} c="white" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }} lineClamp={1}>
                          {driverName || 'DRIVER NAME'}
                        </Text>
                      </Box>
                    </Group>
                  </Stack>
                </Box>
              </Box>
            </Box>
          </div>

          {/* Primary Earnings Summary Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mt-2.5">
            <p className="text-sm text-gray-500 mb-1">Your Earnings</p>
            <p className="text-4xl font-bold text-gray-900 mb-1">{formatCurrency(totalEarnings)}</p>
            <p className="text-xs text-gray-400">Net earnings for selected period</p>
          </div>

          {/* Earnings Breakdown Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Earnings Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Base Pay</span>
                <span className="font-semibold text-gray-900">{formatCurrency(breakdown.basePay)}</span>
              </div>
              <div className="h-px bg-gray-200"></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Distance Pay</span>
                <span className="font-semibold text-gray-900">{formatCurrency(breakdown.distancePay)}</span>
              </div>
              <div className="h-px bg-gray-200"></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tips</span>
                <span className="font-semibold text-gray-900">{formatCurrency(breakdown.tips)}</span>
              </div>
              <div className="h-px bg-gray-200"></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Bonuses</span>
                <span className="font-semibold text-gray-900">{formatCurrency(breakdown.bonuses)}</span>
              </div>
              <div className="h-px bg-gray-200"></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Adjustments</span>
                <span className="font-semibold text-gray-900">{formatCurrency(breakdown.adjustments)}</span>
              </div>
              <div className="h-px bg-gray-300 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total Earned</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(breakdown.totalEarned)}</span>
              </div>
            </div>
          </div>

          {/* Payout Status Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Payout Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Available for Payout</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Available</span>
                </div>
                <span className="font-semibold text-gray-900">{formatCurrency(payoutStatus.available)}</span>
              </div>
              <div className="h-px bg-gray-200"></div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Pending</span>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Pending</span>
                </div>
                <span className="font-semibold text-gray-900">{formatCurrency(payoutStatus.pending)}</span>
              </div>
              <div className="h-px bg-gray-200"></div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Paid</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">Paid</span>
                </div>
                <span className="font-semibold text-gray-900">{formatCurrency(payoutStatus.paid)}</span>
              </div>
            </div>
          </div>

          {/* Earnings Metrics Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Earnings Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Earnings per Hour</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.earningsPerHour)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Earnings per Mile</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.earningsPerMile)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Active Time</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.activeTime.toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Trips</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalTrips}</p>
              </div>
            </div>
          </div>

          {/* Transaction Ledger */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Earnings History</h3>
            <div className="space-y-0">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No transactions found</p>
              ) : (
                transactions.map((transaction) => (
                  <button
                    key={transaction.id}
                    onClick={() => handleTransactionClick(transaction)}
                    className="w-full py-4 border-b border-gray-100 last:border-0 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">{transaction.restaurantName}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                            transaction.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {transaction.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          {transaction.date} • {transaction.time} • Order #{transaction.orderId}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>Gross: {formatCurrency(transaction.grossEarnings)}</span>
                          {transaction.tipAmount > 0 && (
                            <span>Tip: {formatCurrency(transaction.tipAmount)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(transaction.netEarnings)}</p>
                        <ChevronRight className="w-5 h-5 text-gray-400 mt-1" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {showDetailModal && selectedTransaction && transactionDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Transaction Details</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTransaction(null);
                  setTransactionDetail(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Restaurant</p>
                <p className="font-semibold text-gray-900">{selectedTransaction.restaurantName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Order ID</p>
                <p className="font-semibold text-gray-900">{selectedTransaction.orderId}</p>
              </div>
              <div className="h-px bg-gray-200"></div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Driver Share</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(transactionDetail.driverShare)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tip</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(transactionDetail.tip)}</span>
                </div>
              </div>
              <div className="h-px bg-gray-300 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Final Driver Payout</span>
                <span className="text-lg font-bold text-orange-500">{formatCurrency(transactionDetail.finalDriverPayout)}</span>
              </div>
              {transactionDetail.stripePayoutId && (
                <>
                  <div className="h-px bg-gray-200"></div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Stripe Payout Reference</p>
                    <p className="font-mono text-xs text-gray-700">{transactionDetail.stripePayoutId}</p>
                  </div>
                  {transactionDetail.payoutDate && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Payout Date</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(transactionDetail.payoutDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EarningsDashboard;

