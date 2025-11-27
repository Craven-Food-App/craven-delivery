import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointment_id } = await req.json();

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing appointment_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate new token and expiration
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`Generating token for appointment ${appointment_id}: ${token}`);

    // Update all documents for this appointment with the new token
    const { data, error } = await supabase
      .from("executive_documents")
      .update({
        signature_token: token,
        signature_token_expires_at: expiresAt
      })
      .eq("appointment_id", appointment_id)
      .select();

    if (error) {
      console.error("Error updating documents with token:", error);
      throw error;
    }

    console.log(`Updated ${data?.length || 0} documents with token`);

    return new Response(
      JSON.stringify({ ok: true, token, documents_updated: data?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("generate-executive-signature-token error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error?.message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
