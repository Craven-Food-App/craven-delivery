// Hook: useTesterActivation
// Activates enrollment when user creates account (links user_id, generates referral code)

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTesterActivation = () => {
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    const activateEnrollment = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return;

        // Check if already activated
        const { data: enrollment } = await supabase
          .from('android_tester_enrollments')
          .select('user_id, status')
          .eq('email', user.email)
          .maybeSingle();

        if (enrollment?.user_id || enrollment?.status === 'activated') {
          setActivated(true);
          return;
        }

        // Call activation Edge Function
        const { data, error } = await supabase.functions.invoke('tester-activate', {
          body: {
            user_id: user.id,
            email: user.email
          }
        });

        if (!error && data?.success) {
          setActivated(true);
        }
      } catch (error) {
        // Silently handle - user might not be enrolled
        console.warn('Tester activation error:', error);
      }
    };

    // Small delay to ensure user record is fully created
    const timer = setTimeout(() => {
      activateEnrollment();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return activated;
};

