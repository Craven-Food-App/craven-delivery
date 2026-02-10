import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Cookie Policy</CardTitle>
            <p className="text-center text-muted-foreground">Last Updated: January 2025</p>
          </CardHeader>
          
          <CardContent className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies?</h2>
              <p className="text-muted-foreground mb-4">
                Cookies are small text files that are placed on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Types of Cookies We Use</h2>
              
              <h3 className="text-xl font-semibold mb-3">Essential Cookies</h3>
              <p className="text-muted-foreground mb-4">
                These cookies are necessary for the website to function and cannot be disabled. They enable core functionality such as:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>User authentication and account access</li>
                <li>Security features and fraud prevention</li>
                <li>Shopping cart functionality</li>
                <li>Session management</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Performance Cookies</h3>
              <p className="text-muted-foreground mb-4">
                These cookies help us understand how visitors interact with our website by collecting anonymous information:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Pages visited and time spent on each page</li>
                <li>Error messages encountered</li>
                <li>Website performance metrics</li>
                <li>User navigation patterns</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Functional Cookies</h3>
              <p className="text-muted-foreground mb-4">
                These cookies enable enhanced functionality and personalization:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Remembering your preferences (language, region)</li>
                <li>Saved delivery addresses</li>
                <li>Recent searches and favorites</li>
                <li>Display settings (dark mode, font size)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Targeting/Advertising Cookies</h3>
              <p className="text-muted-foreground mb-4">
                These cookies track your browsing activity to show you relevant ads:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Personalized recommendations</li>
                <li>Retargeting campaigns</li>
                <li>Social media integration</li>
                <li>Marketing effectiveness measurement</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Specific Cookies We Use</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse mb-4">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Cookie Name</th>
                      <th className="text-left p-3 font-semibold">Type</th>
                      <th className="text-left p-3 font-semibold">Purpose</th>
                      <th className="text-left p-3 font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="p-3">auth-token</td>
                      <td className="p-3">Essential</td>
                      <td className="p-3">User authentication</td>
                      <td className="p-3">Session</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">cart-id</td>
                      <td className="p-3">Essential</td>
                      <td className="p-3">Shopping cart</td>
                      <td className="p-3">7 days</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">_ga</td>
                      <td className="p-3">Analytics</td>
                      <td className="p-3">Google Analytics</td>
                      <td className="p-3">2 years</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">preferences</td>
                      <td className="p-3">Functional</td>
                      <td className="p-3">User preferences</td>
                      <td className="p-3">1 year</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">location</td>
                      <td className="p-3">Functional</td>
                      <td className="p-3">Delivery location</td>
                      <td className="p-3">30 days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Third-Party Cookies</h2>
              <p className="text-muted-foreground mb-4">
                We work with third-party services that may also set cookies on your device:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li><strong>Google Analytics:</strong> Website analytics and performance tracking</li>
                <li><strong>Stripe:</strong> Payment processing and fraud prevention</li>
                <li><strong>Mapbox:</strong> Maps and location services</li>
                <li><strong>Social Media Platforms:</strong> Social sharing and integration</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                These third parties have their own privacy and cookie policies that govern their use of your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. How to Control Cookies</h2>
              
              <h3 className="text-xl font-semibold mb-3">Browser Settings</h3>
              <p className="text-muted-foreground mb-4">
                Most web browsers allow you to control cookies through their settings. You can:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>View and delete cookies</li>
                <li>Block all cookies</li>
                <li>Block third-party cookies only</li>
                <li>Clear all cookies when you close the browser</li>
                <li>Receive notifications when cookies are set</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Browser-Specific Instructions</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
                <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
                <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Opt-Out Tools</h3>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li><strong>Google Analytics:</strong> <a href="https://tools.google.com/dlpage/gaoptout" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a></li>
                <li><strong>Ad Choices:</strong> <a href="http://www.aboutads.info/choices/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Digital Advertising Alliance</a></li>
                <li><strong>Network Advertising:</strong> <a href="http://www.networkadvertising.org/choices/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">NAI Opt-Out Tool</a></li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Impact of Disabling Cookies</h2>
              <p className="text-muted-foreground mb-4">
                Please note that blocking or deleting cookies may impact your experience:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>You may need to log in repeatedly</li>
                <li>Your preferences and settings may not be saved</li>
                <li>Some features may not work properly</li>
                <li>Your shopping cart may not function correctly</li>
                <li>Website performance may be affected</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Mobile Cookies</h2>
              <p className="text-muted-foreground mb-4">
                When you use our mobile app, we may use similar technologies to cookies, including:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground">
                <li>Mobile device identifiers</li>
                <li>Local storage</li>
                <li>Software Development Kits (SDKs)</li>
                <li>Push notification tokens</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                You can control these through your device settings and app permissions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Do Not Track Signals</h2>
              <p className="text-muted-foreground mb-4">
                Some browsers have a "Do Not Track" feature. Currently, there is no industry standard for responding to Do Not Track signals. We do not currently respond to Do Not Track browser signals.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Updates to This Policy</h2>
              <p className="text-muted-foreground mb-4">
                We may update this Cookie Policy from time to time to reflect changes in our practices or applicable laws. The "Last Updated" date at the top indicates when the policy was last revised.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have questions about our use of cookies, please contact us:
              </p>
              <ul className="list-none mb-4 text-muted-foreground">
                <li><strong>Email:</strong> support@cravenusa.com</li>
                <li><strong>Phone:</strong> 216-435-0821</li>
              </ul>
              <p className="text-muted-foreground">
                For more information about how we collect and use your personal data, please review our <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>.
              </p>
            </section>

            <section className="mb-8 p-6 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> This Cookie Policy should be reviewed by legal counsel and customized for your specific use of cookies and tracking technologies. Cookie consent requirements vary by jurisdiction (GDPR in EU, CCPA in California, etc.).
              </p>
            </section>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicy;
