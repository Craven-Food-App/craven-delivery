import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // SECURITY: Get secure CORS headers based on request origin
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderTotal, customerInfo, orderId } = await req.json();

    if (!orderTotal || !customerInfo || !orderId) {
      throw new Error("Missing required parameters");
    }

    // In a real implementation, you would:
    // 1. Integrate with CashApp API to create a payment request
    // 2. Generate a CashApp payment link or QR code
    // 3. Handle the payment confirmation callback

    // For now, we'll simulate the CashApp payment flow
    const cashAppPaymentData = {
      paymentId: `cashapp_${orderId}`,
      amount: orderTotal,
      currency: "USD",
      redirectUrl: `${req.headers.get("origin")}/payment-success?payment_id=cashapp_${orderId}&order_id=${orderId}`,
      cancelUrl: `${req.headers.get("origin")}/payment-canceled`,
      qrCode: `https://cash.app/pay/example-qr-code-${orderId}`, // This would be a real QR code URL
      deepLink: `https://cash.app/pay/${orderId}`, // This would be a real CashApp deep link
      instructions: {
        step1: "Open your CashApp mobile app",
        step2: "Scan the QR code or tap the payment link",
        step3: "Confirm the payment amount and recipient",
        step4: "Complete the payment with your PIN or biometric"
      }
    };

    // Create order record in database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: orderError } = await supabase
      .from("orders")
      .insert({
        id: orderId,
        total_cents: orderTotal,
        order_status: "pending_payment",
        payment_method: "cashapp",
        payment_id: cashAppPaymentData.paymentId,
        customer_info: customerInfo,
        created_at: new Date().toISOString()
      });

    if (orderError) {
      console.error("Error creating order:", orderError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        paymentData: cashAppPaymentData,
        message: "CashApp payment initiated"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("CashApp payment creation error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});