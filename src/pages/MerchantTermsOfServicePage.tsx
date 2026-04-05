import React from 'react';
import { CURRENT_MERCHANT_TERMS_VERSION } from '@/constants/merchantTerms';

/**
 * Merchant-facing terms (marketplace / restaurant operator).
 * Have counsel review before relying on enforcement.
 */
const MerchantTermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Crave&apos;n Merchant Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Version {CURRENT_MERCHANT_TERMS_VERSION} · Effective: April 2026 · Draft for legal review
        </p>

        <p className="text-sm mb-4">
          These Merchant Terms (“Terms”) govern your use of Crave&apos;n&apos;s merchant tools, tablet ordering, payouts,
          and related services as a restaurant or retail operator on the platform. By creating a merchant account,
          clicking accept, or continuing to use merchant services after notice, you agree to these Terms.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">1. Platform role and control</h2>
        <p className="text-sm mb-4">
          Crave&apos;n provides a technology marketplace. You are an independent business, not our employee or agent.
          Crave&apos;n reserves the right to control marketplace operations, including order flow, visibility, pricing
          display, and customer experience standards. You do not own placement or ranking in the app.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">2. Fees and payments</h2>
        <p className="text-sm mb-4">
          Commission, fees, and payout timing are as described in the app and help center. Platform commission is
          subject to a stated cap (e.g. 15% of applicable order amounts) unless otherwise agreed in writing. Payouts
          may be processed via third parties (e.g. Stripe). You are responsible for accurate banking and tax
          information.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">3. Refunds and chargebacks</h2>
        <p className="text-sm mb-4">
          Crave&apos;n may issue refunds or credits to customers in its discretion to protect the customer experience.
          Such amounts may be charged back to you, including via deductions from future payouts or invoicing. You agree
          that chargebacks, disputes, or payment reversals related to your orders may be recovered from future payouts or
          invoiced directly.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">4. Pricing and promotions</h2>
        <p className="text-sm mb-4">
          Crave&apos;n may adjust pricing presentation, fees, and promotional discounts shown to customers, subject to
          applicable law and any caps or rules stated in the product.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">5. Operations and standards</h2>
        <p className="text-sm mb-4">
          You agree to maintain accurate menus, honor posted prep times where reasonable, accept or reject orders in
          accordance with product rules, and comply with applicable health, safety, and licensing requirements. High
          cancellation rates, fraud, or repeated failures may result in warnings, throttling, or removal.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">6. Data</h2>
        <p className="text-sm mb-4">
          Customer and order data generated through the Platform is licensed and used as described in our Privacy
          Policy. You receive limited access to fulfill orders and operate your business; you may not misuse personal
          data or use it for unsolicited marketing outside permitted channels.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">7. Liability</h2>
        <p className="text-sm mb-4">
          You are responsible for the products you sell, food safety, packaging, and compliance with local laws.
          Crave&apos;n is not the merchant of record for your goods. To the maximum extent permitted by law, our
          liability is limited as set forth in our general Terms of Service and applicable law.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">8. Suspension and termination</h2>
        <p className="text-sm mb-4">
          Crave&apos;n may suspend or terminate access immediately if activity poses risk to customers, the Platform,
          or brand integrity, or for repeated or material breach. You may stop using the Platform subject to winding
          down open obligations and payouts.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">9. Changes</h2>
        <p className="text-sm mb-4">
          We may update these Terms. We will provide notice as required by law; continued use after the effective date
          of material changes may require renewed acceptance in the app.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">10. Contact</h2>
        <p className="text-sm mb-8">
          Questions: contact support through the channels listed in the merchant portal or on{' '}
          <a href="/support" className="underline">craven.com/support</a>.
        </p>
      </div>
    </div>
  );
};

export default MerchantTermsOfServicePage;
