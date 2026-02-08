import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createCardPaymentMethod, createAchPaymentMethod } from "../_shared/moov.ts";

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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const { type, card, ach } = await req.json();

    if (type === 'card' && card) {
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
      const billingAddress = {
        addressLine1: card.billingAddress?.addressLine1 || "",
        city: card.billingAddress?.city || "",
        stateOrProvince: card.billingAddress?.state || "",
        postalCode: card.billingZip || card.billingAddress?.postalCode || "",
        country: "US",
      };

      if (!billingAddress.addressLine1 || !billingAddress.city || !billingAddress.stateOrProvince || !billingAddress.postalCode) {
        return new Response(
          JSON.stringify({ error: "Missing required billing address fields" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Create card payment method
      const result = await createCardPaymentMethod({
        cardNumber: card.number,
        expirationMonth: card.expMonth,
        expirationYear: card.expYear,
        cvv: card.cvv,
        holderName: card.holderName,
        billingAddress: billingAddress,
      });

      return new Response(
        JSON.stringify({
          paymentMethodID: result.paymentMethodID,
          type: 'card',
          brand: card.brand || 'Card',
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else if (type === 'ach-debit-fund-source' && ach) {
      // Create ACH payment method
      const result = await createAchPaymentMethod({
        accountType: ach.accountType,
        routingNumber: ach.routingNumber,
        accountNumber: ach.accountNumber,
        holderName: ach.holderName,
        holderType: ach.holderType,
        billingAddress: {
          addressLine1: ach.billingAddress?.addressLine1 || "",
          city: ach.billingAddress?.city || "",
          stateOrProvince: ach.billingAddress?.state || "",
          postalCode: ach.billingAddress?.postalCode || "",
          country: "US",
        },
      });

      return new Response(
        JSON.stringify({
          paymentMethodID: result.paymentMethodID,
          bankAccountID: result.bankAccountID,
          type: 'ach-debit-fund-source',
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
    console.error("Error creating Moov payment method:", error);
    const errorMessage = error?.message || error?.toString() || "Failed to create payment method";
    console.error("Error details:", JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error?.stack || error?.cause || null
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

