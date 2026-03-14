import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const body = await req.json();
    const {
      recipient_user_id,
      recipient_email,
      shares_amount,
      share_class = 'Common',
      price_per_share = 0.001,
      vesting_type = 'graded',
      vesting_period_months = 48,
      cliff_months = 12,
      start_date,
      resolution_id: resolutionIdInput,
      appointment_id,
    } = body;

    // Handle resolution_id - could be UUID or resolution_number
    let resolution_id: string | null = null;
    if (resolutionIdInput) {
      // Check if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(resolutionIdInput)) {
        resolution_id = resolutionIdInput;
      } else {
        // It's a resolution number, look it up
        console.log(`Looking up resolution by number: ${resolutionIdInput}`);
        const { data: resolution, error: resolutionError } = await supabaseAdmin
          .from('governance_board_resolutions')
          .select('id')
          .eq('resolution_number', resolutionIdInput)
          .maybeSingle();
        
        if (resolutionError) {
          console.error('Error looking up resolution:', resolutionError);
          return new Response(
            JSON.stringify({ error: `Failed to find resolution: ${resolutionError.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (!resolution) {
          return new Response(
            JSON.stringify({ error: `Resolution not found with number: ${resolutionIdInput}` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        resolution_id = resolution.id;
        console.log(`Found resolution UUID: ${resolution_id} for number: ${resolutionIdInput}`);
      }
    }

    if (!shares_amount || shares_amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid shares_amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If recipient_user_id is not provided, try to find user by email
    let finalRecipientUserId = recipient_user_id;
    
    if (!finalRecipientUserId && recipient_email) {
      console.log(`Searching for user by email: ${recipient_email}`);
      const searchEmail = recipient_email.toLowerCase().trim();
      
      // PRIMARY: Search all users first (most reliable)
      try {
        console.log('Searching for user by email:', recipient_email);
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error('Error listing users:', listError);
        } else if (users && users.length > 0) {
          console.log(`Searching through ${users.length} users`);
          
          // Exact match (case-insensitive)
          let foundUser = users.find(u => {
            const userEmail = u.email?.toLowerCase().trim();
            return userEmail === searchEmail;
          });
          
          // Try original case if exact match failed
          if (!foundUser) {
            foundUser = users.find(u => {
              const userEmail = u.email?.toLowerCase().trim();
              return userEmail === recipient_email.toLowerCase().trim();
            });
          }
          
          // Try partial match for CEO emails
          if (!foundUser && (searchEmail.includes('ceo') || searchEmail.includes('stroman') || searchEmail.includes('craven'))) {
            foundUser = users.find(u => {
              const userEmail = u.email?.toLowerCase().trim();
              return userEmail && (userEmail.includes('ceo') || userEmail.includes('stroman') || userEmail.includes('craven'));
            });
          }
          
          if (foundUser) {
            finalRecipientUserId = foundUser.id;
            console.log(`✓ Found user in listUsers: ${finalRecipientUserId} (${foundUser.email})`);
          } else {
            console.log(`✗ User not found. Sample emails: ${users.slice(0, 10).map(u => u.email).filter(Boolean).join(', ')}`);
          }
        }
        
        // FALLBACK: Try getUserByEmail if listUsers didn't find it
        if (!finalRecipientUserId) {
          try {
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
            const user = users?.find(u => u.email?.toLowerCase() === recipient_email.toLowerCase());
            if (user) {
              finalRecipientUserId = user.id;
              console.log(`✓ Found user via listUsers: ${finalRecipientUserId} (${user.email})`);
            }
          } catch (err: any) {
            console.log('listUsers failed:', err.message);
          }
        }
        
        // FALLBACK: Check exec_users for CEO
        if (!finalRecipientUserId && (searchEmail.includes('ceo') || searchEmail.includes('stroman') || searchEmail.includes('craven'))) {
          console.log('Checking exec_users for CEO...');
          const { data: execUsers, error: execError } = await supabaseAdmin
            .from('exec_users')
            .select('user_id, title, role')
            .not('user_id', 'is', null);
          
          if (!execError && execUsers && execUsers.length > 0) {
            const ceoExec = execUsers.find(eu => 
              eu.role === 'ceo' || 
              (eu.title && (eu.title.toLowerCase().includes('ceo') || eu.title.toLowerCase().includes('chief executive')))
            );
            
            if (ceoExec?.user_id) {
              finalRecipientUserId = ceoExec.user_id;
              console.log(`✓ Found CEO user via exec_users: ${finalRecipientUserId}`);
            }
          }
        }
      } catch (error) {
        console.error('Exception in user search:', error);
      }
      
      // If still not found, return error
      if (!finalRecipientUserId) {
        console.error(`✗ User not found with email: ${recipient_email}`);
        
        return new Response(
          JSON.stringify({ 
            error: `User not found with email: ${recipient_email}. Please ensure the user exists in the system.`,
            hint: 'The user must have an account before equity can be granted.',
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!finalRecipientUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing recipient_user_id or recipient_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create cap table
    let capTable = await supabaseAdmin
      .from('cap_tables')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!capTable.data) {
      console.log('Cap table not found, creating default cap table...');
      // Create default cap table with 100 million shares (using correct column names)
      const { data: newCapTable, error: createError } = await supabaseAdmin
        .from('cap_tables')
        .insert({
          total_authorized: 100000000, // 100 million (correct column name)
          par_value: 0.001,
          total_issued: 0, // correct column name
          total_unissued: 100000000,
          equity_pool: 20000000, // 20 million (20%)
          trust_shares: 60000000, // 60 million (60%)
          founder_shares: 20000000, // 20 million (20%)
          trust_percentage: 60.00,
          founder_percentage: 20.00,
          pool_percentage: 20.00,
          as_of_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating cap table:', createError);
        return new Response(
          JSON.stringify({ error: `Failed to create cap table: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      capTable = { data: newCapTable, error: null, count: null, status: 200, statusText: 'OK' };
      console.log('Default cap table created successfully');
    }

    const capTableData = capTable.data;

    // Recalculate cap table correctly:
    // Total Issued = Trust shares (already issued) + Founder shares (already issued) + Grants from ledger
    // Total Unissued = Authorized - Total Issued
    const { data: existingGrants, error: existingGrantsError } = await supabaseAdmin
      .from('equity_ledger')
      .select('shares_amount')
      .eq('transaction_type', 'grant');

    if (existingGrantsError) {
      console.warn('Error fetching existing grants for validation:', existingGrantsError);
    }

    const grantsFromLedger = existingGrants?.reduce((sum, g) => sum + Number(g.shares_amount || 0), 0) || 0;
    const trustShares = Number((capTableData as any).holding_company_shares ?? (capTableData as any).trust_shares ?? 0);
    const founderShares = Number(capTableData.founder_shares || 0);
    const totalAuthorized = Number(capTableData.total_authorized || 70000000);
    
    // Total issued = Trust + Founder + Grants from ledger
    const currentTotalIssued = trustShares + founderShares + grantsFromLedger;
    const currentUnissued = totalAuthorized - currentTotalIssued;

    console.log('Cap table validation (corrected calculation):', {
      total_authorized: totalAuthorized,
      trust_shares: trustShares,
      founder_shares: founderShares,
      grants_from_ledger: grantsFromLedger,
      total_issued: currentTotalIssued,
      total_unissued: currentUnissued,
      requested: shares_amount,
    });

    // Check if we have enough unissued shares
    if (currentUnissued < shares_amount) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient unissued shares in cap table',
          available: currentUnissued,
          requested: shares_amount,
          total_authorized: totalAuthorized,
          total_issued: currentTotalIssued,
          breakdown: {
            trust_shares: trustShares,
            founder_shares: founderShares,
            grants_from_ledger: grantsFromLedger,
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vestingStartDate = start_date || new Date().toISOString().split('T')[0];
    const vestingEndDate = new Date(
      new Date(vestingStartDate).getTime() + vesting_period_months * 30 * 24 * 60 * 60 * 1000
    ).toISOString().split('T')[0];

    // Create vesting schedule
    const vestingSchedule: any[] = [];
    if (vesting_type === 'graded') {
      const monthlyVest = shares_amount / vesting_period_months;
      for (let i = 0; i < vesting_period_months; i++) {
        const vestDate = new Date(
          new Date(vestingStartDate).getTime() + (i + 1) * 30 * 24 * 60 * 60 * 1000
        ).toISOString().split('T')[0];
        vestingSchedule.push({
          date: vestDate,
          shares: Math.floor(monthlyVest),
          vested: false,
        });
      }
    } else if (vesting_type === 'cliff') {
      const cliffDate = new Date(
        new Date(vestingStartDate).getTime() + cliff_months * 30 * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0];
      vestingSchedule.push({
        date: cliffDate,
        shares: shares_amount,
        vested: false,
      });
    } else if (vesting_type === 'immediate') {
      vestingSchedule.push({
        date: vestingStartDate,
        shares: shares_amount,
        vested: true,
      });
    }

    // Create vesting schedule record
    const { data: vestingRecord, error: vestingError } = await supabaseAdmin
      .from('vesting_schedules')
      .insert({
        recipient_user_id: finalRecipientUserId,
        total_shares: shares_amount,
        vesting_type,
        cliff_months,
        vesting_period_months,
        vesting_schedule: vestingSchedule,
        start_date: vestingStartDate,
        end_date: vestingEndDate,
        vested_shares: vesting_type === 'immediate' ? shares_amount : 0,
        unvested_shares: vesting_type === 'immediate' ? 0 : shares_amount,
      })
      .select()
      .single();

    if (vestingError) {
      console.error('Error creating vesting schedule:', vestingError);
      throw vestingError;
    }

    console.log('✓ Vesting schedule created:', vestingRecord.id);

    // Create equity ledger entry for grant
    const { data: ledgerEntry, error: ledgerError } = await supabaseAdmin
      .from('equity_ledger')
      .insert({
        transaction_type: 'grant',
        recipient_user_id: finalRecipientUserId,
        shares_amount,
        share_class,
        price_per_share,
        transaction_date: vestingStartDate,
        effective_date: vestingStartDate,
        resolution_id,
        grant_id: vestingRecord.id, // Link to vesting schedule
        notes: `Equity grant: ${shares_amount} shares, ${vesting_type} vesting over ${vesting_period_months} months`,
      })
      .select()
      .single();

    if (ledgerError) {
      console.error('Error creating equity ledger entry:', ledgerError);
      throw ledgerError;
    }

    console.log('✓ Equity ledger entry created:', ledgerEntry.id);

    // Recalculate cap table correctly after grant creation:
    // Total Issued = Trust shares (already issued) + Founder shares (already issued) + Grants from ledger (including new grant)
    const { data: allGrants, error: grantsError } = await supabaseAdmin
      .from('equity_ledger')
      .select('shares_amount')
      .eq('transaction_type', 'grant');

    if (grantsError) {
      console.error('Error fetching grants for cap table calculation:', grantsError);
      throw grantsError;
    }

    const updatedGrantsFromLedger = allGrants?.reduce((sum, g) => sum + Number(g.shares_amount || 0), 0) || 0;
    const updatedTrustShares = Number((capTableData as any).holding_company_shares ?? (capTableData as any).trust_shares ?? 0);
    const updatedFounderShares = Number(capTableData.founder_shares || 0);
    const updatedTotalAuthorized = Number(capTableData.total_authorized || 70000000);
    
    // Total issued (raw) = Trust + Founder + Grants from ledger (now includes the new grant)
    const totalIssuedRaw = updatedTrustShares + updatedFounderShares + updatedGrantsFromLedger;

    // Clamp totals so we never show more issued than authorized
    const totalIssuedCalculated = Math.min(totalIssuedRaw, updatedTotalAuthorized);
    const totalUnissuedCalculated = Math.max(updatedTotalAuthorized - totalIssuedCalculated, 0);

    console.log('Recalculating cap table (corrected calculation):', {
      total_authorized: updatedTotalAuthorized,
      trust_shares: updatedTrustShares,
      founder_shares: updatedFounderShares,
      grants_from_ledger: updatedGrantsFromLedger,
      total_issued_raw: totalIssuedRaw,
      total_issued_calculated: totalIssuedCalculated,
      total_unissued_calculated: totalUnissuedCalculated,
      grants_count: allGrants?.length || 0,
    });

    const { data: updatedCapTable, error: capTableUpdateError } = await supabaseAdmin
      .from('cap_tables')
      .update({
        total_issued: totalIssuedCalculated,
        total_unissued: totalUnissuedCalculated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', capTableData.id)
      .select()
      .single();

    if (capTableUpdateError) {
      console.error('Error updating cap table:', capTableUpdateError);
      throw capTableUpdateError;
    }

    console.log('✓ Cap table updated successfully:', {
      id: updatedCapTable.id,
      total_issued: updatedCapTable.total_issued,
      total_unissued: updatedCapTable.total_unissued,
    });

    // Log the action
    try {
      await supabaseAdmin.rpc('log_governance_action', {
        p_action_type: 'equity_granted',
        p_action_category: 'equity',
        p_target_type: 'equity_grant',
        p_target_id: vestingRecord.id,
        p_target_name: `${shares_amount} shares granted`,
        p_description: `Equity grant: ${shares_amount} shares to user ${finalRecipientUserId}`,
        p_metadata: {
          shares_amount,
          vesting_type,
          vesting_period_months,
          resolution_id,
          appointment_id,
          vesting_schedule_id: vestingRecord.id,
          ledger_entry_id: ledgerEntry.id,
        },
      });
      console.log('✓ Governance action logged');
    } catch (logError) {
      console.warn('Failed to log governance action (non-critical):', logError);
    }

    // Get recipient user info for response
    let recipientInfo: any = { user_id: finalRecipientUserId };
    try {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(finalRecipientUserId);
      if (user) {
        recipientInfo = {
          user_id: finalRecipientUserId,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email,
        };
      }
    } catch (err) {
      console.warn('Could not fetch recipient user info:', err);
    }

    console.log('✓ Equity grant completed:', {
      recipient: recipientInfo,
      shares_amount,
      vesting_type,
      vesting_schedule_id: vestingRecord.id,
      ledger_entry_id: ledgerEntry.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Equity grant created successfully: ${shares_amount.toLocaleString()} shares granted to ${recipientInfo.email || recipientInfo.user_id}`,
        vesting_schedule: vestingRecord,
        ledger_entry: ledgerEntry,
        cap_table_updated: true,
        shares_granted: shares_amount,
        recipient: recipientInfo,
        recipient_user_id: finalRecipientUserId,
        recipient_email: recipientInfo.email,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in governance-grant-equity:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.details || error.hint || '',
        code: error.code || '',
        name: error.name || 'Error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
