import { supabase } from '@/integrations/supabase/client';
import { ExperienceInitiative, ImpactMetrics } from '@/types/cxo';

export const initiativesRepository = {
  async getAll(filters?: { status?: string; ownerId?: string }): Promise<ExperienceInitiative[]> {
    let query = supabase.from('experience_initiatives').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.ownerId) {
      query = query.eq('owner_id', filters.ownerId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      // Table doesn't exist yet - migration needs to be run
      if (error.code === 'PGRST205') {
        console.warn('CXO Portal tables not found. Please run migration: 20250131000008_create_cxo_portal_schema.sql');
        return [];
      }
      console.error('Error fetching initiatives:', error);
      return [];
    }

    return (data || []).map(this.mapInitiative);
  },

  async getById(id: string): Promise<ExperienceInitiative | null> {
    const { data, error } = await supabase
      .from('experience_initiatives')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching initiative:', error);
      return null;
    }

    return data ? this.mapInitiative(data) : null;
  },

  async create(initiative: Omit<ExperienceInitiative, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    const { data, error } = await supabase
      .from('experience_initiatives')
      .insert({
        title: initiative.title,
        problem_statement: initiative.problemStatement,
        root_cause: initiative.rootCause,
        plan: initiative.plan,
        owner_id: initiative.ownerId,
        status: initiative.status,
        impact_metrics: initiative.impactMetrics,
        start_date: initiative.startDate,
        target_date: initiative.targetDate,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating initiative:', error);
      return null;
    }

    return data?.id || null;
  },

  async update(id: string, updates: Partial<ExperienceInitiative>): Promise<boolean> {
    const updateData: any = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.ownerId !== undefined) updateData.owner_id = updates.ownerId;
    if (updates.impactMetrics !== undefined) updateData.impact_metrics = updates.impactMetrics;
    if (updates.targetDate !== undefined) updateData.target_date = updates.targetDate;
    if (updates.completedDate !== undefined) updateData.completed_date = updates.completedDate;

    const { error } = await supabase
      .from('experience_initiatives')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating initiative:', error);
      return false;
    }

    return true;
  },

  mapInitiative(data: any): ExperienceInitiative {
    return {
      id: data.id,
      title: data.title,
      problemStatement: data.problem_statement,
      rootCause: data.root_cause,
      plan: data.plan,
      ownerId: data.owner_id,
      status: data.status,
      impactMetrics: (data.impact_metrics || {}) as ImpactMetrics,
      startDate: data.start_date,
      targetDate: data.target_date,
      completedDate: data.completed_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },
};

