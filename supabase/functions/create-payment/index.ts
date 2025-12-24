import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, RateLimitPresets, addRateLimitHeaders } from '../_shared/rateLimit.ts';
import { createMoovPayment, getMoovConfig, moovRequest } from '../_shared/moov.ts';

// Get allowed origins from environment or use defaults
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim());
  }
  return [
    "http://localhost:8080",
    "http://localhost:5173",
    "https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com",
    "https://cravenusa.com",
    "https://www.cravenusa.com",
    "https://feeder.cravenusa.com",
  ];
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  
  // Check if origin is in allowed list
  let allowedOrigin: string;
  if (origin && allowedOrigins.includes(origin)) {
    allowedOrigin = origin;
  } else {
    // Default to first in list (localhost:8080 for dev)
    allowedOrigin = allowedOrigins[0];
  }
  
  console.log("CORS check:", { origin, allowedOrigin, allowedOrigins, originInList: origin ? allowedOrigins.includes(origin) : false });
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  // SECURITY: Rate limiting for payment endpoint
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const rateLimitResult = await checkRateLimit(req, supabase, RateLimitPresets.PAYMENT);
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ 
        error: rateLimitResult.message || 'Too many payment requests',
        resetIn: rateLimitResult.resetIn 
      }),
      { 
        status: 429, 
        headers: addRateLimitHeaders(corsHeaders, rateLimitResult)
      }
    );
  }

  try {
    const { orderTotal, customerInfo, orderId, paymentMethodId, paymentMethodType } = await req.json();

    if (!orderTotal || !customerInfo || !orderId) {
      throw new Error("Missing required parameters: orderTotal, customerInfo, orderId");
    }

    if (!paymentMethodId || !paymentMethodType) {
      throw new Error("Missing payment method: paymentMethodId and paymentMethodType required");
    }

    // Validate payment method type
    const validTypes = ["card", "ach-debit-fund-source"];
    if (!validTypes.includes(paymentMethodType)) {
      throw new Error(`Invalid payment method type: ${paymentMethodType}. Must be one of: ${validTypes.join(", ")}`);
    }

    // Create payment using Moov
    return await createMoovPaymentHandler(
      orderTotal,
      customerInfo,
      orderId,
      paymentMethodId,
      paymentMethodType,
      corsHeaders
    );
  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function createMoovPaymentHandler(
  orderTotal: number,
  customerInfo: any,
  orderId: string,
  paymentMethodId: string,
  paymentMethodType: "card" | "ach-debit-fund-source",
  corsHeaders: Record<string, string>
) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Check Moov configuration
    const moovConfig = getMoovConfig();
    
    // Debug: Check if secret key is set (don't log the actual key)
    console.log('Moov config check:', {
      hasSecretKey: !!moovConfig.secretKey,
      secretKeyLength: moovConfig.secretKey?.length || 0,
      apiUrl: moovConfig.apiUrl,
      hasAccountId: !!moovConfig.accountId,
      envCheck: {
        MOOV_SECRET_KEY_exists: !!Deno.env.get("MOOV_SECRET_KEY"),
        MOOV_SECRET_KEY_length: Deno.env.get("MOOV_SECRET_KEY")?.length || 0
      }
    });
    
    if (!moovConfig.secretKey) {
      throw new Error("Moov secret key not configured. Please set MOOV_SECRET_KEY environment variable in Supabase Edge Function secrets.");
    }
    
    console.log('Creating Moov payment:', {
      orderTotal,
      orderId,
      paymentMethodId,
      paymentMethodType,
      customerInfo: { name: customerInfo.name, email: customerInfo.email },
      moovApiUrl: moovConfig.apiUrl,
      hasAccountId: !!moovConfig.accountId // MOOV_ACCOUNT_ID is optional
    });
    
    // Create payment with Moov
    const payment = await createMoovPayment({
      amount: orderTotal, // Already in cents
      currency: "USD",
      source: {
        paymentMethodID: paymentMethodId,
        paymentMethodType: paymentMethodType,
      },
      description: `Order #${orderId}`,
      metadata: {
        order_id: orderId,
        customer_email: customerInfo.email || "",
        customer_name: customerInfo.name || "",
      },
    });
    
    console.log('Moov payment created successfully:', payment);

    // Update order with payment information
    // Note: payment_status and payment_provider columns may not exist in orders table
    // We'll just update the timestamp - payment info is tracked via webhooks
    await supabase
      .from('orders')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .catch(err => {
        // Log but don't fail if update fails
        console.error('Order update error (non-critical):', err);
      });

    // Return payment result
    return new Response(
      JSON.stringify({ 
        payment_id: payment.paymentID,
        status: payment.status,
        provider: 'moov',
        order_id: orderId,
        // For card payments, we can return immediately
        // For ACH, the payment will be pending until it clears
        requires_action: payment.status === 'pending',
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Moov payment error:", error);
    
    // Update order with error status
    await supabase
      .from('orders')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    return new Response(
      JSON.stringify({ 
        error: error.message || 'Payment creation failed',
        provider: 'moov'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
}
