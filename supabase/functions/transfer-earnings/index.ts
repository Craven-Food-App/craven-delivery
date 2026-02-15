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

    // Calculate available balance from ledger
    const { data: availableEntries, error: ledgerError } = await supabaseClient
      .from('feeder_wallet_ledger_entries')
      .select('type, amount_cents, status')
      .eq('feeder_id', driver_id)
      .eq('status', 'available');

    if (ledgerError) {
      throw new Error(`Failed to fetch ledger: ${ledgerError.message}`);
    }

    const earningsTypes = [
      'earnings_base_pay', 'earnings_distance_pay', 'earnings_tip',
      'earnings_bonus', 'earnings_adjustment_credit',
    ];

    const availableBalance = (availableEntries || [])
      .filter(r => earningsTypes.includes(r.type))
      .reduce((s, r) => s + r.amount_cents, 0)
      - (availableEntries || [])
        .filter(r => r.type === 'earnings_adjustment_debit')
        .reduce((s, r) => s + r.amount_cents, 0);

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

    // Create ledger payout_debit entry
    const { data: wallet } = await supabaseClient
      .from('feeder_wallets')
      .select('id')
      .eq('feeder_id', driver_id)
      .maybeSingle();

    if (wallet) {
      await supabaseClient
        .from('feeder_wallet_ledger_entries')
        .insert({
          wallet_id: wallet.id,
          feeder_id: driver_id,
          occurred_at: new Date().toISOString(),
          type: 'payout_debit',
          direction: 'debit',
          amount_cents,
          status: 'paid',
          source_type: 'payout',
          source_id: payoutRecord.id,
          idempotency_key: `transfer_${payoutRecord.id}`,
        });
    }

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
















