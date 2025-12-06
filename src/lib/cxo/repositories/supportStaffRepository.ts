import { supabase } from '@/integrations/supabase/client';
import { SupportStaff, SupportStaffMetrics } from '@/types/cxo';

export const supportStaffRepository = {
  async getAll(): Promise<SupportStaff[]> {
    const { data, error } = await supabase
      .from('support_staff')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      // Table doesn't exist yet - migration needs to be run
      if (error.code === 'PGRST205') {
        console.warn('CXO Portal tables not found. Please run migration: 20250131000008_create_cxo_portal_schema.sql');
        return [];
      }
      console.error('Error fetching support staff:', error);
      return [];
    }

    return (data || []).map(this.mapStaff);
  },

  async getMetricsByDate(date: string): Promise<SupportStaffMetrics[]> {
    const { data, error } = await supabase
      .from('support_staff_metrics')
      .select('*')
      .eq('date', date)
      .order('tickets_resolved', { ascending: false });

    if (error) {
      console.error('Error fetching support staff metrics:', error);
      return [];
    }

    return (data || []).map(this.mapMetrics);
  },

  async getMetricsByStaffId(staffId: string, startDate?: string, endDate?: string): Promise<SupportStaffMetrics[]> {
    let query = supabase
      .from('support_staff_metrics')
      .select('*')
      .eq('staff_id', staffId)
      .order('date', { ascending: true });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching staff metrics:', error);
      return [];
    }

    return (data || []).map(this.mapMetrics);
  },

  mapStaff(data: any): SupportStaff {
    return {
      id: data.id,
      userId: data.user_id,
      role: data.role,
      name: data.name,
      active: data.active,
      createdAt: data.created_at,
    };
  },

  mapMetrics(data: any): SupportStaffMetrics {
    return {
      id: data.id,
      staffId: data.staff_id,
      date: data.date,
      ticketsResolved: data.tickets_resolved,
      avgHandleMinutes: data.avg_handle_minutes,
      escalationsCount: data.escalations_count,
      csatScore: data.csat_score,
      notes: data.notes,
      createdAt: data.created_at,
    };
  },
};

