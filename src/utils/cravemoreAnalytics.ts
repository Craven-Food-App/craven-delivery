// @ts-nocheck
// CraveMore Analytics Event Tracking
// Implements all events from spec section 9.1

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export const trackCravemoreEvent = (
  eventName: string,
  params?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
  // Also log to console for debugging
  console.log(`[CraveMore Analytics] ${eventName}`, params);
};

// Specific event trackers
export const analytics = {
  paywallViewed: (source: 'checkout' | 'account' | 'home') => {
    trackCravemoreEvent('cravemore_paywall_viewed', { source });
  },

  planSelected: (planKey: string) => {
    trackCravemoreEvent('cravemore_plan_selected', { plan_key: planKey });
  },

  checkoutStarted: (planKey: string) => {
    trackCravemoreEvent('cravemore_checkout_started', { plan_key: planKey });
  },

  checkoutCompleted: (
    planKey: string,
    priceCents: number,
    promoApplied: boolean
  ) => {
    trackCravemoreEvent('cravemore_checkout_completed', {
      plan_key: planKey,
      price_cents: priceCents,
      promo_applied: promoApplied,
    });
  },

  membershipActive: (planKey: string) => {
    trackCravemoreEvent('cravemore_membership_active', { plan_key: planKey });
  },

  canceled: (planKey: string, reason?: string) => {
    trackCravemoreEvent('cravemore_canceled', {
      plan_key: planKey,
      reason: reason || 'user_initiated',
    });
  },

  deliveryFeeWaived: (orderId: string, amountCents: number) => {
    trackCravemoreEvent('cravemore_delivery_fee_waived', {
      order_id: orderId,
      amount_cents: amountCents,
    });
  },

  cartIneligible: (reason: 'subtotal' | 'merchant' | 'zone') => {
    trackCravemoreEvent('cravemore_cart_ineligible', { reason });
  },
};

