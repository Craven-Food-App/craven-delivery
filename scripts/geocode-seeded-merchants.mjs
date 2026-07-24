/**
 * Geocode all seeded restaurants_master merchants via Mapbox and emit a SQL backfill.
 * Usage: node scripts/geocode-seeded-merchants.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const MAPBOX_TOKEN =
  process.env.MAPBOX_ACCESS_TOKEN ||
  process.env.VITE_MAPBOX_ACCESS_TOKEN ||
  'pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWVxb21qbTQyNTRnMm1vaHg5bDZwcmw2In0.aOsYrL2B0cjfcCGW1jHAdw';

const LOCATION_SQL = [
  'supabase/migrations/20260306000003_update_marketplace_real_locations.sql',
  'supabase/migrations/20260313000001_pet_cosmetic_convenience_mall_real_locations.sql',
  'supabase/migrations/20260421000002_restaurants_master_real_coords_backfill.sql',
];

const SEED_SQL = [
  'supabase/migrations/20260305000002_seed_restaurants_master_toledo.sql',
  'supabase/migrations/20260306000002_seed_marketplace_chains_toledo_retail_malls.sql',
  'supabase/migrations/20260310000001_seed_convenience_cosmetics_pet_stores.sql',
  'supabase/migrations/20260309045340_1a0798a5-719a-4afe-8544-5f2b4f2ea37a.sql',
];

/** @type {Map<string, { name: string, address?: string, city?: string, state?: string, lat?: number, lng?: number }>} */
const byName = new Map();

function normName(n) {
  return String(n || '')
    .replace(/''/g, "'")
    .trim();
}

function upsert(row) {
  const key = normName(row.name).toLowerCase();
  if (!key) return;
  const prev = byName.get(key) || { name: normName(row.name) };
  const next = { ...prev };
  for (const [k, v] of Object.entries(row)) {
    if (v == null || v === '') continue;
    // Never let seed defaults clobber a real address/city already parsed from location SQL
    if ((k === 'city' || k === 'state' || k === 'address') && prev.address && row.address == null) continue;
    if ((k === 'city' || k === 'state') && prev.city && prev.city !== 'Toledo' && v === 'Toledo') continue;
    next[k] = v;
  }
  next.name = normName(row.name) || prev.name;
  byName.set(key, next);
}

function parseUpdateBlocks(sql) {
  // UPDATE ... SET address = '...', city = '...', state = '...', lat = N, lng = N WHERE name = '...'
  const re =
    /SET\s+address\s*=\s*'((?:''|[^'])*)'\s*,\s*city\s*=\s*'((?:''|[^'])*)'\s*,\s*state\s*=\s*'((?:''|[^'])*)'\s*,\s*lat\s*=\s*([-\d.]+)\s*,\s*lng\s*=\s*([-\d.]+)[\s\S]*?WHERE\s+name\s*=\s*'((?:''|[^'])*)'/gi;
  let m;
  while ((m = re.exec(sql))) {
    upsert({
      address: m[1].replace(/''/g, "'"),
      city: m[2].replace(/''/g, "'"),
      state: m[3].replace(/''/g, "'"),
      lat: Number(m[4]),
      lng: Number(m[5]),
      name: m[6].replace(/''/g, "'"),
    });
  }
}

function parseSeedNames(sql) {
  // VALUES rows often start with ('Name', ...
  const re = /\(\s*'((?:''|[^'])+)'\s*,/g;
  let m;
  while ((m = re.exec(sql))) {
    const name = m[1].replace(/''/g, "'");
    // Heuristic: skip UUID-looking / short garbage
    if (name.length < 2 || name.includes('http') || /^[0-9a-f-]{20,}$/i.test(name)) continue;
    // Many VALUES are (gen_random_uuid(), 'Name' — handled separately below
    upsert({ name, city: 'Toledo', state: 'OH' });
  }
  // Pattern: SELECT gen_random_uuid(), n, ... FROM (VALUES ('Name', 'Category', ...
  const re2 = /\(\s*'((?:''|[^'])+)'\s*,\s*'((?:''|[^'])+)'/g;
  while ((m = re2.exec(sql))) {
    const name = m[1].replace(/''/g, "'");
    const maybeCat = m[2].replace(/''/g, "'");
    if (name.length < 2) continue;
    upsert({ name, city: 'Toledo', state: 'OH' });
  }
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function mapboxGeocode(query, { preferPoi = false } = {}) {
  const types = preferPoi ? 'poi,address' : 'address,poi';
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${MAPBOX_TOKEN}&limit=5&country=US&types=${types}` +
    `&proximity=-83.5555,41.6528` +
    `&bbox=-84.05,41.35,-82.95,41.85`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mapbox ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const features = data.features || [];
  // Prefer results near Toledo metro
  const TOLEDO = { lat: 41.6528, lng: -83.5555 };
  const scored = features
    .map((f) => {
      const [lng, lat] = f.center || [];
      if (lat == null || lng == null) return null;
      const miles = haversineMiles(TOLEDO.lat, TOLEDO.lng, lat, lng);
      return { f, lat, lng, miles, relevance: f.relevance ?? 0 };
    })
    .filter(Boolean)
    .filter((x) => x.miles <= 45)
    .sort((a, b) => b.relevance - a.relevance || a.miles - b.miles);

  const best = scored[0];
  if (!best) return null;
  const f = best.f;
  const ctx = f.context || [];
  const place = ctx.find((c) => String(c.id).startsWith('place.'));
  const region = ctx.find((c) => String(c.id).startsWith('region.'));
  return {
    lat: best.lat,
    lng: best.lng,
    placeName: f.place_name || query,
    city: place?.text,
    state: region?.short_code?.replace(/^US-/, '') || region?.text,
    relevance: best.relevance,
    milesFromToledo: best.miles,
  };
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (n) => (n * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function sqlEscape(s) {
  return String(s ?? '').replace(/'/g, "''");
}

function buildQuery(row) {
  const city = row.city || 'Toledo';
  const state = row.state || 'OH';
  if (row.address) {
    // Name + street helps POI matching for chains
    return `${row.name}, ${row.address}, ${city}, ${state}`;
  }
  return `${row.name}, ${city}, ${state}`;
}

async function main() {
  // Seeds first (names only), then real-location SQL overwrites address/city/state
  for (const rel of SEED_SQL) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) continue;
    parseSeedNames(fs.readFileSync(p, 'utf8'));
  }
  for (const rel of LOCATION_SQL) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) continue;
    parseUpdateBlocks(fs.readFileSync(p, 'utf8'));
  }

  // Drop obvious non-merchant VALUES noise (categories alone etc.)
  const skipExact = new Set(
    [
      'restaurant',
      'retail',
      'mall',
      'kids menu',
      'convenience',
      'cosmetics',
      'pet',
      'apparel',
      'toledo',
      'ohio',
      'oh',
      'active',
      'requestable',
      'coming_soon',
      'lead_ready',
    ].map((s) => s.toLowerCase())
  );

  const rows = [...byName.values()].filter((r) => !skipExact.has(r.name.toLowerCase()));
  rows.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Merchants to geocode: ${rows.length}`);

  const results = [];
  const failures = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const q = buildQuery(row);
    process.stdout.write(`[${i + 1}/${rows.length}] ${q} ... `);
    try {
      let geo = await mapboxGeocode(q, { preferPoi: true });
      if (!geo || geo.relevance < 0.4) {
        const q2 = row.address
          ? `${row.address}, ${row.city || 'Toledo'}, ${row.state || 'OH'}`
          : `${row.name}, ${row.city || 'Toledo'}, ${row.state || 'OH'}`;
        geo = await mapboxGeocode(q2, { preferPoi: Boolean(row.address) });
        if (!geo || geo.relevance < 0.35) {
          console.log('FAIL');
          failures.push({ name: row.name, query: q });
          await sleep(120);
          continue;
        }
        results.push({
          name: row.name,
          address: row.address || geo.placeName.split(',')[0].trim(),
          city: row.city || geo.city || 'Toledo',
          state: row.state || geo.state || 'OH',
          lat: geo.lat,
          lng: geo.lng,
          source: 'mapbox',
          query: q2,
          relevance: geo.relevance,
          milesFromToledo: geo.milesFromToledo,
        });
        console.log(`OK ${geo.lat.toFixed(5)},${geo.lng.toFixed(5)} (${geo.milesFromToledo.toFixed(1)}mi retry)`);
      } else {
        results.push({
          name: row.name,
          address: row.address || geo.placeName.split(',')[0].trim(),
          city: row.city || geo.city || 'Toledo',
          state: row.state || geo.state || 'OH',
          lat: geo.lat,
          lng: geo.lng,
          source: 'mapbox',
          query: q,
          relevance: geo.relevance,
          milesFromToledo: geo.milesFromToledo,
        });
        console.log(`OK ${geo.lat.toFixed(5)},${geo.lng.toFixed(5)} (${geo.milesFromToledo.toFixed(1)}mi)`);
      }
    } catch (e) {
      console.log(`ERR ${e.message}`);
      failures.push({ name: row.name, query: q, error: e.message });
    }
    await sleep(120);
  }

  const outJson = path.join(ROOT, 'scripts/geocode-seeded-merchants-results.json');
  fs.writeFileSync(outJson, JSON.stringify({ generatedAt: new Date().toISOString(), results, failures }, null, 2));

  const lines = [];
  lines.push('-- =============================================================================');
  lines.push('-- Backfill restaurants_master with Mapbox-geocoded real lat/lng.');
  lines.push(`-- Generated ${new Date().toISOString()} via scripts/geocode-seeded-merchants.mjs`);
  lines.push(`-- ${results.length} merchants geocoded; ${failures.length} failed.`);
  lines.push('-- Idempotent UPDATEs by name (OH / Toledo-metro seeds).');
  lines.push('-- =============================================================================');
  lines.push('');

  for (const r of results) {
    lines.push(
      `UPDATE public.restaurants_master SET address = '${sqlEscape(r.address)}', city = '${sqlEscape(r.city)}', state = '${sqlEscape(r.state)}', lat = ${r.lat}, lng = ${r.lng}`
    );
    lines.push(` WHERE lower(trim(name)) = lower(trim('${sqlEscape(r.name)}'));`);
    lines.push('');
  }

  if (failures.length) {
    lines.push('-- FAILED TO GEOCODE (manual follow-up):');
    for (const f of failures) {
      lines.push(`-- ${f.name}: ${f.query}${f.error ? ' — ' + f.error : ''}`);
    }
  }

  const outSql = path.join(ROOT, 'supabase/migrations/20260724140000_mapbox_geocode_seeded_merchants.sql');
  fs.writeFileSync(outSql, lines.join('\n') + '\n');

  console.log(`\nWrote ${results.length} updates → ${outSql}`);
  console.log(`Failures: ${failures.length} (see ${outJson})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
