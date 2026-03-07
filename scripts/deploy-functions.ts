#!/usr/bin/env tsx
/**
 * Deploy all Supabase Edge Functions to the linked project.
 * Uses: npx supabase functions deploy <name> for each function in supabase/functions.
 *
 * Usage: npm run deploy:functions
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const functionsDir = path.join(root, 'supabase', 'functions');

const PROJECT_REF = 'xaxbucnjlrfkccsfiddq';

function getFunctionNames(): string[] {
  const entries = fs.readdirSync(functionsDir, { withFileTypes: true });
  const names: string[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('_')) continue;
    const indexPath = path.join(functionsDir, e.name, 'index.ts');
    if (fs.existsSync(indexPath)) names.push(e.name);
  }
  return names.sort();
}

function main() {
  const names = getFunctionNames();
  console.log(`Deploying ${names.length} functions to project ${PROJECT_REF}...\n`);

  for (const name of names) {
    try {
      console.log(`  Deploying ${name}...`);
      execSync(`npx supabase functions deploy ${name} --project-ref ${PROJECT_REF}`, {
        cwd: root,
        stdio: 'inherit',
      });
      console.log(`  OK: ${name}`);
    } catch (err) {
      console.error(`  FAILED: ${name}`);
      throw err;
    }
  }
  console.log('\nAll functions deployed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
