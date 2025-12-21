/**
 * Security Fix Script for Edge Functions
 * 
 * This script updates all edge functions to use secure CORS headers
 * and adds rate limiting to critical endpoints.
 * 
 * Run with: deno run --allow-read --allow-write scripts/fix-edge-function-security.ts
 */

import { walk } from "https://deno.land/std@0.208.0/fs/walk.ts";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";

const FUNCTIONS_DIR = "./supabase/functions";

// Critical endpoints that need rate limiting
const RATE_LIMITED_FUNCTIONS = [
  "send-phone-verification",
  "verify-phone-code",
  "reset-executive-password",
  "reset-executive-password-admin",
  "reset-tablet-password",
  "create-payment",
  "create-cashapp-payment",
  "create-cravemore-checkout",
  "process-refund",
  "daily-driver-payouts",
  "manual-driver-payout",
  "initiate-background-check",
  "checkr-webhook",
  "stripe-webhook",
];

// Functions to fix CORS
async function fixCorsInFunction(filePath: string): Promise<boolean> {
  try {
    let content = await Deno.readTextFile(filePath);
    let modified = false;

    // Check if using wildcard CORS
    if (content.includes("'Access-Control-Allow-Origin': '*'")) {
      console.log(`Fixing CORS in: ${filePath}`);

      // Replace wildcard CORS with secure CORS
      content = content.replace(
        /const corsHeaders = \{[^}]*'Access-Control-Allow-Origin': '\*'[^}]*\};/gs,
        `import { getCorsHeaders } from '../_shared/cors.ts';

// SECURITY: Use secure CORS headers - no wildcards
const corsHeaders = getCorsHeaders(null); // Will use first allowed origin as fallback`
      );

      // Update serve function to use request origin
      if (content.includes("serve(async (req)")) {
        content = content.replace(
          "serve(async (req) => {",
          `serve(async (req) => {
  // Get secure CORS headers based on request origin
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
`
        );
      }

      modified = true;
    }

    if (modified) {
      await Deno.writeTextFile(filePath, content);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error);
    return false;
  }
}

// Add rate limiting to critical functions
async function addRateLimiting(filePath: string, functionName: string): Promise<boolean> {
  try {
    let content = await Deno.readTextFile(filePath);

    // Skip if already has rate limiting
    if (content.includes("checkRateLimit") || content.includes("RateLimitPresets")) {
      console.log(`Rate limiting already exists in: ${functionName}`);
      return false;
    }

    console.log(`Adding rate limiting to: ${functionName}`);

    // Add import
    if (!content.includes("import { checkRateLimit")) {
      content = content.replace(
        /import.*from.*cors\.ts.*;/,
        `$&
import { checkRateLimit, RateLimitPresets, addRateLimitHeaders } from '../_shared/rateLimit.ts';`
      );
    }

    // Determine which rate limit preset to use
    let preset = "API";
    if (functionName.includes("phone") || functionName.includes("verify")) {
      preset = "PHONE_VERIFY";
    } else if (functionName.includes("password") || functionName.includes("reset")) {
      preset = "PASSWORD_RESET";
    } else if (functionName.includes("payment") || functionName.includes("payout")) {
      preset = "PAYMENT";
    }

    // Add rate limit check after CORS OPTIONS handling
    content = content.replace(
      /(if \(req\.method === ['"]OPTIONS['"]\)[^}]*\})/,
      `$1

  // SECURITY: Rate limiting
  const rateLimitResult = await checkRateLimit(req, supabase, RateLimitPresets.${preset});
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ 
        error: rateLimitResult.message || 'Too many requests',
        resetIn: rateLimitResult.resetIn 
      }),
      { 
        status: 429, 
        headers: addRateLimitHeaders(corsHeaders, rateLimitResult)
      }
    );
  }`
    );

    await Deno.writeTextFile(filePath, content);
    return true;
  } catch (error) {
    console.error(`Error adding rate limiting to ${filePath}:`, error);
    return false;
  }
}

// Main execution
async function main() {
  console.log("🔒 Starting Edge Function Security Fixes...\n");

  let corsFixed = 0;
  let rateLimitAdded = 0;

  // Walk through all function directories
  for await (const entry of walk(FUNCTIONS_DIR, {
    maxDepth: 2,
    exts: [".ts"],
    match: [/index\.ts$/],
  })) {
    const functionName = entry.path.split("/").slice(-2, -1)[0];

    // Fix CORS
    const corsWasFixed = await fixCorsInFunction(entry.path);
    if (corsWasFixed) corsFixed++;

    // Add rate limiting to critical functions
    if (RATE_LIMITED_FUNCTIONS.includes(functionName)) {
      const rateLimitWasAdded = await addRateLimiting(entry.path, functionName);
      if (rateLimitWasAdded) rateLimitAdded++;
    }
  }

  console.log("\n✅ Security Fixes Complete!");
  console.log(`   - CORS fixed in ${corsFixed} functions`);
  console.log(`   - Rate limiting added to ${rateLimitAdded} functions`);
}

if (import.meta.main) {
  main();
}

