// DoorDash-style payment error parsing
// Maps Stripe error codes and messages to user-friendly, contextual error objects

export type PaymentErrorType = 'payment_declined' | 'card_invalid' | 'network' | 'validation' | 'general';

export interface ParsedPaymentError {
  type: PaymentErrorType;
  title: string;
  message: string;
  errorCode?: string;
  /** true = show in a centered modal (hard failures); false = inline banner */
  shouldShowModal: boolean;
  /** optional field that caused the error (for inline highlight) */
  field?: 'card_number' | 'expiry' | 'cvv' | 'name' | 'address' | 'zip' | 'phone' | 'email';
}

// ── Stripe decline-code → human-readable map ────────────────────────

const DECLINE_CODE_MAP: Record<string, { title: string; message: string }> = {
  card_declined:           { title: 'Card Declined',           message: 'Your card was declined. Please try a different payment method or contact your bank.' },
  insufficient_funds:      { title: 'Insufficient Funds',      message: 'Your card has insufficient funds. Please try a different card.' },
  lost_card:               { title: 'Card Declined',           message: 'This card has been reported lost. Please use a different card.' },
  stolen_card:             { title: 'Card Declined',           message: 'This card has been reported stolen. Please use a different card.' },
  expired_card:            { title: 'Card Expired',            message: 'Your card has expired. Please update your card or use a different one.' },
  incorrect_cvc:           { title: 'Invalid Security Code',   message: 'The CVV/CVC code you entered is incorrect. Check the 3-digit code on the back of your card.' },
  incorrect_number:        { title: 'Invalid Card Number',     message: 'The card number you entered is incorrect. Please double-check and try again.' },
  invalid_cvc:             { title: 'Invalid Security Code',   message: 'The security code is invalid. Please re-enter the 3 or 4 digit code.' },
  invalid_expiry_month:    { title: 'Invalid Expiration',      message: 'The expiration month is invalid. Please check your card details.' },
  invalid_expiry_year:     { title: 'Invalid Expiration',      message: 'The expiration year is invalid. Please check your card details.' },
  invalid_number:          { title: 'Invalid Card Number',     message: 'This card number is not valid. Please double-check and try again.' },
  processing_error:        { title: 'Processing Error',        message: 'An error occurred while processing your card. Please try again in a moment.' },
  do_not_honor:            { title: 'Card Declined',           message: 'Your bank declined this transaction. Contact your bank or try a different card.' },
  try_again_later:         { title: 'Temporarily Unavailable', message: 'The payment processor is temporarily unavailable. Please try again in a few minutes.' },
  generic_decline:         { title: 'Payment Declined',        message: 'Your payment was declined. Please try a different payment method.' },
  fraudulent:              { title: 'Payment Declined',        message: 'This transaction was flagged by your bank. Contact them or try a different card.' },
  authentication_required: { title: 'Authentication Required', message: 'Your bank requires additional verification. Please complete the authentication step.' },
  withdrawal_count_limit_exceeded: { title: 'Transaction Limit', message: 'You\'ve exceeded the number of allowed transactions. Please try again later or use a different card.' },
  currency_not_supported:  { title: 'Unsupported Currency',    message: 'Your card does not support this currency. Please try a different card.' },
  testmode_decline:        { title: 'Test Card',               message: 'This is a test card and cannot be used for live payments.' },
};

// ── Parser ───────────────────────────────────────────────────────────

export function parsePaymentError(error: any): ParsedPaymentError {
  // Normalise inputs
  const message: string = error?.message || error?.error?.message || error?.raw?.message || '';
  const code: string    = error?.code || error?.decline_code || error?.error?.code || error?.error?.decline_code || '';
  const param: string   = error?.param || error?.error?.param || '';
  const msgLower = message.toLowerCase();

  // 1. Known Stripe decline code
  if (code && DECLINE_CODE_MAP[code]) {
    const mapped = DECLINE_CODE_MAP[code];
    return {
      type: 'payment_declined',
      title: mapped.title,
      message: mapped.message,
      errorCode: code,
      shouldShowModal: true,
    };
  }

  // 2. Card-validation errors (show inline banner, not modal)
  if (msgLower.includes('card number') || msgLower.includes('incorrect_number') || code === 'incorrect_number' || code === 'invalid_number') {
    return { type: 'card_invalid', title: 'Invalid Card Number', message: 'Please check your card number and try again.', errorCode: code || 'invalid_number', shouldShowModal: false, field: 'card_number' };
  }
  if (msgLower.includes('expir') || msgLower.includes('exp_month') || msgLower.includes('exp_year') || param?.includes('exp')) {
    return { type: 'card_invalid', title: 'Invalid Expiration Date', message: 'Your card\'s expiration date is invalid or has passed.', errorCode: code || 'invalid_expiry', shouldShowModal: false, field: 'expiry' };
  }
  if (msgLower.includes('cvc') || msgLower.includes('cvv') || msgLower.includes('security code') || param?.includes('cvc')) {
    return { type: 'card_invalid', title: 'Invalid Security Code', message: 'The CVV/CVC code is incorrect. Check the 3-digit code on the back of your card.', errorCode: code || 'invalid_cvc', shouldShowModal: false, field: 'cvv' };
  }
  if (msgLower.includes('test card') || msgLower.includes('live mode')) {
    return { type: 'card_invalid', title: 'Invalid Card', message: 'This card cannot be used for live transactions. Please use a valid payment card.', errorCode: 'test_card', shouldShowModal: false };
  }

  // 3. Network / timeout
  if (msgLower.includes('network') || msgLower.includes('timeout') || msgLower.includes('failed to fetch') || msgLower.includes('load failed') || msgLower.includes('err_internet') || msgLower.includes('aborted')) {
    return { type: 'network', title: 'Connection Issue', message: 'We couldn\'t reach the payment server. Please check your internet connection and try again.', shouldShowModal: false };
  }

  // 4. Payment / decline catch-all → modal
  if (msgLower.includes('payment') || msgLower.includes('declined') || msgLower.includes('failed') || msgLower.includes('charge')) {
    return { type: 'payment_declined', title: 'Payment Failed', message: message || 'Something went wrong with your payment. Please try again.', errorCode: code || undefined, shouldShowModal: true };
  }

  // 5. Generic fallback → inline banner
  return { type: 'general', title: 'Something Went Wrong', message: message || 'An unexpected error occurred. Please try again.', shouldShowModal: false };
}

// ── Validation helpers (for checkout field validation) ────────────────

export interface CheckoutValidationError {
  type: 'validation';
  title: string;
  message: string;
  shouldShowModal: false;
  field?: ParsedPaymentError['field'];
}

export function validateCheckoutFields(fields: {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  hasCartItems: boolean;
  hasPaymentMethod: boolean;
  isDelivery: boolean;
}): CheckoutValidationError | null {
  if (!fields.hasCartItems) {
    return { type: 'validation', title: 'Your Cart is Empty', message: 'Add items to your cart before checking out.', shouldShowModal: false };
  }
  if (!fields.name?.trim()) {
    return { type: 'validation', title: 'Name Required', message: 'Please enter your full name to continue.', shouldShowModal: false, field: 'name' };
  }
  if (!fields.phone?.trim()) {
    return { type: 'validation', title: 'Phone Number Required', message: 'We need your phone number in case we need to reach you about your order.', shouldShowModal: false, field: 'phone' };
  }
  if (!fields.email?.trim()) {
    return { type: 'validation', title: 'Email Required', message: 'Please enter your email address for your order confirmation.', shouldShowModal: false, field: 'email' };
  }
  if (fields.isDelivery && (!fields.address?.trim() || !fields.city?.trim() || !fields.state?.trim() || !fields.zip?.trim())) {
    return { type: 'validation', title: 'Delivery Address Incomplete', message: 'Please add a complete delivery address in your account settings.', shouldShowModal: false, field: 'address' };
  }
  if (!fields.hasPaymentMethod) {
    return { type: 'validation', title: 'Payment Method Required', message: 'Please select or add a payment method to complete your order.', shouldShowModal: false };
  }
  return null;
}

