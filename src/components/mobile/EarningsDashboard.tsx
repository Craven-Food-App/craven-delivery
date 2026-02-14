// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Info, ChevronDown, ChevronRight, Calendar, DollarSign, TrendingUp, Clock, MapPin, Receipt, Fuel, CreditCard, X, Lock } from 'lucide-react';
import feederCardBackground from '@/assets/feeder-card-background.png';
import feederCardImage from '@/assets/feeder-card-image.png';
import { Box, Stack, Text, Title, Group } from '@mantine/core';
import { useFeederDarkMode } from '@/contexts/FeederDarkModeContext';

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
  const { isDark, colors: C } = useFeederDarkMode();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [showPageInfo, setShowPageInfo] = useState(false);
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
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCardDetails, setShowCardDetails] = useState(false);
  
  // Gas Money state
  const [gasMoney, setGasMoney] = useState(0);
  const [showGasMoneyModal, setShowGasMoneyModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  
  // Earnings Cashout state
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [earningsCashoutAmount, setEarningsCashoutAmount] = useState('');
  
  // Instant Cashout state
  const [showInstantCashoutModal, setShowInstantCashoutModal] = useState(false);
  const [instantCashoutAmount, setInstantCashoutAmount] = useState('');
  const [debitCardLast4, setDebitCardLast4] = useState('');
  
  // Instant Cashout Eligibility state
  const [isInstantCashoutEligible, setIsInstantCashoutEligible] = useState(false);
  const [completedDeliveries, setCompletedDeliveries] = useState(0);
  const [accountAgeDays, setAccountAgeDays] = useState(0);

  useEffect(() => {
    fetchEarningsData();
    fetchCardData();
    fetchGasMoneyData();
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

      // Fetch or auto-provision card credentials from driver_cards
      let { data: cardData, error: cardError } = await supabase
        .from('driver_cards')
        .select('card_number, cvv, expiry_date')
        .eq('driver_id', user.id)
        .maybeSingle();

      if (!cardData && !cardError) {
        // Auto-provision a card row — trigger auto-fills card_number, cvv, expiry_date
        const { data: newCard, error: insertError } = await supabase
          .from('driver_cards')
          .insert({
            driver_id: user.id,
            issuing_card_id: `auto_${user.id.slice(0, 8)}`,
            status: 'active',
          } as any)
          .select('card_number, cvv, expiry_date')
          .single();

        if (!insertError && newCard) {
          cardData = newCard;
        }
      }

      if (cardData) {
        setCardNumber(cardData.card_number || '');
        setCvv(cardData.cvv || '');
        setExpiryDate(cardData.expiry_date || '');
      }

      // Fetch debit card on file for instant cashout
      const { data: paymentMethod } = await supabase
        .from('payment_methods')
        .select('last_four')
        .eq('user_id', user.id)
        .eq('type', 'debit')
        .maybeSingle();

      if (paymentMethod?.last_four) {
        setDebitCardLast4(paymentMethod.last_four);
      }

      // Fetch eligibility data for instant cashout
      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('created_at, completed_orders')
        .eq('user_id', user.id)
        .maybeSingle();

      if (driverProfile) {
        const ageDays = Math.floor((Date.now() - new Date(driverProfile.created_at).getTime()) / 86400000);
        const deliveries = driverProfile.completed_orders || 0;
        setAccountAgeDays(ageDays);
        setCompletedDeliveries(deliveries);
        setIsInstantCashoutEligible(ageDays >= 30 && deliveries >= 50);
      }
    } catch (error) {
      console.error('Error fetching card data:', error);
    }
  };
  
  const fetchGasMoneyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch accumulated gas money from driver_gas_money table or calculate from distance pay
      const { data: gasMoneyData, error } = await supabase
        .from('driver_gas_money')
        .select('balance')
        .eq('driver_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no records gracefully

      if (!error && gasMoneyData?.balance) {
        setGasMoney(gasMoneyData.balance / 100); // Convert cents to dollars
      } else {
        // If no gas money record exists yet, start at $0
        setGasMoney(0);
      }
    } catch (error) {
      console.error('Error fetching gas money:', error);
      // Fallback to $0
      setGasMoney(0);
    }
  };
  
  const handleTransferGasMoney = async () => {
    try {
      const amount = parseFloat(transferAmount);
      
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      
      if (amount > gasMoney) {
        toast.error(`Amount cannot exceed your gas money balance of ${formatCurrency(gasMoney)}`);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to transfer funds');
        return;
      }

      // Transfer to Feeder Card via Stripe
      const { data, error } = await supabase.functions.invoke('transfer-gas-money', {
        body: { 
          driver_id: user.id,
          amount_cents: Math.round(amount * 100)
        }
      });

      if (error) throw error;

      // Update local state
      setGasMoney(gasMoney - amount);
      setCardBalance(cardBalance + amount);
      setTransferAmount('');
      setShowGasMoneyModal(false);
      
      toast.success(`${formatCurrency(amount)} transferred to your Feeder Card!`);
      
      // Refresh data
      fetchGasMoneyData();
      fetchCardData();
    } catch (error) {
      console.error('Error transferring gas money:', error);
      toast.error('Failed to transfer funds. Please try again.');
    }
  };
  
  const handleTransferEarnings = async () => {
    try {
      const amount = parseFloat(earningsCashoutAmount);
      
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      
      if (amount > payoutStatus.available) {
        toast.error(`Amount cannot exceed your available balance of ${formatCurrency(payoutStatus.available)}`);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to transfer funds');
        return;
      }

      // Transfer earnings to Feeder Card via Stripe
      const { data, error } = await supabase.functions.invoke('transfer-earnings', {
        body: { 
          driver_id: user.id,
          amount_cents: Math.round(amount * 100)
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update local state with server-confirmed new balance
      const newAvailable = data?.new_available_balance != null 
        ? data.new_available_balance / 100 
        : payoutStatus.available - amount;
      
      setPayoutStatus({
        ...payoutStatus,
        available: newAvailable,
        paid: payoutStatus.paid + amount,
      });
      setCardBalance(cardBalance + amount);
      setEarningsCashoutAmount('');
      setShowEarningsModal(false);
      
      toast.success(`${formatCurrency(amount)} transferred to your Feeder Card!`);
      
      // Refresh data
      fetchEarningsData();
      fetchCardData();
    } catch (error) {
      console.error('Error transferring earnings:', error);
      const msg = error instanceof Error ? error.message : 'Failed to transfer funds. Please try again.';
      toast.error(msg);
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
            mileage_pay_cents,
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

      let totalMiles = 0; // Track total miles driven
      
      earnings.forEach((earning: any) => {
        basePay += (earning.amount_cents || 0) / 100;
        tips += (earning.tip_cents || 0) / 100;
        
        // Add mileage pay (distance pay) from the order
        const order = earning.orders;
        if (order?.mileage_pay_cents) {
          distancePay += order.mileage_pay_cents / 100;
        } else if (earning.order_id) {
          // Fallback: if join didn't work, fetch order directly
          // This shouldn't be needed but helps debug
          console.log('Order join missing mileage_pay_cents for order:', earning.order_id);
        }
        
        // Track distance for earnings per mile calculation
        if (order?.distance_km) {
          totalMiles += order.distance_km * 0.621371; // Convert km to miles
        }
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


      // Calculate payout status from database
      // Available = total earnings - paid out earnings
      const { data: payoutsData } = await supabase
        .from('driver_payouts')
        .select('amount, status')
        .eq('driver_id', user.id);

      let paidTotal = 0;
      let pendingTotal = 0;

      if (payoutsData) {
        payoutsData.forEach((payout: any) => {
          const amountDollars = parseFloat(payout.amount || '0');
          if (payout.status === 'completed' || payout.status === 'sent') {
            paidTotal += amountDollars;
          } else if (payout.status === 'pending') {
            pendingTotal += amountDollars;
          }
        });
      }

      // Available = total earned - (paid + pending)
      const availableForPayout = Math.max(0, totalEarned - paidTotal - pendingTotal);

      setPayoutStatus({
        available: availableForPayout,
        pending: pendingTotal,
        paid: paidTotal,
      });

      // Calculate metrics
      const totalTrips = earnings.length;
      const activeTime = totalTrips * 0.5; // Estimate 30 min per trip
      const earningsPerHour = activeTime > 0 ? totalEarned / activeTime : 0;
      const earningsPerMile = totalMiles > 0 ? totalEarned / totalMiles : 0;

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
    <div className="h-screen w-full overflow-y-auto" style={{ 
      background: C.bgMuted,
      paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' 
    }}>
      {/* Header */}
      <div className="border-b sticky top-0 z-10" style={{ padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', background: C.bg, borderColor: C.border }}>
        <div className="flex items-center justify-between mb-1">
          <button 
            onClick={() => onOpenMenu?.()}
            className="p-2" style={{ color: C.muted }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-base font-black" style={{ letterSpacing: '0.2px', color: C.text }}>Earnings</h1>
          <button 
            onClick={() => setShowPageInfo(true)}
            className="p-2" style={{ color: C.muted }}
          >
            <Info className="w-6 h-6" />
          </button>
        </div>
        
        {/* Page Info Modal */}
        {showPageInfo && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
            onClick={() => setShowPageInfo(false)}
            style={{ padding: '20px' }}
          >
            <div 
              className="rounded-lg p-6 max-w-md w-full" 
              style={{ background: C.bg, maxHeight: '80vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: C.text }}>Earnings Dashboard</h2>
                </div>
                <button onClick={() => setShowPageInfo(false)} style={{ color: C.muted2 }}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4" style={{ color: C.muted }}>
                <p className="text-sm leading-relaxed">
                  <strong style={{ color: C.text }}>Your Complete Earnings Overview</strong><br />
                  Track all your delivery earnings in one place. View your income breakdown, payout status, and performance metrics.
                </p>
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">💰 Earnings Breakdown</p>
                    <p className="text-xs text-gray-600">See your base pay, distance pay (gas money), tips, bonuses, and total earnings.</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">⚡ Payout Status</p>
                    <p className="text-xs text-gray-600">Monitor available balance, pending payouts, and total paid earnings.</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">📊 Performance Metrics</p>
                    <p className="text-xs text-gray-600">Track your earnings per hour, earnings per mile, total active time, and trip count.</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">⛽ Gas Money</p>
                    <p className="text-xs text-gray-600">Accumulated mileage pay that can be transferred to your Feeder Card for gas expenses.</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">💳 Feeder Card</p>
                    <p className="text-xs text-gray-600">Your digital debit card showing available balance. Tap to view full card details and transaction history.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Time Range Selector */}
        <div className="mt-3">
          <div className="flex gap-2">
                {(['today', 'thisWeek', 'lastWeek'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
                style={{
                  background: timeRange === range ? '#E8622A' : C.track,
                  color: timeRange === range ? '#fff' : C.muted
                }}
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
                    maxWidth: "480px",
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
                      marginTop: '-40px',
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
                    <Group justify="space-between" align="flex-end" style={{ marginTop: '-50px' }}>
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

          {/* Instant Cashout Option */}
            <div 
            className={`flex items-center justify-between px-4 py-2 cursor-pointer rounded-xl ${!isInstantCashoutEligible ? 'opacity-70' : ''}`}
            style={{ background: C.card }}
            onClick={() => {
              if (isInstantCashoutEligible) {
                setShowInstantCashoutModal(true);
              } else {
                toast.error('You need 50+ deliveries and 30 days as an active feeder to unlock instant cashout');
              }
            }}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CreditCard className={`w-4 h-4 ${isInstantCashoutEligible ? 'text-orange-500' : ''}`} style={{ color: isInstantCashoutEligible ? undefined : C.muted2 }} />
                <span className="text-sm font-medium" style={{ color: isInstantCashoutEligible ? C.muted : C.muted2 }}>
                  Instant Cashout to Debit Card
                </span>
              </div>
              {!isInstantCashoutEligible && (
                <p className="text-xs ml-6 mt-0.5" style={{ color: C.muted2 }}>
                  {completedDeliveries}/50 deliveries · {Math.max(0, 30 - accountAgeDays)} days remaining
                </p>
              )}
            </div>
            {isInstantCashoutEligible ? (
              <ChevronRight className="w-4 h-4" style={{ color: C.muted2 }} />
            ) : (
              <Lock className="w-4 h-4" style={{ color: C.muted2 }} />
            )}
          </div>

          {/* Earnings Summary Cards - Side by Side */}
          <div className="grid grid-cols-2 gap-3 mt-2.5">
            {/* Primary Earnings Summary Card - Clickable only on Today tab */}
             <div 
              className={`rounded-2xl p-6 shadow-sm ${
                timeRange === 'today' && payoutStatus.available > 0 ? 'cursor-pointer' : ''
              } transition-shadow`}
              style={{ background: C.card }}
              onClick={() => {
                if (timeRange === 'today' && payoutStatus.available > 0) {
                  setShowEarningsModal(true);
                }
              }}
            >
              <p className="text-sm mb-1" style={{ color: C.muted2 }}>Your Earnings</p>
              <p className="text-3xl font-bold mb-1" style={{ color: C.text }}>
                {formatCurrency(timeRange === 'today' ? payoutStatus.available : totalEarnings)}
              </p>
              <p className="text-xs" style={{ color: C.muted2 }}>
                {timeRange === 'today' ? 'Available to cash out' : 'Net earnings'}
              </p>
            </div>
            
            {/* Gas Money Card - Clickable only on Today tab */}
            <div 
              className={`rounded-2xl p-6 shadow-sm ${
                timeRange === 'today' && gasMoney > 0 ? 'cursor-pointer' : ''
              } transition-shadow`}
              style={{ background: C.card }}
              onClick={() => {
                if (timeRange === 'today' && gasMoney > 0) {
                  setShowGasMoneyModal(true);
                }
              }}
            >
              <p className="text-sm mb-1" style={{ color: C.muted2 }}>Gas Money</p>
              <p className="text-3xl font-bold mb-1" style={{ color: C.text }}>{formatCurrency(gasMoney)}</p>
              <p className="text-xs" style={{ color: C.muted2 }}>
                {timeRange === 'today' ? 'Available to transfer' : 'Mileage earnings'}
              </p>
            </div>
          </div>

          {/* Earnings Breakdown Card */}
          <div className="rounded-2xl p-6 shadow-sm" style={{ background: C.card }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: C.text }}>Earnings Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span style={{ color: C.muted }}>Base Pay</span>
                <span className="font-semibold" style={{ color: C.text }}>{formatCurrency(breakdown.basePay)}</span>
              </div>
              <div className="h-px" style={{ background: C.border }}></div>
              <div className="flex justify-between items-center">
                <span style={{ color: C.muted }}>Distance Pay</span>
                <span className="font-semibold" style={{ color: C.text }}>{formatCurrency(breakdown.distancePay)}</span>
              </div>
              <div className="h-px" style={{ background: C.border }}></div>
              <div className="flex justify-between items-center">
                <span style={{ color: C.muted }}>Tips</span>
                <span className="font-semibold" style={{ color: C.text }}>{formatCurrency(breakdown.tips)}</span>
              </div>
              <div className="h-px" style={{ background: C.border }}></div>
              <div className="flex justify-between items-center">
                <span style={{ color: C.muted }}>Bonuses</span>
                <span className="font-semibold" style={{ color: C.text }}>{formatCurrency(breakdown.bonuses)}</span>
              </div>
              <div className="h-px" style={{ background: C.border }}></div>
              <div className="flex justify-between items-center">
                <span style={{ color: C.muted }}>Adjustments</span>
                <span className="font-semibold" style={{ color: C.text }}>{formatCurrency(breakdown.adjustments)}</span>
              </div>
              <div className="h-px my-2" style={{ background: C.border }}></div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold" style={{ color: C.text }}>Total Earned</span>
                <span className="text-lg font-bold" style={{ color: C.text }}>{formatCurrency(breakdown.totalEarned)}</span>
              </div>
            </div>
          </div>

          {/* Payout Status Card */}
          <div className="rounded-2xl p-6 shadow-sm" style={{ background: C.card }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: C.text }}>Payout Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span style={{ color: C.muted }}>Available for Payout</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Available</span>
                </div>
                <span className="font-semibold" style={{ color: C.text }}>{formatCurrency(payoutStatus.available)}</span>
              </div>
              <div className="h-px" style={{ background: C.border }}></div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span style={{ color: C.muted }}>Pending</span>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Pending</span>
                </div>
                <span className="font-semibold" style={{ color: C.text }}>{formatCurrency(payoutStatus.pending)}</span>
              </div>
              <div className="h-px" style={{ background: C.border }}></div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span style={{ color: C.muted }}>Paid</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">Paid</span>
                </div>
                <span className="font-semibold" style={{ color: C.text }}>{formatCurrency(payoutStatus.paid)}</span>
              </div>
            </div>
          </div>

          {/* Earnings Metrics Card */}
          <div className="rounded-2xl p-6 shadow-sm" style={{ background: C.card }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: C.text }}>Earnings Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm mb-1" style={{ color: C.muted2 }}>Earnings per Hour</p>
                <p className="text-2xl font-bold" style={{ color: C.text }}>{formatCurrency(metrics.earningsPerHour)}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: C.muted2 }}>Earnings per Mile</p>
                <p className="text-2xl font-bold" style={{ color: C.text }}>{formatCurrency(metrics.earningsPerMile)}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: C.muted2 }}>Active Time</p>
                <p className="text-2xl font-bold" style={{ color: C.text }}>{metrics.activeTime.toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: C.muted2 }}>Total Trips</p>
                <p className="text-2xl font-bold" style={{ color: C.text }}>{metrics.totalTrips}</p>
              </div>
            </div>
          </div>

          {/* Transaction Ledger */}
          <div className="rounded-2xl p-6 shadow-sm" style={{ background: C.card }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: C.text }}>Earnings History</h3>
            <div className="space-y-0">
              {transactions.length === 0 ? (
                <p className="text-center py-8" style={{ color: C.muted2 }}>No transactions found</p>
              ) : (
                transactions.map((transaction) => (
                  <button
                    key={transaction.id}
                    onClick={() => handleTransactionClick(transaction)}
                    className="w-full py-4 last:border-0 text-left transition-colors"
                    style={{ borderBottom: `1px solid ${C.border}` }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold" style={{ color: C.text }}>{transaction.restaurantName}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                            transaction.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {transaction.status}
                          </span>
                        </div>
                        <p className="text-xs mb-1" style={{ color: C.muted2 }}>
                          {transaction.date} • {transaction.time} • Order #{transaction.orderId}
                        </p>
                        <div className="flex items-center gap-4 text-xs" style={{ color: C.muted }}>
                          <span>Gross: {formatCurrency(transaction.grossEarnings)}</span>
                          {transaction.tipAmount > 0 && (
                            <span>Tip: {formatCurrency(transaction.tipAmount)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold" style={{ color: C.text }}>{formatCurrency(transaction.netEarnings)}</p>
                        <ChevronRight className="w-5 h-5 mt-1" style={{ color: C.muted2 }} />
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
          <div className="rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ background: C.bg }}>
            <div className="sticky top-0 border-b p-4 flex items-center justify-between" style={{ background: C.bg, borderColor: C.border }}>
              <h2 className="text-xl font-bold" style={{ color: C.text }}>Transaction Details</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTransaction(null);
                  setTransactionDetail(null);
                }}
                style={{ color: C.muted2 }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm mb-1" style={{ color: C.muted2 }}>Restaurant</p>
                <p className="font-semibold" style={{ color: C.text }}>{selectedTransaction.restaurantName}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: C.muted2 }}>Order ID</p>
                <p className="font-semibold" style={{ color: C.text }}>{selectedTransaction.orderId}</p>
              </div>
              <div className="h-px" style={{ background: C.border }}></div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={{ color: C.muted }}>Driver Share</span>
                  <span className="font-semibold" style={{ color: C.text }}>{formatCurrency(transactionDetail.driverShare)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: C.muted }}>Tip</span>
                  <span className="font-semibold" style={{ color: C.text }}>{formatCurrency(transactionDetail.tip)}</span>
                </div>
              </div>
              <div className="h-px my-2" style={{ background: C.border }}></div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold" style={{ color: C.text }}>Final Driver Payout</span>
                <span className="text-lg font-bold text-orange-500">{formatCurrency(transactionDetail.finalDriverPayout)}</span>
              </div>
              {transactionDetail.stripePayoutId && (
                <>
                  <div className="h-px" style={{ background: C.border }}></div>
                  <div>
                    <p className="text-sm mb-1" style={{ color: C.muted2 }}>Stripe Payout Reference</p>
                    <p className="font-mono text-xs" style={{ color: C.muted }}>{transactionDetail.stripePayoutId}</p>
                  </div>
                  {transactionDetail.payoutDate && (
                    <div>
                      <p className="text-sm mb-1" style={{ color: C.muted2 }}>Payout Date</p>
                      <p className="font-semibold" style={{ color: C.text }}>
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
      
      {/* Gas Money Transfer Modal */}
      {showGasMoneyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl max-w-md w-full p-6 shadow-2xl" style={{ background: C.bg }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Fuel className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: C.text }}>Gas Money</h3>
                  <p className="text-sm" style={{ color: C.muted2 }}>Mileage earnings</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowGasMoneyModal(false);
                  setTransferAmount('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Balance Display */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 mb-6 border-2 border-green-200">
              <p className="text-sm text-green-700 mb-1">Available Balance</p>
              <p className="text-4xl font-bold text-green-900">{formatCurrency(gasMoney)}</p>
              <p className="text-xs text-green-600 mt-2">
                Accumulated from {breakdown.distancePay > 0 ? 'distance pay' : 'mileage'}
              </p>
            </div>
            
            {/* Transfer Options */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: C.muted }}>
                  Transfer Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={gasMoney}
                    className="w-full pl-8 pr-4 py-3 rounded-xl text-lg font-semibold focus:border-green-500 focus:outline-none" style={{ background: C.inputBg, color: C.text, border: `2px solid ${C.border}` }}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setTransferAmount((gasMoney * 0.25).toFixed(2))}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setTransferAmount((gasMoney * 0.5).toFixed(2))}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setTransferAmount((gasMoney * 0.75).toFixed(2))}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setTransferAmount(gasMoney.toFixed(2))}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    All
                  </button>
                </div>
              </div>
              
              {/* Transfer Destination */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: C.text }}>Transfer to Feeder Card</p>
                    <p className="text-xs" style={{ color: C.muted }}>Available instantly</p>
                  </div>
                  <p className="text-lg font-bold" style={{ color: C.text }}>{formatCurrency(cardBalance)}</p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowGasMoneyModal(false);
                    setTransferAmount('');
                  }}
                  className="flex-1 px-6 py-3 font-semibold rounded-xl transition-colors" style={{ background: C.track, color: C.muted }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferGasMoney}
                  disabled={!transferAmount || parseFloat(transferAmount) <= 0}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Transfer
                </button>
              </div>
              
              {/* Info Text */}
              <p className="text-xs text-center mt-4" style={{ color: C.muted2 }}>
                Gas money is accumulated from your distance pay and can be used for fuel or transferred to your Feeder Card for any purpose.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Earnings Cashout Modal */}
      {showEarningsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl max-w-md w-full p-6 shadow-2xl" style={{ background: C.bg }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: C.text }}>Cash Out Earnings</h3>
                  <p className="text-sm" style={{ color: C.muted2 }}>Available balance</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEarningsModal(false);
                  setEarningsCashoutAmount('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Balance Display */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 mb-6 border-2 border-orange-200">
              <p className="text-sm text-orange-700 mb-1">Available to Cash Out</p>
              <p className="text-4xl font-bold text-orange-900">{formatCurrency(payoutStatus.available)}</p>
              <p className="text-xs text-orange-600 mt-2">
                From {metrics.totalTrips} {metrics.totalTrips === 1 ? 'delivery' : 'deliveries'}
              </p>
            </div>
            
            {/* Transfer Options */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: C.muted }}>
                  Cash Out Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                  <input
                    type="number"
                    value={earningsCashoutAmount}
                    onChange={(e) => setEarningsCashoutAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={payoutStatus.available}
                    className="w-full pl-8 pr-4 py-3 rounded-xl text-lg font-semibold focus:border-orange-500 focus:outline-none" style={{ background: C.inputBg, color: C.text, border: `2px solid ${C.border}` }}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setEarningsCashoutAmount((payoutStatus.available * 0.25).toFixed(2))}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setEarningsCashoutAmount((payoutStatus.available * 0.5).toFixed(2))}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setEarningsCashoutAmount((payoutStatus.available * 0.75).toFixed(2))}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setEarningsCashoutAmount(payoutStatus.available.toFixed(2))}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    All
                  </button>
                </div>
              </div>
              
              {/* Transfer Destination */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: C.text }}>Transfer to Feeder Card</p>
                    <p className="text-xs" style={{ color: C.muted }}>Available instantly</p>
                  </div>
                  <p className="text-lg font-bold" style={{ color: C.text }}>{formatCurrency(cardBalance)}</p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEarningsModal(false);
                    setEarningsCashoutAmount('');
                  }}
                  className="flex-1 px-6 py-3 font-semibold rounded-xl transition-colors" style={{ background: C.track, color: C.muted }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferEarnings}
                  disabled={!earningsCashoutAmount || parseFloat(earningsCashoutAmount) <= 0}
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cash Out
                </button>
              </div>
              
              {/* Info Text */}
              <p className="text-xs text-center mt-4" style={{ color: C.muted2 }}>
                Cash out your available earnings instantly to your Feeder Card. Funds can be used anywhere Visa is accepted.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Instant Cashout to Debit Card Modal */}
      {showInstantCashoutModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl max-w-md w-full p-6 shadow-2xl" style={{ background: C.bg }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: C.text }}>Instant Cashout</h3>
                  <p className="text-sm" style={{ color: C.muted2 }}>Transfer to your debit card</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowInstantCashoutModal(false);
                  setInstantCashoutAmount('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Feeder Card Balance */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 mb-6 border-2 border-orange-200">
              <p className="text-sm text-orange-700 mb-1">Feeder Card Balance</p>
              <p className="text-4xl font-bold text-orange-900">{formatCurrency(cardBalance)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: C.muted }}>
                  Cashout Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                  <input
                    type="number"
                    value={instantCashoutAmount}
                    onChange={(e) => setInstantCashoutAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={cardBalance}
                    className="w-full pl-8 pr-4 py-3 rounded-xl text-lg font-semibold focus:border-orange-500 focus:outline-none" style={{ background: C.inputBg, color: C.text, border: `2px solid ${C.border}` }}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setInstantCashoutAmount((cardBalance * pct / 100).toFixed(2))}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {pct}%
                    </button>
                  ))}
                  <button
                    onClick={() => setInstantCashoutAmount(cardBalance.toFixed(2))}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    All
                  </button>
                </div>
              </div>
              
              {/* Destination */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: C.text }}>Debit Card on File</p>
                    <p className="text-xs" style={{ color: C.muted }}>
                      {debitCardLast4 ? `•••• ${debitCardLast4}` : 'No debit card on file'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Fee Disclosure */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-800">A 1.5% processing fee applies to all instant cashouts.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowInstantCashoutModal(false);
                    setInstantCashoutAmount('');
                  }}
                  className="flex-1 px-6 py-3 font-semibold rounded-xl transition-colors" style={{ background: C.track, color: C.muted }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const amount = parseFloat(instantCashoutAmount);
                    if (isNaN(amount) || amount <= 0) {
                      toast.error('Please enter a valid amount');
                      return;
                    }
                    if (amount > cardBalance) {
                      toast.error(`Amount cannot exceed ${formatCurrency(cardBalance)}`);
                      return;
                    }
                    if (!debitCardLast4) {
                      toast.error('No debit card on file. Please add one first.');
                      return;
                    }
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) { toast.error('Please sign in'); return; }
                      const fee = amount * 0.015;
                      const netAmount = amount - fee;
                      // TODO: Integrate with actual payout provider (Moov/Stripe)
                      toast.success(`${formatCurrency(netAmount)} cashout to debit card initiated! (${formatCurrency(fee)} fee)`);
                      setCardBalance(cardBalance - amount);
                      setInstantCashoutAmount('');
                      setShowInstantCashoutModal(false);
                    } catch (err) {
                      console.error('Instant cashout error:', err);
                      toast.error('Cashout failed. Please try again.');
                    }
                  }}
                  disabled={!instantCashoutAmount || parseFloat(instantCashoutAmount) <= 0 || !debitCardLast4}
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cash Out
                </button>
              </div>
              
              <p className="text-xs text-center mt-4" style={{ color: C.muted2 }}>
                Funds will be transferred instantly to your debit card on file.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EarningsDashboard;

