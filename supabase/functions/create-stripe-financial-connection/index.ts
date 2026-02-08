import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const { restaurantId } = await req.json();

    console.log('Creating Stripe Financial Connections session for restaurant:', restaurantId);

    // Create a Financial Connections Session
    const session = await stripe.financialConnections.sessions.create({
      account_holder: {
        type: 'customer',
        customer: restaurantId,
      },
      permissions: ['payment_method', 'balances'],
      filters: {
        countries: ['US'],
      },
    });

    console.log('Financial Connections session created:', session.id);

    return new Response(
      JSON.stringify({
        clientSecret: session.client_secret,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating Financial Connections session:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Failed to create session' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
