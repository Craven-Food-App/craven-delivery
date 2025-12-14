# Deploy Phone Verification Functions

The phone verification edge functions need to be deployed to Supabase for the phone verification to work.

## Quick Deploy (Using Supabase CLI)

If you have Supabase CLI installed and linked:

```bash
supabase functions deploy send-phone-verification
supabase functions deploy verify-phone-code
```

## Manual Deploy (Via Supabase Dashboard)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions** in the left sidebar
4. Click **Create a new function** or find the existing functions

### Deploy `send-phone-verification`:
- Name: `send-phone-verification`
- Copy the code from `supabase/functions/send-phone-verification/index.ts`
- Paste it into the function editor
- Click **Deploy**

### Deploy `verify-phone-code`:
- Name: `verify-phone-code`
- Copy the code from `supabase/functions/verify-phone-code/index.ts`
- Paste it into the function editor
- Click **Deploy**

## Verify Deployment

After deploying, the functions should appear in your Edge Functions list. You can test them by:
1. Going to the Feeder signup page
2. Entering phone and email
3. Clicking Continue
4. The verification modal should appear and send a code

**Note:** In development mode, the verification code will be returned in the response and shown in a toast notification for testing purposes.



