import { supabase } from '@/integrations/supabase/client';
import { ONBOARDING_DEFAULT_STEPS } from './dealConstants';

/** When a deal hits Signed, seed onboarding checklist if empty (Ops handoff). */
export async function pushSignedToOnboarding(partnershipId: string): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const { data: existing, error: selErr } = await supabase
    .from('partnership_onboarding_items')
    .select('id')
    .eq('partnership_id', partnershipId)
    .limit(1);

  if (selErr) return { ok: false, error: selErr.message };
  if (existing?.length) return { ok: true, skipped: true };

  const rows = ONBOARDING_DEFAULT_STEPS.map((step, idx) => ({
    partnership_id: partnershipId,
    step_name: step,
    step_order: idx,
    completed: false,
  }));

  const { error } = await supabase.from('partnership_onboarding_items').insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
