#!/usr/bin/env tsx
/**
 * Run Supabase migrations directly against the remote DB.
 * Requires SUPABASE_DB_URL in .env (or env): postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
 * Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI).
 *
 * Usage:
 *   npm run db:migrate              # Run pending migrations (list below)
 *   npm run db:migrate -- --all     # Run all migrations in supabase/migrations (sorted)
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');

// Pending migrations to run by default (add new files here when you create them)
const PENDING_MIGRATIONS = [
  '20260307000001_get_marketplace_restaurants_by_type.sql',
  '20260308000001_marketplace_parent_location_and_logos.sql',
  '20260308000002_marketplace_rpcs_return_address.sql',
  '20260309000001_ensure_marketplace_seed_if_empty.sql',
  '20260306000003_update_marketplace_real_locations.sql',
  '20260310000001_seed_convenience_cosmetics_pet_stores.sql',
  '20260311000001_late_night_hunger_category.sql',
];

async function runMigrations(files: string[]) {
  const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('Missing SUPABASE_DB_URL or DATABASE_URL. Set it in .env or environment.');
    console.error('Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI).');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log('Connected to database.\n');

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`Skip (not found): ${file}`);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Running: ${file}`);
      try {
        await client.query(sql);
        console.log(`  OK: ${file}\n`);
      } catch (err: any) {
        console.error(`  FAILED: ${file}`);
        console.error(err.message);
        throw err;
      }
    }

    console.log('Migrations finished.');
  } finally {
    await client.end();
  }
}

function getAllMigrations(): string[] {
  const names = fs.readdirSync(migrationsDir).filter((n) => /^\d{14}_.*\.sql$/.test(n));
  names.sort();
  return names;
}

async function main() {
  const args = process.argv.slice(2);
  const runAll = args.includes('--all');
  const files = runAll ? getAllMigrations() : PENDING_MIGRATIONS;

  if (files.length === 0) {
    console.log('No migrations to run.');
    return;
  }
  console.log(`Migrations to run (${files.length}): ${files.join(', ')}\n`);
  await runMigrations(files);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
