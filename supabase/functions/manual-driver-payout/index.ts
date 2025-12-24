import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, RateLimitPresets, addRateLimitHeaders } from '../_shared/rateLimit.ts';
import { createMoovTransfer } from '../_shared/moov.ts';

serve(async (req) => {
  // SECURITY: Get secure CORS headers based on request origin
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // SECURITY: Rate limiting for manual payout (3 per minute)
    const rateLimitResult = await checkRateLimit(req, supabase, RateLimitPresets.PAYMENT);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: rateLimitResult.message || 'Too many payout requests',
          resetIn: rateLimitResult.resetIn 
        }),
        { 
          status: 429, 
          headers: addRateLimitHeaders(corsHeaders, rateLimitResult)
        }
      );
    }

    const { driver_id, amount, payment_method_id } = await req.json();

    if (!driver_id || !amount || !payment_method_id) {
      throw new Error("Missing required parameters: driver_id, amount, payment_method_id");
    }

    console.log(`Processing manual payout: $${amount} to driver ${driver_id}`);

    // Get payment method details
    const { data: paymentMethod, error: pmError } = await supabase
      .from('driver_payment_methods')
      .select('*, moov_payment_method_id, moov_account_id')
      .eq('id', payment_method_id)
      .eq('driver_id', driver_id)
      .single();

    if (pmError || !paymentMethod) {
      throw new Error("Payment method not found or doesn't belong to driver");
    }

    // Create a manual payout batch for today
    const today = new Date().toISOString().split('T')[0];
    const { data: payoutBatch, error: batchError } = await supabase
      .from('daily_payout_batches')
      .upsert({
        payout_date: today,
        total_amount: amount,
        total_drivers: 1,
        status: 'processing'
      }, {
        onConflict: 'payout_date',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (batchError) {
      throw new Error(`Failed to create payout batch: ${batchError.message}`);
    }

    // Create payout record
    const { data: payoutRecord, error: payoutError } = await supabase
      .from('driver_payouts')
      .insert({
        batch_id: payoutBatch.id,
        driver_id: driver_id,
        payment_method_id: payment_method_id,
        amount: amount,
        status: 'pending'
      })
      .select()
      .single();

    if (payoutError) {
      throw new Error(`Failed to create payout record: ${payoutError.message}`);
    }

    // Process the payment using Moov
    if (!paymentMethod.moov_payment_method_id) {
      throw new Error("Moov payment method ID not found. Driver needs to set up Moov payment method.");
    }

    // Determine Moov transfer type
    let moovTransferType: "ach-credit-fund-source" | "rtp-credit-fund-source" | "card-fund-source";
    
    switch (paymentMethod.payment_type) {
      case 'bank_account':
        moovTransferType = "ach-credit-fund-source";
        break;
      case 'instant_rtp':
        moovTransferType = "rtp-credit-fund-source";
        break;
      case 'card':
        moovTransferType = "card-fund-source";
        break;
      default:
        throw new Error(`Unsupported payment method type: ${paymentMethod.payment_type}`);
    }

    // Create Moov transfer
    const transfer = await createMoovTransfer({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "USD",
      destination: {
        paymentMethodID: paymentMethod.moov_payment_method_id,
        paymentMethodType: moovTransferType,
      },
      description: `Manual driver payout for ${driver_id}`,
      metadata: {
        driver_id: driver_id,
        payout_type: paymentMethod.payment_type,
        manual: "true",
      },
    });

    const paymentResult = {
      success: transfer.status === 'pending' || transfer.status === 'completed',
      transactionId: transfer.transferID,
    };

    // Update payout record with result
    await supabase
      .from('driver_payouts')
      .update({
        status: paymentResult.success ? 'completed' : 'failed',
        external_transaction_id: paymentResult.transactionId,
        error_message: paymentResult.error,
        processed_at: new Date().toISOString()
      })
      .eq('id', payoutRecord.id);

    // Update batch status
    await supabase
      .from('daily_payout_batches')
      .update({
        status: paymentResult.success ? 'completed' : 'failed',
        processed_at: new Date().toISOString()
      })
      .eq('id', payoutBatch.id);

    return new Response(
      JSON.stringify({
        success: paymentResult.success,
        payout_id: payoutRecord.id,
        transaction_id: paymentResult.transactionId,
        message: paymentResult.success 
          ? `Successfully sent $${amount} to ${paymentMethod.account_identifier} via ${paymentMethod.payment_type}`
          : `Failed to send payment: ${paymentResult.error}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Manual payout error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

