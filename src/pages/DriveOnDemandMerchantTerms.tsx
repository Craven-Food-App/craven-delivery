import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DriveOnDemandMerchantTerms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold mb-2">Drive On-Demand Merchant Terms and Conditions</h1>
          <p className="text-muted-foreground">
            Last Updated: December 30, 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By registering as a merchant on the Drive On-Demand platform (the "Platform"), you agree to be bound by these Merchant Terms and Conditions (the "Agreement"). If you do not agree to these terms, you may not use the Platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>"Merchant"</strong> refers to any business or individual offering products or services through the Platform</li>
              <li><strong>"Customer"</strong> refers to end users who place orders through the Platform</li>
              <li><strong>"Delivery Partner"</strong> refers to independent contractors who fulfill delivery orders</li>
              <li><strong>"Platform"</strong> refers to the Drive On-Demand application, website, and related services</li>
              <li><strong>"Order"</strong> refers to any purchase request placed by a Customer through the Platform</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">3. Merchant Obligations</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">3.1 Registration and Account</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You must provide accurate, current, and complete information during registration</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>You must be legally authorized to conduct business in your jurisdiction</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Product and Service Standards</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>All products and services must comply with applicable laws and regulations</li>
              <li>Product descriptions, images, and pricing must be accurate and current</li>
              <li>You must honor all prices displayed on the Platform at the time of order</li>
              <li>You are responsible for maintaining adequate inventory levels</li>
              <li>You must maintain appropriate food safety certifications (if applicable)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.3 Order Fulfillment</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You must acknowledge orders within the timeframe specified by the Platform</li>
              <li>Orders must be prepared with reasonable care and timeliness</li>
              <li>You must package items appropriately for delivery</li>
              <li>You must notify Customers promptly of any out-of-stock items or delays</li>
              <li>You have the right to refuse orders that appear fraudulent or violate these terms</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">4. Fees and Payment</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">4.1 Commission Structure</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Commission fees are as displayed in your merchant dashboard</li>
              <li>Commission rates may vary based on your agreement tier and volume</li>
              <li>The Platform reserves the right to modify commission rates with 30 days' notice</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Delivery Fees</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Delivery fees are charged per order as specified in your account settings</li>
              <li>Current standard delivery fee: $7.99 per order</li>
              <li>Delivery fees are collected from Customers and remitted to Delivery Partners</li>
              <li>You may choose to subsidize or cover delivery fees as promotional offers</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Payment Processing</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Payments are processed through the Platform's secure payment system</li>
              <li>Settlement occurs on a [weekly/bi-weekly] basis via [ACH/direct deposit]</li>
              <li>The Platform deducts applicable commissions and fees before settlement</li>
              <li>You are responsible for all taxes related to your sales</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.4 Refunds and Chargebacks</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You are responsible for refunds resulting from product quality issues or errors</li>
              <li>The Platform may process refunds on your behalf and deduct from future settlements</li>
              <li>Excessive refund rates may result in account suspension or termination</li>
              <li>You will be notified of chargebacks and may contest them through our dispute process</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">5. Delivery Radius and Coverage</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You may set a delivery radius up to the maximum allowed by your subscription tier</li>
              <li>Current standard delivery radius: 5 miles</li>
              <li>Orders outside your delivery radius will not be displayed to Customers</li>
              <li>You may adjust your delivery radius at any time through your merchant dashboard</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">6. Intellectual Property</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">6.1 Your Content</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You retain ownership of all product images, descriptions, and branding you provide</li>
              <li>You grant the Platform a non-exclusive license to display and promote your content</li>
              <li>You represent that you have all necessary rights to the content you provide</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.2 Platform Property</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>The Platform and its technology remain the exclusive property of Drive On-Demand</li>
              <li>You may not copy, modify, or reverse engineer any aspect of the Platform</li>
              <li>The Drive On-Demand name, logo, and trademarks may not be used without permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">7. Data and Privacy</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>We collect and process data in accordance with our Privacy Policy</li>
              <li>You are responsible for complying with applicable data protection laws</li>
              <li>Customer data may only be used for order fulfillment purposes</li>
              <li>You may not contact Customers outside the Platform without their explicit consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">8. Quality Standards and Reviews</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Customers may rate and review their experience with your business</li>
              <li>Reviews are Customer opinions and do not necessarily reflect the Platform's views</li>
              <li>You may respond to reviews but may not offer compensation for positive reviews</li>
              <li>We may remove reviews that violate our content policies</li>
              <li>Consistent poor ratings may result in reduced visibility or account suspension</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">9. Insurance and Liability</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">9.1 Merchant Liability</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You are responsible for the quality and safety of products you provide</li>
              <li>You maintain adequate business insurance as required by law</li>
              <li>You indemnify the Platform against claims arising from your products or services</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.2 Platform Liability</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>The Platform is not liable for Delivery Partner actions during fulfillment</li>
              <li>The Platform's liability is limited to the fees paid during the preceding 12 months</li>
              <li>The Platform is provided "as is" without warranties of any kind</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">10. Term and Termination</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">10.1 Term</h3>
            <p className="text-muted-foreground">This Agreement begins upon registration and continues until terminated.</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">10.2 Termination by You</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You may terminate this Agreement at any time with 14 days' written notice</li>
              <li>You remain responsible for fulfilling all pending orders</li>
              <li>Outstanding fees will be settled upon termination</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">10.3 Termination by Platform</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>We may suspend or terminate your account for violation of these terms</li>
              <li>We may terminate this Agreement with 30 days' notice for any reason</li>
              <li>Immediate termination may occur for fraud, illegal activity, or material breach</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">10.4 Effect of Termination</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Upon termination, your access to the Platform will cease</li>
              <li>Provisions regarding payment, liability, and confidentiality survive termination</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">11. Compliance and Conduct</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">11.1 Legal Compliance</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You must comply with all applicable laws, including food safety, labor, and tax laws</li>
              <li>You must maintain all required licenses and permits</li>
              <li>You must not engage in discriminatory practices</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">11.2 Prohibited Activities</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You may not manipulate ratings or reviews</li>
              <li>You may not use the Platform for illegal purposes</li>
              <li>You may not interfere with Platform operations or security</li>
              <li>You may not attempt to divert Customers away from the Platform</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">12. Modifications to Terms</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>We may modify these terms at any time with notice via email or Platform notification</li>
              <li>Continued use of the Platform after changes constitutes acceptance</li>
              <li>Material changes will be effective 30 days after notice</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">13. Dispute Resolution</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">13.1 Informal Resolution</h3>
            <p className="text-muted-foreground">You agree to contact us first to attempt informal resolution of disputes.</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">13.2 Arbitration</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Disputes will be resolved through binding arbitration under [Arbitration Association] rules</li>
              <li>Arbitration will be conducted in [Location]</li>
              <li>You waive the right to participate in class actions</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">13.3 Exceptions</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Either party may seek injunctive relief in court</li>
              <li>Small claims court matters are excluded from arbitration</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">14. General Provisions</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">14.1 Independent Contractor</h3>
            <p className="text-muted-foreground">You are an independent contractor, not an employee or agent of the Platform. This Agreement does not create a partnership or joint venture.</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">14.2 Entire Agreement</h3>
            <p className="text-muted-foreground">This Agreement constitutes the entire agreement between parties. Any conflicting terms in other documents are superseded.</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">14.3 Severability</h3>
            <p className="text-muted-foreground">If any provision is found unenforceable, the remainder continues in effect.</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">14.4 Governing Law</h3>
            <p className="text-muted-foreground">This Agreement is governed by the laws of [State/Country]. Exclusive jurisdiction lies with courts in [Location].</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">14.5 Assignment</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You may not assign this Agreement without our written consent</li>
              <li>We may assign this Agreement to any successor or affiliate</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">14.6 Notices</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Notices must be sent to the email address associated with your account</li>
              <li>We may provide notice through the Platform or via email</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">15. Contact Information</h2>
            <p className="text-muted-foreground mb-4">For questions about these terms, contact us at:</p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold mb-2">Drive On-Demand Support</p>
              <p className="text-muted-foreground">Email: support@driveondemand.com</p>
              <p className="text-muted-foreground">Phone: 567.249.9744</p>
              <p className="text-muted-foreground">Address: 1207 Delaware Ave., #3424, Wilmington, DE. 19806</p>
            </div>
          </section>

          <div className="mt-12 p-6 bg-muted rounded-lg border-2 border-primary/20">
            <p className="font-semibold text-center">
              By clicking "I understand and agree" and requesting your first delivery, you acknowledge that you have read, understood, and agree to be bound by these Merchant Terms and Conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveOnDemandMerchantTerms;














