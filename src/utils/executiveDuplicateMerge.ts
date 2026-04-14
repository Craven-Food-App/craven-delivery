/**
 * Defensive merges for duplicate exec roster rows (e.g. before DB migration runs).
 * Canonical fix: `20260417120000_dedupe_exec_users_one_row_per_user.sql` (same `user_id`)
 * and `20260418120000_exec_users_merge_cross_account.sql` (same person, different accounts / email).
 */

export function mergeOfficerTitles(t1: string, t2: string): string {
  const a = (t1 || '').trim();
  const b = (t2 || '').trim();
  if (!a) return b;
  if (!b) return a;
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return a;
  const bothFounderCeo =
    (la.includes('founder') || la.includes('chief executive')) &&
    (lb.includes('founder') || lb.includes('chief executive')) &&
    la.includes('ceo') &&
    lb.includes('ceo');
  if (bothFounderCeo) return 'Founder CEO';
  return a.length <= b.length ? a : b;
}

export function normalizeOfficerStatusMerge(s1: string, s2: string): string {
  const u = `${s1} ${s2}`.toUpperCase();
  if (u.includes('ACTIVE')) return 'ACTIVE';
  if (u.includes('APPOINTED')) return 'APPOINTED';
  return s1 || s2;
}

export type CorporateOfficerRow = {
  id: string;
  full_name: string;
  email?: string;
  title: string;
  effective_date: string;
  term_end?: string;
  status: string;
};

export function mergeDuplicateOfficerDirectoryRows(
  a: CorporateOfficerRow & { user_id?: string },
  b: CorporateOfficerRow & { user_id?: string },
): CorporateOfficerRow & { user_id?: string } {
  const pickPrimary = a.email && a.email !== 'N/A' ? a : b.email && b.email !== 'N/A' ? b : a;
  const other = pickPrimary === a ? b : a;

  const title = mergeOfficerTitles(pickPrimary.title, other.title);
  const email = pickPrimary.email || other.email;
  const full_name = pickPrimary.full_name || other.full_name;
  const t1 = new Date(pickPrimary.effective_date).getTime();
  const t2 = new Date(other.effective_date).getTime();
  const effective_date =
    Number.isFinite(t1) && Number.isFinite(t2)
      ? t1 <= t2
        ? pickPrimary.effective_date
        : other.effective_date
      : pickPrimary.effective_date || other.effective_date;
  const term_end = pickPrimary.term_end || other.term_end;
  const status = normalizeOfficerStatusMerge(pickPrimary.status, other.status);

  return {
    user_id: pickPrimary.user_id,
    id: pickPrimary.id,
    full_name,
    email,
    title,
    effective_date,
    term_end,
    status,
  };
}

export type TeamExecutiveRow = {
  user_id: string;
  name: string;
  title: string;
  email?: string;
  shares?: number;
  percentage?: number;
};

export function mergeTeamExecutiveRows(
  a: TeamExecutiveRow,
  b: TeamExecutiveRow,
  totalAuthorized: number,
): TeamExecutiveRow {
  const pickPrimary = a.email?.trim() ? a : b.email?.trim() ? b : a;
  const other = pickPrimary === a ? b : a;

  const title = mergeOfficerTitles(pickPrimary.title, other.title);
  const email = pickPrimary.email || other.email || '';
  const name = pickPrimary.name || other.name;
  const shares = Math.max(Number(pickPrimary.shares) || 0, Number(other.shares) || 0);
  const percentage = totalAuthorized > 0 ? (shares / totalAuthorized) * 100 : 0;

  return {
    user_id: pickPrimary.user_id,
    name,
    title,
    email,
    shares,
    percentage,
  };
}

/** Collapse duplicate exec roster lines (same user_id, then same email). */
export function dedupeTeamExecutives(
  rows: (TeamExecutiveRow | null)[],
  totalAuthorized: number,
): TeamExecutiveRow[] {
  const valid = rows.filter((r): r is TeamExecutiveRow => r != null);

  const byUserId = new Map<string, TeamExecutiveRow>();
  for (const row of valid) {
    const prev = byUserId.get(row.user_id);
    if (!prev) byUserId.set(row.user_id, row);
    else byUserId.set(row.user_id, mergeTeamExecutiveRows(prev, row, totalAuthorized));
  }

  const byEmail = new Map<string, TeamExecutiveRow>();
  for (const row of byUserId.values()) {
    const ek = (row.email || '').toLowerCase().trim();
    const key = ek || `__uid_${row.user_id}`;
    const prev = byEmail.get(key);
    if (!prev) byEmail.set(key, row);
    else byEmail.set(key, mergeTeamExecutiveRows(prev, row, totalAuthorized));
  }

  return Array.from(byEmail.values()).sort((a, b) => a.name.localeCompare(b.name));
}
