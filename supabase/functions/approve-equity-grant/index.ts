import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

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
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (execError || !execUser || !['board_member', 'ceo'].includes(execUser.role)) {
      throw new Error('Only board members and CEO can approve equity grants');
    }

    const { grant_id } = await req.json();

    // Fetch the grant
    const { data: grant, error: grantError } = await supabase
      .from('equity_grants')
      .select('*')
      .eq('id', grant_id)
      .single();

    if (grantError || !grant) {
      throw new Error('Grant not found');
    }

    if (grant.status !== 'draft') {
      throw new Error('Only draft grants can be approved');
    }

    // Update or create employee_equity record
    const { data: existingEquity } = await supabase
      .from('employee_equity')
      .select('id')
      .eq('employee_id', grant.employee_id)
      .single();

    if (existingEquity) {
      // Update existing
      await supabase
        .from('employee_equity')
        .update({
          shares_total: grant.shares_total,
          shares_percentage: grant.shares_percentage,
          equity_type: grant.share_class,
          strike_price: grant.strike_price,
          vesting_schedule: grant.vesting_schedule,
          grant_date: grant.grant_date,
        })
        .eq('id', existingEquity.id);
    } else {
      // Create new
      await supabase
        .from('employee_equity')
        .insert({
          employee_id: grant.employee_id,
          shares_total: grant.shares_total,
          shares_percentage: grant.shares_percentage,
          equity_type: grant.share_class,
          strike_price: grant.strike_price,
          vesting_schedule: grant.vesting_schedule,
          grant_date: grant.grant_date,
        });
    }

    // Update grant status
    const { data: updatedGrant, error: updateError } = await supabase
      .from('equity_grants')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', grant_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create audit trail
    await supabase.from('equity_grant_history').insert({
      grant_id: grant.id,
      changed_by: user.id,
      change_type: 'approved',
      old_values: { status: 'draft' },
      new_values: { status: 'approved', approved_at: new Date().toISOString() },
      reason: 'Grant approved by board',
    });

    console.log('Equity grant approved:', grant_id);

    return new Response(
      JSON.stringify({ success: true, grant: updatedGrant }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in approve-equity-grant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
