# Feeder Android build

Everything feeder lives under **apps/feeder**: dev server, build, and Android project.

## Which Android project to open

- **Open in Android Studio:** `d:\Repositories\craven-delivery\apps\feeder\android`

Build and sync both run from **apps/feeder**, so this `android` folder is the one that gets updated.

## Build steps

1. From **apps/feeder**: `npm run build` then `npm run sync`  
   Or from repo root: `npm run feeder:build`
2. Open **apps/feeder/android** in Android Studio.
3. Build → Build Bundle(s) / APK(s) or Run.

## If the app crashes on load

1. Rebuild and sync from apps/feeder: `npm run build` then `npm run sync`.
2. In Chrome on your PC, go to **chrome://inspect** and find the Feeder WebView to see the JS error and stack trace.
3. The in-app error screen should show the actual error message (not “Unknown error”) so you can fix the cause.
