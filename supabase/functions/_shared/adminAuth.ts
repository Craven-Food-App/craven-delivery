import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Verify the caller is authenticated AND has an admin/CEO/COO/CFO/CHRO role.
 * Returns { ok: true, userId } on success, or { ok: false, status, error } on failure.
 *
 * Caller should pass the raw `Request` and an array of allowed roles (defaults to admin/ceo).
 * Uses SUPABASE_SERVICE_ROLE_KEY for the role lookup.
 */
export async function requireAdmin(
  req: Request,
  allowedRoles: string[] = ["admin", "ceo", "coo", "cfo", "chro", "executive"],
): Promise<
  | { ok: true; userId: string; email: string | null }
  | { ok: false; status: number; error: string }
> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing Authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, status: 500, error: "Server misconfigured" };
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const userId = userData.user.id;
  const email = userData.user.email ?? null;

  // Check user_roles
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const userRoles = (roles ?? []).map((r: any) => String(r.role).toLowerCase());
  if (userRoles.some((r) => allowedRoles.includes(r))) {
    return { ok: true, userId, email };
  }

  // Check exec_users (approved executive)
  const { data: exec } = await admin
    .from("exec_users")
    .select("role, is_approved")
    .eq("user_id", userId)
    .maybeSingle();
  if (exec && exec.is_approved !== false) {
    const execRole = String(exec.role || "").toLowerCase();
    if (allowedRoles.includes(execRole) || allowedRoles.includes("executive")) {
      return { ok: true, userId, email };
    }
  }

  return { ok: false, status: 403, error: "Forbidden: insufficient privileges" };
}