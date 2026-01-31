import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

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

    const { 
      owner_type, // 'restaurant' | 'driver'
      owner_id,
      email,
      business_name, // for restaurants
      first_name, // for drivers
      last_name, // for drivers
    } = await req.json();

    console.log(`Creating Stripe Custom account for ${owner_type}:`, owner_id);

    // Check if account already exists
    const { data: existing } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id')
      .eq('owner_type', owner_type)
      .eq('owner_id', owner_id)
      .single();

    if (existing?.stripe_account_id) {
      return new Response(
        JSON.stringify({ 
          stripe_account_id: existing.stripe_account_id,
          message: 'Account already exists' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Custom Connect account (transfers only, NO card_payments)
    const accountParams: Stripe.AccountCreateParams = {
      type: 'custom',
      country: 'US',
      email: email,
      capabilities: {
        transfers: { requested: true }, // ONLY transfers
      },
      business_type: owner_type === 'restaurant' ? 'company' : 'individual',
      metadata: {
        owner_type,
        owner_id,
        platform: 'cravenusa',
      },
    };

    if (owner_type === 'restaurant') {
      accountParams.company = { name: business_name };
    } else {
      accountParams.individual = {
        email: email,
        first_name: first_name,
        last_name: last_name,
      };
    }

    const account = await stripe.accounts.create(accountParams);

    console.log('Stripe Custom account created:', account.id);

    // Store in database
    const { data: stripeAccount, error: dbError } = await supabase
      .from('stripe_accounts')
      .insert({
        owner_type,
        owner_id,
        stripe_account_id: account.id,
        details_submitted: account.details_submitted || false,
        payouts_enabled: account.payouts_enabled || false,
        charges_enabled: account.charges_enabled || false,
        requirements: account.requirements || {},
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to store account: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({
        stripe_account_id: account.id,
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating connected account:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

