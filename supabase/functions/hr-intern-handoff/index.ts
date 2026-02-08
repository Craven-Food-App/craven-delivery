import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
interface HandoffPayload {
  person: {
    first_name: string;
    last_name: string;
    email: string;
    location?: string;
    phone?: string;
  };
  employment: {
    role_type: "INTERN";
    track: "Technology" | "Strategy/Ops" | "Operations" | "Marketing";
    start_date: string; // YYYY-MM-DD
    manager_id?: string;
    sponsor_id?: string;
  };
  program: {
    initial_role_state: "INTERN_ACTIVE";
    source: "HR_HANDOFF";
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is HR or Admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check permissions
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "ceo", "hr", "INTERN_PROGRAM_ADMIN"]);

    const hasPermission = roles && roles.length > 0;
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. HR or Admin access required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      const body: HandoffPayload = await req.json();

      // Validate payload structure
      if (!body.person || !body.employment || !body.program) {
        return new Response(
          JSON.stringify({ error: "Invalid payload structure. Required: person, employment, program" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate required fields
      if (!body.person.first_name || !body.person.last_name || !body.person.email) {
        return new Response(
          JSON.stringify({ error: "Missing required person fields: first_name, last_name, email" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!body.employment.track || !body.employment.start_date) {
        return new Response(
          JSON.stringify({ error: "Missing required employment fields: track, start_date" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user exists, create if not
      const { data: existingUser } = await supabaseClient.auth.admin.getUserByEmail(body.person.email);

      let userId = existingUser?.user?.id;

      if (!userId) {
        // Create user account
        const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
          email: body.person.email,
          email_confirm: true,
          user_metadata: {
            full_name: `${body.person.first_name} ${body.person.last_name}`,
            first_name: body.person.first_name,
            last_name: body.person.last_name,
          },
        });

        if (createError || !newUser?.user) {
          return new Response(
            JSON.stringify({ error: `Failed to create user account: ${createError?.message || "Unknown error"}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        userId = newUser.user.id;
      }

      // Create or update candidate record
      const { data: existingCandidate } = await supabaseClient
        .from("hr_intern_candidates")
        .select("id")
        .eq("email", body.person.email)
        .single();

      let candidateId: string;

      if (existingCandidate) {
        // Update existing candidate
        const { data: updatedCandidate, error: updateError } = await supabaseClient
          .from("hr_intern_candidates")
          .update({
            first_name: body.person.first_name,
            last_name: body.person.last_name,
            email: body.person.email,
            location: body.person.location,
            phone: body.person.phone,
            track: body.employment.track,
            start_date: body.employment.start_date,
            manager_id: body.employment.manager_id || null,
            sponsor_id: body.employment.sponsor_id || null,
            hr_status: "Accepted",
            handoff_status: "Pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingCandidate.id)
          .select("id")
          .single();

        if (updateError || !updatedCandidate) {
          return new Response(
            JSON.stringify({ error: `Failed to update candidate: ${updateError?.message || "Unknown error"}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        candidateId = updatedCandidate.id;
      } else {
        // Create new candidate
        const { data: newCandidate, error: insertError } = await supabaseClient
          .from("hr_intern_candidates")
          .insert({
            first_name: body.person.first_name,
            last_name: body.person.last_name,
            email: body.person.email,
            location: body.person.location,
            phone: body.person.phone,
            track: body.employment.track,
            start_date: body.employment.start_date,
            manager_id: body.employment.manager_id || null,
            sponsor_id: body.employment.sponsor_id || null,
            hr_status: "Accepted",
            handoff_status: "Pending",
            created_by: user.id,
          })
          .select("id")
          .single();

        if (insertError || !newCandidate) {
          return new Response(
            JSON.stringify({ error: `Failed to create candidate: ${insertError?.message || "Unknown error"}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        candidateId = newCandidate.id;
      }

      // The trigger will automatically attempt enrollment
      // Wait a moment and check status
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get handoff status
      const { data: handoffStatus, error: statusError } = await supabaseClient
        .rpc("get_hr_handoff_status", { p_candidate_id: candidateId });

      if (statusError) {
        return new Response(
          JSON.stringify({ 
            error: "Handoff initiated but status check failed",
            candidate_id: candidateId,
            message: statusError.message 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const status = handoffStatus?.[0];

      if (status?.handoff_status === "Enrolled") {
        // Send enrollment email (async, non-blocking)
        try {
          await supabaseClient.functions.invoke("send-intern-enrollment-email", {
            body: {
              intern_email: body.person.email,
              intern_name: `${body.person.first_name} ${body.person.last_name}`,
              track: body.employment.track,
              start_date: body.employment.start_date,
              engagement_id: status.engagement_id,
            },
          });
        } catch (emailError) {
          console.error("Failed to send enrollment email:", emailError);
          // Don't fail the handoff if email fails
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Intern successfully enrolled in program",
            candidate_id: candidateId,
            employee_id: status.employee_id,
            engagement_id: status.engagement_id,
            handoff_status: status.handoff_status,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (status?.handoff_status === "Failed") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Enrollment failed",
            candidate_id: candidateId,
            handoff_status: status.handoff_status,
            handoff_error: status.handoff_error,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Handoff is processing",
            candidate_id: candidateId,
            handoff_status: status?.handoff_status || "Pending",
          }),
          { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // GET - Get candidate status
    if (req.method === "GET") {
      const url = new URL(req.url);
      const candidateId = url.searchParams.get("candidate_id");

      if (!candidateId) {
        return new Response(
          JSON.stringify({ error: "Missing candidate_id parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: status, error: statusError } = await supabaseClient
        .rpc("get_hr_handoff_status", { p_candidate_id: candidateId });

      if (statusError) {
        return new Response(
          JSON.stringify({ error: statusError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data: status?.[0] || null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("HR handoff error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

