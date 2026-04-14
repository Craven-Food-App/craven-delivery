import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

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

    console.log('Starting equity grants sync...');

    // Get all equity_grants that don't have corresponding equity_ledger entries
    // Also include 'draft' status grants in case they were created but not properly synced
    const { data: equityGrants, error: grantsError } = await supabaseAdmin
      .from('equity_grants')
      .select(`
        id,
        executive_id,
        employee_id,
        grant_date,
        shares_total,
        shares_percentage,
        share_class,
        strike_price,
        vesting_schedule,
        status,
        board_resolution_id,
        notes,
        exec_users!equity_grants_executive_id_fkey (
          id,
          user_id,
          title,
          role,
          email
        )
      `)
      .in('status', ['approved', 'draft'])
      .order('grant_date', { ascending: true });

    if (grantsError) {
      console.error('Error fetching equity grants:', grantsError);
      throw grantsError;
    }

    if (!equityGrants || equityGrants.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No equity grants found to sync',
          synced: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${equityGrants.length} equity grants to process`);

    let syncedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Get all users for email lookup
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const usersMap = new Map(users?.map(u => [u.email?.toLowerCase(), u.id]) || []);

    for (const grant of equityGrants) {
      try {
        // Skip the generic check - we'll check per-user below

        // Get recipient user_id
        let recipientUserId: string | null = null;
        
        // Try to get from exec_users
        const execUser = grant.exec_users as { user_id?: string | null; title?: string; role?: string; email?: string } | null;
        
        // First priority: exec_users.user_id
        if (execUser?.user_id && typeof execUser.user_id === 'string') {
          recipientUserId = execUser.user_id;
        }
        // Second priority: exec_users.email -> lookup in usersMap
        else if (execUser?.email && typeof execUser.email === 'string') {
          recipientUserId = usersMap.get(execUser.email.toLowerCase()) || null;
        }
        // Third priority: employees table
        else if (grant.employee_id) {
          const { data: employee, error: empError } = await supabaseAdmin
            .from('employees')
            .select('user_id, email')
            .eq('id', grant.employee_id)
            .maybeSingle();

          if (!empError && employee?.user_id && typeof employee.user_id === 'string') {
            recipientUserId = employee.user_id;
          } else if (!empError && employee?.email && typeof employee.email === 'string') {
            recipientUserId = usersMap.get(employee.email.toLowerCase()) || null;
          }
        }
        
        // Fourth priority: Match by role/title to known executives
        if (!recipientUserId && execUser) {
          const role = execUser.role?.toLowerCase() || '';
          const title = (execUser.title as string)?.toLowerCase() || '';
          
          // Known executive emails
          if (role === 'cfo' || title.includes('cfo') || title.includes('chief financial')) {
            recipientUserId = usersMap.get('jsweet.cfo@cravenusa.com') || null;
            if (!recipientUserId) {
              for (const [email, userId] of usersMap.entries()) {
                if (email.includes('jsweet') || email.includes('cfo')) {
                  recipientUserId = userId;
                  break;
                }
              }
            }
          } else if (role === 'cto' || title.includes('cto') || title.includes('chief technology')) {
            recipientUserId = usersMap.get('natecurry.cto@cravenusa.com') || null;
            if (!recipientUserId) {
              for (const [email, userId] of usersMap.entries()) {
                if (email.includes('natecurry') || email.includes('nathan') || email.includes('cto')) {
                  recipientUserId = userId;
                  break;
                }
              }
            }
          }
          
          // Fifth priority: Search user_profiles by name/role
          if (!recipientUserId) {
            let searchTerms = '';
            if (role === 'cfo') {
              searchTerms = `email.ilike.%jsweet%,email.ilike.%cfo%,full_name.ilike.%justin%,full_name.ilike.%sweet%`;
            } else if (role === 'cto') {
              searchTerms = `email.ilike.%natecurry%,email.ilike.%nathan%,email.ilike.%cto%,full_name.ilike.%nathan%,full_name.ilike.%curry%`;
            } else {
              searchTerms = `email.ilike.%${role}%,full_name.ilike.%${role}%`;
            }
            
            const { data: profiles, error: profileError } = await supabaseAdmin
              .from('user_profiles')
              .select('user_id, email, full_name')
              .or(searchTerms);
            
            if (!profileError && profiles && profiles.length > 0) {
              const exactMatch = profiles.find((p: any) => {
                const email = String(p?.email || '').toLowerCase();
                const fullName = String(p?.full_name || '').toLowerCase();
                if (role === 'cfo') {
                  return email.includes('jsweet') || fullName.includes('justin sweet');
                } else if (role === 'cto') {
                  return email.includes('natecurry') || email.includes('nathan') || fullName.includes('nathan curry');
                }
                return false;
              });
              const matchedUserId = exactMatch?.user_id || profiles[0]?.user_id;
              recipientUserId = (matchedUserId && typeof matchedUserId === 'string') ? matchedUserId : null;
            }
          }
        }

        if (!recipientUserId) {
          console.warn(`⚠ Grant ${grant.id}: No user_id found for exec_user ${grant.executive_id}, skipping`);
          console.warn(`  - exec_users.user_id: ${execUser?.user_id || 'null'}`);
          console.warn(`  - exec_users.email: ${execUser?.email || 'null'}`);
          console.warn(`  - exec_users.role: ${execUser?.role || 'null'}`);
          skippedCount++;
          continue;
        }

        console.log(`✓ Grant ${grant.id}: Found user_id ${recipientUserId} for ${execUser?.role || 'executive'}`);

        // Check if ledger entry already exists for this user and grant
        const { data: existingUserLedger, error: userLedgerError } = await supabaseAdmin
          .from('equity_ledger')
          .select('id')
          .eq('recipient_user_id', recipientUserId)
          .eq('transaction_type', 'grant')
          .eq('shares_amount', grant.shares_total)
          .eq('transaction_date', grant.grant_date)
          .maybeSingle();

        if (userLedgerError) {
          console.error(`Error checking user ledger for grant ${grant.id}:`, userLedgerError);
          errors.push(`Grant ${grant.id}: ${userLedgerError.message}`);
          skippedCount++;
          continue;
        }

        if (existingUserLedger) {
          console.log(`✓ Grant ${grant.id}: Ledger entry already exists`);
          syncedCount++;
          continue;
        }

        // Parse vesting schedule
        const vestingSchedule = grant.vesting_schedule || {};
        let vestingType = 'GRADED';
        let vestingPeriodMonths = 48;
        let cliffMonths = 12;
        let vestedShares = 0;
        let unvestedShares = grant.shares_total;

        if (typeof vestingSchedule === 'object') {
          if (vestingSchedule.type === 'immediate' || vestingSchedule.type === 'IMMEDIATE') {
            vestingType = 'IMMEDIATE';
            vestedShares = grant.shares_total;
            unvestedShares = 0;
          } else if (vestingSchedule.type === 'cliff' || vestingSchedule.type === 'CLIFF') {
            vestingType = 'CLIFF';
            cliffMonths = vestingSchedule.cliff_months || 12;
            vestingPeriodMonths = vestingSchedule.duration_months || 48;
          } else if (vestingSchedule.type === 'graded' || vestingSchedule.type === 'GRADED') {
            vestingType = 'GRADED';
            vestingPeriodMonths = vestingSchedule.duration_months || 48;
            cliffMonths = vestingSchedule.cliff_months || 0;
          }
        } else if (typeof vestingSchedule === 'string') {
          const scheduleLower = vestingSchedule.toLowerCase();
          if (scheduleLower.includes('immediate')) {
            vestingType = 'IMMEDIATE';
            vestedShares = grant.shares_total;
            unvestedShares = 0;
          }
        }

        const vestingStartDate = grant.grant_date;
        const vestingEndDate = new Date(
          new Date(vestingStartDate).getTime() + vestingPeriodMonths * 30 * 24 * 60 * 60 * 1000
        ).toISOString().split('T')[0];

        // Create vesting schedule array
        const vestingScheduleArray: any[] = [];
        if (vestingType === 'GRADED') {
          const monthlyVest = grant.shares_total / vestingPeriodMonths;
          for (let i = 0; i < vestingPeriodMonths; i++) {
            const vestDate = new Date(
              new Date(vestingStartDate).getTime() + (i + 1) * 30 * 24 * 60 * 60 * 1000
            ).toISOString().split('T')[0];
            vestingScheduleArray.push({
              date: vestDate,
              shares: Math.floor(monthlyVest),
              vested: false,
            });
          }
        } else if (vestingType === 'CLIFF') {
          const cliffDate = new Date(
            new Date(vestingStartDate).getTime() + cliffMonths * 30 * 24 * 60 * 60 * 1000
          ).toISOString().split('T')[0];
          vestingScheduleArray.push({
            date: cliffDate,
            shares: grant.shares_total,
            vested: false,
          });
        } else if (vestingType === 'IMMEDIATE') {
          vestingScheduleArray.push({
            date: vestingStartDate,
            shares: grant.shares_total,
            vested: true,
          });
        }

        // Check if vesting schedule already exists
        const { data: existingVesting, error: vestingCheckError } = await supabaseAdmin
          .from('vesting_schedules')
          .select('id')
          .eq('recipient_user_id', recipientUserId)
          .eq('total_shares', grant.shares_total)
          .maybeSingle();

        let vestingScheduleId: string | null = null;

        if (existingVesting) {
          vestingScheduleId = existingVesting.id;
          console.log(`✓ Grant ${grant.id}: Using existing vesting schedule`);
        } else {
          // Create vesting schedule
          const { data: vestingRecord, error: vestingError } = await supabaseAdmin
            .from('vesting_schedules')
            .insert({
              recipient_user_id: recipientUserId,
              total_shares: grant.shares_total,
              vesting_type: vestingType,
              cliff_months: cliffMonths,
              vesting_period_months: vestingPeriodMonths,
              vesting_schedule: vestingScheduleArray,
              start_date: vestingStartDate,
              end_date: vestingEndDate,
              vested_shares: vestedShares,
              unvested_shares: unvestedShares,
            })
            .select()
            .single();

          if (vestingError) {
            console.error(`Error creating vesting schedule for grant ${grant.id}:`, vestingError);
            errors.push(`Grant ${grant.id}: Vesting schedule error - ${vestingError.message}`);
            skippedCount++;
            continue;
          }

          vestingScheduleId = vestingRecord?.id || null;
          console.log(`✓ Grant ${grant.id}: Created vesting schedule`);
        }

        // Create equity ledger entry
        const shareClass = grant.share_class?.replace(' Stock', '').toUpperCase() || 'COMMON';
        
        const { data: ledgerEntry, error: ledgerError } = await supabaseAdmin
          .from('equity_ledger')
          .insert({
            transaction_type: 'grant',
            recipient_user_id: recipientUserId,
            shares_amount: grant.shares_total,
            share_class: shareClass,
            price_per_share: grant.strike_price || 0.001,
            transaction_date: vestingStartDate,
            effective_date: vestingStartDate,
            resolution_id: grant.board_resolution_id,
            grant_id: vestingScheduleId, // Link to vesting schedule
            notes: grant.notes || `Equity grant: ${grant.shares_total} shares, ${vestingType.toLowerCase()} vesting`,
          })
          .select()
          .single();

        if (ledgerError) {
          console.error(`Error creating ledger entry for grant ${grant.id}:`, ledgerError);
          errors.push(`Grant ${grant.id}: Ledger error - ${ledgerError.message}`);
          skippedCount++;
          continue;
        }

        console.log(`✓ Grant ${grant.id}: Created equity ledger entry`);
        syncedCount++;

      } catch (error: any) {
        console.error(`Error processing grant ${grant.id}:`, error);
        errors.push(`Grant ${grant.id}: ${error.message}`);
        skippedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${syncedCount} equity grants`,
        synced: syncedCount,
        skipped: skippedCount,
        total: equityGrants.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in sync-equity-grants:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

