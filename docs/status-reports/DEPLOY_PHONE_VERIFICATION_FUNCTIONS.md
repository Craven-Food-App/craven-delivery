# Deploy Phone Verification Edge Functions

The phone verification functions need to be deployed to Supabase. Follow these steps:

## Option 1: Deploy via Supabase CLI (Recommended)

### Step 1: Authenticate with Supabase
```bash
supabase login
```
This will open your browser to authenticate with Supabase.

### Step 2: Link your project (if not already linked)
```bash
supabase link --project-ref xaxbucnjlrfkccsfiddq
```

### Step 3: Deploy the functions
```bash
supabase functions deploy send-phone-verification
supabase functions deploy verify-phone-code
```

## Option 2: Deploy via Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (xaxbucnjlrfkccsfiddq)
3. Navigate to **Edge Functions** in the left sidebar
4. Click **Create a new function**
5. For each function:

   **Function 1: send-phone-verification**
   - Name: `send-phone-verification`
   - Copy the contents of `supabase/functions/send-phone-verification/index.ts`
   - Paste into the function editor
   - Click **Deploy**

   **Function 2: verify-phone-code**
   - Name: `verify-phone-code`
   - Copy the contents of `supabase/functions/verify-phone-code/index.ts`
   - Paste into the function editor
   - Click **Deploy**

## Verify Deployment

After deploying, verify the functions appear in your Supabase dashboard under **Edge Functions**.

## Configuration

The functions are already configured in `supabase/config.toml` with:
- `verify_jwt = false` (public access, since verification happens before login)

## Testing

Once deployed, test the phone verification flow:
1. Go to the Feeder signup page
2. Enter phone and email
3. Click Continue
4. The verification modal should appear and send a code

In development mode, the code will be returned in the response and shown in a toast notification.

