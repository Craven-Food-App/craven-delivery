import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim());
  }
  return [
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
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:5173",
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost",
    "https://localhost",
  ];
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

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

    // Mark as accepted if not already and increment access tracking
    const now = new Date().toISOString();
    
    if (invite.status === "invited") {
      await supabase
        .from("invites")
        .update({ 
          status: "accepted", 
          accepted_at: now,
          access_count: (invite.access_count || 0) + 1,
          last_accessed_at: now
        })
        .eq("id", invite.id);
    } else {
      // Just increment access tracking for returning users
      await supabase
        .from("invites")
        .update({ 
          access_count: (invite.access_count || 0) + 1,
          last_accessed_at: now
        })
        .eq("id", invite.id);
    }

    // Log this access for audit trail
    await supabase
      .from("foundational_access_logs")
      .insert({
        invite_id: invite.id,
        email: invite.email,
        page_accessed: 'access',
        accessed_at: now
      });

    // Return invite info (including strike price if available)
    return new Response(
      JSON.stringify({
        invite: {
          id: invite.id,
          min_amount_cents: invite.min_amount_cents,
          max_amount_cents: invite.max_amount_cents,
          email: invite.email,
          full_name: invite.full_name,
          strike_price: invite.strike_price || 0.0001,
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
