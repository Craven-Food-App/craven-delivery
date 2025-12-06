import { supabase } from '@/integrations/supabase/client';
import { ExperienceAnalytics } from '@/types/cxo';

export const analyticsRepository = {
  async getBySegment(
    segment: 'driver' | 'customer' | 'merchant' | 'global',
    startDate?: string,
    endDate?: string
  ): Promise<ExperienceAnalytics[]> {
    let query = supabase
      .from('experience_analytics')
      .select('*')
      .eq('segment', segment)
      .order('date', { ascending: true });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      // Table doesn't exist yet - migration needs to be run
      if (error.code === 'PGRST205') {
        console.warn('CXO Portal tables not found. Please run migration: 20250131000008_create_cxo_portal_schema.sql');
        return [];
      }
      console.error('Error fetching analytics:', error);
      return [];
    }

    return (data || []).map(this.mapAnalytics);
  },

  async getLatest(segment: 'driver' | 'customer' | 'merchant' | 'global'): Promise<ExperienceAnalytics | null> {
    const { data, error } = await supabase
      .from('experience_analytics')
      .select('*')
      .eq('segment', segment)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching latest analytics:', error);
      return null;
    }

    return data ? this.mapAnalytics(data) : null;
  },

  mapAnalytics(data: any): ExperienceAnalytics {
    return {
      id: data.id,
      date: data.date,
      csatScore: data.csat_score,
      npsScore: data.nps_score,
      totalSurveys: data.total_surveys,
      avgDeliveryMinutes: data.avg_delivery_minutes,
      lateDeliveryRate: data.late_delivery_rate,
      repeatComplaintRate: data.repeat_complaint_rate,
      segment: data.segment,
      createdAt: data.created_at,
    };
  },
};

