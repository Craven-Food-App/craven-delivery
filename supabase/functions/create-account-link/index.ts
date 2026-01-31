import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
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
    const { stripe_account_id, refresh_url, return_url } = await req.json();

    console.log('Creating account link for:', stripe_account_id);

    const appUrl = Deno.env.get('APP_URL') || 'https://cravenusa.com';

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: stripe_account_id,
      refresh_url: refresh_url || `${appUrl}/onboarding/refresh`,
      return_url: return_url || `${appUrl}/onboarding/complete`,
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating account link:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

