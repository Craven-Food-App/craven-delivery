# Crave'n Admin – Android

Capacitor Android project for the tablet Admin app.

## Build

1. From the **Admin app root** (`apps/tablet/Admin`):
   ```bash
   npm run build
   npm run sync
   ```

2. Open in Android Studio or build from the command line:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   On Windows: `gradlew.bat assembleDebug`

3. Run on a device/emulator from Android Studio, or:
   ```bash
   npm run open:android
   ```
   then run the app from Android Studio.

## Notes

- **Launcher icon**: Adaptive icon (API 26+) is included. For API 25 and below you may need to add fallback PNGs in `app/src/main/res/mipmap-mdpi`, `mipmap-hdpi`, etc., if your minSdk is below 26.
- **Web assets**: Always run `npm run build` and `npm run sync` before building the Android app so the latest web bundle is copied into `app/src/main/assets/public`.
