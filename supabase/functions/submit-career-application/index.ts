import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(/\s*,\s*/)[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return null;
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    const body = await req.json();
    const clientIp = getClientIp(req);

    if (!clientIp) {
      return new Response(
        JSON.stringify({ error: "Unable to verify submission. Please try again." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rpcParams: Record<string, unknown> = {
      name: body.name,
      email: body.email,
      submitted_from_ip: clientIp,
    };
    if (body.phone != null) rpcParams.phone = body.phone;
    if (body.linkedin_url != null) rpcParams.linkedin_url = body.linkedin_url;
    if (body.applicant_role != null) rpcParams.applicant_role = body.applicant_role;
    if (body.current_company != null) rpcParams.current_company = body.current_company;
    if (body.years_experience != null) rpcParams.years_experience = body.years_experience;
    if (body.location != null) rpcParams.location = body.location;
    if (body.skills != null) rpcParams.skills = body.skills;
    if (body.education != null) rpcParams.education = body.education;
    if (body.summary != null) rpcParams.summary = body.summary;
    if (body.resume_file_path != null) rpcParams.resume_file_path = body.resume_file_path;
    if (body.job_posting_id != null) rpcParams.job_posting_id = body.job_posting_id;
    if (body.position_title != null) rpcParams.position_title = body.position_title;

    const { data, error } = await supabase.rpc("submit_career_application", rpcParams);

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("ALREADY_APPLIED") || msg.includes("already submitted")) {
        return new Response(
          JSON.stringify({
            error: "You have already submitted an application. We'll be in touch.",
          }),
          { status: 409, headers: jsonHeaders }
        );
      }
      return new Response(
        JSON.stringify({ error: msg || "Submission failed" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    return new Response(JSON.stringify({ id: data }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (e) {
    console.error("submit-career-application error:", e);
    return new Response(
      JSON.stringify({ error: "Submission failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
