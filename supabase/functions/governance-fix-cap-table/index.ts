import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getCorsHeaders(origin: string | null) {
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin || '*',
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the cap table
    const { data: capTable, error: capTableError } = await supabaseAdmin
      .from('cap_tables')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (capTableError || !capTable) {
      return new Response(
        JSON.stringify({ error: 'Cap table not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total issued shares correctly:
    // Total Issued = Trust shares (already issued) + Founder shares (already issued) + Grants from ledger
    const { data: allGrants, error: grantsError } = await supabaseAdmin
      .from('equity_ledger')
      .select('shares_amount')
      .eq('transaction_type', 'grant');

    if (grantsError) {
      return new Response(
        JSON.stringify({ error: `Error fetching grants: ${grantsError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const grantsFromLedger = allGrants?.reduce((sum, g) => sum + Number(g.shares_amount || 0), 0) || 0;
    const trustShares = Number(capTable.trust_shares || 0);
    const founderShares = Number(capTable.founder_shares || 0);
    const totalAuthorized = Number(capTable.total_authorized || 100000000);
    
    // Total issued = Trust + Founder + Grants from ledger
    const totalIssuedCalculated = trustShares + founderShares + grantsFromLedger;
    const totalUnissuedCalculated = totalAuthorized - totalIssuedCalculated;

    console.log('Recalculating cap table (corrected calculation):', {
      total_authorized: totalAuthorized,
      trust_shares: trustShares,
      founder_shares: founderShares,
      grants_from_ledger: grantsFromLedger,
      total_issued_calculated: totalIssuedCalculated,
      total_unissued_calculated: totalUnissuedCalculated,
      grants_count: allGrants?.length || 0,
      previous_issued: capTable.total_issued,
      previous_unissued: capTable.total_unissued,
    });

    // Update cap table
    const { data: updatedCapTable, error: updateError } = await supabaseAdmin
      .from('cap_tables')
      .update({
        total_issued: totalIssuedCalculated,
        total_unissued: totalUnissuedCalculated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', capTable.id)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Error updating cap table: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cap table recalculated successfully',
        cap_table: updatedCapTable,
        calculation: {
          total_authorized: totalAuthorized,
          trust_shares: trustShares,
          founder_shares: founderShares,
          grants_from_ledger: grantsFromLedger,
          total_issued_calculated: totalIssuedCalculated,
          total_unissued_calculated: totalUnissuedCalculated,
          grants_count: allGrants?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in governance-fix-cap-table:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

