import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Shield, Clock } from 'lucide-react';
import { useCraveMoreOffer, CraveMorePlan } from '@/hooks/useCraveMoreOffer';
import { CraveMorePlanCard } from './CraveMorePlanCard';
import { CraveMoreText } from '@/components/ui/cravemore-text';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@/utils/cravemoreAnalytics';

interface CraveMorePaywallProps {
  source?: 'checkout' | 'account' | 'home';
  cartSubtotalCents?: number;
  merchantId?: string;
  zoneId?: string;
  onClose?: () => void;
}

export const CraveMorePaywall: React.FC<CraveMorePaywallProps> = ({
  source = 'home',
  cartSubtotalCents,
  merchantId,
  zoneId,
  onClose,
}) => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { offer, loading: offerLoading } = useCraveMoreOffer({
    cartSubtotalCents,
    merchantId,
    zoneId,
  });

  const handlePlanSelect = async (planKey: string) => {
    setSelectedPlan(planKey);
    setLoading(true);

    try {
      // Track analytics
      analytics.planSelected(planKey);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        navigate('/login?redirect=/cravemore');
        setLoading(false);
        setSelectedPlan(null);
        return;
      }

      // Track checkout started
      analytics.checkoutStarted(planKey);

      // Create checkout session
      const { data, error } = await supabase.functions.invoke('create-cravemore-checkout', {
        body: { planKey },
      });

      if (error) {
        console.error('Checkout error:', error);
        console.error('Error details:', {
          message: error.message,
          context: error.context,
          status: error.status,
          data: error.data,
        });
        
        // Try to extract error message from various sources
        let errorMsg = error.message || '';
        let serverError = '';
        
        // Try to read the response body if available
        if (error.context && error.context instanceof Response) {
          try {
            const errorText = await error.context.clone().text();
            console.error('Error response body:', errorText);
            try {
              const parsed = JSON.parse(errorText);
              serverError = parsed.error || parsed.message || parsed.details || errorText;
            } catch {
              serverError = errorText;
            }
          } catch (e) {
            console.error('Failed to read error response:', e);
          }
        }
        
        // Check error.data (Supabase client usually puts parsed response here)
        if (error.data) {
          if (typeof error.data === 'object') {
            serverError = error.data.error || error.data.message || serverError || '';
          } else if (typeof error.data === 'string') {
            try {
              const parsed = JSON.parse(error.data);
              serverError = parsed.error || parsed.message || parsed.details || error.data;
            } catch {
              serverError = error.data || serverError;
            }
          }
        }
        
        // Use server error if available, otherwise use client error
        const displayError = serverError || errorMsg;
        
        // Log the full error for debugging
        console.error('Display error:', displayError);
        
        // Provide more specific error messages
        if (displayError.includes('Failed to send') || displayError.includes('CORS') || displayError.includes('ERR_FAILED')) {
          toast.error('Checkout service is not available. The Edge Functions need to be deployed. See DEPLOYMENT_INSTRUCTIONS.md', {
            duration: 8000,
          });
        } else if (displayError.includes('Unauthorized') || displayError.includes('401')) {
          toast.error('Please sign in to continue');
          navigate('/login?redirect=/cravemore');
        } else if (displayError.includes('sold out')) {
          toast.error('This plan is currently sold out. Please select another plan.');
        } else if (displayError.includes('Database migration required') || displayError.includes('cravemore_payment_sessions') || displayError.includes('does not exist') || displayError.includes('relation')) {
          toast.error('Database migration required. Please apply migration: 20251224102610_create_cravemore_payment_sessions.sql', {
            duration: 10000,
          });
        } else if (displayError.includes('cannot currently make live charges') || displayError.includes('Stripe account is not activated')) {
          toast.error('Payment processing is not available. Please use Stripe test mode keys for development or activate your Stripe account for live mode.', {
            duration: 10000,
          });
        } else if (displayError.includes('Invalid Stripe API key')) {
          toast.error('Payment configuration error. Please check your Stripe API key settings in the Supabase dashboard.', {
            duration: 8000,
          });
        } else if (displayError) {
          toast.error(displayError, {
            duration: 5000,
          });
        } else {
          toast.error('Failed to start checkout. Please check the Supabase function logs for details or try again.', {
            duration: 6000,
          });
        }
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      // Don't show duplicate error if we already showed a specific one
      if (!error?.message?.includes('Failed to send') && !error?.message?.includes('CORS')) {
        if (!toast) {
          toast.error('Failed to start checkout. Please try again.');
        }
      }
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  // Track paywall view
  React.useEffect(() => {
    if (offer && !offerLoading) {
      analytics.paywallViewed(source);
    }
  }, [offer, offerLoading, source]);

  if (offerLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4">Loading plans...</p>
        </CardContent>
      </Card>
    );
  }

  if (!offer) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Failed to load plans. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  // If user already has active membership, show different message
  if (offer.currentMembership?.status === 'active') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-xl font-bold mb-2">You're already a <CraveMoreText /> member!</h3>
          <p className="text-muted-foreground mb-4">
            Plan: {offer.currentMembership.planKey}
            {offer.currentMembership.foundingMember && ' • Founding Member'}
          </p>
          <Button onClick={() => navigate('/account/cravemore')}>
            Manage Membership
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full text-sm mb-2">
          <Sparkles className="w-4 h-4" />
          <span className="font-semibold">Introducing <CraveMoreText /></span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Unlimited Perks, Zero Delivery Fees
        </h2>
        <p className="text-sm text-muted-foreground">
          Join <CraveMoreText /> and unlock unlimited benefits
        </p>
      </div>

      {/* Benefits row */}
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-8">
        <div className="flex items-center gap-2 text-sm">
          <Zap className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <span className="font-medium">Zero delivery fees</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Shield className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <span className="font-medium">Priority support</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <span className="font-medium">Early access</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <span className="font-medium">Member discounts</span>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {offer.plans.map((plan) => (
          <CraveMorePlanCard
            key={plan.id}
            plan={plan}
            isSelected={selectedPlan === plan.planKey}
            onSelect={handlePlanSelect}
            loading={loading}
          />
        ))}
      </div>

      {/* Active promo notice */}
      {offer.activePromo && (
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            🎉 Launch promo active! Limited time pricing.
          </p>
        </div>
      )}
    </div>
  );
};

