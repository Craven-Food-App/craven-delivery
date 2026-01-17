/**
 * Unified Status Synchronization System
 * 
 * This module provides a centralized way to manage and synchronize
 * status across different governance systems to ensure consistency.
 */

import { supabase } from '@/integrations/supabase/client';

export interface StatusMapping {
  governance: string;
  board: string;
  appointment: string;
  workflow: string;
}

/**
 * Status mappings between different systems
 */
export const STATUS_MAPPINGS: Record<string, StatusMapping> = {
  DRAFT: {
    governance: 'DRAFT',
    board: 'pending',
    appointment: 'draft',
    workflow: 'initiated',
  },
  PENDING_VOTE: {
    governance: 'PENDING_VOTE',
    board: 'pending',
    appointment: 'ready_for_board_authorization',
    workflow: 'board_approval_pending',
  },
  ADOPTED: {
    governance: 'ADOPTED',
    board: 'approved',
    appointment: 'authorized_to_offer',
    workflow: 'board_approved',
  },
  EXECUTED: {
    governance: 'EXECUTED',
    board: 'executed',
    appointment: 'documents_sent',
    workflow: 'notice_sent',
  },
  REJECTED: {
    governance: 'REJECTED',
    board: 'rejected',
    appointment: 'rejected',
    workflow: 'board_rejected',
  },
  ACTIVE: {
    governance: 'ACTIVE',
    board: 'executed',
    appointment: 'fully_appointed_active',
    workflow: 'completed',
  },
};

/**
 * Synchronize governance resolution status to board resolution
 */
export async function syncGovernanceToBoardResolution(
  governanceResolutionId: string,
  status: string
): Promise<boolean> {
  try {
    // Get the governance resolution
    const { data: govRes, error: govError } = await supabase
      .from('governance_board_resolutions')
      .select('resolution_number')
      .eq('id', governanceResolutionId)
      .single();

    if (govError || !govRes) {
      console.error('[StatusManager] Governance resolution not found:', governanceResolutionId);
      return false;
    }

    // Find corresponding board resolution
    const { data: boardRes, error: boardError } = await supabase
      .from('board_resolutions')
      .select('id')
      .eq('resolution_number', govRes.resolution_number)
      .single();

    if (boardError || !boardRes) {
      // Board resolution might not exist yet, that's okay
      return true;
    }

    // Map governance status to board status
    const mapping = STATUS_MAPPINGS[status];
    if (!mapping) {
      console.warn('[StatusManager] Unknown status mapping:', status);
      return false;
    }

    // Update board resolution
    const { error: updateError } = await supabase
      .from('board_resolutions')
      .update({ status: mapping.board })
      .eq('id', boardRes.id);

    if (updateError) {
      console.error('[StatusManager] Error updating board resolution:', updateError);
      return false;
    }

    console.log(`[StatusManager] Synced governance resolution ${governanceResolutionId} status ${status} to board resolution ${boardRes.id}`);
    return true;
  } catch (error) {
    console.error('[StatusManager] Error syncing governance to board:', error);
    return false;
  }
}

/**
 * Synchronize appointment status based on resolution status
 */
export async function syncResolutionToAppointment(
  resolutionId: string,
  status: string
): Promise<boolean> {
  try {
    // Get resolution
    const { data: resolution, error: resError } = await supabase
      .from('governance_board_resolutions')
      .select('appointment_id, type')
      .eq('id', resolutionId)
      .single();

    if (resError || !resolution || !resolution.appointment_id) {
      return true; // No appointment linked, that's okay
    }

    // Map resolution status to appointment status
    const mapping = STATUS_MAPPINGS[status];
    if (!mapping || !mapping.appointment) {
      return true; // No mapping needed
    }

    // Update appointment status
    const { error: updateError } = await supabase
      .from('executive_appointments')
      .update({ status: mapping.appointment })
      .eq('id', resolution.appointment_id);

    if (updateError) {
      console.error('[StatusManager] Error updating appointment status:', updateError);
      return false;
    }

    console.log(`[StatusManager] Synced resolution ${resolutionId} status ${status} to appointment ${resolution.appointment_id}`);
    return true;
  } catch (error) {
    console.error('[StatusManager] Error syncing resolution to appointment:', error);
    return false;
  }
}

/**
 * Synchronize exit workflow status based on board resolution
 */
export async function syncResolutionToExitWorkflow(
  resolutionId: string,
  status: string
): Promise<boolean> {
  try {
    // Find exit workflow linked to this resolution
    const { data: workflow, error: workflowError } = await supabase
      .from('exit_workflows')
      .select('id')
      .eq('board_resolution_id', resolutionId)
      .single();

    if (workflowError || !workflow) {
      return true; // No workflow linked, that's okay
    }

    // Map resolution status to workflow status
    const mapping = STATUS_MAPPINGS[status];
    if (!mapping || !mapping.workflow) {
      return true; // No mapping needed
    }

    // Update workflow status
    const { error: updateError } = await supabase
      .from('exit_workflows')
      .update({ status: mapping.workflow })
      .eq('id', workflow.id);

    if (updateError) {
      console.error('[StatusManager] Error updating workflow status:', updateError);
      return false;
    }

    console.log(`[StatusManager] Synced resolution ${resolutionId} status ${status} to exit workflow ${workflow.id}`);
    return true;
  } catch (error) {
    console.error('[StatusManager] Error syncing resolution to workflow:', error);
    return false;
  }
}

/**
 * Comprehensive status synchronization
 * Syncs status across all related systems
 */
export async function syncAllStatuses(
  resolutionId: string,
  newStatus: string
): Promise<boolean> {
  try {
    const results = await Promise.all([
      syncGovernanceToBoardResolution(resolutionId, newStatus),
      syncResolutionToAppointment(resolutionId, newStatus),
      syncResolutionToExitWorkflow(resolutionId, newStatus),
    ]);

    const allSuccess = results.every(r => r === true);
    
    if (allSuccess) {
      console.log(`[StatusManager] Successfully synced all statuses for resolution ${resolutionId}`);
    } else {
      console.warn(`[StatusManager] Some status syncs failed for resolution ${resolutionId}`);
    }

    return allSuccess;
  } catch (error) {
    console.error('[StatusManager] Error in comprehensive sync:', error);
    return false;
  }
}

/**
 * Sync executive status across all systems when removed or resigned
 */
export async function syncExecutiveStatus(
  executiveEmail: string,
  status: 'removed' | 'resigned' | 'terminated',
  reason?: string,
  effectiveDate?: string
): Promise<boolean> {
  try {
    // Update corporate_officers
    const { error: officerError } = await supabase
      .from('corporate_officers')
      .update({
        status: status.toUpperCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('email', executiveEmail);

    if (officerError) {
      console.error('[StatusManager] Error updating corporate_officers:', officerError);
    }

    // Update executive_appointments
    const { error: appointmentError } = await supabase
      .from('executive_appointments')
      .update({
        status: status === 'removed' ? 'rejected' : status,
        updated_at: new Date().toISOString(),
      })
      .eq('proposed_officer_email', executiveEmail);

    if (appointmentError) {
      console.error('[StatusManager] Error updating executive_appointments:', appointmentError);
    }

    // Get user_id from email
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', executiveEmail)
      .single();

    if (userProfile) {
      // Remove executive roles from user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .in('role', ['CRAVEN_EXECUTIVE', 'CRAVEN_CEO', 'CRAVEN_CFO', 'CRAVEN_COO', 'CRAVEN_CTO', 'CRAVEN_CXO'])
        .eq('user_id', userProfile.user_id);

      if (roleError) {
        console.error('[StatusManager] Error removing executive roles:', roleError);
      }
    }

    // Log the status change
    await supabase.from('governance_logs').insert({
      action: `executive_${status}`,
      entity_type: 'executive',
      description: `Executive ${status}: ${executiveEmail}${reason ? ` - ${reason}` : ''}`,
      data: {
        email: executiveEmail,
        status,
        reason,
        effective_date: effectiveDate,
      },
    });

    console.log(`[StatusManager] Synced executive status ${status} for ${executiveEmail}`);
    return true;
  } catch (error) {
    console.error('[StatusManager] Error syncing executive status:', error);
    return false;
  }
}

/**
 * Create audit trail entry for any action
 */
export async function createAuditTrail(
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  metadata?: any
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('governance_logs').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
      data: metadata || {},
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('[StatusManager] Error creating audit trail:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[StatusManager] Error creating audit trail:', error);
    return false;
  }
}

/**
 * Get current status across all systems for a resolution
 */
export async function getUnifiedStatus(resolutionId: string): Promise<{
  governance?: string;
  board?: string;
  appointment?: string;
  workflow?: string;
} | null> {
  try {
    const { data: govRes, error } = await supabase
      .from('governance_board_resolutions')
      .select('status, resolution_number, appointment_id')
      .eq('id', resolutionId)
      .single();

    if (error || !govRes) {
      return null;
    }

    const result: any = {
      governance: govRes.status,
    };

    // Get board resolution status
    const { data: boardRes } = await supabase
      .from('board_resolutions')
      .select('status')
      .eq('resolution_number', govRes.resolution_number)
      .single();

    if (boardRes) {
      result.board = boardRes.status;
    }

    // Get appointment status if linked
    if (govRes.appointment_id) {
      const { data: appointment } = await supabase
        .from('executive_appointments')
        .select('status')
        .eq('id', govRes.appointment_id)
        .single();

      if (appointment) {
        result.appointment = appointment.status;
      }
    }

    // Get exit workflow status if linked
    const { data: workflow } = await supabase
      .from('exit_workflows')
      .select('status')
      .eq('board_resolution_id', resolutionId)
      .single();

    if (workflow) {
      result.workflow = workflow.status;
    }

    return result;
  } catch (error) {
    console.error('[StatusManager] Error getting unified status:', error);
    return null;
  }
}

