import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAnalytics } from '@/hooks/useAnalytics';

export type NewCustomer365PromoDisplayState =
  | 'eligible'
  | 'in_progress'
  | 'completed'
  | 'reward_pending'
  | 'reward_active'
  | 'expired'
  | 'disqualified'
  | 'ineligible';

export interface NewCustomer365PromoState {
  ok: boolean;
  eligible: boolean;
  display_state: NewCustomer365PromoDisplayState;
  promotion_key?: string;
  promotion_id?: string;
  title?: string;
  required_count?: number;
  qualifying_count?: number;
  remaining_count?: number;
  qualification_deadline?: string;
  reward_status?: string;
  reward_starts_at?: string | null;
  reward_ends_at?: string | null;
  terms_version?: string;
  participation_id?: string;
  reason?: string;
  error?: string;
}

/**
 * Backend-driven eligibility + progress for the new-customer 365 CraveMore
 * referral promotion. Counts come from existing `referrals` via RPC.
 */
export function useNewCustomer365ReferralPromo() {
  const [promo, setPromo] = useState<NewCustomer365PromoState | null>(null);
  const [loading, setLoading] = useState(true);
  const { trackEvent } = useAnalytics();
  const trackedView = useRef(false);
  const lastProgress = useRef<number | null>(null);
  const trackedReward = useRef(false);
  const trackedCompleted = useRef(false);
  const trackedDisqualified = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPromo(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('evaluate_new_customer_365_promo', {
        p_customer_id: user.id,
      });

      if (error) {
        console.warn('evaluate_new_customer_365_promo:', error.message);
        setPromo({
          ok: false,
          eligible: false,
          display_state: 'ineligible',
          error: error.message,
        });
        return;
      }

      const state = (data || {}) as NewCustomer365PromoState;
      setPromo(state);

      try {
        if (!trackedView.current) {
          trackedView.current = true;
          trackEvent('new_customer_365_promo_viewed', {
            display_state: state.display_state,
            promotion_key: state.promotion_key,
            eligible: state.eligible,
          });
          if (state.eligible) {
            trackEvent('new_customer_365_promo_eligible', {
              promotion_key: state.promotion_key,
            });
          }
        }

        if (
          state.eligible &&
          typeof state.qualifying_count === 'number' &&
          lastProgress.current !== state.qualifying_count
        ) {
          lastProgress.current = state.qualifying_count;
          trackEvent('new_customer_365_promo_progress', {
            qualifying_count: state.qualifying_count,
            required_count: state.required_count,
            remaining_count: state.remaining_count,
          });
        }

        if (
          (state.display_state === 'reward_active' || state.display_state === 'reward_pending') &&
          !trackedReward.current
        ) {
          trackedReward.current = true;
          trackEvent('new_customer_365_promo_reward_issued', {
            reward_status: state.reward_status,
            reward_ends_at: state.reward_ends_at,
          });
        }

        if (state.display_state === 'completed' && !trackedCompleted.current) {
          trackedCompleted.current = true;
          trackEvent('new_customer_365_promo_completed', {
            qualifying_count: state.qualifying_count,
          });
        }

        if (state.display_state === 'disqualified' && !trackedDisqualified.current) {
          trackedDisqualified.current = true;
          trackEvent('new_customer_365_promo_disqualified', {
            reason: state.reason,
          });
        }
      } catch {
        // Analytics must never block promo UI
      }
    } catch (err) {
      console.error('365 promo evaluate failed:', err);
      setPromo({
        ok: false,
        eligible: false,
        display_state: 'ineligible',
        error: err instanceof Error ? err.message : 'unknown',
      });
    } finally {
      setLoading(false);
    }
  }, [trackEvent]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { promo, loading, refresh };
}
