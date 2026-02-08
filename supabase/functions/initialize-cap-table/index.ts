import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    console.log('Initializing cap table...');

    // Check if cap table exists
    const { data: existingCapTable, error: checkError } = await supabaseAdmin
      .from('cap_tables')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking cap table:', checkError);
      return new Response(
        JSON.stringify({ error: `Failed to check cap table: ${checkError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingCapTable) {
      console.log('Cap table already exists');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Cap table already exists',
          capTable: existingCapTable,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create cap table using the actual schema columns
    // Note: cap_tables schema has: total_authorized (not total_authorized_shares), 
    // total_issued (not total_issued_shares), and no company_name column
    const { data: newCapTable, error: createError } = await supabaseAdmin
      .from('cap_tables')
      .insert({
        total_authorized: 100000000, // 100 million (using correct column name)
        par_value: 0.0001,
        total_issued: 0, // using correct column name
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

    console.log('Cap table created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cap table initialized successfully',
        capTable: newCapTable,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in initialize-cap-table:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

