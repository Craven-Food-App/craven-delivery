import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureHighlight {
  id: string;
  portal_id: string;
  feature_key: string;
  title: string;
  description: string;
  target_selector: string | null;
  highlight_type: string;
  priority: number;
}

export function useFeatureHighlights(portalId: string) {
  const [unseen, setUnseen] = useState<FeatureHighlight[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get all active highlights for this portal (or global *)
      const { data: highlights } = await supabase
        .from('portal_feature_highlights')
        .select('*')
        .in('portal_id', [portalId, '*'])
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (!highlights || highlights.length === 0) {
        setUnseen([]);
        setLoading(false);
        return;
      }

      // Get which ones this user has already seen
      const { data: seen } = await supabase
        .from('portal_feature_seen')
        .select('feature_id')
        .eq('user_id', user.id);

      const seenIds = new Set((seen || []).map(s => s.feature_id));
      const unseenHighlights = highlights.filter(h => !seenIds.has(h.id));
      setUnseen(unseenHighlights as FeatureHighlight[]);
    } catch (err) {
      console.error('Feature highlights error:', err);
    } finally {
      setLoading(false);
    }
  }, [portalId]);

  useEffect(() => { load(); }, [load]);

  const markSeen = useCallback(async (featureId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('portal_feature_seen').insert({
        user_id: user.id,
        feature_id: featureId,
      });

      setUnseen(prev => prev.filter(f => f.id !== featureId));
    } catch (err) {
      console.error('Mark seen error:', err);
    }
  }, []);

  const isFeatureNew = useCallback((featureKey: string) => {
    return unseen.some(f => f.feature_key === featureKey);
  }, [unseen]);

  const getFeature = useCallback((featureKey: string) => {
    return unseen.find(f => f.feature_key === featureKey) || null;
  }, [unseen]);

  return { unseen, loading, markSeen, isFeatureNew, getFeature };
}
