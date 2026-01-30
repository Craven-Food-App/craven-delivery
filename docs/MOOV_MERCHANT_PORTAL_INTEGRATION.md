# Moov Onboarding Integration - Merchant Portal

This document describes how Moov hosted onboarding has been integrated into the Merchant Portal UI.

## Components Created

### 1. MoovOnboardingCard Component
**Location:** `src/components/restaurant/dashboard/settings/MoovOnboardingCard.tsx`

A reusable card component that:
- Displays current Moov onboarding status
- Shows different UI states (not started, pending, completed, revoked, failed)
- Handles creating onboarding invites via the edge function
- Redirects merchants to Moov's hosted onboarding form
- Checks status on return from Moov onboarding
- Automatically refreshes status when returning from Moov

**Features:**
- Status badges with icons (CheckCircle, Loader, AlertCircle)
- Loading states during invite creation
- Error handling with user-friendly messages
- Auto-status check on mount if returning from onboarding
- Manual refresh button

### 2. Integration Points

#### BankAccountDashboard
**Location:** `src/components/restaurant/dashboard/settings/BankAccountDashboard.tsx`

- Added `MoovOnboardingCard` component below the Stripe Connect section
- Merchants can see both Stripe and Moov onboarding options in one place
- Located in Settings → Bank Account tab

#### HomeDashboard
**Location:** `src/components/merchant/HomeDashboard.tsx`

- Added Moov onboarding status check to incomplete tasks alert
- Shows warning card if `moov_onboarding_complete` is false
- Includes button to navigate directly to Moov setup
- Displays alongside Stripe onboarding warnings

## User Flow

### Merchant Journey

1. **Home Dashboard**
   - Merchant sees alert: "Moov Account Setup Required"
   - Clicks "Complete Moov Setup" button
   - Redirected to Settings → Bank Account tab

2. **Bank Account Settings**
   - Sees Moov Onboarding Card
   - Card shows current status (Not Started, Pending, Completed, etc.)
   - Clicks "Start Moov Onboarding" button

3. **Onboarding Process**
   - Edge function creates Moov onboarding invite
   - Merchant redirected to Moov's hosted onboarding form
   - Completes onboarding at their own pace
   - Moov redirects back to merchant portal with `?moov_onboarding=complete`

4. **Return to Portal**
   - Component detects return parameter
   - Automatically checks status after 2 second delay
   - Updates UI to show completed status
   - Shows success state with account ID

## Status Tracking

The component tracks these database fields from the `restaurants` table:

- `moov_onboarding_status` - Current status (pending, completed, revoked, failed)
- `moov_onboarding_complete` - Boolean completion flag
- `moov_account_id` - Moov account ID after completion
- `moov_onboarding_invite_code` - Tracking code for the invite

## UI States

### Not Started
- Default state when no onboarding has been initiated
- Shows benefits list (card payments, ACH, payouts, wallet)
- "Start Moov Onboarding" button

### Pending
- Status when onboarding link has been created but not completed
- Shows "Onboarding In Progress" message
- "Continue Setup" and "Check Status" buttons

### Completed
- Status when onboarding is successfully completed
- Green success card with checkmark
- Shows account ID (first 8 characters)
- "Refresh Status" button

### Revoked/Failed
- Error states with warning badges
- Option to start new onboarding process

## Configuration

### Fee Plan Code
Update the `feePlanCodes` array in `MoovOnboardingCard.tsx`:

```typescript
feePlanCodes: ["merchant-direct"], // Update with your actual fee plan code
```

### Capabilities
Modify the capabilities array as needed:

```typescript
capabilities: [
  "wallet.balance",
  "collect-funds.ach",
  "collect-funds.card-payments",
  "send-funds.ach",
],
```

### Return URLs
The component automatically sets return URLs:
- `returnURL`: Redirects to merchant portal with completion parameter
- `termsOfServiceURL`: Links to your terms of service page

## Webhook Integration (Future)

When Moov sends webhook events for account updates, update the `moov-webhook` function to:

```typescript
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
```

This ensures the UI updates automatically when Moov processes the onboarding.

## Testing

1. Navigate to Merchant Portal → Settings → Bank Account
2. Scroll to "Moov Account Setup" card
3. Click "Start Moov Onboarding"
4. Should redirect to Moov onboarding form
5. Complete or cancel onboarding
6. Return to portal
7. Status should update automatically

## Troubleshooting

### Status not updating after return
- Check browser console for errors
- Verify edge function is returning correct data
- Check database for `moov_onboarding_status` updates
- Use "Refresh Status" button to manually update

### Onboarding link not creating
- Verify Moov secrets are set in Supabase
- Check edge function logs for errors
- Ensure restaurant ID exists
- Verify fee plan codes are valid

### UI showing wrong status
- Check database values directly
- Clear browser cache
- Refresh page
- Use manual status check button

