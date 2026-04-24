import { supabase } from '@/integrations/supabase/client';

export async function claimOrderAssignment(assignmentId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('claim_order_assignment', {
    p_assignment_id: assignmentId,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  const d = data as { ok?: boolean; error?: string } | null;
  if (d && d.ok === false) {
    return { ok: false, error: (d as { error?: string }).error || 'claim_failed' };
  }
  return { ok: true };
}

export async function claimOrderAssignmentsBatch(assignmentIds: string[]): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (assignmentIds.length === 0) {
    return { ok: false, error: 'no_ids' };
  }
  const { data, error } = await supabase.rpc('claim_order_assignments_batch', {
    p_assignment_ids: assignmentIds,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  const d = data as { ok?: boolean; error?: string } | null;
  if (d && d.ok === false) {
    return { ok: false, error: (d as { error?: string }).error || 'claim_batch_failed' };
  }
  return { ok: true };
}
