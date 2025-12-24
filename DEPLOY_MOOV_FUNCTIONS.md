# Deploy Moov Edge Functions

The Moov onboarding edge functions need to be deployed to Supabase before they can be used.

## Functions to Deploy

1. `create-moov-onboarding-invite`
2. `manage-moov-onboarding-invites`

## Deployment Steps

### Option 1: Deploy via Supabase CLI (Recommended)

```bash
# Deploy both functions
supabase functions deploy create-moov-onboarding-invite
supabase functions deploy manage-moov-onboarding-invites
```

### Option 2: Deploy via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions
2. Click "Deploy" or use the CLI in the dashboard terminal
3. Deploy each function individually

### Option 3: Auto-deploy via Git (if configured)

If your project has GitHub Actions or CI/CD set up:
1. Push the code to git (already done)
2. Wait for automatic deployment
3. Check deployment status in Supabase dashboard

## Verify Deployment

After deployment, verify the functions are accessible:

```bash
# Test OPTIONS request (preflight)
curl -X OPTIONS https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/create-moov-onboarding-invite \
  -H "Origin: https://cravenusa.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

You should get a 200 OK response with CORS headers.

## Common Issues

### Issue: Function not found (404)

**Solution:** Function needs to be deployed

### Issue: CORS errors

**Check:**
1. Function is deployed
2. Origin is in allowed list (cravenusa.com is already included)
3. OPTIONS handler is working

### Issue: Internal server errors

**Check:**
1. Moov secrets are set in Supabase
2. Function logs in Supabase dashboard
3. Moov API credentials are valid

## After Deployment

Once deployed, test the function from the Merchant Portal:
1. Navigate to Settings → Bank Account
2. Click "Start Moov Onboarding"
3. Should redirect to Moov onboarding form

