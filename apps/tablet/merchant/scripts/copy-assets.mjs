// scripts/copy-assets.mjs
// FIX: Replaces the inline `require('fs')` in package.json "build" script.
// The package is "type": "module" so require() throws ERR_REQUIRE_ESM.
// This ESM script handles the background image copy safely.

import { existsSync, copyFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');
const repoRoot = resolve(__dirname, '../../..');

const assets = [
  {
    src: join(repoRoot, 'public', 'craven-merchant-app-bg.png'),
    dest: join(projectRoot, 'dist', 'craven-merchant-app-bg.png'),
    label: 'merchant bg image',
  },
];

let allOk = true;
for (const { src, dest, label } of assets) {
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`✓ Copied ${label}: ${src} → ${dest}`);
  } else {
    console.warn(`⚠ Source not found for ${label}: ${src}`);
    allOk = false;
  }
}

if (!allOk) {
  console.warn('Some assets were not copied. Check paths above.');
  process.exit(0); // Warn but don't fail the build
}

