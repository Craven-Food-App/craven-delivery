import { supabase } from '@/integrations/supabase/client';

export interface OnlineFeederRow {
  id: string;
  user_id: string;
  full_name: string;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  current_latitude: number | null;
  current_longitude: number | null;
  is_available: boolean;
  rating: number;
}

const STALE_MS = 12 * 60 * 1000;

/**
 * Feeders who are truly in an active feed: online profile, active driver_session,
 * online_since, recent heartbeat, not past end_time, and in a searching/accepting state
 * (not paused). Used by Live Driver Testing and similar UIs.
 */
export async function fetchActiveOnlineFeeders(): Promise<{
  feeders: OnlineFeederRow[];
  error: Error | null;
}> {
  try {
    const now = Date.now();

    const { data: onlineProfiles, error: profilesError } = await supabase
      .from('driver_profiles')
      .select('id, user_id, vehicle_type, vehicle_make, vehicle_model, rating, is_available, status')
      .eq('is_available', true)
      .eq('status', 'online');

    if (profilesError) {
      return { feeders: [], error: new Error(profilesError.message) };
    }
    if (!onlineProfiles?.length) {
      return { feeders: [], error: null };
    }

    const profileIds = onlineProfiles.map((p) => p.id);
    const { data: sessions, error: sessionsError } = await supabase
      .from('driver_sessions')
      .select('driver_id, is_online, last_activity, session_data')
      .in('driver_id', profileIds)
      .eq('is_online', true);

    if (sessionsError) {
      return { feeders: [], error: new Error(sessionsError.message) };
    }

    const sessionByProfileId = new Map((sessions || []).map((s) => [s.driver_id, s]));

    const activeProfiles = onlineProfiles.filter((p) => {
      const s = sessionByProfileId.get(p.id);
      if (!s) return false;
      const sd = (s.session_data || {}) as Record<string, unknown>;
      if (!sd.online_since) return false;
      const last = new Date(s.last_activity as string).getTime();
      if (Number.isNaN(last) || now - last > STALE_MS) return false;
      if (sd.end_time) {
        const end = new Date(String(sd.end_time)).getTime();
        if (Number.isNaN(end) || now >= end) return false;
      }
      const ds = sd.driver_state as string | undefined;
      // Include paused: still in an active session (e.g. Live Driver Testing can target them)
      return (
        ds === 'online_searching' ||
        ds === 'online_paused' ||
        ds === undefined ||
        ds === null
      );
    });

    if (activeProfiles.length === 0) {
      return { feeders: [], error: null };
    }

    const driverUserIds = [...new Set(activeProfiles.map((d) => d.user_id).filter(Boolean) as string[])];

    const [profilesResult, locationsResult] = await Promise.all([
      supabase.from('user_profiles').select('user_id, full_name').in('user_id', driverUserIds),
      supabase.from('craver_locations').select('user_id, lat, lng').in('user_id', driverUserIds),
    ]);

    const profiles = profilesResult.data;
    const locations = locationsResult.data;

    const seenUserIds = new Set<string>();
    const feeders: OnlineFeederRow[] = activeProfiles
      .filter((d) => {
        if (!d.user_id || seenUserIds.has(d.user_id)) return false;
        seenUserIds.add(d.user_id);
        return true;
      })
      .map((driver) => {
        const profile = profiles?.find((p) => p.user_id === driver.user_id);
        const location = locations?.find((l) => l.user_id === driver.user_id);
        return {
          id: driver.id,
          user_id: driver.user_id!,
          full_name: profile?.full_name || 'Unknown Feeder',
          current_latitude: location?.lat ?? null,
          current_longitude: location?.lng ?? null,
          is_available: true,
          rating: driver.rating || 5.0,
          vehicle_type: driver.vehicle_type || '',
          vehicle_make: driver.vehicle_make || '',
          vehicle_model: driver.vehicle_model || '',
        };
      });

    return { feeders, error: null };
  } catch (e: any) {
    return { feeders: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}
