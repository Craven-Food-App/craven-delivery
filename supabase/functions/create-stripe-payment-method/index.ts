// Standalone version of create-stripe-payment-method
// This includes all dependencies inline - no shared files needed
// This eliminates potential issues with shared imports

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { getCorsHeaders } from '../_shared/cors.ts';

// CORS helper (inline)
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    "http://localhost:8080",
    "http://localhost:5173",
    "https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com",
    "https://cravenusa.com",
    "https://www.cravenusa.com",
    "https://feeder.cravenusa.com",
    "https://merchant.cravenusa.com",
    "https://board.cravenusa.com",
    "https://hq.cravenusa.com",
    "https://ceo.cravenusa.com",
    "https://cfo.cravenusa.com",
    "https://coo.cravenusa.com",
    "https://cto.cravenusa.com",
  ];
  
  const allowedOrigin = origin && allowedOrigins.includes(origin) 
    ? origin 
    : allowedOrigins[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Stripe helper functions (inline)
function getStripeClient(): Stripe {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
}

async function getOrCreateCustomer(params: {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  const stripe = getStripeClient();
  
  const existingCustomers = await stripe.customers.list({
    email: params.email,
    limit: 1,
  });
  
  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }
  
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    phone: params.phone,
    metadata: params.metadata || {},
  });
  
  return customer.id;
}

async function createStripePaymentMethod(params: {
  type: 'card';
  card: {
    number: string;
    expMonth: number;
    expYear: number;
    cvv: string;
  };
  billingDetails: {
    name: string;
    email?: string;
    phone?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
}): Promise<{ id: string; card: { brand: string; last4: string; expMonth: number; expYear: number } }> {
  const stripe = getStripeClient();
  
  const paymentMethod = await stripe.paymentMethods.create({
    type: params.type,
    card: {
      number: params.card.number,
      exp_month: params.card.expMonth,
      exp_year: params.card.expYear,
      cvc: params.card.cvv,
    },
    billing_details: {
      name: params.billingDetails.name,
      email: params.billingDetails.email,
      phone: params.billingDetails.phone,
      address: {
        line1: params.billingDetails.address.line1,
        line2: params.billingDetails.address.line2,
        city: params.billingDetails.address.city,
        state: params.billingDetails.address.state,
        postal_code: params.billingDetails.address.postalCode,
        country: params.billingDetails.address.country,
      },
    },
  });
  
  if (!paymentMethod.card) {
    throw new Error("Failed to create card payment method");
  }
  
  return {
    id: paymentMethod.id,
    card: {
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
    },
  };
}

async function attachPaymentMethodToCustomer(
  paymentMethodId: string,
  customerId: string
): Promise<void> {
  const stripe = getStripeClient();
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

// Main function
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Parse request body with error handling
    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch (parseError: any) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: parseError?.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { paymentMethodId, billingAddress, type, card } = requestBody;

    // Support both new format (paymentMethodId) and legacy format (type + card) for backward compatibility
    if (paymentMethodId) {
      // New format: payment method already created via Stripe.js on frontend
      if (!paymentMethodId || typeof paymentMethodId !== 'string') {
        return new Response(
          JSON.stringify({ error: "Missing or invalid paymentMethodId" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Get user email for customer creation
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, phone')
        .eq('user_id', user.id)
        .single();

      const userEmail = user.email || '';
      const userName = profile?.full_name || '';

      console.log("Creating Stripe customer for user:", { userEmail, userName, userId: user.id });

      // Create or get Stripe customer
      let customerId: string;
      try {
        customerId = await getOrCreateCustomer({
          email: userEmail,
          name: userName,
          phone: profile?.phone,
          metadata: {
            user_id: user.id,
          },
        });
        console.log("Stripe customer ID:", customerId);
      } catch (customerError: any) {
        console.error("Error creating/getting Stripe customer:", customerError);
        throw new Error(`Failed to create Stripe customer: ${customerError?.message || customerError}`);
      }

      // Retrieve payment method from Stripe to get card details
      const stripe = getStripeClient();
      let paymentMethod;
      try {
        paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        console.log("Retrieved payment method:", { id: paymentMethod.id, type: paymentMethod.type });
      } catch (pmError: any) {
        console.error("Error retrieving Stripe payment method:", pmError);
        // Check if it's a permissions issue with restricted key
        if (pmError?.code === 'resource_missing' || pmError?.message?.includes('No such payment_method')) {
          throw new Error(`Payment method not found. It may have been created with a different Stripe account or key.`);
        }
        if (pmError?.type === 'invalid_request_error' && pmError?.message?.includes('permission')) {
          throw new Error(`Stripe API permission error. Your restricted key may not have permission to retrieve payment methods. Error: ${pmError.message}`);
        }
        throw new Error(`Failed to retrieve payment method: ${pmError?.message || pmError}`);
      }

      if (!paymentMethod.card) {
        throw new Error("Payment method is not a card");
      }

      // Attach payment method to customer FIRST (required before updating)
      console.log("Attaching payment method to customer...");
      try {
        await attachPaymentMethodToCustomer(paymentMethodId, customerId);
        console.log("Payment method attached successfully");
      } catch (attachError: any) {
        console.error("Error attaching payment method:", attachError);
        // Check for specific Stripe errors
        if (attachError?.code === 'card_declined' || attachError?.message?.includes('does not support')) {
          throw new Error(`Card declined: ${attachError.message || 'Your card does not support this type of purchase. Please try a different card.'}`);
        }
        throw new Error(`Failed to attach payment method: ${attachError?.message || attachError}`);
      }

      // Update payment method billing details AFTER attaching (optional)
      if (billingAddress) {
        try {
          await stripe.paymentMethods.update(paymentMethodId, {
            billing_details: {
              address: {
                line1: billingAddress.addressLine1,
                line2: billingAddress.addressLine2,
                city: billingAddress.city,
                state: billingAddress.state,
                postal_code: billingAddress.postalCode,
                country: billingAddress.country || 'US',
              },
            },
          });
          console.log("Payment method billing details updated");
        } catch (updateError: any) {
          console.warn("Failed to update payment method billing details:", updateError);
          // Non-critical, continue - payment method is already attached
        }
      }

      return new Response(
        JSON.stringify({
          paymentMethodID: paymentMethod.id,
          type: 'card',
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          customerId: customerId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else if (type === 'card' && card) {
      // Validate required fields
      if (!card.number || !card.expMonth || !card.expYear || !card.cvv || !card.holderName) {
        return new Response(
          JSON.stringify({ error: "Missing required card fields" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Validate billing address
      const billingAddress = card.billingAddress || {};
      if (!billingAddress.addressLine1 || !billingAddress.city || !billingAddress.state || !billingAddress.postalCode) {
        return new Response(
          JSON.stringify({ error: "Missing required billing address fields" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Get user email for customer creation
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, phone')
        .eq('user_id', user.id)
        .single();

      const userEmail = user.email || '';
      const userName = card.holderName || profile?.full_name || '';

      console.log("Creating Stripe customer for user:", { userEmail, userName, userId: user.id });

      // Create or get Stripe customer
      let customerId: string;
      try {
        customerId = await getOrCreateCustomer({
          email: userEmail,
          name: userName,
          phone: profile?.phone,
          metadata: {
            user_id: user.id,
          },
        });
        console.log("Stripe customer ID:", customerId);
      } catch (customerError: any) {
        console.error("Error creating/getting Stripe customer:", customerError);
        throw new Error(`Failed to create Stripe customer: ${customerError?.message || customerError}`);
      }

      // Create payment method in Stripe
      console.log("Creating Stripe payment method...");
      let paymentMethod: { id: string; card: { brand: string; last4: string; expMonth: number; expYear: number } };
      try {
        paymentMethod = await createStripePaymentMethod({
          type: 'card',
          card: {
            number: card.number,
            expMonth: parseInt(card.expMonth),
            expYear: parseInt(card.expYear),
            cvv: card.cvv,
          },
          billingDetails: {
            name: card.holderName,
            email: userEmail,
            phone: profile?.phone,
            address: {
              line1: billingAddress.addressLine1,
              line2: billingAddress.addressLine2,
              city: billingAddress.city,
              state: billingAddress.state,
              postalCode: billingAddress.postalCode || card.billingZip || '',
              country: billingAddress.country || 'US',
            },
          },
        });
        console.log("Payment method created:", { id: paymentMethod.id, brand: paymentMethod.card.brand, last4: paymentMethod.card.last4 });
      } catch (pmError: any) {
        console.error("Error creating Stripe payment method:", pmError);
        throw new Error(`Failed to create payment method: ${pmError?.message || pmError}`);
      }

      // Attach payment method to customer
      console.log("Attaching payment method to customer...");
      try {
        await attachPaymentMethodToCustomer(paymentMethod.id, customerId);
        console.log("Payment method attached successfully");
      } catch (attachError: any) {
        console.error("Error attaching payment method:", attachError);
        throw new Error(`Failed to attach payment method: ${attachError?.message || attachError}`);
      }

      return new Response(
        JSON.stringify({
          paymentMethodID: paymentMethod.id,
          type: 'card',
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          customerId: customerId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid payment method type or missing details" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
  } catch (error: any) {
    console.error("Error creating Stripe payment method:", error);
    
    // Extract detailed error message
    let errorMessage = "Failed to create payment method";
    let errorDetails: any = null;
    
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Check for Stripe-specific errors
    if (error?.type) {
      errorMessage = `Stripe ${error.type}: ${error.message || errorMessage}`;
      errorDetails = {
        type: error.type,
        code: error.code,
        param: error.param,
        decline_code: error.decline_code,
      };
    }
    
    // Check for missing or expired STRIPE_SECRET_KEY
    if (errorMessage.includes("STRIPE_SECRET_KEY") || errorMessage.includes("secret key")) {
      errorMessage = "Stripe secret key not configured. Please set STRIPE_SECRET_KEY in Supabase Edge Function secrets.";
    }
    
    // Check for expired API key
    if (errorMessage.includes("Expired API Key") || errorMessage.includes("expired")) {
      errorMessage = "Stripe API key is expired. Please update STRIPE_SECRET_KEY in Supabase Edge Function secrets with a valid key from https://dashboard.stripe.com/apikeys";
      errorDetails = {
        hint: "Go to Stripe Dashboard → API Keys to generate a new secret key, then update it in Supabase Dashboard → Settings → Edge Functions → Secrets"
      };
    }
    
    console.error("Error details:", {
      message: errorMessage,
      error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      stack: error?.stack,
    });
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails || error?.stack || null,
        hint: "Check Supabase Edge Function logs for more details"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
