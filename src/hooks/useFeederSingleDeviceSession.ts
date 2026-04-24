import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STORAGE_KEY = 'craven_feeder_device_session_id';

function getOrCreateDeviceSessionId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length > 8) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Enforces one logged-in feeder session per user: logging in on a new device updates
 * driver_profiles.active_device_session_id; this hook signs out if the value no longer matches this device.
 */
export function useFeederSingleDeviceSession() {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from('driver_profiles')
        .select('id, user_id, active_device_session_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profile) {
        return;
      }

      myUserIdRef.current = user.id;
      const deviceId = getOrCreateDeviceSessionId();

      const { data: updated } = await supabase
        .from('driver_profiles')
        .update({ active_device_session_id: deviceId })
        .eq('id', profile.id)
        .select('active_device_session_id')
        .single();

      if (updated?.active_device_session_id && updated.active_device_session_id !== deviceId) {
        await supabase.auth.signOut();
        toast.error('You were signed in on another device. This session was ended.');
        return;
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const ch = supabase
        .channel(`feeder_device_lease_${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'driver_profiles',
            filter: `id=eq.${profile.id}`,
          },
          (payload) => {
            const next = (payload.new as { active_device_session_id?: string | null })?.active_device_session_id;
            const current = getOrCreateDeviceSessionId();
            if (next != null && next !== current) {
              void supabase.auth.signOut();
              toast.error('Signed in elsewhere. You were signed out on this device.');
            }
          }
        )
        .subscribe();

      channelRef.current = ch;
    };

    void run();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        void run();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);
}
