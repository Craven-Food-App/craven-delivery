

# Set Jason Parcell's Password and Hub PIN

## What needs to happen

1. **Set password to `CPart419!`** — Requires the Supabase Admin API (`auth.admin.updateUserById`). This must be done via an edge function since we can't modify auth users through migrations.

2. **Insert Hub PIN `800133`** into `ceo_access_credentials` — Following the existing pattern (e.g., Nathan Curry's `570022`, Justin Sweet's `101307`), the PIN is stored as plain text in the `pin_hash` column.

## Implementation

### 1. Create edge function `setup-jason-parcell`
Modeled after `setup-nathan-curry/index.ts`. It will:
- Use `SUPABASE_SERVICE_ROLE_KEY` (already available in edge functions) to create an admin client
- Call `supabaseAdmin.auth.admin.updateUserById('06847119-d5e5-44dc-a5f4-6b3b677d9423', { password: 'CPart419!', email_confirm: true })`
- Upsert into `ceo_access_credentials` with `user_email = 'jparcell2022@gmail.com'` and `pin_hash = '800133'`
- Return success/failure response

### 2. Deploy and invoke
- Deploy the edge function
- Invoke it to execute the setup
- Confirm password and PIN are set

### Files
- **New**: `supabase/functions/setup-jason-parcell/index.ts`

