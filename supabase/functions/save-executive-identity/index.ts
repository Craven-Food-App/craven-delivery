// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

type Payload = {
  executiveId: string;
  fullName: string;
  dateOfBirth: string; // ISO date
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  ssn: string; // unmasked 9 digits
  w9StoragePath?: string; // optional
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENCRYPTION_KEY_B64 = Deno.env.get("ENCRYPTION_KEY_B64")!;

function badRequest(msg: string, details?: any) {
  return new Response(JSON.stringify({ error: msg, details }), { 
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function importKeyFromB64(keyB64: string) {
  const raw = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
  if (raw.byteLength !== 32) throw new Error("ENCRYPTION_KEY_B64 must be 32 bytes");
  return await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

function toBase64(u8: Uint8Array) {
  let s = "";
  u8.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  // Basic validation (no logs with SSN!)
  const {
    executiveId,
    fullName,
    dateOfBirth,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country = "US",
    ssn,
    w9StoragePath,
  } = body;

  if (!executiveId || !fullName || !dateOfBirth || !ssn) {
    return badRequest("Missing required fields");
  }

  const ssnDigits = ssn.replace(/\D/g, "");
  if (!/^\d{9}$/.test(ssnDigits)) {
    return badRequest("SSN must be 9 digits");
  }

  // Validate encryption key exists
  if (!ENCRYPTION_KEY_B64) {
    console.error("ENCRYPTION_KEY_B64 environment variable not set");
    return new Response(JSON.stringify({ error: "Server configuration error" }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Encrypt SSN with AES-GCM
  try {
    const key = await importKeyFromB64(ENCRYPTION_KEY_B64);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const ciphertextBuf = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(ssnDigits)
    );
    const ciphertext = new Uint8Array(ciphertextBuf);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ssnLast4 = ssnDigits.slice(-4);

    const { error } = await supabase.from("executive_identity").upsert({
      executive_id: executiveId,
      full_name: fullName,
      date_of_birth: dateOfBirth,
      address_line1: addressLine1 ?? null,
      address_line2: addressLine2 ?? null,
      city: city ?? null,
      state: state ?? null,
      postal_code: postalCode ?? null,
      country,
      ssn_ciphertext: toBase64(ciphertext),
      ssn_iv: toBase64(iv),
      ssn_last4: ssnLast4,
      w9_storage_path: w9StoragePath ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "executive_id" });

    if (error) {
      console.error('DB insert error (SSN not logged):', error.message);
      return new Response(JSON.stringify({ error: "DB insert failed" }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true, last4: ssnLast4 }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Encryption or DB error (SSN not logged):', e);
    return new Response(JSON.stringify({ error: "Encryption or DB error" }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

