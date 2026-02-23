import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, Users, Store, Truck, DollarSign, Settings, 
  BarChart, Bell, FileText, AlertCircle, CheckCircle, Code 
} from 'lucide-react';
import Footer from '@/components/Footer';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AdminGuide = () => {
  const navigate = useNavigate();

  const sections = [
    {
      id: 'overview',
      title: 'Admin Overview',
      icon: Shield,
      content: {
        intro: 'The Admin Dashboard is your central hub for managing the entire Crave\'N platform. You have full control over orders, drivers, restaurants, and platform settings.',
        features: [
          'Real-time order monitoring and management',
          'Driver verification and performance tracking',
          'Restaurant onboarding and management',
          'Financial oversight and payout processing',
          'Platform configuration and settings',
          'Analytics and reporting'
        ]
      }
    },
    {
      id: 'orders',
      title: 'Order Management',
      icon: FileText,
      content: {
        intro: 'Monitor and manage all orders across the platform in real-time.',
        steps: [
          {
            title: 'View Active Orders',
            description: 'Navigate to Admin > Orders to see all active deliveries',
            details: 'Filter by status: pending, accepted, in_progress, delivered, cancelled'
          },
          {
            title: 'Manual Order Assignment',
            description: 'Assign orders to specific drivers when auto-assignment fails',
            details: 'Click on an unassigned order > Select "Assign Driver" > Choose from available drivers'
          },
          {
            title: 'Handle Issues',
            description: 'Resolve order problems and customer complaints',
            details: 'Access order details > Review issue > Process refund or redelivery as needed'
          },
          {
            title: 'Order Analytics',
            description: 'View order statistics and trends',
            details: 'Track completion rates, average delivery times, and customer satisfaction'
          }
        ]
      }
    },
    {
      id: 'drivers',
      title: 'Driver Management',
      icon: Truck,
      content: {
        intro: 'Oversee driver applications, verification, and performance.',
        steps: [
          {
            title: 'Review Applications',
            description: 'Navigate to Admin > Feeder Applications',
            details: 'Review submitted applications, verify documents, conduct background checks'
          },
          {
            title: 'Approve Drivers',
            description: 'Activate approved drivers in the system',
            details: 'Check background check status > Verify vehicle inspection > Click "Approve Driver"'
          },
          {
            title: 'Monitor Performance',
            description: 'Track driver ratings, completion rates, and earnings',
            details: 'View driver profiles to see detailed performance metrics and customer feedback'
          },
          {
            title: 'Handle Payouts',
            description: 'Process daily driver payouts',
            details: 'Navigate to Payout Management > Review pending payouts > Process batch payments'
          },
          {
            title: 'Manage Issues',
            description: 'Address driver complaints and violations',
            details: 'Suspend or deactivate drivers as needed, communicate policy updates'
          }
        ]
      }
    },
    {
      id: 'restaurants',
      title: 'Restaurant Management',
      icon: Store,
      content: {
        intro: 'Onboard and manage restaurant partners on the platform.',
        steps: [
          {
            title: 'Onboard New Restaurants',
            description: 'Add restaurants to the platform',
            details: 'Collect business info, menu data, banking details > Create restaurant profile > Set up menu categories and items'
          },
          {
            title: 'Manage Menus',
            description: 'Help restaurants update their offerings',
            details: 'Access restaurant dashboard > Menu Management > Add/edit items, prices, availability'
          },
          {
            title: 'Set Commission Rates',
            description: 'Configure commission structure per restaurant',
            details: 'Navigate to Commission Settings > Set percentage or flat fee > Apply special rates as needed'
          },
          {
            title: 'Monitor Performance',
            description: 'Track restaurant order volume and ratings',
            details: 'Review analytics dashboard for insights on popular items and peak times'
          }
        ]
      }
    },
    {
      id: 'promos',
      title: 'Promo Code Management',
      icon: DollarSign,
      content: {
        intro: 'Create and manage promotional codes for marketing campaigns.',
        steps: [
          {
            title: 'Create Promo Code',
            description: 'Navigate to Admin > Promo Code Manager',
            details: 'Click "Create New" > Enter code, discount type (% or $), amount, validity period'
          },
          {
            title: 'Set Usage Limits',
            description: 'Configure how many times a code can be used',
            details: 'Set per-user limit and total usage cap to control costs'
          },
          {
            title: 'Track Performance',
            description: 'Monitor promo code usage and ROI',
            details: 'View redemption counts, revenue impact, and customer acquisition metrics'
          },
          {
            title: 'Deactivate Codes',
            description: 'Turn off codes that are no longer valid',
            details: 'Toggle "Active" status or set end date to automatically expire codes'
          }
        ]
      }
    },
    {
      id: 'settings',
      title: 'Platform Settings',
      icon: Settings,
      content: {
        intro: 'Configure platform-wide settings and policies.',
        steps: [
          {
            title: 'Commission Settings',
            description: 'Set default commission rates',
            details: 'Configure base percentage, minimum fee, and special tier rates'
          },
          {
            title: 'Payout Settings',
            description: 'Manage driver payout schedules and methods',
            details: 'Set daily/weekly payout schedules, minimum payout amounts, payment methods'
          },
          {
            title: 'Notification Settings',
            description: 'Configure system notifications',
            details: 'Set up email templates, SMS alerts, push notification rules'
          },
          {
            title: 'Delivery Settings',
            description: 'Configure delivery parameters',
            details: 'Set max delivery distance, base delivery fee, surge pricing rules'
          }
        ]
      }
    },
    {
      id: 'analytics',
      title: 'Analytics & Reporting',
      icon: BarChart,
      content: {
        intro: 'Access comprehensive platform analytics and generate reports.',
        insights: [
          {
            metric: 'Platform GMV',
            description: 'Gross Merchandise Value - total order value processed'
          },
          {
            metric: 'Active Users',
            description: 'Daily/Monthly active customers, drivers, and restaurants'
          },
          {
            metric: 'Order Metrics',
            description: 'Completion rate, average order value, delivery times'
          },
          {
            metric: 'Revenue Breakdown',
            description: 'Commission earnings, delivery fees, total revenue'
          },
          {
            metric: 'Driver Performance',
            description: 'Acceptance rates, completion rates, average ratings'
          },
          {
            metric: 'Restaurant Performance',
            description: 'Order volume, customer ratings, popular items'
          }
        ]
      }
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-12">
          <Shield className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-center mb-4">Admin Documentation</h1>
          <p className="text-xl text-center opacity-90 max-w-3xl mx-auto">
            Complete guide to managing the Crave'n platform
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Quick Access */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button onClick={() => navigate('/admin')} variant="outline">
                Admin Dashboard
              </Button>
              <Button onClick={() => navigate('/testing')} variant="outline">
                Testing Hub
              </Button>
              <Button onClick={() => navigate('/help-center')} variant="outline">
                Help Center
              </Button>
              <Button onClick={() => navigate('/contact-us')} variant="outline">
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <TabsTrigger key={section.id} value={section.id} className="flex items-center gap-2 py-3">
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{section.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <TabsContent key={section.id} value={section.id} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-6 w-6 text-primary" />
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-muted-foreground">{section.content.intro}</p>

                    {section.content.features && (
                      <div>
                        <h3 className="font-semibold mb-3">Key Features</h3>
                        <ul className="space-y-2">
                          {section.content.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {section.content.steps && (
                      <div className="space-y-4">
                        <h3 className="font-semibold">Step-by-Step Guide</h3>
                        {section.content.steps.map((step, i) => (
                          <Card key={i}>
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <Badge variant="outline">{i + 1}</Badge>
                                {step.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="font-medium text-sm">{step.description}</p>
                              <p className="text-sm text-muted-foreground">{step.details}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {section.content.insights && (
                      <div className="space-y-4">
                        <h3 className="font-semibold">Key Metrics</h3>
                        <div className="grid gap-4">
                          {section.content.insights.map((insight, i) => (
                            <Card key={i}>
                              <CardContent className="p-4">
                                <h4 className="font-semibold mb-1">{insight.metric}</h4>
                                <p className="text-sm text-muted-foreground">{insight.description}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Best Practices */}
        <Card className="mt-8 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Monitor daily:</strong> Check order flow, driver availability, and customer complaints</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Respond quickly:</strong> Address driver and restaurant issues within 24 hours</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Process payouts promptly:</strong> Ensure drivers receive earnings on schedule</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Review analytics weekly:</strong> Track trends and identify improvement opportunities</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Test regularly:</strong> Use the Testing Hub to verify platform functionality</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default AdminGuide;
