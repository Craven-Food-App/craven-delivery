import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'Missing token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('executive_signatures')
      .select('id, employee_email, employee_name, position, document_type, token, token_expires_at, signed_at, typed_name, signature_png_base64, signature_svg, metadata')
      .eq('token', token)
      .lte('token_expires_at', new Date(new Date().getTime() + 365 * 24 * 3600 * 1000).toISOString()) // no-op, but keeps select shape explicit
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return new Response(JSON.stringify({ ok: true, record: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ ok: true, record: data }), {
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
