import { supabase } from '@/integrations/supabase/client';
import { CxoReport } from '@/types/cxo';

export const reportsRepository = {
  async getAll(filters?: { type?: 'daily' | 'weekly'; startDate?: string; endDate?: string }): Promise<CxoReport[]> {
    let query = supabase.from('cxo_reports').select('*');

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.startDate) {
      query = query.gte('report_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('report_date', filters.endDate);
    }

    const { data, error } = await query.order('report_date', { ascending: false });

    if (error) {
      // Table doesn't exist yet - migration needs to be run
      if (error.code === 'PGRST205') {
        console.warn('CXO Portal tables not found. Please run migration: 20250131000008_create_cxo_portal_schema.sql');
        return [];
      }
      console.error('Error fetching reports:', error);
      return [];
    }

    return (data || []).map(this.mapReport);
  },

  async getById(id: string): Promise<CxoReport | null> {
    const { data, error } = await supabase
      .from('cxo_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching report:', error);
      return null;
    }

    return data ? this.mapReport(data) : null;
  },

  async create(report: Omit<CxoReport, 'id' | 'createdAt'>): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('cxo_reports')
      .insert({
        report_date: report.reportDate,
        type: report.type,
        biggest_issue: report.biggestIssue,
        fix_deployed: report.fixDeployed,
        metrics_moved: report.metricsMoved,
        ticket_backlog_status: report.ticketBacklogStatus,
        recommendation_for_tomorrow: report.recommendationForTomorrow,
        author_id: user.id,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating report:', error);
      return null;
    }

    return data?.id || null;
  },

  mapReport(data: any): CxoReport {
    return {
      id: data.id,
      reportDate: data.report_date,
      type: data.type,
      biggestIssue: data.biggest_issue,
      fixDeployed: data.fix_deployed,
      metricsMoved: data.metrics_moved,
      ticketBacklogStatus: data.ticket_backlog_status,
      recommendationForTomorrow: data.recommendation_for_tomorrow,
      authorId: data.author_id,
      createdAt: data.created_at,
    };
  },
};

