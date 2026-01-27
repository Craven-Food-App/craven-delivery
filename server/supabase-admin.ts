import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export function supabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  }
  
  if (!env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL environment variable is required");
  }
  
  return createClient(env.SUPABASE_URL, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

