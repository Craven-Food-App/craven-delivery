# Reset CFO Password

To reset the password for Justin Sweet (wowbilallovely@gmail.com) to `Craventemp01!`:

## Option 1: Using the Edge Function (Recommended)

1. Deploy the edge function:
```bash
supabase functions deploy reset-executive-password
```

2. Call the function with curl:
```bash
curl -X POST https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/reset-executive-password \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "wowbilallovely@gmail.com", "newPassword": "Craventemp01!"}'
```

## Option 2: Using the Script

1. Set the service role key in your environment:
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
```

2. Run the script:
```bash
npm run reset-exec-password
```

## Option 3: Direct SQL/Admin API

You can also reset the password directly in the Supabase Dashboard:
1. Go to Authentication > Users
2. Find the user with email `wowbilallovely@gmail.com`
3. Click on the user
4. Click "Reset Password" or "Update User"
5. Set the new password to `Craventemp01!`

## Getting the Service Role Key

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to Settings > API
4. Copy the "service_role" key (keep this secret!)

