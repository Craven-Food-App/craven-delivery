/**
 * Copy dist/ to android/app/src/main/assets/public and capacitor.config.json to assets.
 * Use when "npx cap sync android" fails with ENOTEMPTY/EPERM (e.g. Android Studio has the folder locked).
 * Close Android Studio, then run: npm run release:copy && npx cap sync android
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const publicDir = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public');
const assetsDir = path.join(root, 'android', 'app', 'src', 'main', 'assets');

if (!fs.existsSync(distDir)) {
  console.error('Run npm run build first. dist/ not found.');
  process.exit(1);
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log('Copying dist to android/.../assets/public ...');
if (fs.existsSync(publicDir)) {
  copyRecursive(distDir, publicDir);
} else {
  fs.mkdirSync(publicDir, { recursive: true });
  copyRecursive(distDir, publicDir);
}

const capConfigJson = path.join(assetsDir, 'capacitor.config.json');
if (!fs.existsSync(capConfigJson)) {
  const config = {
    appId: 'com.craven.delivery.tablet.merchant',
    appName: "Crave'n Merchant",
    webDir: 'dist',
    server: { cleartext: false },
    android: { allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: false },
    plugins: { SplashScreen: { launchShowDuration: 0, launchAutoHide: true, backgroundColor: '#ffffff', showSpinner: false, androidScaleType: 'CENTER_CROP' } },
  };
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(capConfigJson, JSON.stringify(config, null, 2));
  console.log('Wrote capacitor.config.json to assets');
}

console.log('Done. Run: npx cap sync android');
