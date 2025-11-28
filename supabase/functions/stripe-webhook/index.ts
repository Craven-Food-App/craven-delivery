import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    console.error('Missing signature or webhook secret');
    return new Response('Webhook signature or secret missing', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log('Received Stripe webhook event:', event.type);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log('Account updated:', account.id);

        const { error } = await supabase
          .from('restaurants')
          .update({
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_onboarding_complete: account.details_submitted
          })
          .eq('stripe_connect_account_id', account.id);

        if (error) {
          console.error('Failed to update restaurant:', error);
        } else {
          console.log('Successfully synced account status to database');
        }
        break;
      }

      case 'account.external_account.created': {
        const externalAccount = event.data.object;
        console.log('External account created for account:', externalAccount.account);
        
        // Optionally store external account details
        const { error } = await supabase
          .from('restaurants')
          .update({
            stripe_onboarding_complete: true
          })
          .eq('stripe_connect_account_id', externalAccount.account);

        if (error) {
          console.error('Failed to update restaurant:', error);
        }
        break;
      }

      case 'account.external_account.deleted': {
        const externalAccount = event.data.object;
        console.log('External account deleted for account:', externalAccount.account);
        break;
      }

      case 'capability.updated': {
        const capability = event.data.object as Stripe.Capability;
        console.log('Capability updated:', capability.id, 'Status:', capability.status);

        // Fetch the full account to get current status
        const account = await stripe.accounts.retrieve(capability.account as string);
        
        const { error } = await supabase
          .from('restaurants')
          .update({
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
          })
          .eq('stripe_connect_account_id', account.id);

        if (error) {
          console.error('Failed to update restaurant capabilities:', error);
        } else {
          console.log('Successfully synced capability status');
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
