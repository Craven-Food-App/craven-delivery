import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CraveMorePlan {
  id: string;
  planKey: 'monthly' | 'annual' | 'lifetime';
  displayName: string;
  billingPeriod: string;
  priceCents: number;
  isMostPopular: boolean;
  badgeText: string | null;
  annualSavings: number | null;
  monthlyEquivalent: number | null;
  breakevenMonths: number | null;
  lifetimeAvailable: boolean;
  lifetimeRemaining: number | null;
}

export interface CraveMoreOffer {
  plans: CraveMorePlan[];
  activePromo: {
    promoKey: string;
    endsAt: string;
  } | null;
  currentMembership: {
    planKey: string;
    status: string;
    renewsAt: string | null;
    foundingMember: boolean;
  } | null;
  eligibility: {
    isEligibleForZeroFee: boolean;
    eligibilityReason: string | null;
    minSubtotalCents: number;
    amountNeededCents: number | null;
  };
}

interface UseCraveMoreOfferParams {
  cartSubtotalCents?: number;
  merchantId?: string;
  zoneId?: string;
  location?: string;
}

export const useCraveMoreOffer = (params?: UseCraveMoreOfferParams) => {
  const [offer, setOffer] = useState<CraveMoreOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOffer();
  }, [params?.cartSubtotalCents, params?.merchantId, params?.zoneId]);

  const fetchOffer = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const response = await supabase.functions.invoke('get-cravemore-offer', {
        body: {
          userId: user?.id,
          location: params?.location,
          cartSubtotalCents: params?.cartSubtotalCents,
          merchantId: params?.merchantId,
          zoneId: params?.zoneId,
        },
      });

      if (response.error) {
        // If function doesn't exist yet, provide fallback
        if (response.error.message?.includes('Failed to send') || response.error.message?.includes('CORS')) {
          console.warn('Edge Function not deployed yet, using fallback data');
          // Return fallback data structure
          setOffer({
            plans: [
              {
                id: 'monthly-fallback',
                planKey: 'monthly',
                displayName: 'Monthly',
                billingPeriod: 'month',
                priceCents: 949,
                isMostPopular: false,
                badgeText: null,
                annualSavings: null,
                monthlyEquivalent: null,
                breakevenMonths: null,
                lifetimeAvailable: true,
                lifetimeRemaining: null,
              },
              {
                id: 'annual-fallback',
                planKey: 'annual',
                displayName: 'Annual',
                billingPeriod: 'year',
                priceCents: 8900,
                isMostPopular: true,
                badgeText: 'Most Popular',
                annualSavings: 2488,
                monthlyEquivalent: 742,
                breakevenMonths: null,
                lifetimeAvailable: true,
                lifetimeRemaining: null,
              },
              {
                id: 'lifetime-fallback',
                planKey: 'lifetime',
                displayName: 'Lifetime',
                billingPeriod: 'one_time',
                priceCents: 29900,
                isMostPopular: false,
                badgeText: 'Founding Member',
                annualSavings: null,
                monthlyEquivalent: null,
                breakevenMonths: 32,
                lifetimeAvailable: true,
                lifetimeRemaining: 1000,
              },
            ],
            activePromo: null,
            currentMembership: null,
            eligibility: {
              isEligibleForZeroFee: false,
              eligibilityReason: null,
              minSubtotalCents: 1200,
              amountNeededCents: null,
            },
          });
          setError('Edge Function not deployed. Please deploy the get-cravemore-offer function.');
          return;
        }
        throw response.error;
      }

      setOffer(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching CraveMore offer:', err);
      setError(err instanceof Error ? err.message : 'Failed to load offer');
    } finally {
      setLoading(false);
    }
  };

  return { offer, loading, error, refetch: fetchOffer };
};

