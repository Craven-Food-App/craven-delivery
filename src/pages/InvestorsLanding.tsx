import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const InvestorsLanding: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Above the Fold */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">Investors</h1>
          <p className="text-xl mb-8 text-slate-300">
            Crave'n is a next-generation local commerce and delivery platform designed to realign incentives between customers, drivers, restaurants, and the platform itself.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => navigate('/investors/access')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg"
            >
              Request Investor Access
            </Button>
          </div>
          <p className="text-sm text-slate-400 mt-6">
            For informational purposes only. Not an offer or solicitation to buy or sell securities.
          </p>
        </div>
      </section>

      {/* Market Problem → Crave'n Solution */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-semibold mb-6 text-gray-900">The Problem</h2>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Cost inefficiency for restaurants</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Unsustainable economics for drivers</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Increasingly expensive outcomes for customers</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Platforms optimized for extraction rather than ecosystem health</span>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-semibold mb-6 text-gray-900">Crave'n's Solution</h2>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Driver-centric economics</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Merchant-friendly structures</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Membership-based retention (CraveMore)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Scalable regional expansion</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* High-Level Traction */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-semibold mb-8 text-gray-900">Progress</h2>
          <ul className="space-y-4 text-gray-700">
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>Platform development substantially complete</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>Multi-portal ecosystem live (drivers, merchants, executives, customers)</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>Active market entry strategy underway</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>Strategic partnerships and pipeline in development</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>Leadership team operational prior to institutional funding</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Business Model Overview */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-semibold mb-8 text-gray-900">Business Model</h2>
          <ul className="space-y-4 text-gray-700">
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>Merchant platform fees</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>Consumer membership programs (CraveMore)</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>Local market partnerships</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>Platform services & ecosystem expansion</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Competitive Positioning */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-semibold mb-8 text-gray-900">How Crave'n Differs</h2>
          <ul className="space-y-4 text-gray-700">
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>Designed for local sustainability, not national extraction</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>Incentive alignment across all participants</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>Governance-first operational model</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">•</span>
              <span>Scalable infrastructure with capital discipline</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Leadership Credibility */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-semibold mb-6 text-gray-900">Leadership Philosophy</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            Crave'n is built by operators focused on governance, accountability, scalable infrastructure, and capital discipline.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-6">Request Investor Access</h2>
          <p className="text-lg text-slate-300 mb-8">
            Access detailed investor materials and engage with our team.
          </p>
          <Button
            onClick={() => navigate('/investors/access')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg"
          >
            Request Investor Access
          </Button>
        </div>
      </section>

      {/* Footer Disclaimer */}
      <section className="py-8 px-4 bg-gray-100 border-t">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-gray-600 text-center">
            This page is for informational purposes only and does not constitute an offer to sell, or a solicitation of an offer to buy, any securities.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default InvestorsLanding;

