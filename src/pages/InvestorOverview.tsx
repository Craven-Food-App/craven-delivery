import React from 'react';
import InvestorAccessGuard from '@/components/investor/InvestorAccessGuard';
import InvestorLayout from '@/components/investor/InvestorLayout';
import { Target, TrendingUp, Shield, BarChart3, Users, Globe, Zap, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const InvestorOverview: React.FC = () => {
  return (
    <InvestorAccessGuard>
      <InvestorLayout>
        <div className="container mx-auto py-12 px-6">
          {/* Confidentiality Banner */}
          <div className="bg-amber-50 border-b border-amber-200 py-3 px-4 mb-8 -mx-6">
            <p className="text-sm text-amber-900 text-center max-w-4xl mx-auto">
              <strong>Confidential materials.</strong> Do not distribute. Provided for evaluation purposes only.
            </p>
          </div>

          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-5xl font-bold mb-4 text-gray-900">Crave'n Inc.</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Next-generation local commerce and delivery platform designed to realign incentives between customers, drivers, restaurants, and the platform itself.
            </p>
          </div>

          {/* Investment Terms */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <Card className="border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Investment Instrument</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-500" />
                  <span className="text-2xl font-bold text-gray-900">SAFE</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Simple Agreement for Future Equity</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Target Raise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-500" />
                  <span className="text-2xl font-bold text-gray-900">$3M</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Total funding target</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Valuation Cap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                  <span className="text-2xl font-bold text-gray-900">$18M</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Pre-money valuation cap</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Discount Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <span className="text-2xl font-bold text-gray-900">10%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Early investor discount</p>
              </CardContent>
            </Card>
          </div>

          {/* Company Overview */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Company Overview</h2>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Crave'n is a next-generation local commerce and delivery platform designed to realign incentives 
                between customers, drivers, restaurants, and the platform itself. Unlike traditional delivery 
                platforms optimized for extraction, Crave'n is built for local sustainability and ecosystem health.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                Our platform addresses fundamental cost inefficiencies in the current delivery ecosystem while 
                creating sustainable economics for all participants. We focus on underserved secondary markets 
                where traditional platforms have failed to create value for local stakeholders.
              </p>
            </div>
          </section>

          {/* The Problem & Solution */}
          <section className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <span className="text-red-500">The Problem</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 mt-1">•</span>
                      <span>Cost inefficiency for restaurants with high platform fees</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 mt-1">•</span>
                      <span>Unsustainable economics for drivers with declining earnings</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 mt-1">•</span>
                      <span>Increasingly expensive outcomes for customers</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 mt-1">•</span>
                      <span>Platforms optimized for extraction rather than ecosystem health</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <span className="text-green-600">Crave'n's Solution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Driver-centric economics with sustainable unit economics</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Merchant-friendly structures with competitive fees</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Membership-based retention (CraveMore) for customer loyalty</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Scalable regional expansion with capital discipline</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Business Model */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Business Model</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-orange-500" />
                    Merchant Platform Fees
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    Competitive fee structure for restaurants and merchants, designed to be sustainable 
                    for local businesses while maintaining platform economics.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-500" />
                    Consumer Membership
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    CraveMore membership program providing zero delivery fees and exclusive benefits, 
                    creating predictable recurring revenue and customer retention.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-orange-500" />
                    Market Partnerships
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    Local market partnerships and platform services driving ecosystem expansion 
                    and additional revenue streams.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Competitive Positioning */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">How Crave'n Differs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Zap className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Designed for Local Sustainability</h3>
                      <p className="text-gray-700">
                        Unlike national platforms focused on extraction, Crave'n is built for local 
                        market health and long-term sustainability.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Users className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Incentive Alignment</h3>
                      <p className="text-gray-700">
                        Our model ensures all participants—customers, drivers, restaurants, and the 
                        platform—benefit from ecosystem growth.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Shield className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Governance-First Model</h3>
                      <p className="text-gray-700">
                        Built by operators focused on governance, accountability, and scalable 
                        infrastructure with capital discipline.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Capital Discipline</h3>
                      <p className="text-gray-700">
                        Scalable infrastructure designed for efficient capital deployment and 
                        sustainable growth without excessive burn rates.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Progress & Traction */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Progress & Traction</h2>
            <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
              <CardContent className="pt-6">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="font-medium">Platform development substantially complete</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="font-medium">Multi-portal ecosystem live (drivers, merchants, executives, customers)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="font-medium">Active market entry strategy underway</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="font-medium">Strategic partnerships and pipeline in development</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="font-medium">Leadership team operational prior to institutional funding</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Leadership Philosophy */}
          <section className="mb-12">
            <Card className="bg-slate-900 text-white">
              <CardHeader>
                <CardTitle className="text-2xl">Leadership Philosophy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed text-slate-200">
                  Crave'n is built by operators focused on governance, accountability, scalable infrastructure, 
                  and capital discipline. Our leadership team brings operational experience and a commitment to 
                  building sustainable businesses that create value for all stakeholders.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* CTA */}
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle>Ready to Learn More?</CardTitle>
              <CardDescription>
                Access detailed investor materials and engage with our team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => window.location.href = '/investors/portal'}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Access Investor Portal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = 'mailto:invest@cravenusa.com?subject=Investor Inquiry'}
                >
                  Contact Investor Relations
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </InvestorLayout>
    </InvestorAccessGuard>
  );
};

export default InvestorOverview;

