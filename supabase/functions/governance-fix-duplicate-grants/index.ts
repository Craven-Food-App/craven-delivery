import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const userEmail = body.user_email || 'tstroman.ceo@cravenusa.com';

    console.log(`Fixing duplicate grants for: ${userEmail}`);

    // Find user
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());

    if (!user) {
      return new Response(
        JSON.stringify({ error: `User not found: ${userEmail}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found user: ${user.id} (${user.email})`);

    // Get all equity ledger entries for this user
    const { data: ledgerEntries, error: ledgerError } = await supabaseAdmin
      .from('equity_ledger')
      .select('*')
      .eq('recipient_user_id', user.id)
      .eq('transaction_type', 'grant')
      .order('created_at', { ascending: true });

    if (ledgerError) {
      throw ledgerError;
    }

    console.log(`Found ${ledgerEntries?.length || 0} equity ledger entries`);

    if (!ledgerEntries || ledgerEntries.length <= 1) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No duplicates found',
          entries: ledgerEntries?.length || 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Keep the first (oldest) entry
    const firstEntry = ledgerEntries[0];
    const duplicates = ledgerEntries.slice(1);

    // Calculate total shares (should be 20M)
    const totalShares = 20000000;

    // Update first entry
    const { error: updateError } = await supabaseAdmin
      .from('equity_ledger')
      .update({
        shares_amount: totalShares,
        notes: `Equity grant: ${totalShares.toLocaleString()} shares, immediate vesting (merged ${ledgerEntries.length} duplicates)`,
      })
      .eq('id', firstEntry.id);

    if (updateError) {
      throw updateError;
    }

    // Delete duplicates
    const duplicateIds = duplicates.map(e => e.id);
    const { error: deleteError } = await supabaseAdmin
      .from('equity_ledger')
      .delete()
      .in('id', duplicateIds);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`Deleted ${duplicates.length} duplicate ledger entries`);

    // Fix vesting schedules
    const { data: vestingSchedules, error: vestingError } = await supabaseAdmin
      .from('vesting_schedules')
      .select('*')
      .eq('recipient_user_id', user.id)
      .order('created_at', { ascending: true });

    if (vestingError) {
      console.warn('Error fetching vesting schedules:', vestingError);
    } else if (vestingSchedules && vestingSchedules.length > 1) {
      const firstSchedule = vestingSchedules[0];
      const duplicateSchedules = vestingSchedules.slice(1);

      // Update first schedule
      await supabaseAdmin
        .from('vesting_schedules')
        .update({
          total_shares: totalShares,
          vested_shares: totalShares,
          unvested_shares: 0,
          vesting_type: 'immediate',
        })
        .eq('id', firstSchedule.id);

      // Delete duplicates
      const duplicateScheduleIds = duplicateSchedules.map(s => s.id);
      await supabaseAdmin
        .from('vesting_schedules')
        .delete()
        .in('id', duplicateScheduleIds);

      console.log(`Deleted ${duplicateSchedules.length} duplicate vesting schedules`);
    }

    // Fix cap table
    const { data: capTables } = await supabaseAdmin
      .from('cap_tables')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (capTables) {
      // Calculate actual issued shares from all grants
      const { data: allGrants } = await supabaseAdmin
        .from('equity_ledger')
        .select('shares_amount')
        .eq('transaction_type', 'grant');

      const totalIssued = allGrants?.reduce((sum, g) => sum + Number(g.shares_amount || 0), 0) || 0;

      await supabaseAdmin
        .from('cap_tables')
        .update({
          total_issued: totalIssued,
          total_unissued: capTables.total_authorized - totalIssued,
          updated_at: new Date().toISOString(),
        })
        .eq('id', capTables.id);

      console.log(`Updated cap table: ${totalIssued.toLocaleString()} shares issued`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Merged ${ledgerEntries.length} duplicate grants into single ${totalShares.toLocaleString()} share grant`,
        kept_entry_id: firstEntry.id,
        deleted_count: duplicates.length,
        total_shares: totalShares,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error fixing duplicate grants:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

