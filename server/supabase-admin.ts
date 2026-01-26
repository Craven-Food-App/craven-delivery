import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
}

export function supabaseAdmin() {
  return createClient(env.SUPABASE_URL, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

