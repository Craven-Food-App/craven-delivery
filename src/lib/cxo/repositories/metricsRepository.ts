import { supabase } from '@/integrations/supabase/client';
import { ExperienceMetricsSnapshot, ProblemZone } from '@/types/cxo';

export const metricsRepository = {
  async getLatestSnapshot(): Promise<ExperienceMetricsSnapshot | null> {
    const { data, error } = await supabase
      .from('experience_metrics_snapshots')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Table doesn't exist yet - migration needs to be run
      if (error.code === 'PGRST205') {
        console.warn('CXO Portal tables not found. Please run migration: 20250131000008_create_cxo_portal_schema.sql');
        return null;
      }
      console.error('Error fetching latest metrics snapshot:', error);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      capturedAt: data.captured_at,
      timeBucket: data.time_bucket,
      openOrders: data.open_orders,
      delayedOrders: data.delayed_orders,
      avgDeliveryMinutes: data.avg_delivery_minutes,
      maxDeliveryMinutes: data.max_delivery_minutes,
      driverOnlineCount: data.driver_online_count,
      driverOfflineCount: data.driver_offline_count,
      ticketsOpenCount: data.tickets_open_count,
      ticketsEscalatedCount: data.tickets_escalated_count,
      cancellationRate: data.cancellation_rate,
      atRiskRestaurantsCount: data.at_risk_restaurants_count,
      problemZones: (data.problem_zones || []) as ProblemZone[],
      createdAt: data.created_at,
    };
  },

  async getSnapshotsByDateRange(startDate: string, endDate: string, timeBucket: 'hour' | 'day' | 'week' = 'day') {
    const { data, error } = await supabase
      .from('experience_metrics_snapshots')
      .select('*')
      .eq('time_bucket', timeBucket)
      .gte('captured_at', startDate)
      .lte('captured_at', endDate)
      .order('captured_at', { ascending: true });

    if (error) {
      console.error('Error fetching metrics snapshots:', error);
      return [];
    }

    return (data || []).map((item) => ({
      ...item,
      capturedAt: item.captured_at,
      timeBucket: item.time_bucket,
      openOrders: item.open_orders,
      delayedOrders: item.delayed_orders,
      avgDeliveryMinutes: item.avg_delivery_minutes,
      maxDeliveryMinutes: item.max_delivery_minutes,
      driverOnlineCount: item.driver_online_count,
      driverOfflineCount: item.driver_offline_count,
      ticketsOpenCount: item.tickets_open_count,
      ticketsEscalatedCount: item.tickets_escalated_count,
      cancellationRate: item.cancellation_rate,
      atRiskRestaurantsCount: item.at_risk_restaurants_count,
      problemZones: (item.problem_zones || []) as ProblemZone[],
      createdAt: item.created_at,
    }));
  },
};

