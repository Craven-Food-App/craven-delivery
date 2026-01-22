// Hook: useTesterActivityTracking
// Automatically logs activity day on app launch (session init)

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTesterActivityTracking = () => {
  useEffect(() => {
    const logActivity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Log activity day (idempotent - won't duplicate)
        await supabase.rpc('log_tester_activity_day', {
          p_user_id: user.id
        });
      } catch (error) {
        // Silently handle - user might not be enrolled
        console.warn('Activity tracking error:', error);
      }
    };

    logActivity();
  }, []);
};

