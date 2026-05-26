import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, RateLimitPresets, addRateLimitHeaders } from '../_shared/rateLimit.ts';
import { createPayoutToConnectedAccount } from '../_shared/stripe.ts';
import { requireAdmin } from "../_shared/adminAuth.ts";

// Service-role client used inside processPayout to look up Stripe Connect accounts
const adminSupabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface DriverEarning {
  driver_id: string;
  amount: number;
  payment_method: {
    id: string;
    payment_type: string;
    account_identifier: string;
  };
}

serve(async (req) => {
  // SECURITY: Get secure CORS headers based on request origin
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth gate (allow cron with CRON_SECRET header, otherwise require admin/CFO)
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || providedSecret !== cronSecret) {
    const gate = await requireAdmin(req, ["admin", "cfo", "ceo"]);
    if (!gate.ok) {
      return new Response(JSON.stringify({ error: gate.error }), {
        status: gate.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    console.log("Starting daily driver payouts process");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // SECURITY: Rate limiting for payout processing (3 per minute)
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

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const payoutDate = yesterday.toISOString().split('T')[0];

    console.log(`Processing payouts for date: ${payoutDate}`);

    // Check if batch already exists
    const { data: existingBatch } = await supabase
      .from('daily_payout_batches')
      .select('*')
      .eq('payout_date', payoutDate)
      .single();

    if (existingBatch && existingBatch.status === 'completed') {
      console.log(`Payouts already completed for ${payoutDate}`);
      return new Response(
        JSON.stringify({ message: "Payouts already completed for this date" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all drivers with earnings from yesterday and their payment methods
    const { data: driversWithEarnings, error: driversError } = await supabase
      .from('driver_earnings')
      .select(`
        driver_id,
        amount,
        driver_payment_methods!inner(
          id,
          payment_type,
          account_identifier,
          is_primary
        )
      `)
      .gte('created_at', `${payoutDate}T00:00:00Z`)
      .lt('created_at', `${payoutDate}T23:59:59Z`)
      .eq('driver_payment_methods.is_primary', true);

    if (driversError) {
      throw new Error(`Failed to fetch driver earnings: ${driversError.message}`);
    }

    if (!driversWithEarnings || driversWithEarnings.length === 0) {
      console.log("No drivers with earnings found for yesterday");
      return new Response(
        JSON.stringify({ message: "No drivers with earnings found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate earnings by driver
    const driverEarnings = new Map<string, DriverEarning>();
    
    driversWithEarnings.forEach((earning: any) => {
      const driverId = earning.driver_id;
      if (driverEarnings.has(driverId)) {
        driverEarnings.get(driverId)!.amount += earning.amount;
      } else {
        driverEarnings.set(driverId, {
          driver_id: driverId,
          amount: earning.amount,
          payment_method: earning.driver_payment_methods
        });
      }
    });

    const totalAmount = Array.from(driverEarnings.values()).reduce((sum, earning) => sum + earning.amount, 0);
    const totalDrivers = driverEarnings.size;

    console.log(`Found ${totalDrivers} drivers with total earnings of $${totalAmount}`);

    // Create or update payout batch
    const { data: payoutBatch, error: batchError } = await supabase
      .from('daily_payout_batches')
      .upsert({
        payout_date: payoutDate,
        total_amount: totalAmount,
        total_drivers: totalDrivers,
        status: 'processing'
      })
      .select()
      .single();

    if (batchError) {
      throw new Error(`Failed to create payout batch: ${batchError.message}`);
    }

    // Process individual payouts
    const payoutPromises = Array.from(driverEarnings.values()).map(async (earning) => {
      try {
        console.log(`Processing payout for driver ${earning.driver_id}: $${earning.amount} to ${earning.payment_method.account_identifier}`);

        // Create payout record
        const { data: payoutRecord, error: payoutError } = await supabase
          .from('driver_payouts')
          .insert({
            batch_id: payoutBatch.id,
            driver_id: earning.driver_id,
            payment_method_id: earning.payment_method.id,
            amount: earning.amount,
            status: 'pending'
          })
          .select()
          .single();

        if (payoutError) {
          throw new Error(`Failed to create payout record: ${payoutError.message}`);
        }

        // Process payment using real payment processor
        const paymentResult = await processPayout(earning);

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

        return { success: paymentResult.success, driver_id: earning.driver_id };
      } catch (error) {
        console.error(`Error processing payout for driver ${earning.driver_id}:`, error);
        return { success: false, driver_id: earning.driver_id, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const payoutResults = await Promise.all(payoutPromises);
    const successfulPayouts = payoutResults.filter(result => result.success).length;
    const failedPayouts = payoutResults.filter(result => !result.success).length;

    // Update batch status
    const batchStatus = failedPayouts === 0 ? 'completed' : 'failed';
    await supabase
      .from('daily_payout_batches')
      .update({
        status: batchStatus,
        processed_at: new Date().toISOString()
      })
      .eq('id', payoutBatch.id);

    console.log(`Payout batch completed: ${successfulPayouts} successful, ${failedPayouts} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        batch_id: payoutBatch.id,
        total_drivers: totalDrivers,
        total_amount: totalAmount,
        successful_payouts: successfulPayouts,
        failed_payouts: failedPayouts,
        results: payoutResults
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Daily payout error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// Process payout using Stripe Connect transfers
async function processPayout(earning: DriverEarning): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const paymentType = earning.payment_method.payment_type;
    const amount = earning.amount;

    const { data: stripeAccount, error: stripeAcctError } = await adminSupabase
      .from('stripe_accounts')
      .select('stripe_account_id, payouts_enabled')
      .eq('owner_type', 'driver')
      .eq('owner_id', earning.driver_id)
      .maybeSingle();

    if (stripeAcctError || !stripeAccount?.stripe_account_id) {
      throw new Error("Driver has not completed Stripe Connect onboarding.");
    }

    if (!stripeAccount.payouts_enabled) {
      throw new Error("Driver's Stripe Connect account is not payouts-enabled.");
    }

    console.log(`Processing ${paymentType} payout via Stripe Connect: $${amount} to ${stripeAccount.stripe_account_id}`);

    const transfer = await createPayoutToConnectedAccount({
      amount: Math.round(amount * 100),
      currency: "USD",
      connectedAccountId: stripeAccount.stripe_account_id,
      description: `Driver payout for ${earning.driver_id}`,
      metadata: {
        driver_id: earning.driver_id,
        payout_type: paymentType,
      },
    });

    return {
      success: transfer.status === 'pending' || transfer.status === 'completed',
      transactionId: transfer.id,
    };
  } catch (error) {
    console.error("Stripe Connect payout processing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
