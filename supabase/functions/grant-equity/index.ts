import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if user has board member or CEO role
    const { data: execUser, error: execError } = await supabase
      .from('exec_users')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (execError || !execUser || !['board_member', 'ceo'].includes(execUser.role)) {
      throw new Error('Only board members and CEO can grant equity');
    }

    const {
      executive_id,
      employee_id,
      shares_total,
      shares_percentage,
      share_class,
      strike_price,
      vesting_schedule,
      consideration_type,
      consideration_value,
      grant_date,
      notes,
    } = await req.json();

    // Validate total cap table doesn't exceed 100%
    const { data: existingEquity } = await supabase
      .from('employee_equity')
      .select('shares_percentage');

    const currentTotal = existingEquity?.reduce((sum, eq) => sum + (eq.shares_percentage || 0), 0) || 0;
    
    if (currentTotal + shares_percentage > 100) {
      return new Response(
        JSON.stringify({ 
          error: `Cap table would exceed 100%. Current: ${currentTotal}%, Proposed: ${shares_percentage}%` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create equity grant
    const { data: grant, error: grantError } = await supabase
      .from('equity_grants')
      .insert({
        executive_id,
        employee_id,
        granted_by: execUser.id,
        grant_date: grant_date || new Date().toISOString().split('T')[0],
        shares_total,
        shares_percentage,
        share_class: share_class || 'Common Stock',
        strike_price,
        vesting_schedule,
        consideration_type,
        consideration_value,
        status: 'draft',
        notes,
      })
      .select()
      .single();

    if (grantError) {
      console.error('Grant creation error:', grantError);
      throw grantError;
    }

    // Create audit trail
    await supabase.from('equity_grant_history').insert({
      grant_id: grant.id,
      changed_by: execUser.id,
      change_type: 'created',
      new_values: grant,
      reason: 'Initial grant creation',
    });

    console.log('Equity grant created:', grant.id);

    return new Response(
      JSON.stringify({ success: true, grant }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in grant-equity:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
