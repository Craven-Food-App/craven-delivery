import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

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
      shares_amount,
      share_class = 'Common',
      resolution_id,
      appointment_id,
      grant_id,
    } = body;

    if (!recipient_user_id || !shares_amount) {
      return new Response(
        JSON.stringify({ error: 'Missing recipient_user_id or shares_amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate certificate
    const certResponse = await fetch(`${supabaseUrl}/functions/v1/governance-generate-certificate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        recipient_user_id,
        shares_amount,
        share_class,
        resolution_id,
        appointment_id,
      }),
    });

    if (!certResponse.ok) {
      const error = await certResponse.json();
      throw new Error(`Failed to generate certificate: ${error.error || 'Unknown error'}`);
    }

    const { certificate_id, certificate_number } = await certResponse.json();

    // Create equity ledger entry for issuance
    const { data: ledgerEntry, error: ledgerError } = await supabaseAdmin
      .from('equity_ledger')
      .insert({
        transaction_type: 'issuance',
        grant_id,
        recipient_user_id,
        shares_amount,
        share_class,
        transaction_date: new Date().toISOString().split('T')[0],
        effective_date: new Date().toISOString().split('T')[0],
        resolution_id,
        certificate_id,
        notes: `Share issuance: ${shares_amount} shares, Certificate ${certificate_number}`,
      })
      .select()
      .single();

    if (ledgerError) {
      throw ledgerError;
    }

    // Update cap table (issued shares)
    const { data: capTable } = await supabaseAdmin
      .from('cap_tables')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (capTable) {
      await supabaseAdmin
        .from('cap_tables')
        .update({
          total_issued: capTable.total_issued + shares_amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', capTable.id);
    }

    // Log the action
    await supabaseAdmin.rpc('log_governance_action', {
      p_action_type: 'shares_issued',
      p_action_category: 'equity',
      p_target_type: 'certificate',
      p_target_id: certificate_id,
      p_target_name: `Certificate ${certificate_number}`,
      p_description: `Issued ${shares_amount} shares, Certificate ${certificate_number}`,
      p_metadata: {
        shares_amount,
        certificate_number,
        resolution_id,
        appointment_id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Shares issued and certificate generated',
        certificate_id,
        certificate_number,
        ledger_entry: ledgerEntry,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in governance-issue-shares:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

