#!/usr/bin/env tsx
/**
 * Bulk CORS Application Script
 * Applies secure CORS configuration to all Supabase Edge Functions
 * 
 * Run with: tsx scripts/bulk-apply-cors.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const FUNCTIONS_DIR = path.join(process.cwd(), 'supabase', 'functions');

interface FunctionStatus {
  name: string;
  hasCors: boolean;
  hasSecureCors: boolean;
  filePath: string;
}

/**
 * Check if a function already has CORS configuration
 */
function checkCorsStatus(filePath: string): { hasCors: boolean; hasSecureCors: boolean } {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const hasCors = content.includes('Access-Control-Allow-Origin') || 
                  content.includes('cors.ts') ||
                  content.includes('getCorsHeaders');
  
  const hasSecureCors = content.includes('getCorsHeaders') && 
                        content.includes("from '../_shared/cors.ts'");
  
  return { hasCors, hasSecureCors };
}

/**
 * Apply secure CORS to a function
 */
function applyCors(filePath: string, dryRun: boolean = false): boolean {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Check if already has secure CORS
  const { hasSecureCors } = checkCorsStatus(filePath);
  if (hasSecureCors) {
    console.log(`  ✅ Already has secure CORS`);
    return false;
  }

  // Add import if not present
  if (!content.includes("from '../_shared/cors.ts'")) {
    // Find the best place to add import (after other imports)
    const importRegex = /^import .+ from .+;$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.indexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length + 1;
      
      content = content.slice(0, insertPosition) + 
                "\nimport { getCorsHeaders } from '../_shared/cors.ts';" +
                content.slice(insertPosition);
      modified = true;
    }
  }

  // Replace wildcard CORS with secure CORS
  // Pattern 1: { 'Access-Control-Allow-Origin': '*' }
  if (content.includes("'Access-Control-Allow-Origin': '*'")) {
    content = content.replace(
      /'Access-Control-Allow-Origin': '\*'/g,
      "...getCorsHeaders(req.headers.get('origin'))"
    );
    modified = true;
  }

  // Pattern 2: { "Access-Control-Allow-Origin": "*" }
  if (content.includes('"Access-Control-Allow-Origin": "*"')) {
    content = content.replace(
      /"Access-Control-Allow-Origin": "\*"/g,
      "...getCorsHeaders(req.headers.get('origin'))"
    );
    modified = true;
  }

  // Pattern 3: OPTIONS handler with wildcard
  const optionsRegex = /if \(req\.method === ['"]OPTIONS['"]\) \{[\s\S]*?return new Response\(null, \{[\s\S]*?headers: \{[\s\S]*?['"]Access-Control-Allow-Origin['"]:\s*['"]\*['"][\s\S]*?\}\s*\}\);/g;
  
  if (optionsRegex.test(content)) {
    content = content.replace(
      optionsRegex,
      `if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req.headers.get('origin')) });
  }`
    );
    modified = true;
  }

  // Pattern 4: Simple CORS headers object
  const simpleCorsRegex = /const corsHeaders = \{[\s\S]*?['"]Access-Control-Allow-Origin['"]:\s*['"]\*['"][\s\S]*?\};/g;
  
  if (simpleCorsRegex.test(content)) {
    content = content.replace(
      simpleCorsRegex,
      "// CORS headers now provided by getCorsHeaders() from _shared/cors.ts"
    );
    modified = true;
  }

  if (modified && !dryRun) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ Applied secure CORS`);
    return true;
  } else if (modified && dryRun) {
    console.log(`  📝 Would apply secure CORS (dry run)`);
    return true;
  } else {
    console.log(`  ⚠️  Manual review needed - complex CORS pattern`);
    return false;
  }
}

/**
 * Scan all edge functions
 */
function scanFunctions(): FunctionStatus[] {
  const results: FunctionStatus[] = [];
  
  const dirs = fs.readdirSync(FUNCTIONS_DIR);
  
  for (const dir of dirs) {
    const dirPath = path.join(FUNCTIONS_DIR, dir);
    const stats = fs.statSync(dirPath);
    
    if (!stats.isDirectory() || dir === '_shared') {
      continue;
    }
    
    const indexPath = path.join(dirPath, 'index.ts');
    if (!fs.existsSync(indexPath)) {
      continue;
    }
    
    const { hasCors, hasSecureCors } = checkCorsStatus(indexPath);
    
    results.push({
      name: dir,
      hasCors,
      hasSecureCors,
      filePath: indexPath,
    });
  }
  
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const applyAll = args.includes('--all') || args.includes('-a');
  const functionName = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));

  console.log('\n=================================');
  console.log('  BULK CORS APPLICATION SCRIPT');
  console.log('=================================\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  console.log('📊 Scanning edge functions...\n');
  
  const functions = scanFunctions();
  
  const securedFunctions = functions.filter(f => f.hasSecureCors);
  const needsSecureCors = functions.filter(f => !f.hasSecureCors);
  
  console.log(`Total functions: ${functions.length}`);
  console.log(`✅ Already secured: ${securedFunctions.length}`);
  console.log(`⚠️  Needs secure CORS: ${needsSecureCors.length}\n`);

  // If specific function requested
  if (functionName) {
    const func = functions.find(f => f.name === functionName);
    if (!func) {
      console.error(`❌ Function not found: ${functionName}`);
      process.exit(1);
    }
    
    console.log(`\n🔧 Processing: ${func.name}`);
    applyCors(func.filePath, dryRun);
    console.log('');
    return;
  }

  // Apply to all if requested
  if (applyAll) {
    console.log('🔧 Applying secure CORS to all functions...\n');
    
    let modified = 0;
    let skipped = 0;
    let needsReview = 0;
    
    for (const func of needsSecureCors) {
      console.log(`\n📦 ${func.name}`);
      const result = applyCors(func.filePath, dryRun);
      
      if (result) {
        modified++;
      } else if (func.hasCors) {
        needsReview++;
      } else {
        skipped++;
      }
    }
    
    console.log('\n=================================');
    console.log('  SUMMARY');
    console.log('=================================\n');
    console.log(`✅ Modified: ${modified}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`⚠️  Needs Review: ${needsReview}`);
    console.log(`✅ Already Secured: ${securedFunctions.length}`);
    console.log(`\nTotal Progress: ${securedFunctions.length + modified}/${functions.length} (${Math.round((securedFunctions.length + modified) / functions.length * 100)}%)`);
    console.log('=================================\n');
    
    return;
  }

  // Default: List functions needing CORS
  console.log('=================================');
  console.log('  FUNCTIONS NEEDING SECURE CORS');
  console.log('=================================\n');
  
  if (needsSecureCors.length === 0) {
    console.log('✅ All functions already have secure CORS!\n');
    return;
  }

  // Categorize by priority
  const paymentFunctions = needsSecureCors.filter(f => 
    f.name.includes('payment') || f.name.includes('stripe') || f.name.includes('refund') || f.name.includes('payout')
  );
  
  const authFunctions = needsSecureCors.filter(f =>
    f.name.includes('auth') || f.name.includes('verify') || f.name.includes('reset') || f.name.includes('phone')
  );
  
  const orderFunctions = needsSecureCors.filter(f =>
    f.name.includes('order') || f.name.includes('delivery')
  );
  
  const otherFunctions = needsSecureCors.filter(f =>
    !paymentFunctions.includes(f) && !authFunctions.includes(f) && !orderFunctions.includes(f)
  );

  if (paymentFunctions.length > 0) {
    console.log('🔴 HIGH PRIORITY - Payment/Financial Functions:');
    paymentFunctions.forEach(f => console.log(`  - ${f.name}`));
    console.log('');
  }

  if (authFunctions.length > 0) {
    console.log('🟠 HIGH PRIORITY - Authentication Functions:');
    authFunctions.forEach(f => console.log(`  - ${f.name}`));
    console.log('');
  }

  if (orderFunctions.length > 0) {
    console.log('🟡 MEDIUM PRIORITY - Order/Delivery Functions:');
    orderFunctions.forEach(f => console.log(`  - ${f.name}`));
    console.log('');
  }

  if (otherFunctions.length > 0) {
    console.log('🟢 LOWER PRIORITY - Other Functions:');
    otherFunctions.forEach(f => console.log(`  - ${f.name}`));
    console.log('');
  }

  console.log('=================================');
  console.log('  USAGE');
  console.log('=================================\n');
  console.log('Apply to specific function:');
  console.log('  tsx scripts/bulk-apply-cors.ts <function-name>\n');
  console.log('Apply to all functions:');
  console.log('  tsx scripts/bulk-apply-cors.ts --all\n');
  console.log('Dry run (preview changes):');
  console.log('  tsx scripts/bulk-apply-cors.ts --all --dry-run\n');
  console.log('=================================\n');
}

main();






































