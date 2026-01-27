# Deploy create-invite-checkout Edge Function

```bash
supabase functions deploy create-invite-checkout --no-verify-jwt
```

This function is public (no JWT verification) because it's called before authentication.

## Environment Variables Required

Set these secrets in Supabase:
```bash
supabase secrets set STRIPE_SECRET_KEY=your_stripe_secret_key
supabase secrets set FRONTEND_URL=https://your-frontend-domain.com
```

