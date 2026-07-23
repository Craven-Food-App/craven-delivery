import React from "react";

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Crave’n Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Last updated: July 22, 2026
        </p>

        <p className="text-sm mb-4">
          These Terms of Service (“Terms”) govern your use of Crave’n’s mobile applications, websites, and
          related services (the “Services”). By creating an account or using the Services, you agree to these
          Terms. If you do not agree, do not use the Services.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">1. Our Role</h2>
        <p className="text-sm mb-4">
          Crave’n operates a technology platform that connects customers with independent restaurants and
          merchants (“Restaurants”) and independent delivery providers (“Feeders”). Crave’n does not prepare
          food, control Restaurants, or employ Feeders. Restaurants are responsible for their food, menus,
          allergens, and compliance with applicable laws.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">2. Eligibility and Account</h2>
        <p className="text-sm mb-4">
          You must be at least 18 years old and able to form a binding contract to use the Services. You are
          responsible for your account, including maintaining accurate information, securing your credentials,
          and all activity under your account. We may suspend or terminate your account if we believe you have
          violated these Terms or created risk for others.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">3. Orders and Delivery</h2>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>
            When you place an order, you make an offer to purchase items from the selected Restaurant. Crave’n
            may accept or reject the order on behalf of the Restaurant.
          </li>
          <li>
            Restaurants are responsible for menu accuracy, allergens, and food safety. If you have dietary
            restrictions, review information carefully and contact the Restaurant as needed before ordering.
          </li>
          <li>
            Deliveries are fulfilled by independent Feeders. Delivery times shown in the app are estimates only
            and may vary due to restaurant prep time, traffic, weather, and driver availability.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">
          4. Cancellations, Refunds, and “Double Up” Orders
        </h2>
        <p className="text-sm mb-2">
          Once an order is placed and a Restaurant begins preparation or a Feeder is dispatched, options to
          change or cancel may be limited. Refunds, credits, or adjustments may be granted at our discretion,
          including for missing items, non‑delivery, or significant delays.
        </p>
        <p className="text-sm mb-4">
          “Double Up” orders combine items from two or more Restaurants into one delivery. Preparation times
          and packaging may vary between Restaurants. Not all Restaurants or locations support Double Up, and
          availability may change at any time.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">5. Fees, Payments, and CraveMore</h2>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>
            You agree to pay all prices and fees shown at checkout, including items, taxes, service fees, and
            delivery fees.
          </li>
          <li>
            Payments are processed by third‑party processors such as Stripe. By providing a payment method, you
            authorize us to charge for each order and applicable adjustments.
          </li>
          <li>
            CraveMore is an optional subscription with additional terms described in the CraveMore Subscription
            Terms, including free trials, monthly fees, and auto‑renewal.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">6. Promotions, Credits, and Referrals</h2>
        <p className="text-sm mb-4">
          Promotional codes, discounts, and credits are subject to additional terms, may expire, are
          non‑transferable, and have no cash value. We may change or revoke promotions and credits where
          permitted by law. Customer referral offers, including Refer & Earn credits and limited
          promotions such as the New Customer 365-Day CraveMore Free Delivery prize, are governed by the{" "}
          <a href="/legal/referral" className="text-orange-600 underline font-medium">
            Crave’n Referral Program Terms
          </a>
          , which are incorporated into these Terms by reference.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">7. Conduct and Safety</h2>
        <p className="text-sm mb-4">
          You agree not to misuse the Services, interfere with their operation, or harass Restaurants, Feeders,
          or Crave’n personnel. We may investigate and cooperate with law enforcement regarding any suspected
          illegal or abusive activity.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">7a. Ratings, Reviews, and Trust &amp; Safety Reports</h2>
        <p className="text-sm mb-2">
          After each delivery, customers, Restaurants, and Feeders may rate one another on a 1–5 star scale,
          add optional tags, and submit Trust &amp; Safety reports describing issues such as safety concerns,
          harassment, fraud, no‑shows, or damaged/wrong orders. By using the Services you agree that:
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>Your ratings and reports are submitted voluntarily and must be truthful and made in good faith.</li>
          <li>Ratings are anonymous to the rated party. We display averages, not the identity of any individual rater.</li>
          <li>
            Reports are reviewed by Crave’n Trust &amp; Safety. Reports do not automatically deduct stars, but
            confirmed reports — alone or in combination with other signals — may result in warnings, temporary
            suspension, deactivation, or permanent removal from the platform.
          </li>
          <li>
            We may withhold, weight, or remove ratings we believe to be retaliatory, automated, off‑topic, abusive,
            or in violation of these Terms.
          </li>
          <li>
            You waive any claim against Crave’n or other users arising from another user’s good‑faith rating or
            report, except as required by applicable law.
          </li>
          <li>
            Rating and report data may be used to compute eligibility for tiers, dispatch weight, payouts,
            promotions, and continued access to the Services.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">8. Disclaimers</h2>
        <p className="text-sm mb-4">
          The Services are provided “as is” and “as available,” without warranties of any kind. Crave’n does not
          guarantee uninterrupted or error‑free operation, the quality or safety of items provided by
          Restaurants, or exact delivery times.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">9. Limitation of Liability</h2>
        <p className="text-sm mb-4">
          To the fullest extent permitted by law, Crave’n and its affiliates are not liable for indirect,
          incidental, special, consequential, or punitive damages, or for any loss of profits or data. Our total
          liability for all claims related to the Services will not exceed the greater of (a) the amount you
          paid to Crave’n for the transaction(s) giving rise to the claim in the past three months, or (b)
          $100.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">10. Governing Law</h2>
        <p className="text-sm mb-4">
          These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law
          rules. You agree that any disputes will be brought exclusively in the state or federal courts located
          in Delaware.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">11. Changes to These Terms</h2>
        <p className="text-sm mb-4">
          We may update these Terms from time to time. If we make material changes, we will update the “Last
          updated” date and, where appropriate, notify you in the app or by email. Your continued use of the
          Services after changes become effective constitutes your acceptance of the revised Terms.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">12. Contact Us</h2>
        <p className="text-sm mb-1 font-medium">Crave’n Inc.</p>
        <p className="text-sm">Email: help@cravenusa.com</p>
        <p className="text-sm">Phone: 216-435-0821</p>
      </div>
    </div>
  );
};

export default TermsOfServicePage;


