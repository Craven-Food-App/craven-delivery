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

    // 3. Create equity grant for the officer (separate from employees)
    // Officers get equity via equity_grants table, linked to exec_users
    const vestingJson = (vesting_schedule && typeof vesting_schedule === 'string')
      ? { type: vesting_schedule, duration_months: 0 }
      : { type: 'none', duration_months: 0 };

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
        shares_total: parseInt(shares_issued, 10),
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

