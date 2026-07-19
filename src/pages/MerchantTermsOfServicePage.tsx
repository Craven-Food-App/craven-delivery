import React from 'react';
import { CURRENT_MERCHANT_TERMS_VERSION } from '@/constants/merchantTerms';

/**
 * Merchant-facing terms (marketplace / restaurant / retail / grocery / CX).
 * Have counsel review before relying on enforcement.
 */
const MerchantTermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Crave&apos;n Merchant Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Version {CURRENT_MERCHANT_TERMS_VERSION} · Effective: July 19, 2026 · Draft for legal review
        </p>

        <p className="text-sm mb-4">
          These Merchant Terms of Service (“Terms”) govern your access to and use of Crave&apos;n merchant products and
          services, including the Merchant Portal, Live Orders / kitchen tools, tablet apps, menu and catalog tools,
          inventory tools, insights and reports, payouts, promotions, paid growth and storefront features, POS
          integrations, Drive On-Demand, Crave&apos;N Express (CX) courier tools (when applicable), and related support
          channels (collectively, the “Merchant Services”).
        </p>
        <p className="text-sm mb-4">
          By creating a merchant account, completing onboarding, clicking accept, enabling a feature, or continuing to
          use the Merchant Services after notice of these Terms, you agree to these Terms and our{' '}
          <a href="/legal/privacy" className="underline">
            Privacy Policy
          </a>
          . If you do not agree, do not use the Merchant Services.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">1. Who these Terms cover</h2>
        <p className="text-sm mb-2">
          These Terms apply to businesses using Crave&apos;n as a merchant, including restaurants, retail stores,
          grocery stores, multi-location operators, and courier-service / CX operators onboarded through merchant
          flows. “You” means the business entity and the individual accepting on its behalf.
        </p>
        <p className="text-sm mb-4">
          You represent that you have authority to bind the business, that the information you provide is accurate, and
          that you and your business will comply with all applicable laws (including food safety, retail, alcohol,
          employment, tax, advertising, and consumer-protection laws).
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">2. Platform role and control</h2>
        <p className="text-sm mb-4">
          Crave&apos;n operates a technology marketplace and related logistics tooling. You are an independent business,
          not our employee, partner, joint venturer, or agent. Crave&apos;n may control marketplace operations,
          including order flow, customer experience standards, visibility, placement, ranking, feature availability,
          and how prices and fees are presented in the apps. You do not own placement, ranking, demand, or customer
          relationships created solely through the Platform, except as expressly stated for first-party storefront or
          similar features when activated.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">3. Accounts, onboarding, and verification</h2>
        <p className="text-sm mb-2">
          To use payout and certain live features, you must complete onboarding and verification steps we specify,
          which may include:
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>Business profile, hours, locations, and operational settings;</li>
          <li>Menu, product catalog, and inventory setup (as applicable to your business type);</li>
          <li>
            Owner / authorized representative identity verification (for example government ID, date of birth, and
            SSN last-4) and any background-check authorization you provide;
          </li>
          <li>
            Business tax and banking information, and completion of Stripe Connect (or successor) onboarding, KYC/KYB,
            and bank account linkage; and
          </li>
          <li>Licenses, permits, and feature-specific attestations (for example alcohol sales).</li>
        </ul>
        <p className="text-sm mb-4">
          You must keep account, banking, tax, and license information current. We may pause go-live, payouts, or
          features until verification is complete or if information appears incomplete, inaccurate, or high-risk. You
          are responsible for activity under your merchant users, tablet logins, pause-store PIN, and credentials.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">4. Fees, commission, and payouts</h2>
        <p className="text-sm mb-2">Unless we agree otherwise in writing or display different rates in the Merchant Portal:</p>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>
            <strong>Marketplace delivery orders:</strong> flat <strong>15%</strong> platform commission on applicable
            order amounts (as calculated and disclosed in the Merchant Services).
          </li>
          <li>
            <strong>Marketplace pickup orders:</strong> <strong>0%</strong> platform commission (payment processing fees
            may still apply).
          </li>
          <li>
            <strong>First-party / branded storefront and certain direct channels:</strong> commission terms as disclosed
            when you activate the feature (for example, commission-free direct orders where marketed as such).
          </li>
          <li>
            <strong>Payment processing:</strong> Stripe (or another processor we use) may charge processing fees on
            transactions, separate from platform commission.
          </li>
          <li>
            <strong>Customer delivery fees and tips:</strong> generally allocated between drivers (“Feeders”) and/or the
            Platform as described in product rules; they are not your food/goods commission unless we expressly say so.
          </li>
        </ul>
        <p className="text-sm mb-4">
          Payouts are typically processed through Stripe Connect to your linked bank account on schedules shown in the
          Financials tools. We may hold, delay, offset, or reverse payouts for risk, disputes, refunds, chargebacks,
          incomplete onboarding, legal requirements, or suspected fraud. You are solely responsible for taxes arising
          from your sales and for maintaining accurate tax information (including any 1099-K or similar reporting
          thresholds). Optional paid products (Section 5) do not change your marketplace commission unless we expressly
          state otherwise.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">5. Optional paid features and promotions</h2>
        <p className="text-sm mb-2">
          You may purchase or activate optional products when offered, such as Local Boost, Category Feature, City
          Spotlight, Branded Storefront, Instagram Ordering integrations, CraveMore merchant opt-in, and
          merchant-funded promotional campaigns. Fees (for example monthly subscription amounts shown in-product) and
          billing cadence are as disclosed at purchase or activation.
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>
            Paid growth / advertising tools are offered on an “as available” basis. We do not guarantee impressions,
            clicks, orders, revenue, or placement outcomes.
          </li>
          <li>
            You may cancel optional subscriptions as allowed in the product; fees already incurred are generally
            non-refundable unless required by law or expressly stated.
          </li>
          <li>
            Merchant-funded promotions (discounts, free delivery, item promos) are your responsibility. Related costs
            may reduce your net payout or be settled as described in the Merchant Services.
          </li>
          <li>
            CraveMore is a customer membership / rewards program. Opting in may affect eligibility display and
            customer benefits as described in-product; it does not make you a party to the customer membership
            agreement.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-8 mb-2">6. Refunds, credits, and chargebacks</h2>
        <p className="text-sm mb-4">
          Crave&apos;n may issue refunds, partial refunds, or credits to customers in its discretion to protect the
          customer experience and Platform integrity. Such amounts, together with chargebacks, payment disputes,
          reversals, and related fees, may be charged back to you, deducted from current or future payouts, held from
          reserves, or invoiced. You agree to cooperate with investigations and provide evidence reasonably requested.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">7. Pricing presentation</h2>
        <p className="text-sm mb-4">
          Subject to applicable law, Crave&apos;n may adjust how prices, fees, taxes, tips, and promotional discounts
          are displayed to customers. You remain responsible for the menu/catalog prices you set (and for taxes where
          you are the taxpayer), except where we expressly collect and remit tax on your behalf under a disclosed
          arrangement.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">8. Catalog, inventory, content, and AI tools</h2>
        <p className="text-sm mb-2">You agree to:</p>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>
            Keep menus, products, modifiers, prices, allergens, hours, availability, and inventory accurate and
            updated;
          </li>
          <li>
            Only list items you are legally permitted to sell, with truthful descriptions, images, and claims;
          </li>
          <li>
            Ensure you have rights to all photos, logos, trademarks, and other content you upload (store images, menu
            images, branding); and
          </li>
          <li>
            Review AI-generated descriptions or other automated content before publishing. You are responsible for
            final accuracy even if generated with our tools.
          </li>
        </ul>
        <p className="text-sm mb-4">
          We may remove or require changes to content that is inaccurate, infringing, unsafe, illegal, or inconsistent
          with Platform standards.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">9. Orders, operations, and devices</h2>
        <p className="text-sm mb-2">
          You agree to operate professionally using Merchant Portal tools (including Live Orders / kitchen board), web
          and tablet apps, and any printer or related integrations you enable. Without limiting other rules, you will:
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>Accept, reject, prepare, and mark orders in accordance with product workflows and timing expectations;</li>
          <li>Honor reasonable prep times and readiness commitments;</li>
          <li>Package orders safely and correctly for delivery or pickup;</li>
          <li>
            Use pause-store, tablet controls, and chat features responsibly and only for legitimate operational
            purposes; and
          </li>
          <li>
            Maintain health, safety, sanitation, and licensing standards applicable to your business.
          </li>
        </ul>
        <p className="text-sm mb-4">
          High cancellation rates, excessive customer complaints, food-safety incidents, fraud, or repeated operational
          failures may result in warnings, reduced visibility, throttling, holds, suspension, or removal. Hardware is
          not required to sell on Crave&apos;n unless we expressly require a device for a specific program; any
          tablet-shipping or device programs are subject to separate logistics terms if provided.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">10. Delivery, pickup, and Feeders</h2>
        <p className="text-sm mb-4">
          Marketplace delivery is typically fulfilled by independent drivers (“Feeders”) or other delivery partners
          coordinated through the Platform. You are not the Feeder’s employer. You must make orders available for
          timely pickup, treat Feeders professionally, and follow handoff instructions. Customer pickup orders must be
          ready according to the order details and any pickup codes or instructions shown in the Merchant Services.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">11. Drive On-Demand</h2>
        <p className="text-sm mb-4">
          If you use Drive On-Demand (requesting Feeders for deliveries originating outside the standard marketplace
          checkout flow, including first-party or off-platform channels where enabled), those orders are also governed
          by the{' '}
          <a href="/drive-on-demand-merchant-terms" className="underline">
            Drive On-Demand Merchant Terms and Conditions
          </a>
          , which are incorporated into these Terms by reference. If there is a conflict for a Drive On-Demand job, the
          Drive On-Demand terms control for that job; these Terms control for all other Merchant Services.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">12. Crave&apos;N Express (CX) / courier services</h2>
        <p className="text-sm mb-2">
          If your merchant account is configured as a courier service / CX operator, additional rules apply:
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>
            CX tools may allow you to post jobs, manage dispatch, interact with available courier capacity, and review
            invoices or billing status through the CX portal experience.
          </li>
          <li>
            Access to post jobs or use certain CX features may require an active Stripe (or successor) subscription,
            trial, or other billing status as disclosed in-product.
          </li>
          <li>
            You are responsible for the legality of packages and goods you arrange to move, accurate pickup/dropoff
            instructions, restricted-item compliance, and any customer-facing promises you make.
          </li>
          <li>
            CX does not make Crave&apos;n the shipper, freight broker of last resort, or insurer of your goods unless a
            separate written program expressly says so.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-8 mb-2">13. POS and third-party integrations</h2>
        <p className="text-sm mb-4">
          If you connect a point-of-sale or other third-party system (for example Square, Toast, or Clover) via OAuth
          or similar means, you authorize Crave&apos;n to access data necessary for menu sync, order operations, or
          other features you enable. You must have rights to grant that access. Third-party services have their own
          terms; we are not responsible for outages, sync errors, or data inaccuracies originating from those systems.
          You may disconnect integrations as supported in Settings; disconnection may affect catalog freshness and
          order workflows.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">14. Alcohol and age-restricted products</h2>
        <p className="text-sm mb-4">
          Selling alcohol or other age-restricted products is optional and only permitted where enabled after your
          attestations and any license review we require. You represent that you hold all required licenses and that
          sales are legal in the applicable jurisdiction. You must follow Platform age-verification and handoff rules.
          We may disable alcohol or restricted SKUs, reverse orders, or suspend the feature for compliance risk.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">15. Ratings &amp; Trust &amp; Safety reports</h2>
        <p className="text-sm mb-2">
          Crave&apos;n operates community rating and reporting across customers, merchants, and Feeders. You acknowledge
          and agree that:
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>
            Customers and Feeders may rate your business and submit Trust &amp; Safety reports (for example wrong or
            missing items, food safety, unsafe handoffs, or other issues).
          </li>
          <li>
            You may rate customers and Feeders after eligible orders. Ratings and reports must be honest, made in good
            faith, and based solely on the experience tied to that order. You must not retaliate or discriminate on
            any basis prohibited by law.
          </li>
          <li>
            Aggregated ratings, tags, and report outcomes may affect visibility, promotion eligibility, dispatch
            priority, and continued participation.
          </li>
          <li>
            Confirmed issues may result in warnings, throttling, item removal, suspension, marketplace removal,
            refunds, and chargebacks.
          </li>
          <li>
            Identities of individual raters or reporters are not shared with you. We may share aggregated or
            anonymized rating data and report categories for operational transparency.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-8 mb-2">16. Data, privacy, messaging, and customer insights</h2>
        <p className="text-sm mb-2">
          Customer, Feeder, and order data made available through the Merchant Services is provided to help you fulfill
          orders and operate your business. Our{' '}
          <a href="/legal/privacy" className="underline">
            Privacy Policy
          </a>{' '}
          describes how Crave&apos;n processes personal information. In addition:
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>
            You receive limited data necessary for fulfillment and operations. We may mask or limit customer personal
            information (for example showing first name and last initial, or city/state/ZIP instead of a full street
            address) except where more detail is needed for fulfillment.
          </li>
          <li>
            You may not use customer personal data for unsolicited marketing, resale, profiling outside permitted
            insights, or any purpose inconsistent with these Terms, the Privacy Policy, or law.
          </li>
          <li>
            In-app chat, support threads, and communications tools may only be used for legitimate order/support
            purposes. Abusive, harassing, or spam messaging is prohibited.
          </li>
          <li>
            Insights, reports, and customer metrics are provided as-is for operational use and may be estimated or
            aggregated.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-8 mb-2">17. Intellectual property</h2>
        <p className="text-sm mb-4">
          Crave&apos;n and its licensors own the Platform, apps, software, trademarks, and related IP. You retain
          ownership of your pre-existing marks and content, and grant Crave&apos;n a non-exclusive, worldwide, royalty-free
          license to host, display, distribute, and promote your store listing, catalog, and uploaded media in
          connection with operating and marketing the Platform. You must not reverse engineer or misuse the Merchant
          Services except as allowed by law.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">18. Liability; no merchant-of-record for your goods</h2>
        <p className="text-sm mb-4">
          You are solely responsible for the products and services you sell, including quality, allergens, packaging,
          labeling, inventory accuracy, food safety, and legal compliance. Except where a payment flow expressly names
          Crave&apos;n as merchant of record for processing purposes, Crave&apos;n is not the merchant of record for your
          goods. To the maximum extent permitted by law, Crave&apos;n’s liability under these Terms is limited as set
          forth in our general Terms of Service and applicable law, and we are not liable for lost profits, lost data,
          or indirect, incidental, special, consequential, or punitive damages. You agree to defend and indemnify
          Crave&apos;n and its affiliates against claims arising from your products, content, store operations,
          integrations, promotions, age-restricted sales, or breach of these Terms.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">19. Suspension, termination, and account deletion</h2>
        <p className="text-sm mb-4">
          We may suspend or terminate access immediately for risk to customers, Feeders, the Platform, or brand
          integrity; legal or compliance reasons; fraud; or material or repeated breach. You may stop using the Merchant
          Services and may request store or account deletion through available Settings tools, subject to winding down
          open orders, disputes, refunds, chargebacks, fees, and legal retention requirements. Deletion does not erase
          records we must keep for accounting, fraud prevention, dispute resolution, or law.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">20. Changes to these Terms</h2>
        <p className="text-sm mb-4">
          We may update these Terms from time to time. We will provide notice as required by law (including in-app
          notice). Continued use after the effective date of material changes may require renewed acceptance of the
          current terms version in the Merchant Portal. The version identifier at the top of this page is controlling
          for acceptance records.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2">21. Contact</h2>
        <p className="text-sm mb-8">
          Questions about these Terms: contact support through the Merchant Portal or at{' '}
          <a href="/support" className="underline">
            craven.com/support
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default MerchantTermsOfServicePage;
