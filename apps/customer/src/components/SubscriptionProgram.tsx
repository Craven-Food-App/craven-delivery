/**
 * Subscription Program Component (CravePass)
 * Monthly subscription for unlimited free delivery and benefits
 * Competes directly with DoorDash DashPass
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Crown,
  Check,
  X,
  DollarSign,
  Truck,
  Star,
  Zap,
  TrendingDown,
  Calendar,
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_annual: number;
  benefits: {
    free_delivery: boolean;
    reduced_service_fee: number;
    priority_support: boolean;
    exclusive_deals: boolean;
    min_order_amount: number;
    description: string;
  };
}

interface UserSubscription {
  id: string;
  status: string;
  billing_cycle: 'monthly' | 'annual';
  start_date: string;
  next_billing_date: string;
  plan: SubscriptionPlan;
}

export function SubscriptionProgram() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [savings, setSavings] = useState(0);

  useEffect(() => {
    fetchSubscriptionData();
    calculateSavings();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch available plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true);

      if (plansError) throw plansError;
      setPlans((plansData || []) as unknown as SubscriptionPlan[]);

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch user's current subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:plan_id (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        throw subscriptionError;
      }

      if (subscriptionData) {
        setCurrentSubscription(subscriptionData as any);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSavings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate potential savings based on past orders
      const { data: orders } = await supabase
        .from('orders')
        .select('delivery_fee, service_fee')
        .eq('customer_id', user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!orders) return;

      const totalDeliveryFees = orders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
      const totalServiceFees = orders.reduce((sum, o) => sum + (o.service_fee || 0), 0);
      const potentialSavings = totalDeliveryFees + (totalServiceFees * 0.5); // 50% off service fees

      setSavings(potentialSavings);
    } catch (error) {
      console.error('Error calculating savings:', error);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      setSubscribing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Calculate billing dates
      const startDate = new Date();
      const nextBillingDate = new Date();
      if (isAnnual) {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      } else {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }

      // Create subscription
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'active',
          billing_cycle: isAnnual ? 'annual' : 'monthly',
          start_date: startDate.toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          auto_renew: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Welcome to CravePass!',
        description: 'Your subscription is now active. Enjoy unlimited free delivery!',
      });

      fetchSubscriptionData();
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: 'Subscription Failed',
        description: 'Failed to activate subscription. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your CravePass subscription?')) return;

    try {
      if (!currentSubscription) return;

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          auto_renew: false
        })
        .eq('id', currentSubscription.id);

      if (error) throw error;

      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription will remain active until the end of the current billing period.',
      });

      fetchSubscriptionData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Cancellation Failed',
        description: 'Failed to cancel subscription. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const plan = plans[0]; // CravePass plan
  if (!plan) return null;

  const monthlyPrice = plan.price_monthly / 100;
  const annualPrice = plan.price_annual / 100;
  const annualMonthlyCost = annualPrice / 12;
  const annualSavings = (monthlyPrice * 12) - annualPrice;

  return (
    <div className="space-y-6">
      {/* Active Subscription Banner */}
      {currentSubscription && currentSubscription.status === 'active' && (
        <Card className="p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Crown className="w-12 h-12" />
              <div>
                <h3 className="text-2xl font-bold">CravePass Active</h3>
                <p className="text-orange-100">
                  Next billing: {new Date(currentSubscription.next_billing_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button variant="outline" className="bg-white text-orange-600 hover:bg-gray-100">
              Manage
            </Button>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="text-center">
        <div className="inline-block p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mb-4">
          <Crown className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold mb-2">CravePass</h1>
        <p className="text-xl text-gray-600">
          Unlimited free delivery & exclusive benefits
        </p>
      </div>

      {/* Potential Savings */}
      {savings > 0 && !currentSubscription && (
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="text-center">
            <TrendingDown className="w-12 h-12 mx-auto mb-3 text-green-600" />
            <h3 className="text-2xl font-bold text-green-700 mb-2">
              You could save ${(savings / 100).toFixed(2)}/month!
            </h3>
            <p className="text-green-600">
              Based on your last 30 days of orders
            </p>
          </div>
        </Card>
      )}

      {/* Billing Toggle */}
      {!currentSubscription && (
        <Card className="p-6">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div>
              <p className="font-semibold">Monthly</p>
              <p className="text-sm text-gray-600">${monthlyPrice}/month</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
              <Badge className="bg-green-600">Save ${annualSavings.toFixed(0)}</Badge>
            </div>
            <div>
              <p className="font-semibold">Annual</p>
              <p className="text-sm text-gray-600">${annualMonthlyCost.toFixed(2)}/month</p>
            </div>
          </div>
        </Card>
      )}

      {/* Benefits */}
      <Card className="p-8">
        <h3 className="text-2xl font-bold mb-6 text-center">What's Included</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex items-start gap-4">
            <div className="bg-orange-100 p-3 rounded-full">
              <Truck className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h4 className="font-bold text-lg mb-1">Unlimited Free Delivery</h4>
              <p className="text-gray-600">
                $0 delivery fee on all orders over ${(plan.benefits.min_order_amount / 100).toFixed(0)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-orange-100 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h4 className="font-bold text-lg mb-1">Reduced Service Fees</h4>
              <p className="text-gray-600">
                {plan.benefits.reduced_service_fee}% off service fees on every order
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-orange-100 p-3 rounded-full">
              <Star className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h4 className="font-bold text-lg mb-1">Priority Support</h4>
              <p className="text-gray-600">
                Get help faster with dedicated member support
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-orange-100 p-3 rounded-full">
              <Gift className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h4 className="font-bold text-lg mb-1">Exclusive Deals</h4>
              <p className="text-gray-600">
                Members-only promotions and special offers
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* CTA */}
      {!currentSubscription ? (
        <Card className="p-8 bg-gradient-to-br from-orange-50 to-red-50">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-3xl font-bold mb-4">
              {isAnnual ? (
                <>
                  ${annualPrice} <span className="text-lg text-gray-600">per year</span>
                </>
              ) : (
                <>
                  ${monthlyPrice} <span className="text-lg text-gray-600">per month</span>
                </>
              )}
            </h3>
            <p className="text-gray-600 mb-6">
              {isAnnual ? 'Billed annually' : 'Billed monthly'} • Cancel anytime
            </p>
            <Button
              onClick={() => handleSubscribe(plan.id)}
              disabled={subscribing}
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-12 py-6 text-xl"
            >
              {subscribing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Activating...
                </>
              ) : (
                <>
                  <Crown className="w-6 h-6 mr-2" />
                  Start Free Trial
                </>
              )}
            </Button>
            <p className="text-sm text-gray-600 mt-4">
              7-day free trial • No commitment • Cancel anytime
            </p>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold">Manage Subscription</h4>
              <p className="text-sm text-gray-600">
                {currentSubscription.billing_cycle === 'annual' ? 'Annual' : 'Monthly'} billing
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleCancelSubscription}
              className="text-red-600"
            >
              Cancel Subscription
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

