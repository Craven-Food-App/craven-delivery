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
            <p className="text-center text-muted-foreground">Last Updated: March 2026</p>
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
                <li>The Crave'n Partner Portal for restaurants and merchants.</li>
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
