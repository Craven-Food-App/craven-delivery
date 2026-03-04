# Android app: notification sounds, camera shutter, and voice

## What the app does

- **Notification sounds**: The FCM service uses the system default notification sound and vibration. The notification channel is created with sound and vibration enabled.
- **Camera shutter**: When you take a proof-of-delivery (or pickup) photo, a short beep plays via the Web Audio API.
- **Read out loud (voice guidance)**: Turn-by-turn voice uses the browser’s speech synthesis. It’s primed on first user tap so it works in the built Android WebView.

## If you still don’t hear anything

1. **Notification sounds**
   - **Device**: Settings → Apps → Crave'n Feeder → Notifications → ensure “Sound” is on and the channel isn’t muted.
   - **Do Not Disturb**: Make sure the app or “Messages” category isn’t silenced.
   - **Volume**: Check that **Notification volume** (not only media) is up.
   - **Channel**: If you had an older install, delete app data or reinstall so the notification channel is recreated with sound enabled.

2. **In-app sounds (shutter, beeps)**
   - The first time you use the app after install, **tap once** on the screen (e.g. open the dashboard). That resumes the WebView’s audio so later sounds can play.
   - If you never tap, Android may keep audio suspended and you won’t hear shutter or other in-app sounds.

3. **Voice guidance**
   - In the app, enable **Voice guidance** in navigation/driver settings.
   - Tap somewhere in the app at least once so the speech engine can initialize.
   - If it still doesn’t speak, check: Settings → Accessibility → Text-to-speech and ensure a default engine and language are set.

## Build note

The Android app loads the web app from the **root** `dist` (built with the root `npm run build` or your feeder build that outputs to `dist`). So always build the web app before building/syncing the Android app so the latest JS (including sound and TTS fixes) is included.
