import { supabase } from '@/integrations/supabase/client';
import { ExperienceTicket } from '@/types/cxo';

export const ticketsRepository = {
  async getAll(filters?: {
    type?: string;
    status?: string;
    priority?: string;
    needsApproval?: boolean;
  }): Promise<ExperienceTicket[]> {
    let query = supabase.from('experience_tickets').select('*');

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.needsApproval !== undefined) {
      query = query.eq('needs_cxo_approval', filters.needsApproval);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      // Table doesn't exist yet - migration needs to be run
      if (error.code === 'PGRST205') {
        console.warn('CXO Portal tables not found. Please run migration: 20250131000008_create_cxo_portal_schema.sql');
        return [];
      }
      console.error('Error fetching tickets:', error);
      return [];
    }

    return (data || []).map(this.mapTicket);
  },

  async getById(id: string): Promise<ExperienceTicket | null> {
    const { data, error } = await supabase
      .from('experience_tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching ticket:', error);
      return null;
    }

    return data ? this.mapTicket(data) : null;
  },

  async create(ticket: Omit<ExperienceTicket, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('experience_tickets')
      .insert({
        external_ticket_id: ticket.externalTicketId,
        type: ticket.type,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        summary: ticket.summary,
        description: ticket.description,
        customer_id: ticket.customerId,
        driver_id: ticket.driverId,
        merchant_id: ticket.merchantId,
        zone: ticket.zone,
        created_by: user.id,
        assigned_to: ticket.assignedTo,
        needs_cxo_approval: ticket.needsCxoApproval,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      return null;
    }

    return data?.id || null;
  },

  async update(id: string, updates: Partial<ExperienceTicket>): Promise<boolean> {
    const updateData: any = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
    if (updates.resolutionNotes !== undefined) updateData.resolution_notes = updates.resolutionNotes;
    if (updates.rootCauseTag !== undefined) updateData.root_cause_tag = updates.rootCauseTag;
    if (updates.approvedCreditAmount !== undefined) updateData.approved_credit_amount = updates.approvedCreditAmount;
    if (updates.needsCxoApproval !== undefined) updateData.needs_cxo_approval = updates.needsCxoApproval;

    const { error } = await supabase
      .from('experience_tickets')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating ticket:', error);
      return false;
    }

    return true;
  },

  mapTicket(data: any): ExperienceTicket {
    return {
      id: data.id,
      externalTicketId: data.external_ticket_id,
      type: data.type,
      category: data.category,
      status: data.status,
      priority: data.priority,
      summary: data.summary,
      description: data.description,
      customerId: data.customer_id,
      driverId: data.driver_id,
      merchantId: data.merchant_id,
      zone: data.zone,
      createdBy: data.created_by,
      assignedTo: data.assigned_to,
      resolutionNotes: data.resolution_notes,
      rootCauseTag: data.root_cause_tag,
      approvedCreditAmount: data.approved_credit_amount,
      needsCxoApproval: data.needs_cxo_approval,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },
};

