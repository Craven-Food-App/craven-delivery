# POS Integrations (Square, Toast, Clover) – Setup Guide

This guide is for **platform administrators** who configure the merchant portal so that merchants can connect their Square, Toast, or Clover POS with real OAuth and sync.

## Overview

- **Merchant flow:** Merchant goes to **Settings → Integrations**, clicks **Connect** for Square/Toast/Clover, follows the on-screen instructions, and is redirected to the provider to authorize. After authorizing, they are redirected back and the integration shows as **Connected** with stored tokens.
- **Backend:** Two Supabase Edge Functions handle OAuth:
  - `pos-oauth-start`: Builds the provider’s authorization URL and returns it (called by the frontend with the user’s JWT and `restaurant_id`).
  - `pos-oauth-callback`: Receives the redirect from the provider with `code` and `state`, exchanges the code for tokens, and saves them in `restaurant_integrations.credentials_encrypted`.

## 1. Environment variables (Supabase Edge Functions)

Set these in your Supabase project (**Settings → Edge Functions → Secrets** or project env):

| Variable | Required for | Description |
|----------|--------------|-------------|
| `SQUARE_APPLICATION_ID` | Square | Application ID from [Square Developer Dashboard](https://developer.squareup.com/apps) (OAuth page). |
| `SQUARE_APPLICATION_SECRET` | Square | Application secret from the same OAuth page. |
| `CLOVER_APP_ID` | Clover | App ID from [Clover Developer Dashboard](https://www.clover.com/developers). |
| `CLOVER_APP_SECRET` | Clover | App secret from Clover. |
| `TOAST_CLIENT_ID` | Toast | Client ID from Toast partner/developer portal. |
| `TOAST_CLIENT_SECRET` | Toast | Client secret from Toast. |
| `POS_OAUTH_RETURN_URL` | All | Base URL where merchants are sent after OAuth (e.g. `https://cravenusa.com` or `https://merchant.cravenusa.com`). No trailing slash. |

If a provider’s credentials are missing, the **Connect** button for that provider will show an error (e.g. “Square integration is not configured”).

## 2. Square setup

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps) and create (or select) an application.
2. Open the app → **OAuth** tab.
3. Under **Redirect URL**, add your callback URL (must match exactly):
   ```
   https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/pos-oauth-callback?provider=square
   ```
   Example: `https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/pos-oauth-callback?provider=square`
4. Copy **Application ID** and **Application secret** into `SQUARE_APPLICATION_ID` and `SQUARE_APPLICATION_SECRET`.
5. For production, complete Square’s app review if required.

## 3. Clover setup

1. Go to [Clover Developer Dashboard](https://www.clover.com/developers) and create (or select) an app.
2. Set the **Redirect URL** (Alternate Launch Path) to:
   ```
   https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/pos-oauth-callback?provider=clover
   ```
3. Copy **App ID** and **App Secret** into `CLOVER_APP_ID` and `CLOVER_APP_SECRET`.

## 4. Toast setup

1. Apply for API access at [Toast Partner / Developer](https://pos.toasttab.com/developers) if needed.
2. Create an application and set the **Redirect URI** to:
   ```
   https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/pos-oauth-callback?provider=toast
   ```
3. Copy **Client ID** and **Client Secret** into `TOAST_CLIENT_ID` and `TOAST_CLIENT_SECRET`.

## 5. Return URL after OAuth

Set `POS_OAUTH_RETURN_URL` to the base URL of the site where merchants land after connecting (e.g. `https://cravenusa.com` or your merchant portal domain). The callback redirects to:

- Success: `{POS_OAUTH_RETURN_URL}/merchant-portal?pos=connected&provider=square|toast|clover`
- Error: `{POS_OAUTH_RETURN_URL}/merchant-portal?pos=error&message=...`

The merchant portal reads these query params and shows a success or error toast, then clears the params from the URL.

## 6. Merchant-facing instructions

Merchants see step-by-step instructions in the UI when they open **Settings → Integrations** (or the Integrations dashboard):

- **Square:** Sign in to Square, authorize Crave'n, then return to the portal.
- **Toast:** Sign in to Toast, approve access, then return.
- **Clover:** Sign in to Clover, grant permission, then return.

“Connected” is shown only when the integration has valid stored credentials (after a successful OAuth callback). Disconnect removes the row and revokes the stored tokens on our side (provider-side revoke is not done automatically).

## 7. Database

Table used: `restaurant_integrations` (already exists). For POS OAuth we use:

- `restaurant_id`, `integration_type: 'pos'`, `provider_name`: `"Square POS"` | `"Toast"` | `"Clover"`
- `status`: `'connected'` when we have tokens
- `credentials_encrypted`: JSON of the provider’s token response (e.g. `access_token`, `refresh_token`, `merchant_id` for Square)
- `last_synced_at`: set on successful connect (optional; future sync jobs can update this)

## 8. Deploying the Edge Functions

From the repo root:

```bash
supabase functions deploy pos-oauth-start
supabase functions deploy pos-oauth-callback
```

Ensure the project’s env vars (above) are set before merchants use Connect.

## 9. Optional: encryption at rest

Currently, the token response is stored as JSON in `credentials_encrypted`. For stronger security, you can encrypt this payload with a key stored in `ENCRYPTION_KEY` (or Supabase Vault) before writing and decrypt in sync jobs or when calling the provider’s API.
