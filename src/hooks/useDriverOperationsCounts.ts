import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subscribeToDriverOperationsChanges } from '@/lib/driverOperationsEvents';
import { deriveDriverLifecycle, type DriverLifecycleStage } from '@/lib/driverLifecycle';

export interface DriverOperationsCounts {
  applied: number;
  screening: number;
  awaitingBackground: number;
  onboarding: number;
  readyToActivate: number;
  active: number;
  rejected: number;
  waitlistTotal: number;
  openSupportChats: number;
  unclaimedSupportChats: number;
}

const EMPTY_COUNTS: DriverOperationsCounts = {
  applied: 0,
  screening: 0,
  awaitingBackground: 0,
  onboarding: 0,
  readyToActivate: 0,
  active: 0,
  rejected: 0,
  waitlistTotal: 0,
  openSupportChats: 0,
  unclaimedSupportChats: 0,
};

const STAGE_TO_KEY: Record<DriverLifecycleStage, keyof DriverOperationsCounts> = {
  applied: 'applied',
  screening: 'screening',
  awaiting_background: 'awaitingBackground',
  onboarding: 'onboarding',
  ready_to_activate: 'readyToActivate',
  active: 'active',
  rejected: 'rejected',
};

/**
 * Pipeline counts for the Driver Operations portal.
 *
 * Stage tallies are computed from `deriveDriverLifecycle` rather than from
 * separate SQL predicates, so the sidebar badges, the KPI strip, and the
 * per-row stage badges always describe the same driver the same way.
 */
export function useDriverOperationsCounts() {
  const [counts, setCounts] = useState<DriverOperationsCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const [applicationsResult, chatsResult] = await Promise.all([
        supabase
          .from('craver_applications')
          .select(
            'id, status, background_check, background_check_approved_at, background_check_initiated_at, onboarding_started_at, onboarding_completed_at'
          ),
        supabase
          .from('driver_support_chats')
          .select('id, status, agent_id')
          .neq('status', 'resolved'),
      ]);

      if (applicationsResult.error) throw applicationsResult.error;
      if (chatsResult.error) throw chatsResult.error;

      const next: DriverOperationsCounts = { ...EMPTY_COUNTS };

      for (const application of applicationsResult.data ?? []) {
        const { stage } = deriveDriverLifecycle(application);
        next[STAGE_TO_KEY[stage]] += 1;
        if ((application.status || '').toLowerCase() === 'waitlist') {
          next.waitlistTotal += 1;
        }
      }

      const chats = chatsResult.data ?? [];
      next.openSupportChats = chats.length;
      next.unclaimedSupportChats = chats.filter(chat => !chat.agent_id).length;

      if (!mounted.current) return;
      setCounts(next);
      setError(null);
    } catch (err: any) {
      if (!mounted.current) return;
      setError(err?.message || 'Failed to load pipeline counts');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      void load();
    }, 400);
  }, [load]);

  useEffect(() => {
    mounted.current = true;
    void load();

    const unsubscribe = subscribeToDriverOperationsChanges(scheduleReload);

    const channel = supabase
      .channel('driver-operations-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'craver_applications' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_support_chats' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'onboarding_tasks' }, scheduleReload)
      .subscribe();

    return () => {
      mounted.current = false;
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [load, scheduleReload]);

  return { counts, loading, error, refresh: load };
}
