import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: equityRows, error } = await supabase
      .from('employee_equity')
      .select('employee_id, shares_percentage, shares_total, equity_type, grant_date');

    if (error) throw error;

    const employeeIds = Array.from(new Set((equityRows || []).map((r: any) => r.employee_id))).filter(Boolean);

    let employeesById: Record<string, any> = {};
    if (employeeIds.length > 0) {
      const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, position, email')
        .in('id', employeeIds);
      if (empErr) throw empErr;
      employeesById = (employees || []).reduce((acc: any, e: any) => { acc[e.id] = e; return acc; }, {});
    }

    const shareholders = (equityRows || []).map((eq: any) => ({
      id: eq.employee_id,
      first_name: employeesById[eq.employee_id]?.first_name || '',
      last_name: employeesById[eq.employee_id]?.last_name || '',
      position: employeesById[eq.employee_id]?.position || '',
      email: employeesById[eq.employee_id]?.email || '',
      employee_equity: [{
        shares_percentage: eq.shares_percentage,
        shares_total: eq.shares_total,
        equity_type: eq.equity_type,
        grant_date: eq.grant_date,
      }]
    }));

    return new Response(JSON.stringify({ ok: true, shareholders }), {
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
