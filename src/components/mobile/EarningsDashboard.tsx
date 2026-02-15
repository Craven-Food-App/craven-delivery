// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Info, ChevronDown, ChevronRight, Calendar, DollarSign, TrendingUp, Clock, MapPin, Receipt, Fuel, CreditCard, X, Plus, Trash2, Lock, ArrowUpRight } from 'lucide-react';
import feederCardBackground from '@/assets/feeder-card-background.png';
import feederCardImage from '@/assets/feeder-card-image.png';
import { Box, Stack, Text, Title, Group } from '@mantine/core';

type EarningsDashboardProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

type TimeRange = 'today' | 'thisWeek' | 'lastWeek' | 'overall' | 'custom';

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
  const cardNumber = '5399283309390129';
  const expiryDate = '12/28';
  const cvv = '847';
  const [showCardDetails, setShowCardDetails] = useState(false);
  
  // Gas Money state
  const [gasMoney, setGasMoney] = useState(0);
  const [showGasMoneyModal, setShowGasMoneyModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  
  // Earnings Cashout state
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [earningsCashoutAmount, setEarningsCashoutAmount] = useState('');
  
  // Debit Card Cashout state
  const [showDebitCashoutModal, setShowDebitCashoutModal] = useState(false);
  const [showAddDebitCardModal, setShowAddDebitCardModal] = useState(false);
  const [debitCashoutAmount, setDebitCashoutAmount] = useState('');
  const [savedDebitCards, setSavedDebitCards] = useState<any[]>([]);
  const [selectedDebitCard, setSelectedDebitCard] = useState<any>(null);
  const [newCardLast4, setNewCardLast4] = useState('');
  const [newCardHolderName, setNewCardHolderName] = useState('');
  const [newCardBrand, setNewCardBrand] = useState('visa');
  const [isEligibleForInstantCashout, setIsEligibleForInstantCashout] = useState(false);
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0);
  const [debitCashoutLoading, setDebitCashoutLoading] = useState(false);
  const [sentToFeederCard, setSentToFeederCard] = useState(0);

  useEffect(() => {
    fetchEarningsData();
    fetchCardData();
    fetchGasMoneyData();
    fetchDebitCards();
    checkCashoutEligibility();
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

  // Debit card cashout functions
  const fetchDebitCards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('driver_debit_cards')
        .select('*')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSavedDebitCards(data);
        const defaultCard = data.find((c: any) => c.is_default) || data[0];
        if (defaultCard) setSelectedDebitCard(defaultCard);
      }
    } catch (error) {
      console.error('Error fetching debit cards:', error);
    }
  };

  const checkCashoutEligibility = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Count completed orders for this driver
      const { count, error } = await supabase
        .from('driver_earnings')
        .select('id', { count: 'exact', head: true })
        .eq('driver_id', user.id);

      if (!error && count !== null) {
        setCompletedOrdersCount(count);
        // Eligible if 50+ completed orders
        setIsEligibleForInstantCashout(count >= 50);
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
    }
  };

  const handleAddDebitCard = async () => {
    if (!newCardLast4 || newCardLast4.length !== 4 || !newCardHolderName.trim()) {
      toast.error('Please enter valid card details');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isFirst = savedDebitCards.length === 0;

      const { data, error } = await supabase
        .from('driver_debit_cards')
        .insert({
          driver_id: user.id,
          card_last4: newCardLast4,
          card_brand: newCardBrand,
          card_holder_name: newCardHolderName.trim(),
          is_default: isFirst,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Debit card added successfully!');
      setNewCardLast4('');
      setNewCardHolderName('');
      setNewCardBrand('visa');
      setShowAddDebitCardModal(false);
      fetchDebitCards();
    } catch (error) {
      console.error('Error adding debit card:', error);
      toast.error('Failed to add debit card');
    }
  };

  const handleDeleteDebitCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('driver_debit_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;
      toast.success('Card removed');
      fetchDebitCards();
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Failed to remove card');
    }
  };

  const handleDebitCashout = async () => {
    if (!isEligibleForInstantCashout) {
      toast.error(`You need ${50 - completedOrdersCount} more deliveries to unlock instant cashout`);
      return;
    }
    if (!selectedDebitCard) {
      toast.error('Please add a debit card first');
      return;
    }

    const amount = parseFloat(debitCashoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount > cardBalance) {
      toast.error(`Amount cannot exceed your Feeder Card balance of ${formatCurrency(cardBalance)}`);
      return;
    }

    const fee = amount * 0.015; // 1.5% fee
    const netAmount = amount - fee;
    const amountCents = Math.round(amount * 100);

    setDebitCashoutLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Call the Stripe-powered instant payout edge function
      const { data, error } = await supabase.functions.invoke('create-instant-payout', {
        body: {
          amount: amountCents,
          payout_method: 'instant',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCardBalance(prev => prev - amount);
      setDebitCashoutAmount('');
      setShowDebitCashoutModal(false);

      const actualFee = data?.fee_cents ? (data.fee_cents / 100) : fee;
      const actualNet = data?.net_amount ? (data.net_amount / 100) : netAmount;
      toast.success(`${formatCurrency(actualNet)} sent to your debit card ending in ${selectedDebitCard.card_last4}! (${formatCurrency(actualFee)} fee applied)`);
      fetchCardData();
    } catch (error) {
      console.error('Error processing debit cashout:', error);
      const msg = error instanceof Error ? error.message : 'Failed to process cashout';
      toast.error(msg);
    } finally {
      setDebitCashoutLoading(false);
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
      case 'overall':
        return { start: new Date(2020, 0, 1), end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
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

      // Calculate "Sent to Feeder Card" for selected time range
      let feederCardQuery = supabase
        .from('driver_payouts')
        .select('amount, status, created_at')
        .eq('driver_id', user.id)
        .in('status', ['completed', 'sent']);

      if (timeRange !== 'overall') {
        feederCardQuery = feederCardQuery
          .gte('created_at', start.toISOString())
          .lt('created_at', end.toISOString());
      }

      const { data: feederPayouts } = await feederCardQuery;
      let feederTotal = 0;
      if (feederPayouts) {
        feederPayouts.forEach((p: any) => {
          feederTotal += parseFloat(p.amount || '0');
        });
      }
      setSentToFeederCard(feederTotal);

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
    <div className="h-screen w-full overflow-y-auto bg-gray-50" style={{ 
      paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' 
    }}>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10" style={{ padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <div className="flex items-center justify-between mb-1">
          <button 
            onClick={() => onOpenMenu?.()}
            className="text-gray-700 p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-base font-black text-gray-900" style={{ letterSpacing: '0.2px' }}>Earnings</h1>
          <button 
            onClick={() => setShowPageInfo(true)}
            className="text-gray-700 p-2"
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
              className="bg-white rounded-lg p-6 max-w-md w-full" 
              onClick={(e) => e.stopPropagation()}
              style={{ maxHeight: '80vh', overflowY: 'auto' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Earnings Dashboard</h2>
                </div>
                <button onClick={() => setShowPageInfo(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4 text-gray-700">
                <p className="text-sm leading-relaxed">
                  <strong className="text-gray-900">Your Complete Earnings Overview</strong><br />
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
            {(['today', 'thisWeek', 'lastWeek', 'overall'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {range === 'today' ? 'Today' : range === 'thisWeek' ? 'This Week' : range === 'lastWeek' ? 'Last Week' : 'Overall'}
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

          {/* Cash Out to Debit Card Section */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mt-2.5 mb-2.5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-bold text-gray-900">Cash Out to Debit Card</h3>
              </div>
              {!isEligibleForInstantCashout && (
                <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
                  <Lock className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-500">{completedOrdersCount}/50 deliveries</span>
                </div>
              )}
            </div>

            {!isEligibleForInstantCashout ? (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-sm text-orange-800 font-medium mb-1">🔒 Unlock Instant Cashout</p>
                <p className="text-xs text-orange-700">
                  Complete {50 - completedOrdersCount} more {50 - completedOrdersCount === 1 ? 'delivery' : 'deliveries'} with a good rating to unlock instant cashout to your debit card.
                </p>
                <div className="mt-3 bg-orange-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-orange-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min((completedOrdersCount / 50) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-orange-600 mt-1 text-right">{Math.min(completedOrdersCount, 50)}/50</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedDebitCards.length === 0 ? (
                  <button
                    onClick={() => setShowAddDebitCardModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-orange-300 rounded-xl text-orange-600 hover:bg-orange-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Debit Card</span>
                  </button>
                ) : (
                  <>
                    {/* Selected card preview */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                      <CreditCard className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedDebitCard?.card_brand?.toUpperCase()} •••• {selectedDebitCard?.card_last4}
                        </p>
                        <p className="text-xs text-gray-500">{selectedDebitCard?.card_holder_name}</p>
                      </div>
                      <button
                        onClick={() => setShowAddDebitCardModal(true)}
                        className="text-xs text-orange-600 font-medium"
                      >
                        Manage
                      </button>
                    </div>
                    
                    {/* Cash out button */}
                    <button
                      onClick={() => {
                        if (cardBalance <= 0) {
                          toast.error('No balance available to cash out');
                          return;
                        }
                        setShowDebitCashoutModal(true);
                      }}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Cash Out to Debit Card
                    </button>
                    <p className="text-xs text-gray-400 text-center">1.5% instant transfer fee applies</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Earnings Summary Cards - Side by Side */}
          <div className="grid grid-cols-2 gap-3 mt-2.5">
            {/* Primary Earnings Summary Card - Clickable only on Today tab */}
            <div 
              className={`bg-white rounded-2xl p-6 shadow-sm ${
                timeRange === 'today' && payoutStatus.available > 0
                  ? 'cursor-pointer hover:shadow-md' 
                  : ''
              } transition-shadow`}
              onClick={() => {
                if (timeRange === 'today' && payoutStatus.available > 0) {
                  setShowEarningsModal(true);
                }
              }}
            >
              <p className="text-sm text-gray-500 mb-1">Your Earnings</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {formatCurrency(timeRange === 'today' ? payoutStatus.available : totalEarnings)}
              </p>
              <p className="text-xs text-gray-400">
                {timeRange === 'today' ? 'Available to cash out' : 'Net earnings'}
              </p>
              <p className="text-[10px] font-medium text-orange-500 mt-0.5">
                Sent to Feeder Card: {formatCurrency(sentToFeederCard)}
              </p>
            </div>
            
            {/* Gas Money Card - Clickable only on Today tab */}
            <div 
              className={`bg-white rounded-2xl p-6 shadow-sm ${
                timeRange === 'today' && gasMoney > 0
                  ? 'cursor-pointer hover:shadow-md' 
                  : ''
              } transition-shadow`}
              onClick={() => {
                if (timeRange === 'today' && gasMoney > 0) {
                  setShowGasMoneyModal(true);
                }
              }}
            >
              <p className="text-sm text-gray-500 mb-1">Gas Money</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(gasMoney)}</p>
              <p className="text-xs text-gray-400">
                {timeRange === 'today' ? 'Available to transfer' : 'Mileage earnings'}
              </p>
            </div>
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
      
      {/* Gas Money Transfer Modal */}
      {showGasMoneyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Fuel className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Gas Money</h3>
                  <p className="text-sm text-gray-500">Mileage earnings</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-semibold focus:border-green-500 focus:outline-none"
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
                    <p className="text-sm font-semibold text-gray-900">Transfer to Feeder Card</p>
                    <p className="text-xs text-gray-600">Available instantly</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(cardBalance)}</p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowGasMoneyModal(false);
                    setTransferAmount('');
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
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
              <p className="text-xs text-gray-500 text-center mt-4">
                Gas money is accumulated from your distance pay and can be used for fuel or transferred to your Feeder Card for any purpose.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Earnings Cashout Modal */}
      {showEarningsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Cash Out Earnings</h3>
                  <p className="text-sm text-gray-500">Available balance</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-semibold focus:border-orange-500 focus:outline-none"
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
                    <p className="text-sm font-semibold text-gray-900">Transfer to Feeder Card</p>
                    <p className="text-xs text-gray-600">Available instantly</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(cardBalance)}</p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEarningsModal(false);
                    setEarningsCashoutAmount('');
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
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
              <p className="text-xs text-gray-500 text-center mt-4">
                Cash out your available earnings instantly to your Feeder Card. Funds can be used anywhere Visa is accepted.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Debit Card Modal */}
      {showAddDebitCardModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Manage Debit Cards</h3>
                  <p className="text-sm text-gray-500">For instant cashout</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddDebitCardModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Saved cards list */}
            {savedDebitCards.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-gray-700">Your Cards</p>
                {savedDebitCards.map((card: any) => (
                  <div key={card.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {card.card_brand?.toUpperCase()} •••• {card.card_last4}
                      </p>
                      <p className="text-xs text-gray-500">{card.card_holder_name}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteDebitCard(card.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new card form */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Add New Card</p>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cardholder Name</label>
                <input
                  type="text"
                  value={newCardHolderName}
                  onChange={(e) => setNewCardHolderName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Last 4 Digits</label>
                <input
                  type="text"
                  value={newCardLast4}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setNewCardLast4(val);
                  }}
                  placeholder="1234"
                  maxLength={4}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Card Network</label>
                <select
                  value={newCardBrand}
                  onChange={(e) => setNewCardBrand(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:outline-none bg-white"
                >
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                </select>
              </div>
              <button
                onClick={handleAddDebitCard}
                disabled={!newCardLast4 || newCardLast4.length !== 4 || !newCardHolderName.trim()}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debit Card Cashout Modal */}
      {showDebitCashoutModal && selectedDebitCard && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Cash Out to Debit</h3>
                  <p className="text-sm text-gray-500">Instant transfer</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDebitCashoutModal(false);
                  setDebitCashoutAmount('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Balance Display */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 mb-6 border-2 border-orange-200">
              <p className="text-sm text-orange-700 mb-1">Feeder Card Balance</p>
              <p className="text-4xl font-bold text-orange-900">{formatCurrency(cardBalance)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Cash Out</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                  <input
                    type="number"
                    value={debitCashoutAmount}
                    onChange={(e) => setDebitCashoutAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={cardBalance}
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-semibold focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[0.25, 0.5, 0.75, 1].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setDebitCashoutAmount((cardBalance * pct).toFixed(2))}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {pct === 1 ? 'All' : `${pct * 100}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fee breakdown */}
              {debitCashoutAmount && parseFloat(debitCashoutAmount) > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-medium text-gray-900">{formatCurrency(parseFloat(debitCashoutAmount))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Instant fee (1.5%)</span>
                    <span className="font-medium text-red-600">-{formatCurrency(parseFloat(debitCashoutAmount) * 0.015)}</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between text-sm">
                    <span className="font-semibold text-gray-900">You receive</span>
                    <span className="font-bold text-green-700">{formatCurrency(parseFloat(debitCashoutAmount) * 0.985)}</span>
                  </div>
                </div>
              )}

              {/* Destination card */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedDebitCard.card_brand?.toUpperCase()} •••• {selectedDebitCard.card_last4}
                    </p>
                    <p className="text-xs text-gray-600">{selectedDebitCard.card_holder_name}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDebitCashoutModal(false);
                    setDebitCashoutAmount('');
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDebitCashout}
                  disabled={!debitCashoutAmount || parseFloat(debitCashoutAmount) <= 0 || debitCashoutLoading}
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {debitCashoutLoading ? 'Processing...' : 'Cash Out'}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Funds arrive instantly to your debit card. A 1.5% fee is applied to all instant transfers.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EarningsDashboard;

