import type { Request } from "express";
import { supabaseAdmin } from "./supabase-admin.js";

export interface AuthContext {
  userId: string;
  email?: string;
}

export async function getAuthContext(req: Request): Promise<AuthContext | null> {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }

    return {
      userId: data.user.id,
      email: data.user.email ?? undefined,
    };
  } catch {
    return null;
  }
}
