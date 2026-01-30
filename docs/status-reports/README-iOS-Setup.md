# iOS Push Notification Sound Setup

## Required Steps for Custom Sound on iOS

After transferring the project to GitHub and setting up locally:

1. **Add the custom sound file to iOS resources:**
   ```bash
   # Copy the sound file to iOS app bundle
   cp public/craven-notification.wav ios/App/App/craven-notification.caf
   ```

2. **Update iOS project in Xcode:**
   - Open `ios/App/App.xcworkspace` in Xcode
   - Right-click on the App folder in project navigator
   - Select "Add Files to App"
   - Add the `craven-notification.caf` file
   - Make sure "Add to target" is checked for the App target

3. **Verify sound file format:**
   - iOS requires .caf, .wav, or .aiff formats
   - Sound duration should be less than 30 seconds
   - File should be bundled with the app (not downloaded)

4. **Test the setup:**
   ```bash
   npx cap sync ios
   npx cap run ios
   ```

## Custom Sound Configuration

The app is configured to use "craven-notification.caf" as the default notification sound:
- Edge function references this file in APNS payload
- Capacitor config specifies the sound file
- iOS app bundle includes the sound file

## For Admin Portal

Admin can upload custom notification sounds through the admin portal. These will:
- Be stored in Supabase storage for web notifications
- Need to be manually added to iOS app bundle for native notifications
- Require app update to change iOS notification sounds