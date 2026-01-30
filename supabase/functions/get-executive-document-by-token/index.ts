import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token }: { token?: string } = await req.json();

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing or invalid signature token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: document, error } = await supabase
      .from("executive_documents")
      .select("id, officer_name, role, type, status, signature_status, file_url, signed_file_url, packet_id, signing_stage, signing_order, required_signers, signer_roles, signature_token, signature_token_expires_at")
      .eq("signature_token", token)
      .maybeSingle();

    if (error) throw error;

    if (!document) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid or expired signature token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (document.signature_token_expires_at) {
      const expiresAt = new Date(document.signature_token_expires_at);
      if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
        return new Response(
          JSON.stringify({ ok: false, error: "This signing link has expired" }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (document.signature_status === "signed") {
      return new Response(
        JSON.stringify({ ok: false, error: "This document has already been signed" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { signature_token, signature_token_expires_at, ...publicDocument } = document;

    return new Response(
      JSON.stringify({ ok: true, document: publicDocument }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("get-executive-document-by-token error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error?.message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

