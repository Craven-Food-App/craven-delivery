import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ReferralStepKey =
  | 'signed_up'
  | 'ordered'
  | 'qualified'
  | 'credit_issued';

export interface ReferralStep {
  key: ReferralStepKey;
  label: string;
  detail: string;
  done: boolean;
  active: boolean;
  creditCents?: number;
}

export interface TrackedReferral {
  id: string;
  referralCode: string;
  status: string;
  requirementsMet: boolean;
  createdAt: string;
  completedAt: string | null;
  referrerBonusCents: number;
  referredLabel: string;
  hasAnyOrder: boolean;
  hasDeliveredOrder: boolean;
  creditStatus: 'none' | 'pending' | 'approved' | 'paid';
  creditCents: number;
  countsToward365: boolean;
  steps: ReferralStep[];
}

function buildSteps(args: {
  hasAnyOrder: boolean;
  hasDeliveredOrder: boolean;
  requirementsMet: boolean;
  status: string;
  creditStatus: TrackedReferral['creditStatus'];
  creditCents: number;
}): ReferralStep[] {
  const qualified =
    args.requirementsMet ||
    args.status === 'completed' ||
    args.status === 'paid';
  const creditIssued =
    args.creditStatus === 'approved' ||
    args.creditStatus === 'paid' ||
    args.status === 'paid';

  const steps: ReferralStep[] = [
    {
      key: 'signed_up',
      label: 'Signed up with your code',
      detail: 'Friend created a Crave’n account using your invite',
      done: true,
      active: false,
    },
    {
      key: 'ordered',
      label: 'Placed an order with a merchant',
      detail: 'Friend started a restaurant / merchant order',
      done: args.hasAnyOrder || qualified,
      active: false,
    },
    {
      key: 'qualified',
      label: 'Qualifying order completed',
      detail: 'First qualifying order delivered (meets min. amount)',
      done: qualified,
      active: false,
    },
    {
      key: 'credit_issued',
      label: creditIssued
        ? `Your credit issued · $${(args.creditCents / 100).toFixed(2)}`
        : `Your credit · $${(args.creditCents / 100).toFixed(2)}`,
      detail: creditIssued
        ? 'Referral reward is available on eligible orders'
        : 'Credit posts after the qualifying order completes',
      done: creditIssued,
      active: false,
      creditCents: args.creditCents,
    },
  ];

  if (!creditIssued) {
    const firstOpen = steps.find((s) => !s.done);
    steps.forEach((s) => {
      s.active = firstOpen ? s.key === firstOpen.key : false;
    });
  } else {
    steps.forEach((s) => {
      s.active = s.key === 'credit_issued';
    });
  }

  return steps;
}

export function useReferralTracker() {
  const [referrals, setReferrals] = useState<TrackedReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReferrals([]);
        return;
      }

      const { data, error: rpcErr } = await supabase.rpc(
        'get_my_customer_referral_tracker',
        { p_user_id: user.id }
      );

      if (rpcErr) {
        // Fallback: basic referrals list without order steps if RPC not migrated yet
        console.warn('get_my_customer_referral_tracker:', rpcErr.message);
        const { data: rows, error: refErr } = await supabase
          .from('referrals')
          .select(
            'id, referral_code, status, requirements_met, created_at, completed_at, referrer_bonus_amount, referred_id'
          )
          .eq('referrer_id', user.id)
          .eq('referral_type', 'customer')
          .order('created_at', { ascending: false });

        if (refErr) throw refErr;

        const { data: bonuses } = await supabase
          .from('referral_bonuses')
          .select('referral_id, amount, status')
          .eq('user_id', user.id)
          .eq('bonus_type', 'referrer');

        const bonusMap = new Map((bonuses || []).map((b: any) => [b.referral_id, b]));

        setReferrals(
          (rows || []).map((r: any) => {
            const bonus = bonusMap.get(r.id);
            const creditCents = Number(bonus?.amount ?? r.referrer_bonus_amount ?? 1000);
            const creditStatus = (bonus?.status || 'none') as TrackedReferral['creditStatus'];
            const qualified =
              !!r.requirements_met || r.status === 'completed' || r.status === 'paid';
            return {
              id: r.id,
              referralCode: r.referral_code,
              status: r.status,
              requirementsMet: !!r.requirements_met,
              createdAt: r.created_at,
              completedAt: r.completed_at,
              referrerBonusCents: creditCents,
              referredLabel: `Friend · ${String(r.referred_id).slice(0, 8)}`,
              hasAnyOrder: qualified,
              hasDeliveredOrder: qualified,
              creditStatus,
              creditCents,
              countsToward365: qualified,
              steps: buildSteps({
                hasAnyOrder: qualified,
                hasDeliveredOrder: qualified,
                requirementsMet: !!r.requirements_met,
                status: r.status,
                creditStatus,
                creditCents,
              }),
            };
          })
        );
        return;
      }

      const payload = data as { ok?: boolean; referrals?: any[]; error?: string };
      if (payload?.ok === false) {
        setError(payload.error || 'Unable to load referrals');
        setReferrals([]);
        return;
      }

      const list = payload?.referrals || [];
      setReferrals(
        list.map((r: any) => {
          const creditCents = Number(r.credit_cents ?? r.referrer_bonus_amount ?? 1000);
          const creditStatus = (r.credit_status || 'none') as TrackedReferral['creditStatus'];
          return {
            id: r.id,
            referralCode: r.referral_code,
            status: r.status,
            requirementsMet: !!r.requirements_met,
            createdAt: r.created_at,
            completedAt: r.completed_at,
            referrerBonusCents: creditCents,
            referredLabel: r.referred_label || `Friend · ${String(r.referred_id).slice(0, 8)}`,
            hasAnyOrder: !!r.has_any_order,
            hasDeliveredOrder: !!r.has_delivered_order,
            creditStatus,
            creditCents,
            countsToward365: !!r.counts_toward_365,
            steps: buildSteps({
              hasAnyOrder: !!r.has_any_order,
              hasDeliveredOrder: !!r.has_delivered_order,
              requirementsMet: !!r.requirements_met,
              status: r.status,
              creditStatus,
              creditCents,
            }),
          };
        })
      );
    } catch (err: any) {
      console.error('useReferralTracker:', err);
      setError(err.message || 'Failed to load referrals');
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { referrals, loading, error, refresh };
}
