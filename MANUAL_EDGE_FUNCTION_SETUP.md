# Manual Edge Function Setup - Copy & Paste Guide

## Function 1: verify-invite-access

### Step 1: Create Function
1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions
2. Click **"Create a new function"**
3. Name: `verify-invite-access`
4. Click **"Create function"**

### Step 2: Paste This Code

Replace the entire contents of the editor with this:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { accessCode, email } = await req.json();

    if (!accessCode || !email) {
      return new Response(
        JSON.stringify({ error: "Access code and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find invite by access code and email
    const { data: invite, error } = await supabase
      .from("invites")
      .select("*")
      .eq("access_code", accessCode.toUpperCase().trim())
      .eq("email", email.trim().toLowerCase())
      .single();

    if (error || !invite) {
      return new Response(
        JSON.stringify({ error: "Invalid access code or email." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check invite status
    if (invite.status === "revoked") {
      return new Response(
        JSON.stringify({ error: "This invite has been revoked." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invite has expired." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invite.status === "paid") {
      return new Response(
        JSON.stringify({ error: "This invite has already been used." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as accepted if not already
    if (invite.status === "invited") {
      await supabase
        .from("invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invite.id);
    }

    // Return invite info
    return new Response(
      JSON.stringify({
        invite: {
          id: invite.id,
          min_amount_cents: invite.min_amount_cents,
          max_amount_cents: invite.max_amount_cents,
          email: invite.email,
          full_name: invite.full_name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error verifying access:", error);
    return new Response(
      JSON.stringify({ error: "Unable to verify access." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### Step 3: Configure Function
1. Scroll down to **"Function Settings"**
2. **Verify JWT Token:** Turn this **OFF** (uncheck it)
3. Click **"Deploy"**

---

## Function 2: create-invite-checkout

### Step 1: Create Function
1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions
2. Click **"Create a new function"**
3. Name: `create-invite-checkout`
4. Click **"Create function"**

### Step 2: Paste This Code

Replace the entire contents of the editor with this:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.11.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { inviteId, amountCents, email } = await req.json();

    if (!inviteId || !amountCents || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify invite exists and is valid
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("*")
      .eq("id", inviteId)
      .eq("email", email.trim().toLowerCase())
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "Invalid invite" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate amount is within bounds
    if (amountCents < invite.min_amount_cents || amountCents > invite.max_amount_cents) {
      return new Response(
        JSON.stringify({ 
          error: `Amount must be between $${(invite.min_amount_cents / 100).toFixed(2)} and $${(invite.max_amount_cents / 100).toFixed(2)}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check invite is still valid
    if (invite.status === "revoked") {
      return new Response(
        JSON.stringify({ error: "This invite has been revoked" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invite.status === "paid") {
      return new Response(
        JSON.stringify({ error: "This invite has already been used" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2024-12-18.acacia",
    });

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Private Investment Contribution",
              description: `Contribution by ${invite.full_name || email}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${Deno.env.get("FRONTEND_URL") || "https://craven-delivery.com"}/success?session_id={CHECKOUT_SESSION_ID}&invite_id=${inviteId}`,
      cancel_url: `${Deno.env.get("FRONTEND_URL") || "https://craven-delivery.com"}/allocate?invite_id=${inviteId}`,
      customer_email: email,
      metadata: {
        invite_id: inviteId,
        amount_cents: amountCents.toString(),
      },
    });

    // Update invite with checkout session info
    await supabase
      .from("invites")
      .update({
        stripe_session_id: session.id,
        selected_amount_cents: amountCents,
      })
      .eq("id", inviteId);

    return new Response(
      JSON.stringify({
        checkoutUrl: session.url,
        sessionId: session.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: "Unable to create checkout session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### Step 3: Configure Function
1. Scroll down to **"Function Settings"**
2. **Verify JWT Token:** Turn this **OFF** (uncheck it)
3. Click **"Deploy"**

---

## Step 4: Set Environment Secrets

1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/settings/secrets
2. Click **"Add new secret"**
3. Add these two secrets:

**Secret 1:**
- **Name:** `STRIPE_SECRET_KEY`
- **Value:** Your Stripe secret key (starts with `sk_live_` or `sk_test_`)

**Secret 2:**
- **Name:** `FRONTEND_URL`
- **Value:** `https://craven-delivery.com` (or your actual frontend domain)

---

## Done! ✅

After deploying both functions and setting the secrets, the Access form will work immediately.

Test it by:
1. Going to `/access` page
2. Entering an access code and email
3. It should work without any errors

