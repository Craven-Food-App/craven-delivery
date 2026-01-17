import { supabase } from '@/integrations/supabase/client';
import { ExperienceIncident } from '@/types/cxo';

export const incidentsRepository = {
  async getAll(filters?: {
    type?: string;
    severity?: string;
    status?: string;
    zone?: string;
  }): Promise<ExperienceIncident[]> {
    let query = supabase.from('experience_incidents').select('*');

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.zone) {
      query = query.eq('zone', filters.zone);
    }

    const { data, error } = await query.order('reported_at', { ascending: false });

    if (error) {
      // Table doesn't exist yet - migration needs to be run
      if (error.code === 'PGRST205') {
        console.warn('CXO Portal tables not found. Please run migration: 20250131000008_create_cxo_portal_schema.sql');
        return [];
      }
      console.error('Error fetching incidents:', error);
      return [];
    }

    return (data || []).map(this.mapIncident);
  },

  async getById(id: string): Promise<ExperienceIncident | null> {
    const { data, error } = await supabase
      .from('experience_incidents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching incident:', error);
      return null;
    }

    return data ? this.mapIncident(data) : null;
  },

  async create(incident: Omit<ExperienceIncident, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('experience_incidents')
      .insert({
        title: incident.title,
        description: incident.description,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        zone: incident.zone,
        reported_at: incident.reportedAt,
        owner_id: user.id,
        linked_ticket_id: incident.linkedTicketId,
        notes: incident.notes,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating incident:', error);
      return null;
    }

    return data?.id || null;
  },

  async update(id: string, updates: Partial<ExperienceIncident>): Promise<boolean> {
    const updateData: any = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.ownerId !== undefined) updateData.owner_id = updates.ownerId;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.resolvedAt !== undefined) updateData.resolved_at = updates.resolvedAt;
    if (updates.severity !== undefined) updateData.severity = updates.severity;

    const { error } = await supabase
      .from('experience_incidents')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating incident:', error);
      return false;
    }

    return true;
  },

  mapIncident(data: any): ExperienceIncident {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      type: data.type,
      severity: data.severity,
      status: data.status,
      zone: data.zone,
      reportedAt: data.reported_at,
      resolvedAt: data.resolved_at,
      ownerId: data.owner_id,
      linkedTicketId: data.linked_ticket_id,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },
};

