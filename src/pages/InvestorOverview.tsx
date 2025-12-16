import React from 'react';
import InvestorAccessGuard from '@/components/investor/InvestorAccessGuard';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const InvestorOverview: React.FC = () => {
  return (
    <InvestorAccessGuard>
      <div className="min-h-screen bg-white">
        <Header />
        
        {/* Confidentiality Banner */}
        <div className="bg-amber-50 border-b border-amber-200 py-3 px-4">
          <p className="text-sm text-amber-900 text-center max-w-4xl mx-auto">
            <strong>Confidential materials.</strong> Do not distribute. Provided for evaluation purposes only.
          </p>
        </div>

        <div className="max-w-6xl mx-auto py-12 px-4">
          <h1 className="text-4xl font-bold mb-8 text-gray-900">Investor Overview</h1>

          {/* Executive Summary */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">Executive Summary</h2>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <p className="text-gray-700 leading-relaxed">
                [Executive summary content will be added here. This section provides a high-level overview of Crave'n's business, market opportunity, and strategic positioning.]
              </p>
            </div>
          </section>

          {/* Pitch Deck */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">Pitch Deck</h2>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <p className="text-gray-600 mb-4">
                [Pitch deck PDF will be embedded here when available. For now, this is a placeholder.]
              </p>
              {/* Placeholder for PDF viewer - can use react-pdf or iframe */}
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Pitch deck will be displayed here</p>
              </div>
            </div>
          </section>

          {/* Materials */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">Materials</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-orange-500" />
                  <span className="text-gray-700">Governance & Controls Overview</span>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-orange-500" />
                  <span className="text-gray-700">Internship & Pathway Overview</span>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>
          </section>
        </div>

        <Footer />
      </div>
    </InvestorAccessGuard>
  );
};

export default InvestorOverview;

