// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useFeatureFlag = (flagKey: string): boolean => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlag();

    // Set up real-time subscription for changes
    const subscription = supabase
      .channel(`feature_flag_${flagKey}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'admin_settings',
          filter: `setting_key=eq.${flagKey}`
        },
        (payload) => {
          if (payload.new?.setting_value) {
            setIsEnabled(payload.new.setting_value.enabled === true);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [flagKey]);

  const fetchFlag = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', flagKey)
        .single();

      if (!error && data?.setting_value) {
        setIsEnabled(data.setting_value.enabled === true);
      }
    } catch (error) {
      console.error(`Error fetching feature flag ${flagKey}:`, error);
    } finally {
      setLoading(false);
    }
  };

  return isEnabled;
};

