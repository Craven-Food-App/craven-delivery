import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Link Issuing Card to Driver
 * 
 * Allows authenticated drivers to link a Stripe Issuing card to their account.
 * This is a stub for the full provisioning flow (cardholder + card creation).
 * 
 * In production, you would:
 * 1. Create Stripe Issuing cardholder (if not exists)
 * 2. Create Stripe Issuing card
 * 3. Link card to driver in driver_cards table
 * 
 * For now, this accepts an existing issuing_card_id and links it.
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { issuing_card_id } = await req.json();

    if (!issuing_card_id) {
      throw new Error('Missing issuing_card_id');
    }

    // Use service role for insert
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Link card to driver
    const { data, error } = await supabaseAdmin
      .from('driver_cards')
      .insert({
        driver_id: user.id,
        issuing_card_id,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Card already linked');
      }
      throw error;
    }

    console.log(`[Link Card] Driver ${user.id} linked to card ${issuing_card_id}`);

    return new Response(
      JSON.stringify({ success: true, card: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[Link Card] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});








