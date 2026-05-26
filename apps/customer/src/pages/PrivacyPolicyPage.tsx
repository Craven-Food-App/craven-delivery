import React from "react";

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Crave’n Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Last updated: March 2026
        </p>

        <p className="mb-4 text-sm">
          This Privacy Policy explains how Crave’n Inc. (“Crave’n”, “we”, “us”, or “our”) collects, uses,
          and protects information about you when you use our mobile applications, websites, and related
          services (collectively, the “Services”). By creating an account or using the Services, you agree
          to this Privacy Policy.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">1. Information We Collect</h2>
        <p className="text-sm mb-2">We collect the following categories of information:</p>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>Account and contact information (name, email, mobile phone number).</li>
          <li>Delivery and order information (addresses, order history, promotions, credits).</li>
          <li>Precise location data when you enable location services.</li>
          <li>Device and usage information (device type, IP address, app activity).</li>
          <li>Demand or partnership request information (e.g., when you request a business: order frequency, referral intent, optional message).</li>
          <li>Error and usage data sent to our monitoring providers (e.g., crash reporting) to improve app reliability.</li>
          <li>
            Limited payment information via our payment processors (e.g., Stripe). We do not store full
            card numbers on our servers.
          </li>
          <li>Support communications, feedback, and chat messages.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">2. How We Use Your Information</h2>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>To provide and improve the Services, including order processing and delivery.</li>
          <li>To manage payments, subscriptions (including CraveMore), and promotional credits.</li>
          <li>To send order updates, account alerts, and customer support communications.</li>
          <li>To maintain safety, security, and legal compliance.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">3. How We Share Your Information</h2>
        <p className="text-sm mb-2">
          We share information only as needed to operate the Services and as permitted by law, including:
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>With Restaurants to prepare and fulfill your orders.</li>
          <li>With Feeders (independent delivery providers) to complete deliveries.</li>
          <li>
            With service providers such as Supabase, Stripe, notification providers, and error/performance
            monitoring providers that process data on our behalf.
          </li>
          <li>In connection with business transfers, where permitted.</li>
          <li>
            To comply with legal obligations, enforce our Terms of Service, and protect rights, property,
            and safety.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">4. Data Retention</h2>
        <p className="text-sm mb-4">
          We retain your information while your account is active and as needed to provide the Services,
          comply with legal obligations, resolve disputes, and enforce our agreements. Certain transaction
          records may be retained for accounting and regulatory purposes even after account closure.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">5. Your Choices and Rights</h2>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>Update account details, addresses, and payment methods in the app.</li>
          <li>Control location and notification permissions in your device settings.</li>
          <li>Opt out of marketing communications while still receiving essential order updates.</li>
          <li>
            Request access, correction, or deletion of your data, subject to applicable law, by emailing{" "}
            <span className="font-medium">help@cravenusa.com</span>.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">6. Security</h2>
        <p className="text-sm mb-4">
          We use reasonable technical and organizational measures to protect your information, including
          access controls and database‑level security policies. No system is completely secure, but we work
          to protect against unauthorized access, loss, misuse, or alteration.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">7. Children’s Privacy</h2>
        <p className="text-sm mb-4">
          The Services are not intended for children under 13, and we do not knowingly collect personal
          information from children under 13.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">7a. California Residents</h2>
        <p className="text-sm mb-4">
          California residents may have additional rights (e.g., access, deletion, opt-out of sale of personal information). To exercise these rights, contact help@cravenusa.com.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">8. International Use</h2>
        <p className="text-sm mb-4">
          The Services are currently intended for use in the United States. If you access the Services from
          other jurisdictions, you are responsible for complying with local laws.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">9. Changes to This Policy</h2>
        <p className="text-sm mb-4">
          We may update this Privacy Policy from time to time. If we make material changes, we will update
          the “Last updated” date and, where appropriate, notify you in the app or by email.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">10. Contact Us</h2>
        <p className="text-sm mb-1 font-medium">Crave’n Inc.</p>
        <p className="text-sm">Privacy & data requests: help@cravenusa.com</p>
        <p className="text-sm">Phone: 216-435-0821</p>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;


