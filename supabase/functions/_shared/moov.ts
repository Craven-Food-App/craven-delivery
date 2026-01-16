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
    "x-moov-version": "v2024.01.00", // Required Moov API version header
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

  const response = await fetch(url, options);
  
  // Clone response for logging (so we don't consume the original body)
  const clonedResponse = response.clone();
  const responseText = await clonedResponse.text();
  
  // Log API status and response for debugging
  console.log(`Moov API status: ${response.status}`);
  console.log(`Moov API response (first 200 chars): ${responseText.substring(0, 200)}\n`);

  if (!response.ok) {
    let errorDetails: any;
    try {
      errorDetails = JSON.parse(responseText);
    } catch {
      errorDetails = { message: responseText || response.statusText };
    }
    
    console.error("Moov API error details:", {
      status: response.status,
      statusText: response.statusText,
      path,
      method,
      hasAccountId: !!moovConfig.accountId,
      url,
      errorDetails,
    });
  }

  // Return the original response (body still readable)
  return response;
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
    let errorMessage = "Unknown error";
    try {
      const error = await response.json();
      errorMessage = error.message || error.error?.message || JSON.stringify(error) || response.statusText;
    } catch {
      errorMessage = response.statusText || "Failed to create payment method";
    }
    console.error("Moov API error:", errorMessage, "Status:", response.status);
    throw new Error(`Moov card creation failed: ${errorMessage}`);
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

/**
 * Moov Onboarding Types
 */
export interface MoovOnboardingPrefill {
  mode?: "production" | "sandbox";
  accountType?: "individual" | "business";
  profile?: {
    business?: {
      legalBusinessName?: string;
      doingBusinessAs?: string;
      businessType?: string;
      address?: MoovAddress;
      phone?: {
        number: string;
        countryCode: string;
      };
      email?: string;
      website?: string;
      description?: string;
      taxID?: {
        ein?: {
          number: string;
        };
      };
      industryCodes?: {
        naics?: string;
        sic?: string;
        mcc?: string;
      };
      primaryRegulator?: string;
    };
    individual?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: {
        number: string;
        countryCode: string;
      };
      address?: MoovAddress;
      dateOfBirth?: {
        day: number;
        month: number;
        year: number;
      };
      ssn?: {
        full?: string;
        last4?: string;
      };
    };
  };
  metadata?: Record<string, string>;
  termsOfService?: {
    token: string;
  };
  foreignID?: string;
  customerSupport?: {
    phone?: {
      number: string;
      countryCode: string;
    };
    email?: string;
    address?: MoovAddress;
    website?: string;
  };
  settings?: {
    cardPayment?: {
      statementDescriptor?: string;
    };
    achPayment?: {
      companyName?: string;
    };
  };
}

export interface MoovOnboardingInvite {
  code: string;
  link: string;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
}

/**
 * Create a Moov onboarding invite
 * Generates a link to a co-branded onboarding form
 */
export async function createMoovOnboardingInvite(params: {
  returnURL?: string;
  termsOfServiceURL?: string;
  scopes: string[];
  capabilities: string[];
  feePlanCodes: string[];
  prefill?: MoovOnboardingPrefill;
  config?: MoovConfig;
}): Promise<MoovOnboardingInvite> {
  const response = await moovRequest(
    "POST",
    "/onboarding-invites",
    {
      returnURL: params.returnURL,
      termsOfServiceURL: params.termsOfServiceURL,
      scopes: params.scopes,
      capabilities: params.capabilities,
      feePlanCodes: params.feePlanCodes,
      prefill: params.prefill,
    },
    params.config
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(
      `Moov onboarding invite creation failed: ${error.message || response.statusText}`
    );
  }

  const data = await response.json();
  return {
    code: data.code,
    link: data.link,
    status: data.status,
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
  };
}

/**
 * List all Moov onboarding invites
 */
export async function listMoovOnboardingInvites(
  config?: MoovConfig
): Promise<MoovOnboardingInvite[]> {
  const response = await moovRequest("GET", "/onboarding-invites", undefined, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(
      `Failed to list onboarding invites: ${error.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.invites || [];
}

/**
 * Get a specific Moov onboarding invite by code
 */
export async function getMoovOnboardingInvite(
  code: string,
  config?: MoovConfig
): Promise<MoovOnboardingInvite> {
  const response = await moovRequest(
    "GET",
    `/onboarding-invites/${code}`,
    undefined,
    config
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(
      `Failed to get onboarding invite: ${error.message || response.statusText}`
    );
  }

  return await response.json();
}

/**
 * Revoke a Moov onboarding invite
 * This renders the link unusable
 */
export async function revokeMoovOnboardingInvite(
  code: string,
  config?: MoovConfig
): Promise<void> {
  const response = await moovRequest(
    "DELETE",
    `/onboarding-invites/${code}`,
    undefined,
    config
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(
      `Failed to revoke onboarding invite: ${error.message || response.statusText}`
    );
  }
}

/**
 * Generate a terms of service token for Moov account
 * This should be called before creating an onboarding link if terms acceptance is required
 */
export async function generateMoovTermsOfServiceToken(
  accountID: string,
  config?: MoovConfig
): Promise<{ token: string }> {
  const response = await moovRequest(
    "POST",
    `/accounts/${accountID}/terms-of-service`,
    {},
    config
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(
      `Failed to generate terms of service token: ${error.message || response.statusText}`
    );
  }

  return await response.json();
}

