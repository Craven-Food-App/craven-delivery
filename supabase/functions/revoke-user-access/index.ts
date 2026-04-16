import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

async function archiveRevocationLetter(
  admin: any,
  payload: {
    workflowId: string;
    employeeName: string;
    employeeEmail: string | null;
    systemName: string;
    changes: string[];
    notes?: string | null;
    actorId: string;
  },
) {
  const now = new Date();
  const safeEmail = (payload.employeeEmail || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${payload.workflowId}_access_revocation_letter_${safeEmail}_${now.getTime()}.html`;
  const storagePath = `exit-workflows/${payload.workflowId}/${fileName}`;
  const actionItems = payload.changes.map((c) => `<li>${c}</li>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Access Revocation Letter</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 24px; }
    .box { background: #f7f7f7; border-left: 4px solid #d32f2f; padding: 14px; margin: 18px 0; }
  </style>
</head>
<body>
  <h2>Access Revocation Confirmation</h2>
  <p><strong>Date:</strong> ${now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
  <p><strong>Employee:</strong> ${payload.employeeName}</p>
  <p><strong>Email:</strong> ${payload.employeeEmail || "N/A"}</p>
  <p><strong>System Scope:</strong> ${payload.systemName}</p>
  <div class="box">
    <p><strong>Actions executed:</strong></p>
    <ul>${actionItems}</ul>
  </div>
  ${payload.notes ? `<p><strong>Notes:</strong><br>${payload.notes.replace(/\n/g, "<br>")}</p>` : ""}
  <p>This letter confirms that login and platform access were revoked according to exit workflow controls.</p>
</body>
</html>`;

  const { error: uploadError } = await admin.storage
    .from("documents")
    .upload(storagePath, new TextEncoder().encode(html), {
      contentType: "text/html; charset=utf-8",
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = admin.storage.from("documents").getPublicUrl(storagePath);
  const publicUrl = publicUrlData?.publicUrl || null;

  let role = "employee";
  let executiveId: string | null = null;

  if (payload.employeeEmail) {
    const { data: employee } = await admin
      .from("employees")
      .select("user_id")
      .eq("email", payload.employeeEmail)
      .maybeSingle();
    if (employee?.user_id) {
      const { data: exec } = await admin
        .from("exec_users")
        .select("id, role")
        .eq("user_id", employee.user_id)
        .maybeSingle();
      executiveId = exec?.id || null;
      role = exec?.role || role;
    }
  }

  await admin.from("executive_documents").insert({
    type: "access_revocation_letter",
    officer_name: payload.employeeName,
    role,
    status: "generated",
    file_url: publicUrl,
    executive_id: executiveId,
    created_by: payload.actorId,
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await authed.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actorId = authData.user.id;

    const body = await req.json();
    const {
      workflow_id,
      employee_id,
      system_name,
      email_forward_to,
      notes,
      permanent_delete = false,
    } = body || {};

    if (!workflow_id || !employee_id || !system_name) {
      return new Response(
        JSON.stringify({ error: "workflow_id, employee_id, and system_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const changes: string[] = [];

    const { data: employee, error: empError } = await admin
      .from("employees")
      .select("id, user_id, email, first_name, last_name")
      .eq("id", employee_id)
      .maybeSingle();

    if (empError || !employee) {
      return new Response(JSON.stringify({ error: "Employee not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let targetUserId: string | null = employee.user_id || null;
    const targetEmail = employee.email || null;

    if (!targetUserId && targetEmail) {
      const { data: profile } = await admin
        .from("user_profiles")
        .select("user_id")
        .eq("email", targetEmail)
        .maybeSingle();
      targetUserId = profile?.user_id || null;
    }

    if (targetUserId) {
      if (permanent_delete) {
        const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
        if (deleteError) throw deleteError;
        changes.push("Auth login deleted");
      } else {
        const { error: banError } = await admin.auth.admin.updateUserById(targetUserId, {
          ban_duration: "876000h", // ~100 years
        });
        if (banError) throw banError;
        changes.push("Auth login banned");
      }

      const { error: roleDeleteError } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId);
      if (roleDeleteError) throw roleDeleteError;
      changes.push("All user_roles removed");

      // Best-effort: mark executive record inactive if available
      const { error: execUpdateError } = await admin
        .from("exec_users")
        .update({ approved: false, updated_at: new Date().toISOString() } as any)
        .eq("user_id", targetUserId);
      if (!execUpdateError) {
        changes.push("exec_users approved=false");
      }
    }

    if (targetEmail) {
      const { error: pinDeleteError } = await admin
        .from("ceo_access_credentials")
        .delete()
        .eq("user_email", targetEmail);
      if (!pinDeleteError) {
        changes.push("Hub/PIN credentials removed");
      }
    }

    // Record system-level revocation metadata on the access row
    const { error: revocationUpdateError } = await admin
      .from("exit_access_revocations")
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_by: actorId,
        email_forward_to: email_forward_to || null,
        notes: notes || null,
      })
      .eq("workflow_id", workflow_id)
      .eq("system_name", system_name);

    if (revocationUpdateError) throw revocationUpdateError;

    try {
      await admin.from("governance_logs").insert({
        action: "ACCESS_REVOKED_HARD",
        actor_id: actorId,
        entity_type: "EXIT_WORKFLOW",
        entity_id: workflow_id,
        description: `Hard access revocation completed for ${employee.first_name || ""} ${employee.last_name || ""} (${system_name})`,
        data: {
          employee_id,
          target_user_id: targetUserId,
          target_email: targetEmail,
          system_name,
          permanent_delete,
          changes,
        },
      });
    } catch (logError) {
      console.warn("governance_logs insert failed (non-fatal):", logError);
    }

    try {
      await archiveRevocationLetter(admin, {
        workflowId: workflow_id,
        employeeName: `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Unknown",
        employeeEmail: targetEmail,
        systemName: system_name,
        changes,
        notes: notes || null,
        actorId,
      });
    } catch (archiveError) {
      console.warn("Failed to archive access revocation letter:", archiveError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Access revoked and login access removed",
        changes,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in revoke-user-access:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

