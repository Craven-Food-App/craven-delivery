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
      refresh_url, // optional: where to redirect if onboarding needs refresh
      return_url, // optional: where to redirect after onboarding complete
    } = await req.json();

    console.log(`Creating Stripe Express account for ${owner_type}:`, owner_id);

    // Check if account already exists
    const { data: existing } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id')
      .eq('owner_type', owner_type)
      .eq('owner_id', owner_id)
      .single();

    if (existing?.stripe_account_id) {
      // Account exists - generate new onboarding link
      const appUrl = Deno.env.get('APP_URL') || 'https://cravenusa.com';
      const accountLink = await stripe.accountLinks.create({
        account: existing.stripe_account_id,
        refresh_url: refresh_url || `${appUrl}/onboarding/refresh`,
        return_url: return_url || `${appUrl}/onboarding/complete`,
        type: 'account_onboarding',
      });

      return new Response(
        JSON.stringify({ 
          stripe_account_id: existing.stripe_account_id,
          onboarding_url: accountLink.url,
          message: 'Account already exists - new onboarding link generated' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Express Connect account (Stripe handles KYC/compliance)
    const accountParams: Stripe.AccountCreateParams = {
      type: 'express', // Express = Stripe handles onboarding/compliance
      country: 'US',
      email: email,
      capabilities: {
        transfers: { requested: true }, // ONLY transfers (no card_payments)
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

    console.log('Stripe Express account created:', account.id);

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

    // Generate onboarding link
    const appUrl = Deno.env.get('APP_URL') || 'https://cravenusa.com';
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refresh_url || `${appUrl}/onboarding/refresh`,
      return_url: return_url || `${appUrl}/onboarding/complete`,
      type: 'account_onboarding',
    });

    console.log('Onboarding link created:', accountLink.url);

    return new Response(
      JSON.stringify({
        stripe_account_id: account.id,
        onboarding_url: accountLink.url,
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

