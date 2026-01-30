import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

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
      do $$
      begin
        if not exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'employees' and column_name = 'salary_status'
        ) then
          execute 'alter table public.employees add column salary_status text check (salary_status in (''active'',''deferred'')) default ''active''';
        end if;

        if not exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'employees' and column_name = 'funding_trigger'
        ) then
          execute 'alter table public.employees add column funding_trigger integer';
        end if;

        if not exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'employees' and column_name = 'deferred_salary_clause'
        ) then
          execute 'alter table public.employees add column deferred_salary_clause boolean default false';
        end if;
      end $$;
    `;

    const { error } = await supabase.rpc('execute_raw_sql', { sql });
    if (error) throw error;

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
