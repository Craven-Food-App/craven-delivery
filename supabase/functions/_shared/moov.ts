/**
 * Moov API Client Helper
 * Provides utilities for interacting with Moov.io payment APIs
 */

const MOOV_API_URL = Deno.env.get("MOOV_API_URL") || "https://api.moov.io";
const MOOV_ACCOUNT_ID = Deno.env.get("MOOV_ACCOUNT_ID") || "";

export interface MoovConfig {
  apiUrl?: string;
  accountId?: string;
  publicKey?: string;
  secretKey?: string;
}

export interface MoovCard {
  cardID: string;
  brand: string;
  last4: string;
  expirationMonth: number;
  expirationYear: number;
  holderName?: string;
  billingAddress?: MoovAddress;
}

export interface MoovAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  country: string;
}

export interface MoovBankAccount {
  bankAccountID: string;
  accountType: "checking" | "savings";
  holderName: string;
  holderType: "individual" | "business";
  bankName?: string;
  fingerprint?: string;
  last4?: string;
}

export interface MoovPaymentMethod {
  paymentMethodID: string;
  paymentMethodType: "card" | "ach-debit-fund-source" | "ach-credit-fund-source";
  card?: MoovCard;
  bankAccount?: MoovBankAccount;
}

/**
 * Get Moov API credentials from environment
 */
export function getMoovConfig(): MoovConfig {
  return {
    apiUrl: MOOV_API_URL,
    accountId: MOOV_ACCOUNT_ID,
    publicKey: Deno.env.get("MOOV_PUBLIC_KEY") || "",
    secretKey: Deno.env.get("MOOV_SECRET_KEY") || "",
  };
}

/**
 * Make authenticated request to Moov API
 */
export async function moovRequest(
  method: string,
  path: string,
  body?: any,
  config?: MoovConfig
): Promise<Response> {
  const moovConfig = config || getMoovConfig();
  const secretKey = moovConfig.secretKey;

  if (!secretKey) {
    throw new Error("Moov secret key not configured");
  }

  const url = `${moovConfig.apiUrl}${path}`;
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };

  // Add Moov-Account header if account ID is provided
  if (moovConfig.accountId) {
    headers["Moov-Account"] = moovConfig.accountId;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  return fetch(url, options);
}

/**
 * Create a payment using Moov
 * Supports card payments and ACH debits
 */
export async function createMoovPayment(params: {
  amount: number; // in cents
  currency: string;
  source: {
    paymentMethodID: string;
    paymentMethodType: "card" | "ach-debit-fund-source";
  };
  description?: string;
  metadata?: Record<string, string>;
}): Promise<{ paymentID: string; status: string }> {
  const response = await moovRequest("POST", "/payments", {
    amount: {
      currency: params.currency,
      value: params.amount,
    },
    source: {
      paymentMethodID: params.source.paymentMethodID,
      paymentMethodType: params.source.paymentMethodType,
    },
    description: params.description,
    metadata: params.metadata,
  });

  if (!response.ok) {
    let errorDetails: any;
    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = { message: response.statusText || "Unknown error" };
    }
    
    const errorMessage = errorDetails.message || errorDetails.error || response.statusText || "Unknown error";
    const statusCode = response.status;
    
    console.error("Moov payment API error:", {
      status: statusCode,
      statusText: response.statusText,
      errorDetails,
      url: response.url,
    });
    
    throw new Error(`Moov payment failed: ${errorMessage} (Status: ${statusCode})`);
  }

  return await response.json();
}

/**
 * Create a transfer/payout using Moov
 * Supports ACH credits, RTP, and push to card
 */
export async function createMoovTransfer(params: {
  amount: number; // in cents
  currency: string;
  destination: {
    paymentMethodID: string;
    paymentMethodType: "ach-credit-fund-source" | "rtp-credit-fund-source" | "card-fund-source";
  };
  description?: string;
  metadata?: Record<string, string>;
}): Promise<{ transferID: string; status: string }> {
  const response = await moovRequest("POST", "/transfers", {
    amount: {
      currency: params.currency,
      value: params.amount,
    },
    destination: {
      paymentMethodID: params.destination.paymentMethodID,
      paymentMethodType: params.destination.paymentMethodType,
    },
    description: params.description,
    metadata: params.metadata,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Moov transfer creation failed: ${error.message || response.statusText}`);
  }

  return await response.json();
}

/**
 * Create a card payment method token (for frontend)
 * This would typically be done client-side with Moov.js
 */
export async function createCardPaymentMethod(params: {
  cardNumber: string;
  expirationMonth: number;
  expirationYear: number;
  cvv: string;
  holderName: string;
  billingAddress: MoovAddress;
}): Promise<{ paymentMethodID: string }> {
  // Note: In production, card tokenization should be done client-side with Moov.js
  // This is a server-side fallback - card details should never be sent to your server
  const response = await moovRequest("POST", "/payment-methods", {
    paymentMethodType: "card",
    card: {
      number: params.cardNumber,
      expirationMonth: params.expirationMonth,
      expirationYear: params.expirationYear,
      cvv: params.cvv,
      holderName: params.holderName,
      billingAddress: params.billingAddress,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Moov card creation failed: ${error.message || response.statusText}`);
  }

  return await response.json();
}

/**
 * Create an ACH payment method (bank account)
 */
export async function createAchPaymentMethod(params: {
  accountType: "checking" | "savings";
  routingNumber: string;
  accountNumber: string;
  holderName: string;
  holderType: "individual" | "business";
  billingAddress: MoovAddress;
}): Promise<{ paymentMethodID: string; bankAccountID: string }> {
  const response = await moovRequest("POST", "/payment-methods", {
    paymentMethodType: "ach-debit-fund-source",
    ach: {
      accountType: params.accountType,
      routingNumber: params.routingNumber,
      accountNumber: params.accountNumber,
      holderName: params.holderName,
      holderType: params.holderType,
      billingAddress: params.billingAddress,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Moov ACH creation failed: ${error.message || response.statusText}`);
  }

  return await response.json();
}

/**
 * Get payment method details
 */
export async function getPaymentMethod(paymentMethodID: string): Promise<MoovPaymentMethod> {
  const response = await moovRequest("GET", `/payment-methods/${paymentMethodID}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Failed to get payment method: ${error.message || response.statusText}`);
  }

  return await response.json();
}

/**
 * List payment methods for an account
 */
export async function listPaymentMethods(accountID: string): Promise<MoovPaymentMethod[]> {
  const response = await moovRequest("GET", `/accounts/${accountID}/payment-methods`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Failed to list payment methods: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return data.paymentMethods || [];
}

/**
 * Verify webhook signature from Moov
 * Moov uses HMAC-SHA256 with the signing secret
 */
export async function verifyMoovWebhook(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);
    
    // Import the key for HMAC
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    // Generate HMAC signature
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
    
    // Convert to hex string
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signatureHex = signatureArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    
    // Compare signatures (constant-time comparison)
    const providedSignature = signature.replace(/^sha256=/, "").toLowerCase();
    const computedSignature = signatureHex.toLowerCase();
    
    if (providedSignature.length !== computedSignature.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < providedSignature.length; i++) {
      result |= providedSignature.charCodeAt(i) ^ computedSignature.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

