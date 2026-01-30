import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { checkRateLimit, RateLimitPresets, addRateLimitHeaders } from '../_shared/rateLimit.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  // SECURITY: Webhooks don't use CORS but need rate limiting
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // SECURITY: Rate limiting for webhook (30 per minute)
  const rateLimitResult = await checkRateLimit(req, supabase, RateLimitPresets.API);
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ 
        error: 'Too many webhook requests',
        resetIn: rateLimitResult.resetIn 
      }),
      { status: 429 }
    );
  }

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

      // CraveMore subscription events
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const planKey = session.metadata?.plan_key;
        const userId = session.metadata?.user_id;
        const foundingMember = session.metadata?.founding_member === 'true';

        if (!planKey || !userId) {
          console.log('Missing plan_key or user_id in checkout session metadata');
          break;
        }

        console.log('Processing CraveMore checkout completion:', { planKey, userId, foundingMember });

        if (planKey === 'lifetime') {
          // Handle lifetime one-time payment
          const { error: membershipError } = await supabase
            .from('user_memberships')
            .upsert({
              user_id: userId,
              plan_key: planKey,
              status: 'active',
              started_at: new Date().toISOString(),
              renews_at: null, // Lifetime never renews
              provider: 'stripe',
              provider_customer_id: session.customer as string,
              provider_subscription_id: null,
              founding_member: foundingMember,
            }, {
              onConflict: 'user_id'
            });

          if (membershipError) {
            console.error('Failed to create lifetime membership:', membershipError);
          } else {
            // Increment lifetime cap used
            await supabase.rpc('increment_lifetime_cap', {});
            console.log('Lifetime membership created successfully');
          }
        } else {
          // Handle recurring subscription
          const subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          const renewsAt = new Date(subscription.current_period_end * 1000).toISOString();

          const { error: membershipError } = await supabase
            .from('user_memberships')
            .upsert({
              user_id: userId,
              plan_key: planKey,
              status: 'active',
              started_at: new Date().toISOString(),
              renews_at: renewsAt,
              provider: 'stripe',
              provider_customer_id: session.customer as string,
              provider_subscription_id: subscriptionId,
              founding_member: false,
            }, {
              onConflict: 'user_id'
            });

          if (membershipError) {
            console.error('Failed to create subscription membership:', membershipError);
          } else {
            console.log('Subscription membership created successfully');
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const planKey = subscription.metadata?.plan_key;
        const userId = subscription.metadata?.user_id;

        if (!userId) {
          // Try to find user by customer ID
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('stripe_customer_id', subscription.customer as string)
            .single();

          if (profile) {
            const membership = await supabase
              .from('user_memberships')
              .select('*')
              .eq('user_id', profile.user_id)
              .single();

            if (membership.data) {
              if (event.type === 'customer.subscription.deleted' || subscription.status === 'canceled') {
                await supabase
                  .from('user_memberships')
                  .update({
                    status: 'canceled',
                    canceled_at: new Date().toISOString(),
                  })
                  .eq('user_id', profile.user_id);
              } else {
                const renewsAt = subscription.current_period_end
                  ? new Date(subscription.current_period_end * 1000).toISOString()
                  : null;

                await supabase
                  .from('user_memberships')
                  .update({
                    status: subscription.status === 'active' ? 'active' : 'past_due',
                    renews_at: renewsAt,
                  })
                  .eq('user_id', profile.user_id);
              }
            }
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const planKey = subscription.metadata?.plan_key;

          if (planKey) {
            // Find membership and update renews_at
            const { data: membership } = await supabase
              .from('user_memberships')
              .select('*')
              .eq('provider_subscription_id', subscriptionId)
              .single();

            if (membership) {
              const renewsAt = subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null;

              await supabase
                .from('user_memberships')
                .update({
                  status: 'active',
                  renews_at: renewsAt,
                })
                .eq('id', membership.id);
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const { data: membership } = await supabase
            .from('user_memberships')
            .select('*')
            .eq('provider_subscription_id', subscriptionId)
            .single();

          if (membership) {
            await supabase
              .from('user_memberships')
              .update({
                status: 'past_due',
              })
              .eq('id', membership.id);
          }
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
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
