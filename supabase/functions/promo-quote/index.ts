// Edge Function: promo-quote
// Returns promo eligibility and quote for frontend display
// Does NOT reserve - that happens in create-order

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body (cart totals for preview)
    const { food_subtotal_cents, delivery_fee_cents, service_fee_cents } = await req.json();

    // Call RPC to get promo offer
    const { data: offer, error: offerError } = await supabase.rpc('get_promo_offer', {
      p_user_id: user.id,
    });

    if (offerError) {
      console.error('Error getting promo offer:', offerError);
      return new Response(
        JSON.stringify({ error: 'Failed to get promo offer', details: offerError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If not eligible, return early
    if (!offer.eligible) {
      return new Response(
        JSON.stringify({
          eligible: false,
          reason: offer.reason,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate preview of credit application (same logic as reserve, but non-binding)
    const deliveryCapCents = offer.delivery_cap_cents || 300;
    const creditCents = offer.next_credit_cents || 0;

    let deliveryCreditCents = 0;
    let serviceCreditCents = 0;

    if (food_subtotal_cents >= offer.min_subtotal_cents) {
      // Apply to delivery fee (up to cap)
      deliveryCreditCents = Math.min(
        delivery_fee_cents || 0,
        deliveryCapCents,
        creditCents
      );

      // Apply remainder to service fee
      serviceCreditCents = Math.min(
        service_fee_cents || 0,
        creditCents - deliveryCreditCents
      );
    }

    const totalCreditCents = deliveryCreditCents + serviceCreditCents;

    return new Response(
      JSON.stringify({
        eligible: true,
        next_step: offer.next_step,
        next_credit_cents: creditCents,
        preview: {
          delivery_credit_cents: deliveryCreditCents,
          service_credit_cents: serviceCreditCents,
          total_credit_cents: totalCreditCents,
        },
        expires_at: offer.expires_at,
        min_subtotal_cents: offer.min_subtotal_cents,
        completed_orders: offer.completed_orders,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in promo-quote:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});











