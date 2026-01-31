import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Inline CORS function (required for web UI deployment)
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

    // Find access record by access code and email
    const { data: accessRecord, error } = await supabase
      .from("investor_demo_access")
      .select("*")
      .eq("access_code", accessCode.toUpperCase().trim())
      .eq("email", email.trim().toLowerCase())
      .single();

    if (error || !accessRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid access code or email." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check access status
    if (accessRecord.status === "revoked") {
      return new Response(
        JSON.stringify({ error: "This access has been revoked." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (accessRecord.expires_at && new Date(accessRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This access has expired." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as active if not already
    if (accessRecord.status === "invited") {
      await supabase
        .from("investor_demo_access")
        .update({ status: "active", last_accessed_at: new Date().toISOString() })
        .eq("id", accessRecord.id);
    }

    // Return access record info (without sensitive data)
    return new Response(
      JSON.stringify({
        access: {
          id: accessRecord.id,
          email: accessRecord.email,
          full_name: accessRecord.full_name,
          organization: accessRecord.organization,
          expires_at: accessRecord.expires_at,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (e: any) {
    console.error("Error verifying investor demo access:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Unable to verify access." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

