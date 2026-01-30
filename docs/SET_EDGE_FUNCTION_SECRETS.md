# How to Set ALLOWED_ORIGINS for Edge Functions

## Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Click **Add Secret**
4. Set:
   - **Name:** `ALLOWED_ORIGINS`
   - **Value:** `https://craven.app,https://admin.craven.app,https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com,http://localhost:8080,http://localhost:5173`
5. Click **Save**

## Method 2: Using Supabase Management API

If you have a Management API token, you can use:

```bash
curl -X POST "https://api.supabase.com/v1/projects/{project-ref}/secrets" \
  -H "Authorization: Bearer {management-api-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ALLOWED_ORIGINS",
    "value": "https://craven.app,https://admin.craven.app,https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com,http://localhost:8080,http://localhost:5173"
  }'
```

## Method 3: Using Supabase CLI (if supported)

If your CLI version supports it, try:

```bash
supabase secrets set --project-ref xaxbucnjlrfkccsfiddq ALLOWED_ORIGINS="https://craven.app,https://admin.craven.app,https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com,http://localhost:8080,http://localhost:5173"
```

## Verify Secret is Set

After setting the secret, redeploy your Edge Functions or they will automatically pick up the new secret on next invocation.

## Important Notes

- Secrets are environment variables available to all Edge Functions
- Changes take effect immediately (no redeploy needed for secrets)
- Make sure to include all your domains (production, staging, localhost for development)
- The secret will be available as `Deno.env.get("ALLOWED_ORIGINS")` in your Edge Functions

## Current Implementation

The Edge Functions now use this pattern:

```typescript
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim());
  }
  // Fallback to defaults if not set
  return [
    "https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com",
    "https://cravenusa.com",
    "https://www.cravenusa.com",
    "https://feeder.cravenusa.com",
    "http://localhost:8080",
    "http://localhost:5173",
  ];
};
```

So if the secret isn't set, it will fall back to the default origins, but it's better to set it explicitly.

