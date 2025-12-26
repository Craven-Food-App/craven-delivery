import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// CORS helper (inlined for standalone deployment)
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim());
  }
  return [
    "https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com",
    "https://cravenusa.com",
    "https://www.cravenusa.com",
    "https://feeder.cravenusa.com",
    "https://merchant.cravenusa.com",
    "https://board.cravenusa.com",
    "https://hq.cravenusa.com",
    "https://ceo.cravenusa.com",
    "https://cfo.cravenusa.com",
    "https://coo.cravenusa.com",
    "https://cto.cravenusa.com",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:5173",
  ];
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

// Moov API utilities (inlined for standalone deployment)
const MOOV_API_URL = Deno.env.get("MOOV_API_URL") || "https://api.moov.io";
const MOOV_ACCOUNT_ID = Deno.env.get("MOOV_ACCOUNT_ID") || "";

interface MoovConfig {
  apiUrl?: string;
  accountId?: string;
  publicKey?: string;
  secretKey?: string;
}

interface MoovOnboardingInvite {
  code: string;
  link: string;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
}

function getMoovConfig(): MoovConfig {
  return {
    apiUrl: MOOV_API_URL,
    accountId: MOOV_ACCOUNT_ID,
    publicKey: Deno.env.get("MOOV_PUBLIC_KEY") || "",
    secretKey: Deno.env.get("MOOV_SECRET_KEY") || "",
  };
}

async function moovRequest(
  method: string,
  path: string,
  body?: any,
  config?: MoovConfig
): Promise<Response> {
  const moovConfig = config || getMoovConfig();
  const secretKey = moovConfig.secretKey;

  if (!secretKey) {
    throw new Error("Moov secret key not configured");
  }

  const url = `${moovConfig.apiUrl}${path}`;
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${secretKey}`,
    "Content-Type": "application/json",
    "x-moov-version": "v2024.01.00",
  };

  if (moovConfig.accountId) {
    headers["Moov-Account"] = moovConfig.accountId;
  }

  const options: RequestInit = { method, headers };
  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  // Clone response for logging (so we don't consume the original body)
  const clonedResponse = response.clone();
  const responseText = await clonedResponse.text();
  
  // Log API status and response for debugging
  console.log(`Moov API status: ${response.status}`);
  console.log(`Moov API response (first 200 chars): ${responseText.substring(0, 200)}\n`);

  if (!response.ok) {
    let errorDetails: any;
    try {
      errorDetails = JSON.parse(responseText);
    } catch {
      errorDetails = { message: responseText || response.statusText };
    }
    
    console.error("Moov API error details:", {
      status: response.status,
      statusText: response.statusText,
      path,
      method,
      hasAccountId: !!moovConfig.accountId,
      url,
      errorDetails,
    });
  }

  // Return the original response (body still readable)
  return response;
}

async function listMoovOnboardingInvites(config?: MoovConfig): Promise<MoovOnboardingInvite[]> {
  const response = await moovRequest("GET", "/onboarding-invites", undefined, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Failed to list onboarding invites: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return data.invites || [];
}

async function getMoovOnboardingInvite(
  code: string,
  config?: MoovConfig
): Promise<MoovOnboardingInvite> {
  const response = await moovRequest(
    "GET",
    `/onboarding-invites/${code}`,
    undefined,
    config
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Failed to get onboarding invite: ${error.message || response.statusText}`);
  }

  return await response.json();
}

async function revokeMoovOnboardingInvite(code: string, config?: MoovConfig): Promise<void> {
  const response = await moovRequest(
    "DELETE",
    `/onboarding-invites/${code}`,
    undefined,
    config
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Failed to revoke onboarding invite: ${error.message || response.statusText}`);
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const code = pathParts[pathParts.length - 1] || url.searchParams.get("code");

    const moovConfig = getMoovConfig();

    // Handle different HTTP methods
    if (req.method === "GET") {
      if (code && code !== "invites") {
        // Get specific invite by code
        const invite = await getMoovOnboardingInvite(code, moovConfig);
        return new Response(JSON.stringify(invite), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        // List all invites
        const invites = await listMoovOnboardingInvites(moovConfig);
        return new Response(JSON.stringify({ invites }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    } else if (req.method === "DELETE") {
      if (!code || code === "invites") {
        return new Response(
          JSON.stringify({ error: "Invite code is required for deletion" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Revoke the invite
      await revokeMoovOnboardingInvite(code, moovConfig);

      // Update database if this invite is associated with a restaurant
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("moov_onboarding_invite_code", code)
        .maybeSingle();

      if (restaurant) {
        await supabase
          .from("restaurants")
          .update({
            moov_onboarding_invite_code: null,
            moov_onboarding_status: "revoked",
            updated_at: new Date().toISOString(),
          })
          .eq("id", restaurant.id);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Invite revoked" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 405,
        }
      );
    }
  } catch (error) {
    console.error("Error managing Moov onboarding invites:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

