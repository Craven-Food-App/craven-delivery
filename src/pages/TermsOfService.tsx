import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CraveMoreText } from "@/components/ui/cravemore-text";

const TermsOfService = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              CRAVE'N INC. Terms of Service
            </CardTitle>
            <div className="text-center space-y-1">
              <p className="text-muted-foreground">Effective: October 29, 2025</p>
              <p className="text-muted-foreground">Toledo, Ohio</p>
              <p className="text-muted-foreground font-semibold">Last Updated: March 2026</p>
            </div>
          </CardHeader>
          
          <CardContent className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground mb-4">
                By accessing or using Crave'n's food delivery platform, including the Crave'n App, Crave'n Feeder App, and Partner Portal (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
              </p>
              <p className="text-muted-foreground mb-4">
                These Terms form a binding agreement between you and Crave'n Inc., 1121 W Sylvania Ave., Toledo, OH 43612 ("Crave'n," "we," "us," or "our"). These Terms incorporate by reference our Privacy Policy and any other policies posted on the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Eligibility</h2>
              <p className="text-muted-foreground mb-4">
                You must be at least 18 years old to use the Service. By using the Service, you represent and warrant that you meet this age requirement and that any information you provide to Crave'n is true, accurate, and complete.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <p className="text-muted-foreground mb-4">To use certain features, you must create an account. By creating and maintaining an account, you agree:</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>To provide accurate and complete registration information and keep it updated.</li>
                <li>To maintain the confidentiality of your credentials.</li>
                <li>That you are responsible for all activities under your account.</li>
                <li>To notify us immediately of any unauthorized access or use.</li>
                <li>That we may suspend or terminate accounts that violate these Terms, applicable law, or pose a risk to users or platform integrity.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. <CraveMoreText /> Membership Program</h2>
              <p className="text-muted-foreground mb-4">
                <CraveMoreText /> is an optional premium membership with the terms below.
              </p>
              
              <h3 className="text-xl font-semibold mb-3">Membership Plans</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li><strong>Monthly:</strong> $8.99 per month, billed monthly (auto-renew).</li>
                <li><strong>Annual:</strong> $90.00 per year, billed annually (equivalent to $7.50/month) (auto-renew).</li>
                <li><strong>Lifetime:</strong> $249.00 one-time (limited to first 1,000 customers).</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Membership Benefits (examples)</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>$0 delivery fees on eligible orders.</li>
                <li>Exclusive member-only promotions and discounts.</li>
                <li>Priority customer support.</li>
                <li>Early access to new restaurant partners.</li>
                <li>Special rewards and loyalty benefits.</li>
              </ul>
              <p className="text-sm text-muted-foreground mb-4 italic">
                (Eligibility, participating locations, and exclusions may apply.)
              </p>

              <h3 className="text-xl font-semibold mb-3">Subscription Terms</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Monthly/Annual plans auto-renew unless canceled in Account Settings.</li>
                <li>Charges occur at the beginning of each billing cycle.</li>
                <li>We will provide 30 days' notice of price changes.</li>
                <li>You may cancel anytime; cancellations take effect at the end of the current billing period.</li>
                <li>No refunds for partial billing periods.</li>
                <li>Lifetime memberships are non-refundable after the 30-day satisfaction guarantee.</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Lifetime Membership Special Terms</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Limited to the first 1,000 customers.</li>
                <li>Benefits apply for the lifetime of your account, are non-transferable, and require account good standing and compliance with these Terms.</li>
                <li>30-day money-back guarantee from purchase date.</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Membership Eligibility</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Must be 18+ with a valid payment method.</li>
                <li>One membership per account.</li>
                <li>Benefits apply to orders placed within eligible service areas; some restaurant partners and order types may be excluded.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Orders and Payments</h2>
              
              <h3 className="text-xl font-semibold mb-3">Placing Orders</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>All orders are subject to restaurant acceptance and availability.</li>
                <li>Prices are set by restaurants and may vary by location or item.</li>
                <li>We may refuse or cancel orders for any reason.</li>
                <li>Order confirmation does not guarantee delivery time.</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Payment Terms</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Payment is due at the time of order.</li>
                <li>We accept major credit cards and other approved payment methods.</li>
                <li>You authorize Crave'n (and our payment vendors) to charge your payment method for all fees, including item cost, taxes, service fees, and delivery fees.</li>
                <li>Fees and taxes are displayed at checkout.</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Refunds and Cancellations</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Cancellation policies may vary by restaurant and order status.</li>
                <li>Refunds are issued at Crave'n's sole discretion.</li>
                <li>A cancellation fee may apply for late cancellations.</li>
                <li>Issues with food quality should be reported within 24 hours.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Delivery Services</h2>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Delivery times are estimates and are not guaranteed.</li>
                <li>Feeders (delivery couriers) are independent contractors, not employees or agents of Crave'n.</li>
                <li>You must provide accurate delivery information.</li>
                <li>Failed deliveries due to incorrect or incomplete information may be non-refundable.</li>
                <li>Tips are optional and go entirely to the Feeder.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Feeder (Driver) Terms</h2>
              <p className="text-muted-foreground mb-4">For users providing delivery services ("Feeders"):</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Feeders are independent contractors, not employees.</li>
                <li>Must maintain a valid driver's license, registration, and insurance as required by law.</li>
                <li>Must pass applicable background checks and any required screenings.</li>
                <li>Must comply with all traffic laws and safety regulations.</li>
                <li>Must provide professional, courteous service and maintain accurate location tracking while delivering.</li>
                <li>Earnings are calculated based on Crave'n's payout structure (e.g., base pay, tips, bonuses, incentives).</li>
                <li>Feeders are responsible for their own taxes and expenses.</li>
              </ul>
              <p className="text-sm text-muted-foreground mb-4 italic">
                (Additional Feeder terms are set out in the Crave'n Feeder Independent Contractor Agreement & Terms Addendum, which is incorporated by reference.)
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Restaurant Partner Terms</h2>
              <p className="text-muted-foreground mb-4">Restaurant partners agree to:</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Maintain accurate menus, pricing, availability, and business information.</li>
                <li>Fulfill orders promptly and professionally.</li>
                <li>Comply with all food safety and health regulations.</li>
                <li>Pay applicable commission or service fees to Crave'n.</li>
                <li>Ensure food quality, correct packaging, and compliance with delivery handoff requirements.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Prohibited Conduct</h2>
              <p className="text-muted-foreground mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Violate laws or third-party rights.</li>
                <li>Harass, abuse, or harm others.</li>
                <li>Submit false, misleading, or fraudulent information.</li>
                <li>Interfere with or disrupt the Service or its security features.</li>
                <li>Attempt to gain unauthorized access to accounts or systems.</li>
                <li>Use automated systems, bots, or scrapers to access the Service.</li>
                <li>Reverse engineer, decompile, or otherwise misuse the Service or its content.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Intellectual Property</h2>
              <p className="text-muted-foreground mb-4">
                All content on the Service—including text, graphics, logos, icons, images, software, and other materials—is the property of Crave'n Inc. or its licensors and is protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without prior written authorization.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Disclaimers</h2>
              <p className="text-muted-foreground mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE."
                WE DO NOT GUARANTEE:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Uninterrupted, timely, or error-free service.</li>
                <li>Specific delivery times.</li>
                <li>Food quality or safety (the responsibility of restaurants).</li>
                <li>Accuracy, completeness, or reliability of restaurant information or third-party content.</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, CRAVE'N SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO YOUR USE OF (OR INABILITY TO USE) THE SERVICE.
              </p>
              <p className="text-muted-foreground mb-4">
                OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO CRAVE'N IN THE 12 MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">13. Indemnification</h2>
              <p className="text-muted-foreground mb-4">
                You agree to indemnify, defend, and hold harmless Crave'n Inc., its affiliates, officers, directors, employees, agents, and contractors from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising from or related to:
              </p>
              <ul className="list-none pl-6 mb-4 text-muted-foreground">
                <li>(a) your use of the Service;</li>
                <li>(b) your violation of these Terms; or</li>
                <li>(c) your violation of any rights of another party.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">14. Dispute Resolution (Arbitration) & Governing Law</h2>
              
              <p className="text-muted-foreground mb-4">
                <strong>Arbitration Agreement (AAA).</strong> Except for matters that may be brought in small claims court, any dispute, claim, or controversy arising out of or relating to these Terms or the Service will be resolved by final and binding arbitration administered by the American Arbitration Association (AAA) under its applicable Consumer Arbitration Rules (for consumers) or Commercial Arbitration Rules (for business users), as appropriate.
              </p>

              <p className="text-muted-foreground mb-4">
                <strong>Venue:</strong> Arbitration shall take place in Lucas County, Ohio (Toledo), unless the parties mutually agree otherwise or AAA rules permit remote proceedings.
              </p>

              <p className="text-muted-foreground mb-4">
                <strong>Governing Law:</strong> These Terms and any dispute hereunder are governed by the laws of the State of Ohio, without regard to conflict of law principles.
              </p>

              <p className="text-muted-foreground mb-4">
                <strong>Class Action Waiver:</strong> You and Crave'n agree that each may bring claims only in an individual capacity, and not as a plaintiff or class member in any purported class, collective, consolidated, or representative action.
              </p>

              <p className="text-muted-foreground mb-4">
                <strong>Jury Trial Waiver:</strong> To the extent any matter proceeds in court rather than arbitration, the parties waive the right to a jury trial.
              </p>

              <p className="text-muted-foreground mb-4">
                <strong>Injunctive Relief:</strong> Either party may seek temporary or preliminary injunctive relief in a court of competent jurisdiction to prevent irreparable harm, consistent with these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">15. Modifications to Terms</h2>
              <p className="text-muted-foreground mb-4">
                We may update or modify these Terms at any time. Material changes will be communicated via app notice, email, or website posting. Your continued use of the Service after notice of changes constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">16. Termination</h2>
              <p className="text-muted-foreground mb-4">
                We may suspend or terminate your access to the Service at any time, with or without notice, including for violations of these Terms or to protect platform integrity or user safety. Upon termination, your right to use the Service ceases immediately. Sections that by their nature should survive termination (e.g., intellectual property, disclaimers, limitation of liability, indemnification, arbitration) will survive.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">17. Contact Information</h2>
              <div className="text-muted-foreground mb-4">
                <p className="mb-2"><strong>Crave'n Inc.</strong></p>
                <p className="mb-2">1121 W Sylvania Ave.</p>
                <p className="mb-4">Toledo, OH 43612</p>
                <p className="mb-2"><strong>Support & Privacy requests:</strong> help@cravenusa.com</p>
                <p><strong>Phone:</strong> 216-435-0821</p>
              </div>
            </section>

            <section className="mb-8 p-6 bg-muted rounded-lg border-2 border-primary">
              <h3 className="text-xl font-semibold mb-3">Acknowledgment</h3>
              <p className="text-sm text-muted-foreground">
                By selecting "I Agree" or by continuing to use the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms, including the AAA Arbitration Agreement and Class Action Waiver.
              </p>
            </section>

            <section className="mb-8 p-6 bg-muted rounded-lg border-2 border-primary">
              <p className="text-sm text-muted-foreground text-center font-semibold">
                © 2026 Crave'n Inc. All Rights Reserved.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
