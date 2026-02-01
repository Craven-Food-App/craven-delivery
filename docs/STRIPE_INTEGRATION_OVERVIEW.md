# Stripe Integration Overview - Crave'n Food Delivery Platform

> **Last Updated:** January 31, 2026  
> **Stripe API Version:** 2023-10-16  
> **Stripe.js Version:** v14.21.0

---

## Table of Contents
1. [Overview](#overview)
2. [Environment Variables](#environment-variables)
3. [Architecture](#architecture)
4. [Core Implementations](#core-implementations)
5. [Stripe Connect (Merchant Payouts)](#stripe-connect-merchant-payouts)
6. [Payment Flow](#payment-flow)
7. [Webhook Handlers](#webhook-handlers)
8. [Security](#security)
9. [Testing](#testing)

---

## Overview

Crave'n uses Stripe for all payment processing across the platform:
- **Customer Payments**: Card payments for food orders
- **Merchant Payouts**: Automatic payouts via Stripe Connect Express
- **Driver Payouts**: Transfers for delivery fees
- **Subscription Billing**: CraveMore subscription management

### Key Features
✅ **PCI Compliant** - Card data never touches our servers  
✅ **Stripe Connect** - Merchant direct payouts  
✅ **Webhook Integration** - Real-time payment status updates  
✅ **Multi-Currency** - USD support with international expansion ready  
✅ **Promo Code Integration** - Server-side validation

---

## Environment Variables

### Frontend (Client-Side)
```bash
# .env or Vercel/Netlify Environment Variables
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_...
```

### Backend (Supabase Edge Functions)
```bash
# Supabase Dashboard → Settings → Edge Functions → Secrets
STRIPE_SECRET_KEY=sk_live_... # or sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_... # (optional, for frontend passthrough)
```

### Where to Find Keys

#### Stripe Dashboard
- **API Keys**: https://dashboard.stripe.com/apikeys
- **Webhooks**: https://dashboard.stripe.com/webhooks
- **Connect**: https://dashboard.stripe.com/connect/accounts/overview

#### Supabase Dashboard
- **Project**: https://xaxbucnjlrfkccsfiddq.supabase.co
- **Secrets**: Settings → Edge Functions → Secrets

---

## Architecture

### Payment Flow Diagram
```
┌─────────────┐
│  Customer   │
│   Browser   │
└─────┬───────┘
      │ 1. Stripe.js loads
      │ 2. Card tokenization (client-side)
      ▼
┌─────────────────────┐
│  Stripe Elements    │
│  (PCI Compliant)    │
└─────┬───────────────┘
      │ 3. PaymentMethod created
      ▼
┌─────────────────────┐
│  create-order       │
│  Edge Function      │
└─────┬───────────────┘
      │ 4. Create PaymentIntent
      │ 5. Validate promo
      │ 6. Calculate fees
      ▼
┌─────────────────────┐
│  Stripe API         │
│  (Payment Intent)   │
└─────┬───────────────┘
      │ 7. Charge customer
      │ 8. Distribute funds
      ▼
┌─────────────────────┐      ┌─────────────────────┐
│  Merchant Account   │      │  Platform Account   │
│  (Stripe Connect)   │◄─────┤  (Holds fees)       │
└─────────────────────┘      └─────────────────────┘
```

### Component Structure
```
src/
├── pages/
│   ├── Checkout.tsx                  # Main checkout page
│   └── PaymentSuccess.tsx            # Order confirmation
├── components/
│   ├── checkout/
│   │   ├── PaymentMethodSelector.tsx # Card selection UI
│   │   ├── AddressSelector.tsx       # Delivery address
│   │   └── PromoCodeInput.tsx        # Promo validation
│   └── stripe/
│       └── StripeElements.tsx        # Stripe.js wrapper

supabase/functions/
├── _shared/
│   └── stripe.ts                     # Reusable Stripe utilities
├── create-order/
│   └── index.ts                      # Order creation + payment
├── stripe-webhook/
│   └── index.ts                      # Webhook event handler
├── create-stripe-connect-account/
│   └── index.ts                      # Merchant onboarding
├── create-stripe-connect-link/
│   └── index.ts                      # Generate onboarding URL
└── get-stripe-connect-status/
    └── index.ts                      # Check merchant status
```

---

## Core Implementations

### 1. Stripe Shared Utilities
**File:** `supabase/functions/_shared/stripe.ts`

#### Configuration
```typescript
export interface StripeConfig {
  secretKey: string;
  publishableKey?: string;
}

export function getStripeConfig(): StripeConfig {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const publishableKey = Deno.env.get("STRIPE_PUBLISHABLE_KEY") || "";
  
  if (!secretKey) {
    throw new Error("Stripe secret key not configured");
  }
  
  return { secretKey, publishableKey };
}

export function getStripeClient(): Stripe {
  const config = getStripeConfig();
  return new Stripe(config.secretKey, {
    apiVersion: '2023-10-16',
  });
}
```

#### Key Functions

##### Create or Get Customer
```typescript
export async function getOrCreateCustomer(params: {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}): Promise<string>
```
- Searches for existing customer by email
- Creates new customer if not found
- Returns Stripe customer ID

##### Create Payment Intent
```typescript
export async function createPaymentIntent(params: {
  amount: number;              // in cents
  currency: string;            // 'usd'
  customerId?: string;         // Stripe customer ID
  paymentMethodId?: string;    // Payment method to use
  description?: string;        // Order description
  metadata?: Record<string, string>;
  applicationFeeAmount?: number;  // Platform fee
  onBehalfOf?: string;         // Merchant Connect account
  transferData?: {
    destination: string;       // Merchant account ID
    amount?: number;           // Amount to transfer
  };
}): Promise<{
  id: string;
  clientSecret: string;
  status: string;
}>
```
- Creates a PaymentIntent with Stripe
- Supports Stripe Connect for merchant payouts
- Returns client secret for frontend confirmation

##### Create Stripe Transfer
```typescript
export async function createStripeTransfer(params: {
  amount: number;              // in cents
  currency: string;
  destination: string;         // Connect account ID
  description?: string;
  metadata?: Record<string, string>;
}): Promise<{
  id: string;
  amount: number;
  status: string;
  destination: string;
}>
```
- Transfers funds to merchant/driver Connect account
- Used for payouts after order completion

##### Payment Method Management
```typescript
// Create payment method
export async function createStripePaymentMethod(...)

// Attach to customer
export async function attachPaymentMethodToCustomer(...)

// List customer's cards
export async function listCustomerPaymentMethods(customerId: string)

// Delete payment method
export async function deletePaymentMethod(paymentMethodId: string)
```

---

### 2. Frontend Implementation

#### Stripe Initialization
**File:** `src/pages/Checkout.tsx`

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
let stripePromise: Promise<any> | null = null;
try {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (publishableKey && publishableKey.trim() !== '') {
    stripePromise = loadStripe(publishableKey);
  } else {
    console.warn('VITE_STRIPE_PUBLISHABLE_KEY not set');
  }
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
  stripePromise = null;
}
```

#### Card Payment Component
```typescript
const AddCardForm: React.FC<{
  onSave: (paymentMethodId: string) => Promise<void>;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      console.error('Stripe.js not loaded');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    // Create payment method
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        name: billingName,
        address: {
          line1: address.street_address,
          city: address.city,
          state: address.state,
          postal_code: address.zip_code,
          country: 'US',
        },
      },
    });

    if (error) {
      toast({ variant: 'destructive', description: error.message });
      return;
    }

    await onSave(paymentMethod.id);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement options={{
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': { color: '#aab7c4' },
          },
        },
      }} />
      <button type="submit">Add Card</button>
    </form>
  );
};
```

#### Order Creation
```typescript
const placeOrder = async () => {
  try {
    // Call create-order Edge Function
    const { data, error } = await supabase.functions.invoke('create-order', {
      body: {
        restaurant_id: restaurantId,
        items: cartItems,
        delivery_address_id: selectedAddress.id,
        payment_method_id: selectedPaymentMethod.id,
        promo_code: appliedPromoCode,
        delivery_instructions: deliveryInstructions,
        tip_cents: tipAmount,
      },
    });

    if (error) throw error;

    // Redirect to success page
    navigate(`/payment-success?order_id=${data.order_id}`);
  } catch (err) {
    toast({ variant: 'destructive', description: 'Payment failed' });
  }
};
```

---

### 3. Order Creation Edge Function
**File:** `supabase/functions/create-order/index.ts`

#### Request Flow
```typescript
serve(async (req) => {
  // 1. Validate user authentication
  const authHeader = req.headers.get('Authorization');
  const user = await getAuthenticatedUser(authHeader);

  // 2. Parse and validate request
  const {
    restaurant_id,
    items,
    delivery_address_id,
    payment_method_id,
    promo_code,
    tip_cents,
  } = await req.json();

  // 3. Calculate order totals (server-side)
  const subtotal = items.reduce((sum, item) => 
    sum + (item.price_cents * item.quantity), 0);
  const tax = Math.round(subtotal * 0.0875); // 8.75% tax
  const delivery_fee = 299; // $2.99
  
  // 4. Apply promo code (if valid)
  let discount = 0;
  if (promo_code) {
    const promoResult = await validateAndApplyPromo(promo_code, subtotal);
    discount = promoResult.discount_cents;
  }

  const total = subtotal + tax + delivery_fee + (tip_cents || 0) - discount;

  // 5. Get or create Stripe customer
  const customerId = await getOrCreateCustomer({
    email: user.email,
    name: user.user_metadata.full_name,
    phone: user.user_metadata.phone,
    metadata: { user_id: user.id },
  });

  // 6. Get merchant Stripe Connect account
  const restaurant = await getRestaurantById(restaurant_id);
  const merchantAccountId = restaurant.stripe_connect_account_id;

  // 7. Calculate platform fee (15% of subtotal)
  const platformFee = Math.round(subtotal * 0.15);
  const merchantAmount = subtotal - platformFee;

  // 8. Create PaymentIntent with Connect transfer
  const paymentIntent = await createPaymentIntent({
    amount: total,
    currency: 'usd',
    customerId,
    paymentMethodId: payment_method_id,
    description: `Order from ${restaurant.name}`,
    metadata: {
      order_id: orderId,
      restaurant_id,
      user_id: user.id,
    },
    applicationFeeAmount: platformFee,
    onBehalfOf: merchantAccountId,
    transferData: {
      destination: merchantAccountId,
      amount: merchantAmount,
    },
  });

  // 9. Create order in database
  const { data: order } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      user_id: user.id,
      restaurant_id,
      status: 'pending',
      subtotal_cents: subtotal,
      tax_cents: tax,
      delivery_fee_cents: delivery_fee,
      tip_cents,
      discount_cents: discount,
      total_cents: total,
      payment_intent_id: paymentIntent.id,
      payment_status: 'pending',
    })
    .select()
    .single();

  // 10. Return order details
  return new Response(
    JSON.stringify({
      order_id: order.id,
      payment_status: paymentIntent.status,
      client_secret: paymentIntent.clientSecret,
    }),
    { headers: corsHeaders }
  );
});
```

---

## Stripe Connect (Merchant Payouts)

### Architecture
Merchants receive payments through **Stripe Connect Express** accounts:
- Platform collects full payment
- Automatic transfer to merchant account (minus fees)
- Merchants manage their own bank payouts via Stripe Dashboard

### Merchant Onboarding Flow

#### 1. Create Connect Account
**File:** `supabase/functions/create-stripe-connect-account/index.ts`

```typescript
serve(async (req) => {
  const { email, businessName, restaurantId } = await req.json();

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
  });

  // Create Express Connect account
  const account = await stripe.accounts.create({
    type: 'express',
    email: email,
    business_type: 'company',
    company: {
      name: businessName,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      restaurant_id: restaurantId,
    },
  });

  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${APP_URL}/merchant-portal?refresh=true`,
    return_url: `${APP_URL}/merchant-portal?onboarding=complete`,
    type: 'account_onboarding',
  });

  return new Response(
    JSON.stringify({
      accountId: account.id,
      onboardingUrl: accountLink.url,
    }),
    { headers: corsHeaders }
  );
});
```

#### 2. Check Account Status
**File:** `supabase/functions/get-stripe-connect-status/index.ts`

```typescript
serve(async (req) => {
  const { accountId } = await req.json();
  
  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(accountId);

  return new Response(
    JSON.stringify({
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements,
    }),
    { headers: corsHeaders }
  );
});
```

#### 3. Database Schema
```sql
-- restaurants table
ALTER TABLE restaurants
ADD COLUMN stripe_connect_account_id TEXT,
ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT FALSE;
```

---

## Webhook Handlers

**File:** `supabase/functions/stripe-webhook/index.ts`

### Webhook URL
```
https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/stripe-webhook
```

### Supported Events

#### Account Updates
```typescript
case 'account.updated': {
  const account = event.data.object as Stripe.Account;
  
  // Update restaurant status
  await supabase
    .from('restaurants')
    .update({
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_onboarding_complete: account.details_submitted
    })
    .eq('stripe_connect_account_id', account.id);
  break;
}
```

#### Payment Events
```typescript
case 'payment_intent.succeeded': {
  const paymentIntent = event.data.object;
  
  // Update order payment status
  await supabase
    .from('orders')
    .update({
      payment_status: 'succeeded',
      paid_at: new Date().toISOString()
    })
    .eq('payment_intent_id', paymentIntent.id);
  break;
}

case 'payment_intent.payment_failed': {
  const paymentIntent = event.data.object;
  
  await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      status: 'cancelled'
    })
    .eq('payment_intent_id', paymentIntent.id);
  break;
}
```

#### Transfer Events
```typescript
case 'transfer.created': {
  const transfer = event.data.object;
  console.log('Transfer created:', transfer.id);
  // Log payout to merchant/driver
  break;
}

case 'payout.paid': {
  const payout = event.data.object;
  console.log('Payout completed:', payout.id);
  break;
}
```

### Webhook Security
```typescript
const signature = req.headers.get('stripe-signature');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);
```

---

## Payment Flow

### Complete Customer Journey

1. **Customer adds items to cart**
   - Items stored in CartContext
   - Real-time price calculation

2. **Checkout page loads**
   - Initialize Stripe.js with publishable key
   - Load saved payment methods
   - Load delivery addresses

3. **Customer enters/selects payment**
   - Stripe Elements for card input
   - Card tokenization happens client-side (PCI compliant)
   - PaymentMethod created in Stripe

4. **Apply promo code (optional)**
   - Frontend validates format
   - Backend validates eligibility and calculates discount

5. **Place order**
   - Call `create-order` Edge Function
   - Server calculates all totals (prevents manipulation)
   - Creates PaymentIntent with Connect transfer
   - Charges customer immediately

6. **Payment processing**
   - Stripe charges customer card
   - Funds held in platform account
   - Automatic transfer to merchant (minus 15% fee)
   - Driver fee transferred after delivery

7. **Order confirmation**
   - Webhook updates order status
   - Customer redirected to success page
   - Confirmation email sent

---

## Security

### PCI Compliance
✅ **Card data never touches our servers**
- Stripe.js handles all card input
- PaymentMethod tokens used for server communication
- Stripe Elements are iframe-isolated

### API Key Security
✅ **Secret keys stored in environment variables**
- Never committed to Git
- Supabase secrets for Edge Functions
- Vercel/Netlify environment variables for frontend

### Webhook Verification
✅ **All webhooks cryptographically signed**
```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);
```

### Rate Limiting
✅ **30 requests per minute for webhooks**
```typescript
const rateLimitResult = await checkRateLimit(
  req,
  supabase,
  RateLimitPresets.API
);
```

---

## Testing

### Test Mode Keys
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Test Cards
```
Visa Success:        4242 4242 4242 4242
Visa Decline:        4000 0000 0000 0002
3D Secure Required:  4000 0025 0000 3155
```

### Test Workflow
1. Use test API keys
2. Place order with test card
3. Verify webhook received
4. Check database for order status
5. Verify Connect transfer in Stripe Dashboard

### Webhook Testing (Local)
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local Edge Function
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Trigger test events
stripe trigger payment_intent.succeeded
```

---

## Monitoring & Logs

### Stripe Dashboard
- **Payments**: https://dashboard.stripe.com/payments
- **Connect**: https://dashboard.stripe.com/connect/transfers
- **Logs**: https://dashboard.stripe.com/logs

### Supabase Edge Function Logs
- **Dashboard**: Settings → Edge Functions → Logs
- **CLI**: `supabase functions logs stripe-webhook`

---

## Production Checklist

- [ ] Live API keys configured
- [ ] Webhook endpoint registered in Stripe Dashboard
- [ ] Webhook secret stored in Supabase
- [ ] CORS origins whitelisted
- [ ] Rate limiting enabled
- [ ] Stripe Connect enabled
- [ ] Test payment flow end-to-end
- [ ] Monitor webhook delivery
- [ ] Set up Stripe radar rules for fraud prevention

---

## Additional Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Connect Guide**: https://stripe.com/docs/connect
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Setup Instructions**: See `docs/STRIPE_KEYS_SETUP.md`
- **Payout Configuration**: See `docs/STRIPE_PAYOUT_CONFIGURATION.md`

---

**End of Document**

