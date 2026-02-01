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

    // Ensure user can only transfer their own gas money
    if (user.id !== driver_id) {
      throw new Error('Unauthorized: Cannot transfer gas money for another driver');
    }

    // Get current gas money balance
    const { data: gasMoneyData, error: gasMoneyError } = await supabaseClient
      .from('driver_gas_money')
      .select('balance')
      .eq('driver_id', driver_id)
      .single();

    if (gasMoneyError || !gasMoneyData) {
      throw new Error('Gas money account not found');
    }

    // Check if sufficient balance
    if (gasMoneyData.balance < amount_cents) {
      throw new Error('Insufficient gas money balance');
    }

    // Start transaction: Update gas money balance
    const { error: updateError } = await supabaseClient
      .from('driver_gas_money')
      .update({
        balance: gasMoneyData.balance - amount_cents,
        total_transferred: supabaseClient.rpc('increment', {
          row_id: driver_id,
          amount: amount_cents,
        }),
      })
      .eq('driver_id', driver_id);

    if (updateError) {
      throw new Error(`Failed to update gas money balance: ${updateError.message}`);
    }

    // Record the transfer transaction
    const { error: transactionError } = await supabaseClient
      .from('gas_money_transactions')
      .insert({
        driver_id,
        amount_cents,
        transaction_type: 'transfer',
        destination: 'feeder_card',
        status: 'completed',
        notes: 'Transferred to Feeder Card',
      });

    if (transactionError) {
      console.error('Failed to record transaction:', transactionError);
      // Don't throw - transaction was successful even if logging failed
    }

    // TODO: In production, integrate with Stripe to actually transfer funds to the Feeder Card
    // For now, we're just updating the internal balance tracking
    // The actual Stripe transfer would happen here:
    // await stripe.transfers.create({
    //   amount: amount_cents,
    //   currency: 'usd',
    //   destination: driver_stripe_account_id,
    //   description: 'Gas money transfer to Feeder Card',
    // });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Gas money transferred successfully',
        amount_cents,
        new_balance: gasMoneyData.balance - amount_cents,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error transferring gas money:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to transfer gas money',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

