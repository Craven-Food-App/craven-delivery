# How to Invoke create-ceo-user Function

## Option 1: Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions
2. Click on `create-ceo-user`
3. Click "Invoke function" button
4. Click "Invoke" (no body needed)
5. Check the response

## Option 2: Using curl (from terminal)

Replace `YOUR_SERVICE_ROLE_KEY` with your actual Supabase service role key:

```bash
curl -X POST "https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/create-ceo-user" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Option 3: Using PowerShell (Windows)

```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/create-ceo-user" -Method Post -Headers $headers
```

## What it does:
- Creates the CEO user with email: `tstroman.ceo@cravenusa.com`
- Creates/updates user_profiles record
- Creates/updates exec_users record with CEO role
- Creates/updates user_roles record for executive access
- Default password: `TempPassword123!`

## Response:
You'll get a JSON response with:
- `success: true`
- `userId`: The created user's ID
- `email`: The CEO email
- `password`: The temporary password
- `userCreated`: Whether a new user was created or existing was updated

