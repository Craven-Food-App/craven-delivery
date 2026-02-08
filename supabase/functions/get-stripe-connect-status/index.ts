import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Get Stripe Connect Status - Request received');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Get restaurant for this user (pick most recently created)
    const { data: restaurantsData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, stripe_connect_account_id, stripe_onboarding_complete')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (restaurantError) {
      console.error('Database error fetching restaurant:', restaurantError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch restaurant data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const restaurant = restaurantsData?.[0];

    if (!restaurant) {
      console.log('No restaurant found for user:', user.id);
      return new Response(
        JSON.stringify({
          hasAccount: false,
          accountId: null,
          onboardingComplete: false,
          detailsSubmitted: false,
          chargesEnabled: false,
          payoutsEnabled: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no Stripe account exists yet
    if (!restaurant.stripe_connect_account_id) {
      console.log('No Stripe account connected for restaurant');
      return new Response(
        JSON.stringify({ 
          hasAccount: false,
          onboardingComplete: false,
          accountId: null,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Fetch account details from Stripe
    console.log('Fetching Stripe account:', restaurant.stripe_connect_account_id);
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('Stripe secret key not configured');
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const account = await stripe.accounts.retrieve(restaurant.stripe_connect_account_id);
    
    // Update restaurant with latest Stripe status
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
        stripe_onboarding_complete: account.details_submitted && account.charges_enabled && account.payouts_enabled
      })
      .eq('id', restaurant.id);

    if (updateError) {
      console.error('Failed to update restaurant Stripe status:', updateError.message);
    } else {
      console.log('Successfully updated Stripe status in database');
    }

    return new Response(
      JSON.stringify({
        hasAccount: true,
        accountId: account.id,
        onboardingComplete: account.details_submitted && account.charges_enabled && account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        externalAccounts: account.external_accounts?.data || [],
        requirements: account.requirements
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error getting Stripe Connect status:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
