import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Shield, Clock, Truck, Tag, Percent, Gift, Star, Check, X } from 'lucide-react';
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
        navigate('/auth?redirect=/cravemore');
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
          navigate('/auth?redirect=/cravemore');
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

      {/* Hero benefits card */}
      <Card className="mb-8 border-orange-200 dark:border-orange-900/40 overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent p-6 md:p-8">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-1">
            Get $0 delivery fees plus exclusive benefits
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            One low membership. Unlimited savings on every order from your favorite local spots.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Truck,
                title: '$0 delivery fees',
                desc: 'On every eligible order, no minimums required.',
              },
              {
                icon: Percent,
                title: 'Reduced service fees',
                desc: 'Lower service fees on every order you place.',
              },
              {
                icon: Tag,
                title: 'Member-only deals',
                desc: 'Exclusive discounts at local restaurants and merchants.',
              },
              {
                icon: Gift,
                title: '5% back in Crave Credits',
                desc: 'Earn credits on eligible pickup orders to use later.',
              },
              {
                icon: Star,
                title: 'Priority support',
                desc: 'Skip the line with dedicated member-only support.',
              },
              {
                icon: Clock,
                title: 'Early access',
                desc: 'First in line for new restaurants, drops, and features.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 bg-background/60 rounded-lg p-3 border border-border/50">
                <div className="bg-orange-500/15 text-orange-600 dark:text-orange-400 rounded-md p-2 flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Choose a plan heading */}
      <div className="mb-3 px-1">
        <h3 className="text-lg md:text-xl font-bold text-foreground">Choose a plan</h3>
        <p className="text-xs text-muted-foreground">Cancel anytime. No hidden fees.</p>
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

      {/* Comparison table */}
      <div className="mt-12">
        <h3 className="text-lg md:text-xl font-bold text-foreground text-center mb-1">
          Members vs. non-members
        </h3>
        <p className="text-xs text-muted-foreground text-center mb-5">
          See exactly what you unlock with <CraveMoreText />.
        </p>
        <Card className="overflow-hidden">
          <div className="grid grid-cols-3 text-sm">
            <div className="p-4 bg-muted/40 font-semibold text-foreground">Benefit</div>
            <div className="p-4 bg-muted/40 font-semibold text-center text-muted-foreground">Non-member</div>
            <div className="p-4 bg-orange-500/10 font-semibold text-center text-orange-600 dark:text-orange-400">
              <CraveMoreText /> member
            </div>
            {[
              ['Delivery fees', 'Standard fees apply', '$0 on eligible orders'],
              ['Service fees', 'Standard rate', 'Reduced rate'],
              ['Member-only deals', false, true],
              ['5% back on pickup', false, true],
              ['Priority support', false, true],
              ['Early access to new merchants', false, true],
            ].map(([label, nonMember, member], i) => (
              <React.Fragment key={String(label)}>
                <div className={`p-4 text-foreground ${i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>{label}</div>
                <div className={`p-4 text-center text-muted-foreground ${i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                  {typeof nonMember === 'boolean' ? (
                    nonMember ? <Check className="w-4 h-4 inline text-orange-500" /> : <X className="w-4 h-4 inline text-muted-foreground/60" />
                  ) : (
                    nonMember
                  )}
                </div>
                <div className={`p-4 text-center font-medium text-foreground ${i % 2 === 0 ? 'bg-orange-500/5' : 'bg-orange-500/10'}`}>
                  {typeof member === 'boolean' ? (
                    member ? <Check className="w-4 h-4 inline text-orange-500" /> : <X className="w-4 h-4 inline text-muted-foreground/60" />
                  ) : (
                    member
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        </Card>
      </div>

      {/* FAQ */}
      <div className="mt-12 max-w-3xl mx-auto">
        <h3 className="text-lg md:text-xl font-bold text-foreground text-center mb-5">
          Frequently asked questions
        </h3>
        <div className="space-y-3">
          {[
            {
              q: 'What is CraveMore?',
              a: 'CraveMore is Crave\u2019N\u2019s membership program that gives you $0 delivery fees, reduced service fees, exclusive member-only deals, and 5% back in credits on eligible pickup orders.',
            },
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. You can cancel your monthly or annual membership at any time from your account settings. Lifetime memberships are a one-time purchase and never expire.',
            },
            {
              q: 'What does the Lifetime plan include?',
              a: 'Lifetime is a one-time payment that locks in every CraveMore benefit for life, plus exclusive Founding Member status. Limited quantity available.',
            },
            {
              q: 'Are there order minimums?',
              a: 'Some merchants may set a small minimum subtotal to qualify for $0 delivery fees. You will always see eligibility clearly at checkout.',
            },
            {
              q: 'When does my membership start?',
              a: 'Your benefits activate immediately after a successful payment, and you can use them on your very next order.',
            },
          ].map(({ q, a }) => (
            <Card key={q}>
              <CardContent className="p-4">
                <p className="font-semibold text-sm text-foreground mb-1">{q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Fine print */}
      <p className="text-xs text-muted-foreground text-center mt-8 max-w-3xl mx-auto leading-relaxed">
        By joining <CraveMoreText />, you agree to our Terms and authorize Crave\u2019N to charge your
        payment method on a recurring basis until you cancel. Cancel anytime in your account settings
        to avoid future charges. Lifetime memberships are non-recurring, one-time purchases.
      </p>
    </div>
  );
};

