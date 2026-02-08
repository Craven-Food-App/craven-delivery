import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { driver_id, amount_cents } = await req.json();

    // Validate input
    if (!driver_id || !amount_cents || amount_cents <= 0) {
      throw new Error('Invalid transfer amount');
    }

    // Ensure user can only transfer their own earnings
    if (user.id !== driver_id) {
      throw new Error('Unauthorized: Cannot transfer earnings for another driver');
    }

    // Calculate available balance from driver_earnings
    const { data: earningsData, error: earningsError } = await supabaseClient
      .from('driver_earnings')
      .select('total_cents')
      .eq('driver_id', driver_id);

    if (earningsError) {
      throw new Error(`Failed to fetch earnings: ${earningsError.message}`);
    }

    const totalEarnings = earningsData?.reduce((sum, e) => sum + e.total_cents, 0) || 0;

    // Get already paid out amount
    const { data: payoutsData, error: payoutsError } = await supabaseClient
      .from('driver_payouts')
      .select('amount_cents, status')
      .eq('driver_id', driver_id)
      .in('status', ['pending', 'in_transit', 'paid']);

    if (payoutsError) {
      throw new Error(`Failed to fetch payouts: ${payoutsError.message}`);
    }

    const totalPaidOut = payoutsData?.reduce((sum, p) => sum + p.amount_cents, 0) || 0;
    const availableBalance = totalEarnings - totalPaidOut;

    // Check if sufficient balance
    if (availableBalance < amount_cents) {
      throw new Error(`Insufficient available balance. Available: $${(availableBalance / 100).toFixed(2)}`);
    }

    // Create a payout record
    // Note: In production, this should integrate with Stripe Connect
    // For now, we'll create a payout record that simulates instant transfer to Feeder Card
    const { data: payoutRecord, error: payoutError } = await supabaseClient
      .from('driver_payouts')
      .insert({
        driver_id,
        stripe_account_id: 'feeder_card_placeholder', // TODO: Replace with actual Stripe account ID
        stripe_payout_id: `po_feeder_${Date.now()}_${driver_id.slice(0, 8)}`, // Generate unique ID
        amount_cents,
        currency: 'usd',
        payout_type: 'instant',
        status: 'paid', // Mark as paid immediately for Feeder Card transfers
        arrival_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (payoutError) {
      throw new Error(`Failed to create payout record: ${payoutError.message}`);
    }

    // TODO: In production, integrate with Stripe to actually transfer funds to the Feeder Card
    // The actual Stripe transfer would happen here:
    // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
    // await stripe.transfers.create({
    //   amount: amount_cents,
    //   currency: 'usd',
    //   destination: driver_stripe_account_id,
    //   description: 'Earnings transfer to Feeder Card',
    // });

    const newAvailableBalance = availableBalance - amount_cents;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Earnings transferred successfully',
        amount_cents,
        new_available_balance: newAvailableBalance,
        payout_id: payoutRecord.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error transferring earnings:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to transfer earnings',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});












