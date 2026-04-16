import { supabase } from '@/integrations/supabase/client';

/**
 * Recalculates cap_tables totals based on current equity_ledger entries.
 * Called after any equity grant edit, revocation, or new grant.
 * 
 * Logic:
 * - Sums all active grants (minus cancellations) to get total_issued
 * - Subtracts holding_company_shares + founder_shares (these are canonical, not from ledger)
 * - Remaining issued shares come from ledger grants
 * - equity_pool = total_authorized - total_issued
 */
export async function recalculateCapTable(): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get current cap table
    const { data: capTable, error: capError } = await supabase
      .from('cap_tables')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (capError || !capTable) {
      return { success: false, error: capError?.message || 'No cap table found' };
    }

    // 2. Get all equity_ledger entries
    const { data: ledgerEntries, error: ledgerError } = await supabase
      .from('equity_ledger')
      .select('recipient_user_id, shares_amount, transaction_type, grant_id')
      .in('transaction_type', ['grant', 'cancellation'])
      .not('recipient_user_id', 'is', null);

    if (ledgerError) {
      return { success: false, error: ledgerError.message };
    }

    // 3. Build revoked set
    const revokedKeys = new Set<string>();
    (ledgerEntries || [])
      .filter(e => e.transaction_type === 'cancellation')
      .forEach(c => {
        if (c.grant_id) revokedKeys.add(`grant_id:${c.grant_id}`);
        else revokedKeys.add(`${c.recipient_user_id}_${c.shares_amount}`);
      });

    // 4. Sum active grants (excluding old 18M Torrance duplicates)
    let executiveGrantsTotal = 0;
    (ledgerEntries || [])
      .filter(e => e.transaction_type === 'grant')
      .forEach(grant => {
        // Skip old 18M grants
        if (grant.shares_amount >= 17500000 && grant.shares_amount <= 18500000) return;

        const key = grant.grant_id
          ? `grant_id:${grant.grant_id}`
          : `${grant.recipient_user_id}_${grant.shares_amount}`;

        if (!revokedKeys.has(key)) {
          executiveGrantsTotal += grant.shares_amount || 0;
        }
      });

    // 5. Calculate totals
    const holdingCompanyShares = capTable.holding_company_shares || 0;
    const founderShares = capTable.founder_shares || 0;
    const totalAuthorized = capTable.total_authorized || 70000000;

    // Total issued = holding company + founder + executive grants from ledger
    // But founder shares may also be in the ledger - need to subtract founder's ledger grants
    // to avoid double-counting. The founder (Torrance) ledger grants = 10.5M which equals founder_shares
    // We already skip 18M grants above. The 10.5M grant IS the founder_shares, so subtract it.
    
    // Get Torrance's user_id to identify founder grants
    const { data: torranceProfile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', 'tstroman.ceo@cravenusa.com')
      .maybeSingle();

    let founderLedgerGrants = 0;
    if (torranceProfile?.user_id) {
      (ledgerEntries || [])
        .filter(e => e.transaction_type === 'grant' && e.recipient_user_id === torranceProfile.user_id)
        .forEach(grant => {
          if (grant.shares_amount >= 17500000 && grant.shares_amount <= 18500000) return;
          const key = grant.grant_id
            ? `grant_id:${grant.grant_id}`
            : `${grant.recipient_user_id}_${grant.shares_amount}`;
          if (!revokedKeys.has(key)) {
            founderLedgerGrants += grant.shares_amount || 0;
          }
        });
    }

    // Executive grants excluding founder (already counted as founder_shares)
    const nonFounderGrants = executiveGrantsTotal - founderLedgerGrants;
    
    const totalIssued = holdingCompanyShares + founderShares + nonFounderGrants;
    const totalUnissued = totalAuthorized - totalIssued;
    const equityPool = Math.max(0, totalUnissued - (capTable.micro_equity_pool || 0));

    // Calculate percentages
    const holdingPct = totalAuthorized > 0 ? Number(((holdingCompanyShares / totalAuthorized) * 100).toFixed(2)) : 0;
    const founderPct = totalAuthorized > 0 ? Number(((founderShares / totalAuthorized) * 100).toFixed(2)) : 0;
    const poolPct = totalAuthorized > 0 ? Number(((equityPool / totalAuthorized) * 100).toFixed(2)) : 0;

    // 6. Update cap_tables
    const { error: updateError } = await supabase
      .from('cap_tables')
      .update({
        total_issued: totalIssued,
        total_unissued: totalUnissued,
        equity_pool: equityPool,
        holding_company_percentage: holdingPct,
        founder_percentage: founderPct,
        pool_percentage: poolPct,
        updated_at: new Date().toISOString(),
      })
      .eq('id', capTable.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    console.log('✅ Cap table recalculated:', {
      totalIssued,
      totalUnissued,
      equityPool,
      nonFounderGrants,
      founderLedgerGrants,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error recalculating cap table:', err);
    return { success: false, error: err.message };
  }
}
