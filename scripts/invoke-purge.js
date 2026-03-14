#!/usr/bin/env node
/**
 * One-off: invoke purge-executive-documents for an appointment_id.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env or .env at repo root.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const root = path.resolve(__dirname, '..');
  for (const envPath of [path.join(root, '.env'), path.join(root, 'apps', 'customer', '.env')]) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim();
        let val = m[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
  break;
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://xaxbucnjlrfkccsfiddq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Set in .env or environment.');
  process.exit(1);
}

const appointmentId = process.argv[2] || '06cf310e-7842-42fe-9f21-36f7535cce7b';
const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/purge-executive-documents`;

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ appointment_id: appointmentId }),
})
  .then((r) => r.json())
  .then((data) => {
    console.log(JSON.stringify(data, null, 2));
    if (data.error) process.exit(1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
