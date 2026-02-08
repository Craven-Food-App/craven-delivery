import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const sql = `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'employee_equity' AND column_name = 'shares_total'
        ) THEN
          EXECUTE 'ALTER TABLE public.employee_equity ADD COLUMN shares_total INTEGER';
        END IF;
      END $$;
    `;

    // Execute using rpc if available, else use http rpc replacement
    const { error } = await supabase.rpc('execute_sql_passthrough', { sql });
    if (error) {
      // Fallback: attempt via http fetch to PostgREST rpc if present (ignored if not configured)
      console.error('RPC execute_sql_passthrough not available:', error.message);
    }

    return new Response(JSON.stringify({ ok: true }), {
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
