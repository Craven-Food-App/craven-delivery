// Dev/local origins always allowed so local and tablet dev work even when ALLOWED_ORIGINS is set in prod
const DEV_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:5173",
  "http://localhost:8092",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8082",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8092",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
];

/** Any http(s)://localhost or 127.0.0.1 with any port — avoids CORS breaks when Vite uses a new port. */
const isLocalhostHttpOrigin = (origin: string): boolean => {
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

// Get allowed origins from environment or use defaults
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  const fromEnv = envOrigins ? envOrigins.split(",").map((o) => o.trim()).filter(Boolean) : [];
  // When env is set, merge with dev origins so local/tablet dev always works
  const production = fromEnv.length > 0 ? fromEnv : [
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
  ];
  const combined = [...new Set([...DEV_ORIGINS, ...production])];
  return combined;
};

const isLovableAppPreviewOrigin = (origin: string): boolean => {
  try {
    const u = new URL(origin);
    return u.protocol === "https:" && u.hostname.endsWith(".lovable.app");
  } catch {
    return false;
  }
};

export const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const ok =
    origin != null &&
    (allowedOrigins.includes(origin) ||
      isLovableAppPreviewOrigin(origin) ||
      isLocalhostHttpOrigin(origin));
  const allowedOrigin = ok ? origin! : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

// DEPRECATED: DO NOT USE - Use getCorsHeaders(req.headers.get('origin')) instead
// This wildcard export is insecure and will be removed in future version
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

