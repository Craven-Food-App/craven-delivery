# 🔑 Notification Keys Setup Guide

This guide explains how to obtain and configure all the keys needed for the notification system to work.

---

## 1. VAPID Keys (Web Push Notifications)

**What it's for:** Web push notifications in browsers (Chrome, Firefox, Safari, Edge)

### Option A: Use Firebase Web Push Certificate (What You're Seeing)

If you're using Firebase, you can use the Web Push certificate key pair:

**Public Key (from Firebase):**
```
BJzFRmsDgBVf5x9Jf-hyPa4cMY7f176YsSVjlvf1Si6yxnGXaA5GUeP gNsyPg74IrxrAION-QIGN4dUbIIK4Vok
```

**To get the Private Key:**
1. In Firebase Console, go to **⚙️ Settings** → **Project settings** → **Cloud Messaging**
2. Under **Web Push certificates**, click on the key pair
3. You should see an option to view/download the private key
4. If not visible, you may need to generate a new key pair

### Option B: Use Existing Keys (Already Generated)

Your codebase already has VAPID keys generated. You can use these:

**Public Key:**
```
BPgLUmyCVcWgjxTTQiwY0FSiD7pm-X5u6z7OCU1sXpypwvrrXXja_ADXlEVVGkoisV2XdFpoNMMS_yKFp2FpIC8
```

**Private Key:**
```
JL_Ehq0Pis03yIXGt2Ml1jt8-kCRumaJzAViaGbMEmA
```

### Option C: Generate New Keys

If you want to generate your own keys:

1. **Install web-push CLI:**
   ```bash
   npm install -g web-push
   ```

2. **Generate keys:**
   ```bash
   web-push generate-vapid-keys
   ```

3. **You'll get output like:**
   ```
   Public Key: BPgLUmyCVcWgjxTTQiwY0FSiD7pm-X5u6z7OCU1sXpypwvrrXXja_ADXlEVVGkoisV2XdFpoNMMS_yKFp2FpIC8
   Private Key: JL_Ehq0Pis03yIXGt2Ml1jt8-kCRumaJzAViaGbMEmA
   ```

### Configuration Steps

**1. Add to Frontend Environment (.env file):**

Choose one of these options:

**If using Firebase Web Push certificate:**
```env
VITE_VAPID_PUBLIC_KEY=BJzFRmsDgBVf5x9Jf-hyPa4cMY7f176YsSVjlvf1Si6yxnGXaA5GUeP gNsyPg74IrxrAION-QIGN4dUbIIK4Vok
```

**If using existing keys:**
```env
VITE_VAPID_PUBLIC_KEY=BPgLUmyCVcWgjxTTQiwY0FSiD7pm-X5u6z7OCU1sXpypwvrrXXja_ADXlEVVGkoisV2XdFpoNMMS_yKFp2FpIC8
```

**2. Add to Supabase Edge Function Secrets:**

Via Supabase Dashboard:
1. Go to https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add (choose one set based on which keys you're using):

**If using Firebase Web Push certificate:**
   - `VAPID_PUBLIC_KEY` = `BJzFRmsDgBVf5x9Jf-hyPa4cMY7f176YsSVjlvf1Si6yxnGXaA5GUeP gNsyPg74IrxrAION-QIGN4dUbIIK4Vok` (get private key from Firebase)
   - `VAPID_PRIVATE_KEY` = `[Get from Firebase Web Push certificates]`
   - `VAPID_SUBJECT` = `mailto:support@cravenusa.com`

**If using existing keys:**
   - `VAPID_PUBLIC_KEY` = `BPgLUmyCVcWgjxTTQiwY0FSiD7pm-X5u6z7OCU1sXpypwvrrXXja_ADXlEVVGkoisV2XdFpoNMMS_yKFp2FpIC8`
   - `VAPID_PRIVATE_KEY` = `JL_Ehq0Pis03yIXGt2Ml1jt8-kCRumaJzAViaGbMEmA`
   - `VAPID_SUBJECT` = `mailto:support@cravenusa.com`

Via CLI:
```bash
# If using Firebase Web Push certificate:
supabase secrets set VAPID_PUBLIC_KEY="BJzFRmsDgBVf5x9Jf-hyPa4cMY7f176YsSVjlvf1Si6yxnGXaA5GUeP gNsyPg74IrxrAION-QIGN4dUbIIK4Vok"
supabase secrets set VAPID_PRIVATE_KEY="[Get private key from Firebase]"
supabase secrets set VAPID_SUBJECT=mailto:support@cravenusa.com

# OR if using existing keys:
supabase secrets set VAPID_PUBLIC_KEY=BPgLUmyCVcWgjxTTQiwY0FSiD7pm-X5u6z7OCU1sXpypwvrrXXja_ADXlEVVGkoisV2XdFpoNMMS_yKFp2FpIC8
supabase secrets set VAPID_PRIVATE_KEY=JL_Ehq0Pis03yIXGt2Ml1jt8-kCRumaJzAViaGbMEmA
supabase secrets set VAPID_SUBJECT=mailto:support@cravenusa.com
```

---

## 2. FCM Server Key (Native Android/iOS Push)

**What it's for:** Push notifications on native Android and iOS apps via Firebase Cloud Messaging

### Step 1: Create/Use Firebase Project

1. Go to https://console.firebase.google.com/
2. Either:
   - **Use existing project:** Select your project
   - **Create new project:** Click "Add project" → Enter name → Continue

### Step 2: Get FCM Server Key (for Native Apps)

**Option A: Legacy API (Simpler, but deprecated)**
1. In Firebase Console, click the **⚙️ Settings** icon → **Project settings**
2. Go to the **Cloud Messaging** tab
3. Under **Cloud Messaging API (Legacy)**, you may see:
   - **Server key** (starts with `AAAA...`) ← Use this if available
   - **Sender ID** (numeric) ← Your Sender ID: `424634339319`

**Option B: FCM v1 API (Recommended - Modern approach)**
Since the Legacy API is deprecated, use Service Account instead:

1. In Firebase Console, go to **⚙️ Settings** → **Project settings** → **Service accounts**
2. Click **Generate new private key**
3. Download the JSON file (contains credentials)
4. Extract the key from the JSON:
   - Open the JSON file
   - Find `"private_key"` field
   - This is your service account key

**For your current setup:** The `send-customer-notification` edge function uses the Legacy API format, so if you have a Server key (starts with `AAAA...`), use that. Otherwise, you may need to update the edge function to use FCM v1 API with Service Account.

### Step 3: Enable Firebase Cloud Messaging API

If the API isn't enabled:
1. Go to https://console.cloud.google.com/apis/library/fcm.googleapis.com
2. Select your Firebase project
3. Click **Enable**

### Step 4: Configure in Supabase

**Add to Supabase Edge Function Secrets:**

Via Dashboard:
1. Go to https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq
2. **Settings** → **Edge Functions** → **Secrets**
3. Add:
   - `FCM_SERVER_KEY` = `AAAA...` (your server key from Firebase)

Via CLI:
```bash
supabase secrets set FCM_SERVER_KEY=AAAA_your_actual_server_key_here
```

### Step 5: Configure in Native Apps

**For Android (Capacitor):**
1. Download `google-services.json` from Firebase Console
2. Place it in `android/app/` directory
3. Already configured in your `android/app/build.gradle`

**For iOS (Capacitor):**
1. Download `GoogleService-Info.plist` from Firebase Console
2. Add to Xcode project
3. Configure APNs certificates in Firebase Console

---

## 3. Twilio Credentials (SMS Notifications)

**What it's for:** Sending SMS text messages for order updates

### Step 1: Create Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free account (includes $15.50 trial credit)
3. Verify your phone number

### Step 2: Get Account Credentials

1. After logging in, go to https://console.twilio.com/
2. On the dashboard, you'll see:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click "View" to reveal)

### Step 3: Get Phone Number

1. Go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose a number (or use the trial number provided)
3. Copy the phone number (format: `+1234567890`)

### Step 4: Configure in Supabase

**Add to Supabase Edge Function Secrets:**

Via Dashboard:
1. Go to https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq
2. **Settings** → **Edge Functions** → **Secrets**
3. Add:
   - `TWILIO_ACCOUNT_SID` = `AC...` (your Account SID)
   - `TWILIO_AUTH_TOKEN` = `your_auth_token_here`
   - `TWILIO_PHONE_NUMBER` = `+1234567890` (your Twilio phone number)

Via CLI:
```bash
supabase secrets set TWILIO_ACCOUNT_SID=AC_your_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
```

### Pricing Note

- **Trial:** Free $15.50 credit (enough for ~1,550 SMS messages)
- **Production:** ~$0.0075 per SMS in US
- **International:** Varies by country

---

## 4. Quick Setup Checklist

### ✅ Frontend (.env file)
```env
VITE_VAPID_PUBLIC_KEY=BPgLUmyCVcWgjxTTQiwY0FSiD7pm-X5u6z7OCU1sXpypwvrrXXja_ADXlEVVGkoisV2XdFpoNMMS_yKFp2FpIC8
```

### ✅ Supabase Edge Function Secrets
- [ ] `VAPID_PUBLIC_KEY`
- [ ] `VAPID_PRIVATE_KEY`
- [ ] `VAPID_SUBJECT`
- [ ] `FCM_SERVER_KEY` (if using native apps)
- [ ] `TWILIO_ACCOUNT_SID` (if using SMS)
- [ ] `TWILIO_AUTH_TOKEN` (if using SMS)
- [ ] `TWILIO_PHONE_NUMBER` (if using SMS)

### ✅ Deploy Edge Functions
```bash
cd D:\Repositories\craven-delivery
supabase functions deploy send-customer-notification
supabase functions deploy register-push-subscription
```

### ✅ Test
1. Open notification settings page
2. Enable push notifications for a category
3. Send a test notification via your backend

---

## 5. Verification

### Check Secrets Are Set
```bash
supabase secrets list
```

### Test Web Push
1. Open your app in a browser
2. Go to notification settings
3. Enable push for a category
4. Browser should prompt for permission
5. Check browser console for subscription success

### Test Native Push
1. Build and run on device
2. Enable notifications in app
3. Check device logs for FCM token registration

### Test SMS
1. Ensure user has phone number in profile
2. Enable SMS for "Order Updates"
3. Trigger a test order update notification
4. Check Twilio logs: https://console.twilio.com/monitor/logs

---

## Troubleshooting

### VAPID Keys Not Working
- Ensure public key matches in frontend and backend
- Check browser console for subscription errors
- Verify service worker is registered

### FCM Not Working
- Verify `google-services.json` is in correct location
- Check Android/iOS app is properly configured
- Ensure FCM API is enabled in Google Cloud Console

### SMS Not Sending
- Verify Twilio account has credits
- Check phone number format (must include country code)
- Verify user profile has valid phone number
- Check Twilio logs for error messages

---

## Security Notes

⚠️ **Never commit these keys to git!**
- Use `.env` files (already in `.gitignore`)
- Use Supabase Secrets for server-side keys
- Rotate keys periodically
- Use different keys for development/production

