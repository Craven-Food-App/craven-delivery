import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
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

    const results: any = {
      nathan_revoked: false,
      justin_grant_created: false,
      cap_table_updated: false,
    };

    console.log('Step 1: Revoking Nathan Curry shares...');
    const { data: nathanUser } = await supabaseAdmin.auth.admin.listUsers();
    const nathanAuth = nathanUser?.users?.find(u => u.email === 'natecurry.cto@cravenusa.com');
    
    const { data: nathanExec } = await supabaseAdmin
      .from('exec_users')
      .select('user_id, id')
      .eq('role', 'cto')
      .maybeSingle();
    
    const { data: nathanEmployee } = await supabaseAdmin
      .from('employees')
      .select('user_id, id')
      .eq('email', 'natecurry.cto@cravenusa.com')
      .maybeSingle();
    
    const nathanUserId = nathanAuth?.id || nathanExec?.user_id || nathanEmployee?.user_id;
    
    if (!nathanUserId) {
      console.log('Nathan Curry user not found');
    } else {
      console.log(`Found Nathan Curry user_id: ${nathanUserId}`);
      
      const { data: nathanLedgerGrants } = await supabaseAdmin
        .from('equity_ledger')
        .select('id, shares_amount, share_class, transaction_date, grant_id')
        .eq('recipient_user_id', nathanUserId)
        .eq('transaction_type', 'grant');

      const execUserId = nathanExec?.id;
      const employeeId = nathanEmployee?.id;
      
      let nathanEquityGrants: any[] = [];
      if (execUserId) {
        const { data: grants } = await supabaseAdmin
          .from('equity_grants')
          .select('id, shares_total, share_class, grant_date')
          .eq('executive_id', execUserId);
        if (grants) nathanEquityGrants = grants;
      }
      if (employeeId && nathanEquityGrants.length === 0) {
        const { data: grants } = await supabaseAdmin
          .from('equity_grants')
          .select('id, shares_total, share_class, grant_date')
          .eq('employee_id', employeeId);
        if (grants) nathanEquityGrants = grants;
      }

      let totalRevoked = 0;
      const grantsToRevoke: any[] = [];

      if (nathanLedgerGrants && nathanLedgerGrants.length > 0) {
        console.log(`Found ${nathanLedgerGrants.length} grants in equity_ledger for Nathan`);
        for (const grant of nathanLedgerGrants) {
          grantsToRevoke.push({
            type: 'ledger',
            shares: grant.shares_amount,
            share_class: grant.share_class || 'Common',
            grant_id: grant.grant_id,
          });
          totalRevoked += Number(grant.shares_amount || 0);
        }
      }

      if (nathanEquityGrants && nathanEquityGrants.length > 0) {
        console.log(`Found ${nathanEquityGrants.length} grants in equity_grants for Nathan`);
        for (const grant of nathanEquityGrants) {
          const inLedger = nathanLedgerGrants?.some(lg => lg.grant_id === grant.id);
          if (!inLedger) {
            grantsToRevoke.push({
              type: 'equity_grant',
              shares: grant.shares_total,
              share_class: grant.share_class || 'Common',
              grant_id: grant.id,
            });
            totalRevoked += Number(grant.shares_total || 0);
          }
        }
      }

      if (grantsToRevoke.length > 0) {
        for (const grant of grantsToRevoke) {
          await supabaseAdmin
            .from('equity_ledger')
            .insert({
              transaction_type: 'cancellation',
              recipient_user_id: nathanUserId,
              shares_amount: grant.shares,
              share_class: grant.share_class,
              price_per_share: 0.001,
              transaction_date: new Date().toISOString().split('T')[0],
              effective_date: new Date().toISOString().split('T')[0],
              grant_id: grant.grant_id,
              notes: `Equity revocation: ${grant.shares} shares revoked due to termination of employment. Nathan Curry has been exited and fired.`,
            });
        }

        await supabaseAdmin
          .from('governance_logs')
          .insert({
            action: 'equity_revoked',
            entity_type: 'user',
            entity_id: nathanUserId,
            description: `Revoked ${totalRevoked.toLocaleString()} shares from Nathan Curry due to termination of employment`,
            data: {
              shares_revoked: totalRevoked,
              target_name: 'Nathan Curry',
              reason: 'Termination of employment - Nathan Curry has been exited and fired',
              action_category: 'equity',
            },
          });

        results.nathan_revoked = true;
        results.nathan_shares_revoked = totalRevoked;
        console.log(`✓ Revoked ${totalRevoked} shares from Nathan Curry (${grantsToRevoke.length} grants)`);
      } else {
        console.log('No grants found for Nathan Curry in equity_ledger or equity_grants');
        console.log('Ledger grants:', nathanLedgerGrants);
        console.log('Equity grants:', nathanEquityGrants);
      }
    }

    console.log('Step 2: Ensuring Justin Sweet 5M grant exists...');
    const justin = nathanUser?.users?.find(u => u.email === 'jsweet.cfo@cravenusa.com');
    
    if (justin) {
      const { data: justinGrants } = await supabaseAdmin
        .from('equity_ledger')
        .select('shares_amount')
        .eq('recipient_user_id', justin.id)
        .eq('transaction_type', 'grant')
        .gte('shares_amount', 4500000)
        .lte('shares_amount', 5500000);

      if (!justinGrants || justinGrants.length === 0) {
        console.log('Justin Sweet 5M grant NOT found, creating it...');

        const { data: vestingSchedule } = await supabaseAdmin
          .from('vesting_schedules')
          .insert({
            recipient_user_id: justin.id,
            total_shares: 5000000,
            vesting_type: 'immediate',
            cliff_months: 0,
            vesting_period_months: 0,
            vesting_schedule: [{
              date: new Date().toISOString().split('T')[0],
              shares: 5000000,
              vested: true,
            }],
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            vested_shares: 5000000,
            unvested_shares: 0,
          })
          .select()
          .single();

        await supabaseAdmin
          .from('equity_ledger')
          .insert({
            transaction_type: 'grant',
            recipient_user_id: justin.id,
            shares_amount: 5000000,
            share_class: 'Common',
            price_per_share: 0.001,
            transaction_date: new Date().toISOString().split('T')[0],
            effective_date: new Date().toISOString().split('T')[0],
            grant_id: vestingSchedule?.id,
            notes: 'Equity grant: 5,000,000 shares to Justin Sweet (CFO), immediate vesting',
          });

        await supabaseAdmin
          .from('governance_logs')
          .insert({
            action: 'equity_granted',
            entity_type: 'user',
            entity_id: justin.id,
            description: 'Granted 5,000,000 shares to Justin Sweet (CFO)',
            data: {
              shares_granted: 5000000,
              share_class: 'Common',
              vesting_type: 'immediate',
              target_name: 'Justin Sweet',
              action_category: 'equity',
            },
          });

        results.justin_grant_created = true;
        console.log('✓ Created Justin Sweet 5M grant');
      } else {
        console.log('Justin Sweet 5M grant already exists');
        results.justin_grant_exists = true;
      }
    } else {
      console.log('Justin Sweet user not found');
    }

    console.log('Step 3: Recalculating cap table...');
    const { data: capTable } = await supabaseAdmin
      .from('cap_tables')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (capTable) {
      const { data: allGrants } = await supabaseAdmin
        .from('equity_ledger')
        .select('shares_amount')
        .eq('transaction_type', 'grant');

      const grantsFromLedger = allGrants?.reduce((sum, g) => sum + Number(g.shares_amount || 0), 0) || 0;
      const trustShares = Number(capTable.trust_shares || 0);
      const founderShares = Number(capTable.founder_shares || 0);
      const totalAuthorized = Number(capTable.total_authorized || 100000000);
      
      const totalIssuedCalculated = trustShares + founderShares + grantsFromLedger;
      const totalUnissuedCalculated = totalAuthorized - totalIssuedCalculated;

      console.log('Cap table calculation:', {
        total_authorized: totalAuthorized,
        trust_shares: trustShares,
        founder_shares: founderShares,
        grants_from_ledger: grantsFromLedger,
        total_issued: totalIssuedCalculated,
        total_unissued: totalUnissuedCalculated,
      });

      const { data: updatedCapTable } = await supabaseAdmin
        .from('cap_tables')
        .update({
          total_issued: totalIssuedCalculated,
          total_unissued: totalUnissuedCalculated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', capTable.id)
        .select()
        .single();

      results.cap_table_updated = true;
      results.cap_table = {
        total_authorized: totalAuthorized,
        trust_shares: trustShares,
        founder_shares: founderShares,
        grants_from_ledger: grantsFromLedger,
        total_issued: totalIssuedCalculated,
        total_unissued: totalUnissuedCalculated,
      };

      console.log('✓ Cap table updated');
    } else {
      console.log('Cap table not found');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Fixed everything: revoked Nathan, ensured Justin grant, recalculated cap table',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in governance-fix-everything:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error', stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
