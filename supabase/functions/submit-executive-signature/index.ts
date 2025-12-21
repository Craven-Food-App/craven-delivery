import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

interface SubmitPayload {
  token: string;
  typed_name?: string | null;
  signature_png_base64?: string | null;
  signature_svg?: string | null;
  signer_ip?: string | null;
  signer_user_agent?: string | null;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SubmitPayload = await req.json();
    if (!body.token) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const filePath = `exec-signatures/${encodeURIComponent(body.token)}.json`;
    const payload = {
      token: body.token,
      typed_name: body.typed_name || null,
      signature_png_base64: body.signature_png_base64 || null,
      signature_svg: body.signature_svg || null,
      signer_ip: body.signer_ip || null,
      signer_user_agent: body.signer_user_agent || null,
      signed_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

    const { error: uploadError } = await supabase.storage
      .from('feeder-documents')
      .upload(filePath, blob, { upsert: true, contentType: 'application/json' });

    if (uploadError) throw uploadError;

    return new Response(JSON.stringify({ ok: true, path: filePath }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
