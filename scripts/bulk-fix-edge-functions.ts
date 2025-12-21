/**
 * Bulk Security Fix Script for Supabase Edge Functions
 * 
 * This script systematically applies security fixes to all edge functions:
 * 1. Replace wildcard CORS with secure getCorsHeaders
 * 2. Add rate limiting to critical endpoints
 * 
 * Run with: deno run --allow-read --allow-write scripts/bulk-fix-edge-functions.ts
 */

import { walk } from "https://deno.land/std@0.190.0/fs/mod.ts";

interface EdgeFunctionFix {
  path: string;
  hasWildcardCors: boolean;
  hasRateLimit: boolean;
  isWebhook: boolean;
  isCritical: boolean;
}

const CRITICAL_ENDPOINTS = [
  'create-payment',
  'process-refund',
  'daily-driver-payouts',
  'manual-driver-payout',
  'send-phone-verification',
  'verify-phone-code',
  'reset-executive-password',
  'reset-tablet-password',
];

const WEBHOOK_ENDPOINTS = [
  'stripe-webhook',
  'checkr-webhook',
  'twilio-webhook',
];

async function scanEdgeFunctions(): Promise<EdgeFunctionFix[]> {
  const fixes: EdgeFunctionFix[] = [];
  const functionsDir = './supabase/functions';

  for await (const entry of walk(functionsDir, { 
    exts: ['ts'],
    skip: [/node_modules/, /_shared/],
  })) {
    if (entry.isFile && entry.name === 'index.ts') {
      const content = await Deno.readTextFile(entry.path);
      const functionName = entry.path.split('/').slice(-2, -1)[0];

      const hasWildcardCors = content.includes("'Access-Control-Allow-Origin': '*'") ||
                              content.includes('"Access-Control-Allow-Origin": "*"');
      const hasRateLimit = content.includes('checkRateLimit');
      const isWebhook = WEBHOOK_ENDPOINTS.includes(functionName);
      const isCritical = CRITICAL_ENDPOINTS.includes(functionName);

      if (hasWildcardCors || (!hasRateLimit && isCritical)) {
        fixes.push({
          path: entry.path,
          hasWildcardCors,
          hasRateLimit,
          isWebhook,
          isCritical,
        });
      }
    }
  }

  return fixes;
}

async function fixEdgeFunction(fix: EdgeFunctionFix): Promise<void> {
  let content = await Deno.readTextFile(fix.path);
  const functionName = fix.path.split('/').slice(-2, -1)[0];

  console.log(`\n🔧 Fixing: ${functionName}`);

  // Fix CORS
  if (fix.hasWildcardCors) {
    console.log('  ✓ Replacing wildcard CORS');
    
    // Add import if not present
    if (!content.includes('getCorsHeaders')) {
      const importMatch = content.match(/import\s+{[^}]+}\s+from\s+["']https:\/\/esm\.sh\/@supabase\/supabase-js/);
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          `${importMatch[0]}\nimport { getCorsHeaders } from "../_shared/cors.ts";`
        );
      }
    }

    // Replace wildcard CORS definition
    content = content.replace(
      /const\s+corsHeaders\s*=\s*{[\s\S]*?'Access-Control-Allow-Origin':\s*'\*'[\s\S]*?};/,
      ''
    );

    // Update CORS usage
    if (fix.isWebhook) {
      // Webhooks don't need CORS
      content = content.replace(
        /if\s*\(\s*req\.method\s*===\s*['"]OPTIONS['"]\s*\)\s*{[\s\S]*?return\s+new\s+Response\([^)]*\);[\s\S]*?}/,
        ''
      );
    } else {
      // Regular endpoints need dynamic CORS
      content = content.replace(
        /serve\(async\s*\(req\)\s*=>\s*{/,
        `serve(async (req) => {
  // SECURITY: Get secure CORS headers based on request origin
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));`
      );
    }
  }

  // Add rate limiting for critical endpoints
  if (!fix.hasRateLimit && fix.isCritical) {
    console.log('  ✓ Adding rate limiting');

    // Add import
    if (!content.includes('checkRateLimit')) {
      const importMatch = content.match(/import\s+{[^}]+}\s+from\s+["']\.\.\/\_shared\/cors\.ts["']/);
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          `${importMatch[0]}\nimport { checkRateLimit, RateLimitPresets, addRateLimitHeaders } from '../_shared/rateLimit.ts';`
        );
      }
    }

    // Determine rate limit preset
    let preset = 'API';
    if (functionName.includes('payment') || functionName.includes('payout') || functionName.includes('refund')) {
      preset = 'PAYMENT';
    } else if (functionName.includes('password') || functionName.includes('reset')) {
      preset = 'PASSWORD_RESET';
    } else if (functionName.includes('phone') || functionName.includes('verify')) {
      preset = 'PHONE_VERIFY';
    }

    // Add rate limit check after supabase client creation
    const supabaseMatch = content.match(/const\s+supabase\s*=\s*createClient\([^)]+\);/);
    if (supabaseMatch) {
      const rateLimitCode = `

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
    }`;
      
      content = content.replace(supabaseMatch[0], `${supabaseMatch[0]}${rateLimitCode}`);
    }
  }

  await Deno.writeTextFile(fix.path, content);
  console.log(`  ✅ Fixed: ${functionName}`);
}

async function main() {
  console.log('🔍 Scanning edge functions for security issues...\n');
  
  const fixes = await scanEdgeFunctions();
  
  console.log(`\n📊 Found ${fixes.length} functions needing fixes:`);
  console.log(`   - ${fixes.filter(f => f.hasWildcardCors).length} with wildcard CORS`);
  console.log(`   - ${fixes.filter(f => !f.hasRateLimit && f.isCritical).length} critical endpoints without rate limiting`);

  if (fixes.length === 0) {
    console.log('\n✅ All edge functions are secure!');
    return;
  }

  console.log('\n🚀 Applying fixes...');
  
  for (const fix of fixes) {
    try {
      await fixEdgeFunction(fix);
    } catch (error) {
      console.error(`❌ Error fixing ${fix.path}:`, error);
    }
  }

  console.log('\n✅ Security fixes complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Review the changes');
  console.log('   2. Test edge functions locally');
  console.log('   3. Deploy to Supabase: supabase functions deploy');
}

if (import.meta.main) {
  main();
}

