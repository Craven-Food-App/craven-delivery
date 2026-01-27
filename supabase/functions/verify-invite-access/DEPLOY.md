# Deploy verify-invite-access Edge Function

```bash
supabase functions deploy verify-invite-access --no-verify-jwt
```

This function is public (no JWT verification) because it's called before authentication.

