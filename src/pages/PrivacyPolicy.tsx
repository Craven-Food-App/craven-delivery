import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CraveMoreText } from "@/components/ui/cravemore-text";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Crave'n Inc. Privacy Policy
              <div className="text-lg font-normal mt-2">(Master Version – U.S. & International)</div>
              <div className="text-base font-normal mt-1">(for Customers, Feeders, and Restaurant Partners)</div>
            </CardTitle>
            <p className="text-center text-muted-foreground">Last Updated: May 2026</p>
          </CardHeader>
          
          <CardContent className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground mb-4">
                Welcome to Crave'n Inc. ("Crave'n," "we," "our," or "us").
                We are committed to protecting your personal information and respecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use any Crave'n service, including:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>The Crave'n App and website for customers;</li>
                <li>The Crave'n Feeder App for delivery drivers ("Feeders"); and</li>
                <li>The Crave'n Partner Portal for restaurants and merchants; and</li>
                <li>The Crave'n Merchant, Admin, Corporate, and Orders Tablet Apps used at partner locations and internal operations.</li>
              </ul>
              <p className="text-muted-foreground">
                This Policy applies to all Crave'n users across the United States and, where applicable, internationally through Crave'n Europe Ltd.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
              <p className="text-muted-foreground mb-4">
                We collect several categories of information to operate our delivery platform efficiently and legally.
              </p>
              
              <h3 className="text-xl font-semibold mb-3">a. Personal Information</h3>
              <p className="text-muted-foreground mb-4">
                Depending on your relationship with Crave'n, we may collect:
              </p>
              
              <p className="font-semibold text-muted-foreground mb-2">Customers:</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Name, email address, phone number, and delivery addresses</li>
                <li>Order history, payment method (processed securely through third-party processors)</li>
                <li>Device identifiers, location data, and preferences</li>
                <li>Demand or partnership request data (e.g., when you request a business: order frequency, referral intent, optional message and contact details) used for merchant outreach and reporting</li>
              </ul>
              
              <p className="font-semibold text-muted-foreground mb-2">Feeders (Drivers):</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Full name, contact information, driver's license and vehicle details</li>
                <li>Background check results and identity verification documents</li>
                <li>Real-time location data (active deliveries only)</li>
                <li>Banking information (encrypted for ACH payouts)</li>
                <li>Earnings and payout history for tax reporting</li>
                <li>Tax forms (W-9, SSN/EIN) required by IRS for payments exceeding $600/year</li>
                <li>Preferred payment method (e.g., bank transfer, Cash App)</li>
              </ul>

              <p className="font-semibold text-muted-foreground mb-2">Restaurant Partners:</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Business name, address, and contact details</li>
                <li>Menu items, pricing, and order history</li>
                <li>Banking information for ACH deposits via Stripe Connect</li>
                <li>Tax identification number (EIN) and ownership verification documents</li>
                <li>Sales and payout transaction history</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">b. Automatically Collected Information</h3>
              <p className="text-muted-foreground mb-4">
                When you interact with the Crave'n Platform Services, we may collect:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Device information (browser type, operating system)</li>
                <li>IP address, geolocation, and session data</li>
                <li>Cookies, SDKs, and analytics tools (e.g., Google Analytics)</li>
                <li>Usage data (page views, click activity, frequency, time on app)</li>
                <li>Delivery metrics for Feeders (accepted/canceled orders, mileage, delivery time)</li>
                <li>Error and performance monitoring data (e.g., crash reports, session replay with text and media masked) and related identifiers; when you are logged in, we may associate your account identifier with such data. This data is sent to our service providers (e.g., Sentry) to improve reliability and fix issues.</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">c. Information from Third Parties</h3>
              <p className="text-muted-foreground mb-4">We may also receive information from:</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Background check vendors (e.g., criminal, driving, or identity records)</li>
                <li>Payment processors and financial institutions (e.g., Stripe, Cash App)</li>
                <li>Merchant partners and customers (ratings, feedback)</li>
                <li>Fraud-prevention and analytics partners</li>
                <li>Government or law enforcement agencies (as legally required)</li>
                <li>Publicly available data sources</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">
                We collect and process your information for the following lawful purposes:
              </p>
              
              <h3 className="text-xl font-semibold mb-3">a. Platform Operations</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Process and fulfill customer orders</li>
                <li>Facilitate communication among customers, Feeders, and restaurants</li>
                <li>Calculate and distribute earnings for Feeders and payments for partners</li>
                <li>Manage <CraveMoreText /> memberships, benefits, and billing</li>
                <li>Deliver in-app notifications, order updates, and support messages</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">b. Payment and Financial Compliance</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Process ACH bank transfers through Stripe Connect</li>
                <li>Verify account ownership to prevent fraud</li>
                <li>Comply with IRS 1099 reporting, KYC/AML regulations, and PCI-DSS standards</li>
                <li>Generate invoices, receipts, and tax documentation for contractors and partners</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">c. Security and Fraud Prevention</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Verify identity and prevent unauthorized access</li>
                <li>Detect suspicious activity (e.g., duplicate accounts, payment anomalies)</li>
                <li>Protect financial and personal data through encryption and monitoring</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">d. Service Improvement and Analytics</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Analyze platform usage, delivery performance, and user experience</li>
                <li>Develop new features, optimize logistics, and personalize content</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">e. Marketing and Communication</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Send promotional materials, referral offers, or <CraveMoreText /> updates (with your consent)</li>
                <li>Manage subscriptions and opt-outs</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">f. Legal Compliance</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Respond to subpoenas, regulatory requests, or applicable legal obligations</li>
                <li>Maintain records for tax, audit, and compliance purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-muted-foreground mb-4">
                Crave'n does not sell your Personal Information. We share it only as needed to operate legally and effectively:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li><strong>Restaurants:</strong> Order details, delivery status, and customer names/addresses</li>
                <li><strong>Feeders:</strong> Pickup and delivery instructions</li>
                <li><strong>Payment Processors:</strong> Stripe, Cash App, and regulated ACH banking partners</li>
                <li><strong>Tax Authorities:</strong> IRS or other government entities for compliance</li>
                <li><strong>Vendors and Service Providers:</strong> Hosting, analytics, marketing, security, support, and error/performance monitoring (e.g., Sentry)</li>
                <li><strong>Law Enforcement:</strong> When required by law or to protect safety and rights</li>
                <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or restructuring</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
              <p className="text-muted-foreground mb-4">
                We apply industry-standard safeguards to protect your information:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li><strong>Encryption:</strong> TLS/SSL in transit and AES-256 at rest</li>
                <li><strong>PCI-DSS Compliance:</strong> For all payment handling through certified processors</li>
                <li><strong>Tokenization:</strong> Bank account data is never stored in plain text</li>
                <li><strong>Two-Factor Authentication:</strong> For sensitive account actions</li>
                <li><strong>Security Audits:</strong> Regular penetration tests and SOC 2 alignment</li>
                <li><strong>Bank-Level Protection:</strong> All ACH transfers occur through regulated institutions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Your Privacy Rights</h2>
              <p className="text-muted-foreground mb-4">
                Depending on your location, you may have the right to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li><strong>Access</strong> your data</li>
                <li><strong>Correct</strong> inaccurate or incomplete data</li>
                <li><strong>Delete</strong> your personal information</li>
                <li><strong>Restrict or Opt-Out</strong> of certain processing</li>
                <li><strong>Portability:</strong> Request an export of your data</li>
              </ul>
              <p className="text-muted-foreground mb-4">To exercise these rights:</p>
              <ul className="list-none mb-4 text-muted-foreground">
                <li>Contact <strong>help@cravenusa.com</strong> (privacy and data requests)</li>
                <li>Or call <strong>216-435-0821</strong> (general account help)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking Technologies</h2>
              <p className="text-muted-foreground mb-4">
                Crave'n uses cookies, pixels, and SDKs to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Keep you signed in securely</li>
                <li>Personalize your experience</li>
                <li>Analyze app and web usage</li>
                <li>Display relevant offers or promotions</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                You can adjust cookie preferences in your browser or mobile settings.
                Visit <a href="https://allaboutcookies.org" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://allaboutcookies.org</a> for more details.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
              <p className="text-muted-foreground mb-4">
                The Services are not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us at help@cravenusa.com so we can delete it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Biometric and Identity Verification</h2>
              <p className="text-muted-foreground mb-4">
                Feeders may be asked to provide a live photo or ID scan for fraud prevention and identity confirmation.
                Biometric data (e.g., facial geometry) is securely processed and deleted after three (3) years of inactivity or once verification needs are met.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9a. Clean Pay Transparency &amp; Earnings Records (Feeders)</h2>
              <p className="text-muted-foreground mb-4">
                To support our Clean Pay commitment, the Feeder App records and displays an itemized breakdown
                for every delivery, including Base Pay, Delivery Fee Share, Customer Tip, Promo and Peak Bonuses,
                Mileage Pay (paid at the prevailing IRS standard mileage rate during Live Driver Testing and where
                applicable), Gas Money bucket accruals, and Adjustments. These records are stored against your
                Feeder account so you can review them in real time and in the Order History (organized by Year,
                Month, and Week) for tax preparation, dispute resolution, and personal recordkeeping.
              </p>
              <p className="text-muted-foreground">
                Earnings, payout, and tier-performance data (rolling 60-day metrics used to compute Feeder tiers
                and dispatch weights) are processed to operate the platform, calculate payouts via Stripe Connect,
                and meet IRS 1099 reporting obligations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9b. Delivery Photo Proof &amp; Order Media</h2>
              <p className="text-muted-foreground mb-4">
                Feeders are prompted, through an on-screen guide, to capture a clear photo of the package at the
                drop-off location as proof of delivery. Customers may also be asked to upload photos in support
                tickets (e.g., missing or incorrect items). These photos, along with associated metadata
                (timestamp, approximate GPS coordinates, order ID), are stored to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Confirm completion of delivery and resolve disputes between customers, Feeders, and merchants;</li>
                <li>Detect fraud and policy violations;</li>
                <li>Train and evaluate Feeders during Live Driver Testing.</li>
              </ul>
              <p className="text-muted-foreground">
                Photos are retained for the period required to resolve potential disputes and meet tax/audit
                obligations, and are accessible only to authorized Crave'n personnel, the involved customer/merchant,
                and, where required, law enforcement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9c. Location, Background Location &amp; Push Notifications</h2>
              <p className="text-muted-foreground mb-4">
                The Crave'n Customer App uses your location to find nearby restaurants, calculate delivery
                eligibility (including our 25-mile geofence and national-chain bypass rules), and provide accurate
                ETAs. The Feeder App uses foreground and, where permitted, background location services to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Show your live position on the dispatch map and to customers/merchants for the active delivery only;</li>
                <li>Compute mileage for Mileage Pay and Gas Money;</li>
                <li>Detect unsafe speeds and trigger safety prompts;</li>
                <li>Determine on-shift availability (online/offline status).</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                Background location is only collected while you are actively on shift in the Feeder App and stops
                when you go offline or close the app. You may revoke location permissions at any time in your
                device settings; doing so may limit your ability to receive deliveries.
              </p>
              <p className="text-muted-foreground">
                We use Firebase Cloud Messaging (FCM) and Apple Push Notification service (APNs) to deliver order,
                dispatch, internal communications (C Comms), and safety notifications. You can manage notification
                preferences in your device settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9d. Tablet Apps (Merchant, Admin, Corporate, Orders)</h2>
              <p className="text-muted-foreground mb-4">
                Crave'n provides dedicated tablet applications used at merchant locations and within Crave'n
                operations. These apps process information needed to receive and prepare orders, manage menus,
                run shift and time-clock activity, view dispatch status, and (for corporate/admin devices) access
                internal dashboards and Internal Communications (C Comms). Time-clock entries that remain open for
                more than 24 hours are automatically closed by a system safeguard.
              </p>
              <p className="text-muted-foreground">
                Access to tablet apps is controlled by role-based permissions, executive-officer permissions
                (where applicable), and, for sensitive actions, a per-user PIN (executives use the last four
                hexadecimal characters of their account UUID).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9e. Payments, Payouts &amp; Sensitive Financial Data</h2>
              <p className="text-muted-foreground mb-4">
                Customer payments are processed by Stripe. Feeder and Restaurant Partner payouts are processed via
                Stripe Connect. We do not store full card numbers or full bank account numbers in plain text on our
                servers.
              </p>
              <p className="text-muted-foreground">
                For executive onboarding and finance workflows that require full Social Security Numbers or full
                bank account numbers, those values are encrypted using PGP symmetric encryption; only the last
                four digits are stored in plain text for display. Invoice documents uploaded for AP/AR may be
                analyzed by our AI invoice scanning workflow (powered by Lovable AI Gateway with Google Gemini)
                solely to extract structured fields (vendor, amount, line items) for accounting purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9f. Internal Communications (C Comms)</h2>
              <p className="text-muted-foreground">
                Crave'n personnel and authorized partners may use the C Comms internal messaging system. Messages,
                attachments, and read receipts are stored in private storage with row-level security so that only
                participants in a thread can access its contents. Audio notification chimes and badge counts are
                generated locally on your device.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9g. Governance, Equity &amp; Executive Records</h2>
              <p className="text-muted-foreground">
                For users in officer, board, or executive roles, we process appointment records, signed governance
                documents (board resolutions, bylaws, equity grants under the 70M-share plan and 14.7M option
                pool), cap-table entries, and e-signatures. Cap-table visibility is restricted: only the CEO and
                CFO can view the full cap table; other executives can view only their own equity row.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
              <p className="text-muted-foreground mb-4">
                Your information may be transferred to or processed in the United States or other jurisdictions where Crave'n or its affiliates operate.
                For future operations in the U.K. and E.U., Crave'n Europe Ltd. will ensure compliance with local privacy laws, including GDPR-equivalent protections.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Disclosures for California Residents (CCPA/CPRA)</h2>
              <p className="text-muted-foreground mb-4">California residents have the right to:</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Request access, correction, or deletion of Personal Information</li>
                <li>Opt out of "selling" or "sharing" of Personal Information</li>
                <li>Request details on categories of data collected and shared</li>
                <li>Designate an authorized agent to exercise rights on their behalf</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                Submit requests via <strong>help@cravenusa.com</strong> with verification information.
                Crave'n will not discriminate against users who exercise these rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Data Retention</h2>
              <p className="text-muted-foreground mb-4">
                We retain information only as long as necessary for:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Fulfilling orders and processing payments</li>
                <li>Meeting tax and financial reporting obligations</li>
                <li>Resolving disputes or enforcing agreements</li>
                <li>Complying with applicable laws and security standards</li>
              </ul>
              <p className="text-muted-foreground">
                Retention periods vary by data type and legal requirement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">13. Changes to this Privacy Policy</h2>
              <p className="text-muted-foreground mb-4">
                We may update this Policy periodically to reflect changes in law or operations.
                The "Last Updated" date indicates the latest revision.
                We will notify you via app notification or email for material updates.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
              <div className="text-muted-foreground mb-4">
                <p className="mb-2"><strong>Crave'n Inc.</strong></p>
                <p className="mb-2">1121 W Sylvania Ave.</p>
                <p className="mb-4">Toledo, Ohio 43612</p>
                <p className="mb-2"><strong>Privacy & Data Requests:</strong> help@cravenusa.com</p>
                <p><strong>Phone:</strong> 216-435-0821</p>
              </div>
            </section>

            <section className="mb-8 p-6 bg-muted rounded-lg border-2 border-primary">
              <h3 className="text-xl font-semibold mb-3">Acknowledgment and Agreement</h3>
              <p className="text-sm text-muted-foreground">
                ☑️ I acknowledge that I have read and understand the Crave'n Inc. Privacy Policy and consent to the collection, use, and disclosure of my information as described.
                I understand that Crave'n may update this Policy periodically and that the latest version will always be accessible in the Crave'n App, Feeder App, and Partner Portal.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
