# Stripe Migration Plan - Complete Switch from Moov

## Overview
Complete migration from Moov to Stripe and Stripe Connect for:
- Customer payment processing
- Payment method management
- Merchant/Feeder payouts via Stripe Connect
- Driver payouts

## Migration Status

### ✅ Completed
1. **Stripe Shared Utilities** (`supabase/functions/_shared/stripe.ts`)
   - Payment method creation
   - Payment intent creation
   - Stripe Connect transfers
   - Customer management

2. **Payment Method Creation** (`supabase/functions/create-stripe-payment-method/index.ts`)
   - Replaces `create-moov-payment-method`
   - Creates Stripe payment methods
   - Attaches to Stripe customers

3. **Checkout Page Updates** (`src/pages/Checkout.tsx`)
   - Updated to use Stripe payment method creation
   - Updated payment method storage to use `stripe_payment_method_id`
   - Updated payment processing calls

### 🔄 In Progress
4. **Payment Processing** (`supabase/functions/create-payment/index.ts`)
   - Needs to be updated to use Stripe Payment Intents
   - Should support Stripe Connect for merchant payouts

### ⏳ Pending
5. **Database Schema Migration**
   - Update `payment_methods` table to use `stripe_payment_method_id` instead of `moov_payment_method_id`
   - Add `stripe_customer_id` to user profiles
   - Update driver payment methods to use Stripe

6. **Driver Payout Functions**
   - `supabase/functions/daily-driver-payouts/index.ts` - Update to use Stripe transfers
   - `supabase/functions/manual-driver-payout/index.ts` - Update to use Stripe transfers

7. **Merchant/Feeder Payouts**
   - Already have Stripe Connect setup (`create-stripe-connect-account`, `create-stripe-connect-link`)
   - Need to integrate with payment processing for automatic payouts

8. **Webhook Handler**
   - Update `supabase/functions/stripe-webhook/index.ts` to handle all payment events
   - Replace Moov webhook handler

9. **PaymentMethodSelector Component**
   - Update to fetch and display Stripe payment methods
   - Update to use `stripe_payment_method_id`

## Next Steps

1. **Update Payment Processing Function** - Replace Moov with Stripe Payment Intents
2. **Database Migration** - Add Stripe columns, migrate existing data
3. **Update Driver Payouts** - Switch to Stripe transfers
4. **Test End-to-End** - Verify payment flow works
5. **Deploy** - Roll out changes

## Environment Variables Required

- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (for frontend)
- `STRIPE_WEBHOOK_SECRET` - For webhook signature verification

## Breaking Changes

- Payment method IDs will change from Moov format to Stripe format
- Existing Moov payment methods will need to be re-added by users
- Driver payment methods will need to be re-configured

















