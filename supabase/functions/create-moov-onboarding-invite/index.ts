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

interface MoovAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  country: string;
}

interface MoovOnboardingPrefill {
  mode?: "production" | "sandbox";
  accountType?: "individual" | "business";
  profile?: {
    business?: {
      legalBusinessName?: string;
      doingBusinessAs?: string;
      businessType?: string;
      address?: MoovAddress;
      phone?: { number: string; countryCode: string };
      email?: string;
      website?: string;
      description?: string;
      taxID?: { ein?: { number: string } };
      industryCodes?: { naics?: string; sic?: string; mcc?: string };
      primaryRegulator?: string;
    };
    individual?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: { number: string; countryCode: string };
      address?: MoovAddress;
      dateOfBirth?: { day: number; month: number; year: number };
      ssn?: { full?: string; last4?: string };
    };
  };
  metadata?: Record<string, string>;
  termsOfService?: { token: string };
  foreignID?: string;
  customerSupport?: {
    phone?: { number: string; countryCode: string };
    email?: string;
    address?: MoovAddress;
    website?: string;
  };
  settings?: {
    cardPayment?: { statementDescriptor?: string };
    achPayment?: { companyName?: string };
  };
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

  return fetch(url, options);
}

async function createMoovOnboardingInvite(params: {
  returnURL?: string;
  termsOfServiceURL?: string;
  scopes: string[];
  capabilities: string[];
  feePlanCodes: string[];
  prefill?: MoovOnboardingPrefill;
  config?: MoovConfig;
}): Promise<MoovOnboardingInvite> {
  const response = await moovRequest(
    "POST",
    "/onboarding-invites",
    {
      returnURL: params.returnURL,
      termsOfServiceURL: params.termsOfServiceURL,
      scopes: params.scopes,
      capabilities: params.capabilities,
      feePlanCodes: params.feePlanCodes,
      prefill: params.prefill,
    },
    params.config
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Moov onboarding invite creation failed: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    code: data.code,
    link: data.link,
    status: data.status,
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
  };
}

async function generateMoovTermsOfServiceToken(
  accountID: string,
  config?: MoovConfig
): Promise<{ token: string }> {
  const response = await moovRequest(
    "POST",
    `/accounts/${accountID}/terms-of-service`,
    {},
    config
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Failed to generate terms of service token: ${error.message || response.statusText}`);
  }

  return await response.json();
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

    const body = await req.json();
    const {
      restaurantId,
      returnURL,
      termsOfServiceURL,
      scopes = ["accounts.read"],
      capabilities = ["wallet.balance", "collect-funds.ach", "send-funds.ach"],
      feePlanCodes = [],
      prefill,
      accountType = "business",
    } = body;

    // Validate required fields
    if (!feePlanCodes || feePlanCodes.length === 0) {
      return new Response(
        JSON.stringify({ error: "feePlanCodes is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Fetch restaurant data if restaurantId is provided
    let restaurant: any = null;
    if (restaurantId) {
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .maybeSingle();

      if (restaurantError) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch restaurant data" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      if (restaurantData) {
        // Security: ensure the authenticated user owns this restaurant
        if (restaurantData.owner_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 403,
            }
          );
        }
        restaurant = restaurantData;
      }
    } else {
      // Fallback: get most recent restaurant for user
      const { data: restaurants } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      restaurant = restaurants?.[0] || null;
    }

    // Build prefill data from restaurant if available
    let onboardingPrefill: MoovOnboardingPrefill | undefined = prefill;

    if (restaurant && !prefill) {
      // Auto-populate prefill from restaurant data
      onboardingPrefill = {
        mode: "production",
        accountType: accountType as "individual" | "business",
        profile: {
          business: {
            legalBusinessName: restaurant.name,
            doingBusinessAs: restaurant.name,
            businessType: "llc", // Default, should be configurable
            address: {
              addressLine1: restaurant.address || "",
              city: restaurant.city || "",
              stateOrProvince: restaurant.state || "",
              postalCode: restaurant.zip_code || "",
              country: "US",
            },
            email: restaurant.email || user.email || undefined,
            phone: restaurant.phone
              ? {
                  number: restaurant.phone.replace(/\D/g, ""),
                  countryCode: "1",
                }
              : undefined,
            website: undefined,
            description: restaurant.description || undefined,
          },
        },
        foreignID: restaurant.id,
        customerSupport: {
          email: restaurant.email || user.email || undefined,
          phone: restaurant.phone
            ? {
                number: restaurant.phone.replace(/\D/g, ""),
                countryCode: "1",
              }
            : undefined,
          address: {
            addressLine1: restaurant.address || "",
            city: restaurant.city || "",
            stateOrProvince: restaurant.state || "",
            postalCode: restaurant.zip_code || "",
            country: "US",
          },
        },
        settings: {
          cardPayment: {
            statementDescriptor: restaurant.name?.substring(0, 22) || undefined,
          },
          achPayment: {
            companyName: restaurant.name || undefined,
          },
        },
      };
    }

    // Generate terms of service token if needed
    // Note: This requires an account ID. If you're creating a new account via onboarding,
    // you may need to create the account first or handle this differently.
    // For now, we'll skip this if not provided in prefill
    if (onboardingPrefill && !onboardingPrefill.termsOfService) {
      // Try to get or create a Moov account for this restaurant
      // This is optional - the onboarding process can handle account creation
      const moovAccountId = restaurant?.moov_account_id;
      if (moovAccountId) {
        try {
          const moovConfig = getMoovConfig();
          const termsToken = await generateMoovTermsOfServiceToken(
            moovAccountId,
            moovConfig
          );
          onboardingPrefill.termsOfService = { token: termsToken.token };
        } catch (error) {
          console.warn("Could not generate terms of service token:", error);
          // Continue without it - onboarding can still proceed
        }
      }
    }

    // Get frontend URL for return URL if not provided
    const frontendUrl =
      Deno.env.get("FRONTEND_URL") ||
      Deno.env.get("SUPABASE_URL")?.replace("/functions/v1", "") ||
      "http://localhost:8080";

    const defaultReturnURL = returnURL || `${frontendUrl}/merchant-portal?moov_onboarding=complete`;
    const defaultTermsURL = termsOfServiceURL || `${frontendUrl}/terms-of-service`;

    // Create the onboarding invite
    const moovConfig = getMoovConfig();
    const invite = await createMoovOnboardingInvite(
      {
        returnURL: defaultReturnURL,
        termsOfServiceURL: defaultTermsURL,
        scopes,
        capabilities,
        feePlanCodes,
        prefill: onboardingPrefill,
      },
      moovConfig
    );

    // Store the invite code in the database for tracking
    if (restaurant) {
      await supabase
        .from("restaurants")
        .update({
          moov_onboarding_invite_code: invite.code,
          moov_onboarding_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", restaurant.id);
    }

    return new Response(
      JSON.stringify({
        code: invite.code,
        link: invite.link,
        status: invite.status,
        restaurantId: restaurant?.id || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating Moov onboarding invite:", error);
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

