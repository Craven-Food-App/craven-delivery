import { supabase } from '@/integrations/supabase/client';
import {
  mergeDuplicateOfficerDirectoryRows,
  type CorporateOfficerRow,
} from '@/utils/executiveDuplicateMerge';

export type ExecutiveDirectoryOfficer = CorporateOfficerRow & { user_id?: string };

const TORRANCE_DISPLAY_EMAIL = 'tstroman.ceo@cravenusa.com';

function displayEmailFallback(fullName: string): string | undefined {
  const n = fullName.toLowerCase().replace(/\s+/g, ' ').trim();
  if (n === 'torrance stroman' || (n.includes('torrance') && n.includes('stroman'))) {
    return TORRANCE_DISPLAY_EMAIL;
  }
  return undefined;
}

/**
 * Loads corporate officer rows for the Executive Officer Directory.
 * Uses exec_users.email / name as fallbacks when user_profiles is empty (fixes N/A for CEO).
 */
export async function fetchExecutiveDirectoryOfficers(): Promise<ExecutiveDirectoryOfficer[]> {
  const { data: execUsers, error: execError } = await supabase
    .from('exec_users')
    .select('id, user_id, role, title, officer_status, metadata, email, name');

  if (execError) throw execError;

  const userIds = (execUsers || []).map((e) => e.user_id).filter(Boolean);
  const { data: profiles } = userIds.length
    ? await supabase.from('user_profiles').select('user_id, full_name, email').in('user_id', userIds)
    : { data: [] as { user_id: string; full_name?: string; email?: string | null }[] };

  const execIds = (execUsers || []).map((e) => e.id).filter(Boolean);
  const { data: corpOfficers } = execIds.length
    ? await supabase
        .from('corporate_officers')
        .select('executive_id, status, term_start, term_end, appointed_date')
        .in('executive_id', execIds)
    : { data: [] as Record<string, unknown>[] };

  const { data: appointments } = execIds.length
    ? await supabase
        .from('executive_appointments')
        .select('executive_id, effective_date, status, created_at')
        .in('executive_id', execIds)
        .order('created_at', { ascending: false })
    : { data: [] as Record<string, unknown>[] };

  const profileMap = new Map((profiles || []).map((p) => [p.user_id, p] as const));
  const corpMap = new Map((corpOfficers || []).map((c: { executive_id: string }) => [c.executive_id, c] as const));
  const appointmentMap = new Map(
    (appointments || []).map((a: { executive_id: string }) => [a.executive_id, a] as const),
  );

  const transformed: ExecutiveDirectoryOfficer[] = (execUsers || []).map((exec: Record<string, unknown>) => {
    const uid = exec.user_id as string | undefined;
    const eid = exec.id as string;
    const profile = uid ? profileMap.get(uid) : undefined;
    const corp = corpMap.get(eid) as { status?: string; term_start?: string; term_end?: string; appointed_date?: string } | undefined;
    const appointment = appointmentMap.get(eid) as { effective_date?: string; created_at?: string } | undefined;
    const metadata = (exec.metadata as Record<string, unknown>) || {};

    const status = (corp?.status || exec.officer_status || 'appointed').toString().toUpperCase();
    const fullName =
      profile?.full_name ||
      (metadata.proposed_officer_name as string | undefined) ||
      (exec.name as string | undefined) ||
      (exec.title as string | undefined) ||
      'Unknown';
    const denormEmail = typeof exec.email === 'string' ? exec.email.trim() : '';
    const email =
      (profile?.email && String(profile.email).trim()) ||
      denormEmail ||
      (metadata.proposed_officer_email as string | undefined) ||
      displayEmailFallback(fullName) ||
      undefined;
    const effectiveDate =
      corp?.term_start ||
      corp?.appointed_date ||
      appointment?.effective_date ||
      appointment?.created_at ||
      new Date().toISOString();

    return {
      user_id: uid,
      id: eid,
      full_name: fullName,
      email,
      title: (exec.title as string) || String(exec.role || '').toUpperCase() || 'Officer',
      effective_date: effectiveDate,
      term_end: corp?.term_end || undefined,
      status,
    };
  });

  const byUserOrId = new Map<string, ExecutiveDirectoryOfficer>();
  for (const row of transformed) {
    const key = row.user_id || row.id;
    const existing = byUserOrId.get(key);
    if (!existing) byUserOrId.set(key, row);
    else byUserOrId.set(key, mergeDuplicateOfficerDirectoryRows(existing, row));
  }

  const afterUserId = Array.from(byUserOrId.values());
  const byEmail = new Map<string, ExecutiveDirectoryOfficer>();
  for (const row of afterUserId) {
    const ek = (row.email || '').toLowerCase().trim();
    const key = ek || `__uid_${row.user_id || row.id}`;
    const existing = byEmail.get(key);
    if (!existing) byEmail.set(key, row);
    else byEmail.set(key, mergeDuplicateOfficerDirectoryRows(existing, row));
  }

  return Array.from(byEmail.values());
}

/** Matches Officer Directory when filter is "Active" (status includes "active"). */
export function officerMatchesActiveDirectoryFilter(officer: CorporateOfficerRow): boolean {
  return officer.status.toLowerCase().includes('active');
}
