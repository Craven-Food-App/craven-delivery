import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from '../_shared/cors.ts';

const corsHeaders = {
  ...getCorsHeaders(req.headers.get('origin')),
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

    // Return invite info (including strike price if available)
    return new Response(
      JSON.stringify({
        invite: {
          id: invite.id,
          min_amount_cents: invite.min_amount_cents,
          max_amount_cents: invite.max_amount_cents,
          email: invite.email,
          full_name: invite.full_name,
          strike_price: invite.strike_price || 0.0001, // Default to $0.0001 if not set
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

