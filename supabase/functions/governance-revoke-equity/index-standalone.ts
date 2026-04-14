import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS helper (inline version for dashboard deployment)
const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = [
    "https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com",
    "https://cravenusa.com",
    "https://www.cravenusa.com",
    "https://feeder.cravenusa.com",
    "https://merchant.cravenusa.com",
    "https://board.cravenusa.com",
    "https://hq.cravenusa.com",
    "https://ceo.cravenusa.com",
    "https://cfo.cravenusa.com",
    "https://coo.cravenusa.com",
    "https://cto.cravenusa.com",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:5173",
  ];
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

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

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { recipient_user_id, recipient_email, reason = 'Termination of employment' } = body;

    // Find the user
    let userId = recipient_user_id;
    if (!userId && recipient_email) {
      const { data: user } = await supabaseAdmin.auth.admin.getUserByEmail(recipient_email);
      if (!user?.user) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = user.user.id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'recipient_user_id or recipient_email required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find all grants for this user
    const { data: grants, error: grantsError } = await supabaseAdmin
      .from('equity_ledger')
      .select('id, shares_amount, share_class, transaction_date, grant_id')
      .eq('recipient_user_id', userId)
      .eq('transaction_type', 'grant');

    if (grantsError) {
      return new Response(
        JSON.stringify({ error: `Error fetching grants: ${grantsError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!grants || grants.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No grants found for this user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalRevoked = grants.reduce((sum, g) => sum + Number(g.shares_amount || 0), 0);

    // Create revocation entries in equity_ledger
    const revocationEntries = grants.map(grant => ({
      transaction_type: 'cancellation',
      recipient_user_id: userId,
      shares_amount: grant.shares_amount,
      share_class: grant.share_class || 'Common',
      price_per_share: 0.001,
      transaction_date: new Date().toISOString().split('T')[0],
      effective_date: new Date().toISOString().split('T')[0],
      grant_id: grant.grant_id,
      notes: `Equity revocation: ${grant.shares_amount} shares revoked. Reason: ${reason}`,
    }));

    const { data: revocations, error: revokeError } = await supabaseAdmin
      .from('equity_ledger')
      .insert(revocationEntries)
      .select();

    if (revokeError) {
      return new Response(
        JSON.stringify({ error: `Error creating revocation entries: ${revokeError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log in governance_logs (using correct column names)
    await supabaseAdmin
      .from('governance_logs')
      .insert({
        action: 'equity_revoked',
        entity_type: 'user',
        entity_id: userId,
        description: `Revoked ${totalRevoked.toLocaleString()} shares. Reason: ${reason}`,
        data: {
          shares_revoked: totalRevoked,
          grants_revoked: grants.length,
          reason: reason,
          target_name: recipient_email || userId,
          action_category: 'equity',
        },
      });

    // Recalculate cap table
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

      await supabaseAdmin
        .from('cap_tables')
        .update({
          total_issued: totalIssuedCalculated,
          total_unissued: totalUnissuedCalculated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', capTable.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully revoked ${totalRevoked.toLocaleString()} shares`,
        shares_revoked: totalRevoked,
        grants_revoked: grants.length,
        revocations: revocations,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in governance-revoke-equity:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


