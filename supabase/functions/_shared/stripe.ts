/**
 * Stripe API Client Helper
 * Provides utilities for interacting with Stripe payment APIs
 */

import Stripe from 'https://esm.sh/stripe@14.21.0';

export interface StripeConfig {
  secretKey: string;
  publishableKey?: string;
}

/**
 * Get Stripe API credentials from environment
 */
export function getStripeConfig(): StripeConfig {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const publishableKey = Deno.env.get("STRIPE_PUBLISHABLE_KEY") || "";
  
  if (!secretKey) {
    throw new Error("Stripe secret key not configured. Please set STRIPE_SECRET_KEY environment variable.");
  }
  
  return {
    secretKey,
    publishableKey,
  };
}

/**
 * Initialize Stripe client
 */
export function getStripeClient(): Stripe {
  const config = getStripeConfig();
  return new Stripe(config.secretKey, {
    apiVersion: '2023-10-16',
  });
}

/**
 * Create a payment method (card) in Stripe
 */
export async function createStripePaymentMethod(params: {
  type: 'card';
  card: {
    number: string;
    expMonth: number;
    expYear: number;
    cvv: string;
  };
  billingDetails: {
    name: string;
    email?: string;
    phone?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
}): Promise<{ id: string; card: { brand: string; last4: string; expMonth: number; expYear: number } }> {
  const stripe = getStripeClient();
  
  const paymentMethod = await stripe.paymentMethods.create({
    type: params.type,
    card: {
      number: params.card.number,
      exp_month: params.card.expMonth,
      exp_year: params.card.expYear,
      cvc: params.card.cvv,
    },
    billing_details: {
      name: params.billingDetails.name,
      email: params.billingDetails.email,
      phone: params.billingDetails.phone,
      address: {
        line1: params.billingDetails.address.line1,
        line2: params.billingDetails.address.line2,
        city: params.billingDetails.address.city,
        state: params.billingDetails.address.state,
        postal_code: params.billingDetails.address.postalCode,
        country: params.billingDetails.address.country,
      },
    },
  });
  
  if (!paymentMethod.card) {
    throw new Error("Failed to create card payment method");
  }
  
  return {
    id: paymentMethod.id,
    card: {
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
    },
  };
}

/**
 * Attach a payment method to a customer
 */
export async function attachPaymentMethodToCustomer(
  paymentMethodId: string,
  customerId: string
): Promise<void> {
  const stripe = getStripeClient();
  
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

/**
 * Create or retrieve a Stripe customer
 */
export async function getOrCreateCustomer(params: {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  const stripe = getStripeClient();
  
  // Try to find existing customer by email
  const existingCustomers = await stripe.customers.list({
    email: params.email,
    limit: 1,
  });
  
  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }
  
  // Create new customer
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    phone: params.phone,
    metadata: params.metadata || {},
  });
  
  return customer.id;
}

/**
 * Create a payment intent for an order
 */
export async function createPaymentIntent(params: {
  amount: number; // in cents
  currency: string;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  applicationFeeAmount?: number; // Platform fee in cents
  onBehalfOf?: string; // Stripe Connect account ID for merchant
  transferData?: {
    destination: string; // Stripe Connect account ID
    amount?: number; // Amount to transfer in cents
  };
}): Promise<{
  id: string;
  clientSecret: string;
  status: string;
}> {
  const stripe = getStripeClient();
  
  const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
    amount: params.amount,
    currency: params.currency,
    description: params.description,
    metadata: params.metadata || {},
    automatic_payment_methods: {
      enabled: true,
    },
  };
  
  if (params.customerId) {
    paymentIntentParams.customer = params.customerId;
  }
  
  if (params.paymentMethodId) {
    paymentIntentParams.payment_method = params.paymentMethodId;
    paymentIntentParams.confirmation_method = 'manual';
    paymentIntentParams.confirm = true;
  }
  
  // For Stripe Connect (merchant payouts)
  if (params.onBehalfOf || params.transferData) {
    paymentIntentParams.on_behalf_of = params.onBehalfOf;
    paymentIntentParams.transfer_data = params.transferData;
    paymentIntentParams.application_fee_amount = params.applicationFeeAmount;
  }
  
  const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
  
  return {
    id: paymentIntent.id,
    clientSecret: paymentIntent.client_secret || '',
    status: paymentIntent.status,
  };
}

/**
 * Confirm a payment intent
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId?: string
): Promise<{
  id: string;
  status: string;
  charges: Array<{ id: string; amount: number }>;
}> {
  const stripe = getStripeClient();
  
  const confirmParams: Stripe.PaymentIntentConfirmParams = {};
  if (paymentMethodId) {
    confirmParams.payment_method = paymentMethodId;
  }
  
  const paymentIntent = await stripe.paymentIntents.confirm(
    paymentIntentId,
    confirmParams
  );
  
  return {
    id: paymentIntent.id,
    status: paymentIntent.status,
    charges: paymentIntent.charges.data.map((charge) => ({
      id: charge.id,
      amount: charge.amount,
    })),
  };
}

/**
 * Create a transfer to a Stripe Connect account (for merchant/feeder payouts)
 */
export async function createStripeTransfer(params: {
  amount: number; // in cents
  currency: string;
  destination: string; // Stripe Connect account ID
  description?: string;
  metadata?: Record<string, string>;
}): Promise<{
  id: string;
  amount: number;
  status: string;
  destination: string;
}> {
  const stripe = getStripeClient();
  
  const transfer = await stripe.transfers.create({
    amount: params.amount,
    currency: params.currency,
    destination: params.destination,
    description: params.description,
    metadata: params.metadata || {},
  });
  
  return {
    id: transfer.id,
    amount: transfer.amount,
    status: transfer.reversed ? 'reversed' : 'pending',
    destination: transfer.destination as string,
  };
}

/**
 * Create a payout to a connected account's bank account
 */
export async function createPayoutToConnectedAccount(params: {
  amount: number; // in cents
  currency: string;
  connectedAccountId: string; // Stripe Connect account ID
  description?: string;
  metadata?: Record<string, string>;
}): Promise<{
  id: string;
  amount: number;
  status: string;
}> {
  const stripe = getStripeClient();
  
  // Create a transfer to the connected account
  const transfer = await createStripeTransfer({
    amount: params.amount,
    currency: params.currency,
    destination: params.connectedAccountId,
    description: params.description,
    metadata: params.metadata,
  });
  
  // The connected account will automatically receive the funds
  // Stripe handles the payout to their bank account based on their payout schedule
  
  return {
    id: transfer.id,
    amount: transfer.amount,
    status: transfer.status,
  };
}

/**
 * Retrieve a payment method
 */
export async function retrievePaymentMethod(
  paymentMethodId: string
): Promise<{
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}> {
  const stripe = getStripeClient();
  
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  
  return {
    id: paymentMethod.id,
    type: paymentMethod.type,
    card: paymentMethod.card ? {
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
    } : undefined,
  };
}

/**
 * List payment methods for a customer
 */
export async function listCustomerPaymentMethods(
  customerId: string
): Promise<Array<{
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}>> {
  const stripe = getStripeClient();
  
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  
  return paymentMethods.data.map((pm) => ({
    id: pm.id,
    type: pm.type,
    card: pm.card ? {
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
    } : undefined,
  }));
}

/**
 * Delete a payment method
 */
export async function deletePaymentMethod(paymentMethodId: string): Promise<void> {
  const stripe = getStripeClient();
  
  await stripe.paymentMethods.detach(paymentMethodId);
}

