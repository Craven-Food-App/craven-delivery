import React from "react";

const CraveMoreTermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">CraveMore Subscription Terms</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Last updated: January 20, 2026
        </p>

        <p className="text-sm mb-4">
          CraveMore is an optional subscription offered by Crave’n Inc. (“Crave’n”, “we”, “us”) that may
          provide benefits such as reduced or waived delivery fees on eligible orders, promotional credits, and
          other perks described in the app. These CraveMore Subscription Terms supplement, and are incorporated
          into, the Crave’n Terms of Service.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">1. Enrollment and Eligibility</h2>
        <p className="text-sm mb-4">
          To enroll in CraveMore, you must have a Crave’n account, a valid payment method on file, and be in a
          supported region. We may restrict CraveMore by geography, platform, or account status.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">2. Free Trial</h2>
        <p className="text-sm mb-4">
          CraveMore currently includes a 30‑day free trial for eligible users. During the free trial, you may
          access CraveMore benefits at no subscription charge. At the end of the free trial, your Subscription
          will automatically convert to a paid, auto‑renewing Subscription unless you cancel before the trial
          ends.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">3. Subscription Fees and Billing</h2>
        <p className="text-sm mb-4">
          After any free trial, CraveMore is billed at{" "}
          <span className="font-medium">$9.99 per month (USD)</span>, plus applicable taxes. By starting
          CraveMore, you authorize Crave’n to charge your selected payment method on a recurring monthly basis
          until you cancel. If a charge cannot be processed, we may suspend or cancel your Subscription until
          your payment method is updated.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">4. Benefits and Limitations</h2>
        <p className="text-sm mb-2">
          CraveMore benefits may include, for example, reduced or waived delivery fees on eligible orders and
          promotional credits. Benefits are subject to:
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>Availability in your area</li>
          <li>Minimum order amounts</li>
          <li>Restaurant or item exclusions</li>
          <li>Changes described in the app from time to time</li>
        </ul>
        <p className="text-sm mb-4">
          CraveMore does not guarantee that all orders will have zero delivery fees, that all Restaurants will
          participate, or that delivery times will be faster than non‑CraveMore orders.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">5. Cancellations</h2>
        <p className="text-sm mb-4">
          You can cancel CraveMore at any time in the app under{" "}
          <span className="font-medium">Account → CraveMore</span>, or by emailing{" "}
          <span className="font-medium">help@cravenusa.com</span>. After cancellation, your Subscription
          will remain active until the end of your current billing period. You will not receive a refund or
          credit for partial billing periods, except where required by law.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">6. Changes to Price or Terms</h2>
        <p className="text-sm mb-4">
          We may change the CraveMore price or these terms in the future. If we increase the price or make
          material changes, we will notify you in advance via email or in‑app notice. The updated price or terms
          will apply to the next billing cycle after the effective date. If you do not agree, you must cancel
          before the changes take effect.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">7. Contact</h2>
        <p className="text-sm mb-1 font-medium">Crave’n Inc. Support</p>
        <p className="text-sm">Email: help@cravenusa.com</p>
      </div>
    </div>
  );
};

export default CraveMoreTermsPage;


