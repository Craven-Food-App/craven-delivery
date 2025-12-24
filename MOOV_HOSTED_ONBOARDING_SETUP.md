# Moov Hosted Onboarding Setup Guide

This guide explains how to use the Moov hosted onboarding integration for merchant account creation in the Crave'n Delivery platform.

## Overview

The Moov hosted onboarding system allows you to create co-branded onboarding links that merchants can use to complete their Moov account setup. The onboarding form is hosted by Moov and includes your branding, making it a seamless experience for your merchants.

## Features

- **Co-branded onboarding forms** with your logo and company name
- **Pre-filled merchant data** to reduce friction
- **Secure session management** with expiration handling
- **Terms of service integration** with your platform agreement
- **Custom return URLs** for post-onboarding redirects
- **Capability and fee plan configuration** per merchant

## Prerequisites

1. **Moov API Credentials**: You need:
   - `MOOV_SECRET_KEY` - Your Moov API secret key
   - `MOOV_PUBLIC_KEY` - Your Moov public key (optional, for frontend)
   - `MOOV_API_URL` - Moov API URL (defaults to `https://api.moov.io`)
   - `MOOV_ACCOUNT_ID` - Your Moov platform account ID (optional)

2. **Environment Variables**: Set these in your Supabase project:
   ```bash
   supabase secrets set MOOV_SECRET_KEY=your_secret_key
   supabase secrets set MOOV_PUBLIC_KEY=your_public_key
   supabase secrets set MOOV_API_URL=https://api.moov.io
   supabase secrets set MOOV_ACCOUNT_ID=your_account_id
   ```

3. **Database Migration**: Run the migration to add Moov tracking columns:
   ```bash
   supabase db push
   ```

## API Endpoints

### 1. Create Onboarding Invite

**Endpoint:** `POST /functions/v1/create-moov-onboarding-invite`

**Request Body:**
```json
{
  "restaurantId": "uuid-optional",
  "returnURL": "https://yourapp.com/merchant-portal?onboarding=complete",
  "termsOfServiceURL": "https://yourapp.com/terms-of-service",
  "scopes": ["accounts.read"],
  "capabilities": [
    "wallet.balance",
    "collect-funds.ach",
    "collect-funds.card-payments",
    "send-funds.ach"
  ],
  "feePlanCodes": ["merchant-direct"],
  "accountType": "business",
  "prefill": {
    "mode": "production",
    "accountType": "business",
    "profile": {
      "business": {
        "legalBusinessName": "Whole Body Fitness LLC",
        "doingBusinessAs": "Whole Body Fitness",
        "businessType": "llc",
        "address": {
          "addressLine1": "123 Main Street",
          "city": "Boulder",
          "stateOrProvince": "CO",
          "postalCode": "80301",
          "country": "US"
        },
        "phone": {
          "number": "8185551212",
          "countryCode": "1"
        },
        "email": "merchant@example.com"
      }
    }
  }
}
```

**Response:**
```json
{
  "code": "invite-code-123",
  "link": "https://onboarding.moov.io/invite/abc123",
  "status": "pending",
  "restaurantId": "uuid"
}
```

**Example Usage:**
```typescript
const response = await supabase.functions.invoke('create-moov-onboarding-invite', {
  body: {
    restaurantId: restaurant.id,
    returnURL: `${window.location.origin}/merchant-portal?moov_onboarding=complete`,
    scopes: ['accounts.read'],
    capabilities: ['wallet.balance', 'collect-funds.ach', 'send-funds.ach'],
    feePlanCodes: ['merchant-direct'],
    accountType: 'business'
  }
});

const { code, link } = response.data;
// Redirect merchant to link
window.location.href = link;
```

### 2. List All Onboarding Invites

**Endpoint:** `GET /functions/v1/manage-moov-onboarding-invites`

**Response:**
```json
{
  "invites": [
    {
      "code": "invite-code-123",
      "link": "https://onboarding.moov.io/invite/abc123",
      "status": "completed",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 3. Get Specific Onboarding Invite

**Endpoint:** `GET /functions/v1/manage-moov-onboarding-invites?code=invite-code-123`

**Response:**
```json
{
  "code": "invite-code-123",
  "link": "https://onboarding.moov.io/invite/abc123",
  "status": "completed",
  "createdAt": "2024-01-01T00:00:00Z",
  "expiresAt": "2024-01-08T00:00:00Z"
}
```

### 4. Revoke Onboarding Invite

**Endpoint:** `DELETE /functions/v1/manage-moov-onboarding-invites?code=invite-code-123`

**Response:**
```json
{
  "success": true,
  "message": "Invite revoked"
}
```

## Capabilities

Moov capabilities determine what actions an account can perform. Common capabilities include:

- `wallet.balance` - Store funds with Moov
- `collect-funds.ach` - Collect funds via ACH
- `collect-funds.card-payments` - Collect funds via card payments
- `send-funds.ach` - Send funds via ACH
- `send-funds.instant-bank` - Send funds via instant bank transfer
- `send-funds.push-to-card` - Send funds via push to card
- `card-issuing` - Issue virtual cards (business accounts only)
- `money-transfer.pull-from-card` - Pull money from card
- `money-transfer.push-to-card` - Push money to card

## Fee Plans

Before creating an onboarding link, you need to:

1. **Retrieve available fee plans** using the Moov Fee Plan API
2. **Select or create a fee plan** appropriate for your merchant
3. **Use the fee plan code** in the `feePlanCodes` array

Fee plan types:
- **Cost Plus**: Interchange fees and markup passed to merchant
- **Flat Rate**: Single flat rate for all processing

## Prefill Data

The onboarding system supports pre-filling merchant information to reduce friction:

### Business Account Prefill
```typescript
{
  profile: {
    business: {
      legalBusinessName: "Company Name LLC",
      doingBusinessAs: "DBA Name",
      businessType: "llc", // llc, corporation, sole_proprietor, partnership
      address: {
        addressLine1: "123 Main St",
        addressLine2: "Suite 100",
        city: "Boulder",
        stateOrProvince: "CO",
        postalCode: "80301",
        country: "US"
      },
      phone: {
        number: "8185551212",
        countryCode: "1"
      },
      email: "merchant@example.com",
      taxID: {
        ein: {
          number: "12-3456789"
        }
      },
      industryCodes: {
        naics: "713940",
        sic: "7991",
        mcc: "7997"
      }
    }
  }
}
```

### Individual Account Prefill
```typescript
{
  profile: {
    individual: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: {
        number: "8185551212",
        countryCode: "1"
      },
      dateOfBirth: {
        day: 1,
        month: 1,
        year: 1990
      },
      ssn: {
        last4: "1234"
      }
    }
  }
}
```

## Terms of Service

If your merchants need to accept terms of service:

1. **Generate a terms token** (requires existing Moov account):
   ```typescript
   // This is handled automatically if moov_account_id exists
   // Otherwise, create account first or skip terms acceptance
   ```

2. **Include in prefill**:
   ```typescript
   {
     prefill: {
       termsOfService: {
         token: "generated-token-here"
       }
     }
   }
   ```

## Integration Example

### React Component Example

```typescript
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function MoovOnboardingButton({ restaurantId }: { restaurantId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOnboardingLink = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'create-moov-onboarding-invite',
        {
          body: {
            restaurantId,
            returnURL: `${window.location.origin}/merchant-portal?moov_onboarding=complete`,
            termsOfServiceURL: `${window.location.origin}/terms-of-service`,
            scopes: ['accounts.read'],
            capabilities: [
              'wallet.balance',
              'collect-funds.ach',
              'collect-funds.card-payments',
              'send-funds.ach'
            ],
            feePlanCodes: ['merchant-direct'],
            accountType: 'business'
          }
        }
      );

      if (error) throw error;

      // Redirect to Moov onboarding
      if (data?.link) {
        window.location.href = data.link;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create onboarding link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={createOnboardingLink} disabled={loading}>
        {loading ? 'Creating...' : 'Complete Moov Onboarding'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## Webhook Handling

When a merchant completes onboarding, Moov will send a webhook event. Handle this in your `moov-webhook` function:

```typescript
// In supabase/functions/moov-webhook/index.ts
if (event.type === 'account.updated' || event.type === 'account.created') {
  // Update restaurant with Moov account ID
  await supabase
    .from('restaurants')
    .update({
      moov_account_id: event.accountID,
      moov_onboarding_status: 'completed',
      moov_onboarding_complete: true,
      moov_capabilities: event.capabilities,
      moov_fee_plan_codes: event.feePlanCodes
    })
    .eq('moov_onboarding_invite_code', event.inviteCode);
}
```

## Database Schema

The migration adds the following columns to the `restaurants` table:

- `moov_account_id` - Moov account ID after onboarding
- `moov_onboarding_invite_code` - Tracking code for the invite
- `moov_onboarding_status` - Status: pending, completed, revoked, failed
- `moov_onboarding_complete` - Boolean flag for completion
- `moov_capabilities` - JSON array of enabled capabilities
- `moov_fee_plan_codes` - Array of fee plan codes

## Status Tracking

Monitor onboarding status in your merchant portal:

```typescript
const { data: restaurant } = await supabase
  .from('restaurants')
  .select('moov_onboarding_status, moov_onboarding_complete, moov_account_id')
  .eq('id', restaurantId)
  .single();

if (restaurant?.moov_onboarding_complete) {
  // Show success state
} else if (restaurant?.moov_onboarding_status === 'pending') {
  // Show pending state with link to continue
} else {
  // Show "Start Onboarding" button
}
```

## Error Handling

Common errors and solutions:

1. **"feePlanCodes is required"**
   - Ensure you provide at least one fee plan code
   - Retrieve available plans from Moov Fee Plan API first

2. **"Moov secret key not configured"**
   - Set `MOOV_SECRET_KEY` in Supabase secrets
   - Verify environment variables are loaded

3. **"Failed to generate terms of service token"**
   - This is optional - onboarding can proceed without it
   - Create Moov account first if terms acceptance is required

4. **"Invite code not found"**
   - Invite may have expired or been revoked
   - Create a new onboarding invite

## Security Considerations

1. **Authentication**: All endpoints require valid Supabase authentication
2. **Authorization**: Users can only create invites for their own restaurants
3. **CORS**: Configured to allow only trusted origins
4. **Secrets**: Never expose Moov API keys in client-side code
5. **Webhooks**: Verify webhook signatures using `verifyMoovWebhook`

## Next Steps

1. **Set up Moov API credentials** in Supabase secrets
2. **Run database migration** to add tracking columns
3. **Configure fee plans** in your Moov dashboard
4. **Test onboarding flow** with a test merchant
5. **Set up webhook handling** to track completion
6. **Integrate into merchant portal** UI

## Support

For Moov API documentation:
- [Moov API Docs](https://docs.moov.io/api)
- [Onboarding Guide](https://docs.moov.io/guides/onboarding)
- [Capabilities Reference](https://docs.moov.io/api/capabilities)

For platform-specific issues, check:
- Edge function logs in Supabase dashboard
- Database migration status
- Environment variable configuration

