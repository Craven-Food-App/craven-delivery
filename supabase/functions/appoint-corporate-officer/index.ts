import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
interface OfficerAppointmentRequest {
  executive_name: string;
  executive_email: string;
  executive_title: 'CEO' | 'CFO' | 'COO' | 'CTO' | 'CXO';
  appointment_date: string;
  equity_percent: string;
  shares_issued: string;
  vesting_schedule?: string;
  strike_price?: string;
  annual_salary?: string;
  defer_salary: boolean;
  funding_trigger?: string;
  photo_url?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: OfficerAppointmentRequest = await req.json();
    const {
      executive_name,
      executive_email,
      executive_title,
      appointment_date,
      equity_percent,
      shares_issued,
      vesting_schedule = '4 years, 1 year cliff',
      strike_price = '0.0001',
      annual_salary = '120000',
      defer_salary,
      funding_trigger,
      photo_url,
    } = payload;

    // Map title to role
    const roleMap: Record<string, string> = {
      'CEO': 'ceo',
      'CFO': 'cfo',
      'COO': 'coo',
      'CTO': 'cto',
      'CXO': 'cxo',
    };
    const role = roleMap[executive_title] || 'board_member';

    // Generate resolution number using the function
    const { data: resolutionNumberData, error: resolutionNumberError } = await supabaseClient
      .rpc('generate_resolution_number');

    if (resolutionNumberError) {
      console.warn('Failed to generate resolution number, using fallback:', resolutionNumberError);
    }

    const resolutionNumber = resolutionNumberData || `BR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    // 1. Create board resolution
    // Store salary and funding_trigger in notes as JSON for document generation
    const appointmentMetadata = {
      annual_salary: annual_salary ? parseFloat(annual_salary) : null,
      funding_trigger: funding_trigger || null,
      defer_salary: defer_salary,
      strike_price: strike_price,
      shares_issued: shares_issued,
      equity_percent: equity_percent,
      vesting_schedule: vesting_schedule,
    };
    
    const { data: resolutionData, error: resolutionError } = await supabaseClient
      .from('board_resolutions')
      .insert({
        resolution_type: 'appointment', // Must be 'appointment', not 'officer_appointment'
        resolution_title: `Appointment of ${executive_name} as ${executive_title}`,
        resolution_number: resolutionNumber,
        subject_person_name: executive_name,
        subject_person_email: executive_email,
        subject_position: executive_title,
        effective_date: appointment_date,
        status: 'approved',
        resolution_text: `BE IT RESOLVED that ${executive_name} is hereby appointed as ${executive_title} of the Company, effective ${appointment_date}, with ${equity_percent}% equity (${shares_issued} shares) subject to ${vesting_schedule} vesting schedule.`,
        notes: JSON.stringify(appointmentMetadata), // Store appointment data for document generation
        board_members: [],
      })
      .select()
      .single();

    if (resolutionError) {
      console.error('Board resolution error:', resolutionError);
      throw new Error(`Failed to create board resolution: ${resolutionError.message}`);
    }

    // 2. Create or update exec_users record
    // Check if exec_user already exists for this role
    const { data: existingExec } = await supabaseClient
      .from('exec_users')
      .select('id, user_id, title, role')
      .eq('role', role)
      .maybeSingle();

    let execData;
    if (existingExec) {
      // Update existing exec_user
      const { data: updatedExec, error: updateError } = await supabaseClient
        .from('exec_users')
        .update({
          title: executive_title,
          role: role,
          photo_url: photo_url,
        })
        .eq('id', existingExec.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Update exec_user error:', updateError);
        throw new Error(`Failed to update exec_user: ${updateError.message}`);
      }
      execData = updatedExec;
    } else {
      // Create new exec_user (user_id can be null initially, will be linked when auth user is created)
      const { data: newExec, error: createError } = await supabaseClient
        .from('exec_users')
        .insert({
          user_id: null, // Will be linked when auth user is created
          title: executive_title,
          role: role,
          department: null,
          access_level: 1,
          photo_url: photo_url,
        })
        .select()
        .single();

      if (createError) {
        console.error('Create exec_user error:', createError);
        throw new Error(`Failed to create exec_user: ${createError.message}`);
      }
      execData = newExec;
    }

    // 3. Try to find user_id from email (needed for equity_ledger and vesting_schedules)
    let recipientUserId: string | null = execData.user_id || null;
    
    if (!recipientUserId && executive_email) {
      console.log(`Searching for user by email: ${executive_email}`);
      const searchEmail = executive_email.toLowerCase().trim();
      
      try {
        const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers();
        
        if (!listError && users && users.length > 0) {
          const foundUser = users.find(u => {
            const userEmail = u.email?.toLowerCase().trim();
            return userEmail === searchEmail;
          });
          
          if (foundUser) {
            recipientUserId = foundUser.id;
            console.log(`✓ Found user: ${recipientUserId} (${foundUser.email})`);
            
            // Update exec_users with the found user_id and email
            await supabaseClient
              .from('exec_users')
              .update({ 
                user_id: recipientUserId,
                email: foundUser.email 
              })
              .eq('id', execData.id);
          } else {
            console.log(`✗ User not found with email: ${executive_email}`);
          }
        }
      } catch (error) {
        console.error('Error searching for user:', error);
      }
    }

    // 4. Parse vesting schedule string to extract parameters
    // Default: "4 years, 1 year cliff" -> graded, 48 months, 12 month cliff
    let vestingType = 'graded';
    let vestingPeriodMonths = 48;
    let cliffMonths = 12;
    
    if (vesting_schedule) {
      const scheduleLower = vesting_schedule.toLowerCase();
      if (scheduleLower.includes('immediate')) {
        vestingType = 'immediate';
        vestingPeriodMonths = 0;
        cliffMonths = 0;
      } else if (scheduleLower.includes('cliff')) {
        vestingType = 'cliff';
        // Extract cliff months (e.g., "1 year cliff" -> 12)
        const cliffMatch = scheduleLower.match(/(\d+)\s*(?:year|yr|month|mo)/);
        if (cliffMatch) {
          const num = parseInt(cliffMatch[1]);
          cliffMonths = scheduleLower.includes('year') ? num * 12 : num;
        }
        // Extract total period (e.g., "4 years" -> 48)
        const periodMatch = scheduleLower.match(/(\d+)\s*(?:year|yr)/);
        if (periodMatch) {
          const num = parseInt(periodMatch[1]);
          vestingPeriodMonths = num * 12;
        }
      } else if (scheduleLower.includes('graded')) {
        vestingType = 'graded';
        const periodMatch = scheduleLower.match(/(\d+)\s*(?:year|yr|month|mo)/);
        if (periodMatch) {
          const num = parseInt(periodMatch[1]);
          vestingPeriodMonths = scheduleLower.includes('year') ? num * 12 : num;
        }
      }
    }

    // 5. Create equity grant for the officer (separate from employees)
    // Officers get equity via equity_grants table, linked to exec_users
    const vestingJson = {
      type: vestingType,
      duration_months: vestingPeriodMonths,
      cliff_months: cliffMonths,
    };

    // Use provided strike_price or default to 0.0001
    const strikePrice = parseFloat(strike_price || '0.0001');
    const sharesIssued = parseInt(shares_issued, 10);
    const totalPurchasePrice = strikePrice * sharesIssued;

    let equityGrantId: string | null = null;
    const { data: equityGrant, error: equityError } = await supabaseClient
      .from('equity_grants')
      .insert({
        executive_id: execData.id,          // Link to exec_users
        employee_id: null,                  // Officers are separate from employees
        granted_by: execData.id,            // Granted via appointment/board action
        grant_date: appointment_date,
        shares_total: sharesIssued,
        shares_percentage: parseFloat(equity_percent),
        share_class: 'Common Stock',
        strike_price: strikePrice,
        vesting_schedule: vestingJson,
        consideration_type: 'Founder/Officer Appointment',
        consideration_value: 0,
        status: 'approved',                 // Auto-approved as part of board resolution
        board_resolution_id: resolutionData.id,
        notes: `Officer appointment equity grant for ${executive_name} as ${executive_title}`,
      })
      .select()
      .single();

    if (equityError) {
      console.error('Equity grant error:', equityError);
      // Do not throw to avoid breaking appointment flow; return without equity_grant_id
    } else {
      equityGrantId = equityGrant?.id || null;
      
      // 6. If user_id is found, create vesting_schedules and equity_ledger entries
      if (recipientUserId && equityGrantId) {
        try {
          // Get or create cap table
          const { data: capTableData, error: capTableError } = await supabaseClient
            .from('cap_tables')
            .select('*')
            .limit(1)
            .maybeSingle();

          if (capTableError && capTableError.code !== 'PGRST116') {
            console.error('Error fetching cap table:', capTableError);
          }

          const vestingStartDate = appointment_date;
          const vestingEndDate = new Date(
            new Date(vestingStartDate).getTime() + vestingPeriodMonths * 30 * 24 * 60 * 60 * 1000
          ).toISOString().split('T')[0];

          // Create vesting schedule array
          const vestingScheduleArray: any[] = [];
          if (vestingType === 'graded') {
            const monthlyVest = sharesIssued / vestingPeriodMonths;
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
          } else if (vestingType === 'cliff') {
            const cliffDate = new Date(
              new Date(vestingStartDate).getTime() + cliffMonths * 30 * 24 * 60 * 60 * 1000
            ).toISOString().split('T')[0];
            vestingScheduleArray.push({
              date: cliffDate,
              shares: sharesIssued,
              vested: false,
            });
          } else if (vestingType === 'immediate') {
            vestingScheduleArray.push({
              date: vestingStartDate,
              shares: sharesIssued,
              vested: true,
            });
          }

          // Create vesting schedule record
          const { data: vestingRecord, error: vestingError } = await supabaseClient
            .from('vesting_schedules')
            .insert({
              recipient_user_id: recipientUserId,
              total_shares: sharesIssued,
              vesting_type: vestingType.toUpperCase(),
              cliff_months: cliffMonths,
              vesting_period_months: vestingPeriodMonths,
              vesting_schedule: vestingScheduleArray,
              start_date: vestingStartDate,
              end_date: vestingEndDate,
              vested_shares: vestingType === 'immediate' ? sharesIssued : 0,
              unvested_shares: vestingType === 'immediate' ? 0 : sharesIssued,
            })
            .select()
            .single();

          if (vestingError) {
            console.error('Error creating vesting schedule:', vestingError);
          } else {
            console.log('✓ Vesting schedule created:', vestingRecord?.id);

            // Create equity ledger entry
            const { data: ledgerEntry, error: ledgerError } = await supabaseClient
              .from('equity_ledger')
              .insert({
                transaction_type: 'grant',
                recipient_user_id: recipientUserId,
                shares_amount: sharesIssued,
                share_class: 'Common',
                price_per_share: strikePrice,
                transaction_date: vestingStartDate,
                effective_date: vestingStartDate,
                resolution_id: resolutionData.id,
                grant_id: vestingRecord?.id, // Link to vesting schedule
                notes: `Officer appointment equity grant: ${sharesIssued} shares, ${vestingType} vesting over ${vestingPeriodMonths} months`,
              })
              .select()
              .single();

            if (ledgerError) {
              console.error('Error creating equity ledger entry:', ledgerError);
            } else {
              console.log('✓ Equity ledger entry created:', ledgerEntry?.id);
            }

            // Update cap table if it exists
            if (capTableData) {
              const currentUnissued = Number(capTableData.total_unissued || 0);
              const currentIssued = Number(capTableData.total_issued || 0);
              const newUnissued = currentUnissued - sharesIssued;
              const newIssued = currentIssued + sharesIssued;

              if (newUnissued >= 0) {
                await supabaseClient
                  .from('cap_tables')
                  .update({
                    total_unissued: newUnissued,
                    total_issued: newIssued,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', capTableData.id);
                console.log('✓ Cap table updated');
              } else {
                console.warn('⚠ Insufficient unissued shares in cap table');
              }
            }
          }
        } catch (error) {
          console.error('Error creating vesting/ledger entries:', error);
          // Don't throw - equity_grants entry was created successfully
        }
      } else {
        console.log('⚠ User ID not found, skipping vesting_schedules and equity_ledger creation. These can be created later when user account is set up.');
      }
    }

    // 4. Documents will be generated by the frontend using the proper templates
    // when the user clicks "Send Docs" in GenerateOfficerDocuments component
    // This ensures all documents use the templates from src/lib/templates.ts

    return new Response(
      JSON.stringify({
        success: true,
        officer_id: execData.id,
        resolution_id: resolutionData.id,
        equity_grant_id: equityGrantId,
        message: `${executive_name} successfully appointed as ${executive_title}`,
        price_per_share: strikePrice.toFixed(4),
        total_purchase_price: totalPurchasePrice.toFixed(2),
        note: 'Documents will be generated using proper templates when you click "Send Docs" in the Board Portal.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error appointing officer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// Helper function to format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

