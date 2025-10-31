import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Create Stripe Connect Link - Request received');
    
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

    const body = await req.json().catch(() => ({}));
    const { returnUrl, refreshUrl, restaurantId } = body as { returnUrl?: string; refreshUrl?: string; restaurantId?: string };

    let restaurant: any = null;
    let restaurantError: any = null;

    if (restaurantId) {
      console.log('Fetching restaurant by provided id', { restaurantId });
      const res = await supabase
        .from('restaurants')
        .select('id, name, email, stripe_connect_account_id, owner_id, created_at')
        .eq('id', restaurantId)
        .maybeSingle();
      restaurant = res.data;
      restaurantError = res.error;

      // Security: ensure the authenticated user owns this restaurant
      if (restaurant && restaurant.owner_id !== user.id) {
        console.error('User does not own the specified restaurant');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Fallback: pick most recently created restaurant for this owner (array query to avoid PostgREST single error)
      console.log('Fetching latest restaurant for owner via range(0,0)', { ownerId: user.id });
      const res = await supabase
        .from('restaurants')
        .select('id, name, email, stripe_connect_account_id, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, 0);
      restaurant = res.data?.[0];
      restaurantError = res.error;
    }

    if (restaurantError) {
      console.error('Database error fetching restaurant:', restaurantError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch restaurant data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!restaurant) {
      console.error('No restaurant found for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Restaurant not found. Please complete restaurant setup first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!restaurant.email) {
      console.error('Restaurant missing required email');
      return new Response(
        JSON.stringify({ error: 'Restaurant email required. Please update your restaurant profile.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    let accountId = restaurant.stripe_connect_account_id;

    // Create Stripe Connect account if it doesn't exist
    if (!accountId) {
      console.log('Creating new Stripe Express account');
      try {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: restaurant.email || user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'company',
          metadata: {
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name
          }
        });

        accountId = account.id;
        console.log('Created Stripe account:', accountId);

        // Save account ID to restaurant
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ stripe_connect_account_id: accountId })
          .eq('id', restaurant.id);

        if (updateError) {
          console.error('Failed to save Stripe account ID:', updateError.message);
          throw new Error('Failed to save Stripe account');
        }
        
        console.log('Saved Stripe account ID to database');
      } catch (stripeError: any) {
        const msg: string = stripeError?.raw?.message || String(stripeError?.message || stripeError);
        console.error('Error creating Stripe account:', stripeError);
        const friendly = msg.includes('signed up for Connect')
          ? 'Stripe Connect not enabled for this API key. Please enable Connect in your Stripe dashboard or provide a Connect-enabled secret key.'
          : 'Failed to create Stripe account';
        return new Response(
          JSON.stringify({ error: friendly, details: msg }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('Using existing Stripe account:', accountId);
    }

    // Create account link for onboarding
    console.log('Creating Stripe account onboarding link');
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl || `${returnUrl}?refresh=true` || `${Deno.env.get('SUPABASE_URL')}/merchant-portal`,
        return_url: returnUrl || `${Deno.env.get('SUPABASE_URL')}/merchant-portal`,
        type: 'account_onboarding',
      });

      console.log('Successfully created onboarding link');
      return new Response(
        JSON.stringify({ 
          url: accountLink.url,
          accountId: accountId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } catch (stripeError) {
      console.error('Error creating account link:', stripeError);
      return new Response(
        JSON.stringify({ error: 'Failed to create onboarding link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error creating Stripe Connect link:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
