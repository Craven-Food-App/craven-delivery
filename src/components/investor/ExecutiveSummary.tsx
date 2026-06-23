import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  TrendingUp, 
  ShieldCheck, 
  Users, 
  Globe, 
  BarChart4, 
  PieChart,
  Zap,
  DollarSign,
  ArrowUpRight,
  MapPin,
  Clock,
  FileText,
  ArrowLeft
} from 'lucide-react';

const ExecutiveSummary: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'basic' | 'digital'>('basic');

  // Digital Version Component
  const DigitalVersion = () => {
    const stats = [
      { label: "Target Raise", value: "$3,000,000", icon: <Target className="text-orange-500" /> },
      { label: "Valuation Cap", value: "$18,000,000", icon: <TrendingUp className="text-orange-500" /> },
      { label: "Instrument", value: "SAFE", icon: <ShieldCheck className="text-orange-500" /> },
      { label: "Discount", value: "10%", icon: <Zap className="text-orange-500" /> }
    ];

    return (
      <div className="min-h-screen bg-black text-zinc-100 font-sans p-4 md:p-8 selection:bg-orange-500 selection:text-black">
        {/* Container */}
        <div className="max-w-5xl mx-auto border border-zinc-800 bg-[#050505] shadow-2xl overflow-hidden rounded-2xl">
          
          {/* Header Section */}
          <div className="relative p-8 md:p-12 border-b border-zinc-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-mono uppercase tracking-[0.3em] text-orange-500">Executive Summary</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white mb-2">
                  CRAVE'N <span className="text-zinc-500">INC.</span>
                </h1>
                <p className="text-lg text-zinc-400 font-light max-w-xl">
                  The next-generation delivery infrastructure for underserved secondary markets. 
                  <span className="text-white"> Fair. Fast. Sustainable.</span>
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="bg-orange-500 text-black px-4 py-2 rounded-lg font-bold text-sm mb-2">
                  SEED ROUND ACTIVE
                </div>
                <p className="text-xs font-mono text-zinc-500">SEC RULE 506(C) | REG D</p>
              </div>
            </div>
            {/* Subtle Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] pointer-events-none"></div>
          </div>

          {/* Investment Highlights Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-800">
            {stats.map((stat, i) => (
              <div key={i} className="p-6 border-r last:border-r-0 border-zinc-800 flex flex-col items-center justify-center text-center hover:bg-zinc-900/50 transition-colors">
                <div className="mb-2">{stat.icon}</div>
                <span className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</span>
                <span className="text-2xl font-bold text-white">{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Main Content Body */}
          <div className="grid grid-cols-1 md:grid-cols-3">
            
            {/* Left Column: The Opportunity */}
            <div className="md:col-span-2 p-8 md:p-12 border-r border-zinc-800 space-y-10">
              
              <section>
                <h3 className="flex items-center gap-2 text-xl font-bold text-white mb-4">
                  <Globe size={20} className="text-orange-500" /> 
                  The Market Gap
                </h3>
                <p className="text-zinc-400 leading-relaxed">
                  Incumbent delivery platforms are built for urban density and extract <span className="text-white">up to 30% in commissions</span>. In secondary markets (Tier-2/3 cities), these economics fail merchants and drivers alike. Crave'n addresses this $150B opportunity by deploying hyper-local logistics optimized for lower density.
                </p>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-xl font-bold text-white mb-4">
                  <Zap size={20} className="text-orange-500" /> 
                  The Competitive Moat
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: "Merchant-First", desc: "15% flat commission—half the industry average." },
                    { title: "Driver Retention", desc: "Transparent payouts leading to higher reliability." },
                    { title: "Density Engine", desc: "Proprietary routing for non-urban corridors." },
                    { title: "Unit Economics", desc: "Targeting 20%+ gross margin from day one." }
                  ].map((item, i) => (
                    <div key={i} className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/50">
                      <h4 className="font-bold text-white mb-1 text-sm">{item.title}</h4>
                      <p className="text-xs text-zinc-500 leading-snug">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-xl font-bold text-white mb-4">
                  <BarChart4 size={20} className="text-orange-500" /> 
                  Financial Trajectory
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-zinc-500">Projected Rev. 2028</span>
                    <span className="text-2xl font-black text-orange-500">$40.0M+</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full">
                    <div className="w-3/4 h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full"></div>
                  </div>
                  <p className="text-xs text-zinc-500 italic">
                    *Based on expansion to 10+ markets over a 36-month scaling period.
                  </p>
                </div>
              </section>
            </div>

            {/* Right Column: The Details & Team */}
            <div className="p-8 md:p-10 bg-zinc-900/20 space-y-8">
              
              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4 border-b border-zinc-800 pb-2">Use of Funds</h3>
                <ul className="space-y-3">
                  {[
                    { label: "Market Operations", val: "38%" },
                    { label: "Driver Liquidity", val: "27%" },
                    { label: "Tech Infrastructure", val: "22%" },
                    { label: "Customer Acquisition", val: "13%" }
                  ].map((f, i) => (
                    <li key={i} className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">{f.label}</span>
                      <span className="text-sm font-bold text-white">{f.val}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
                <h3 className="text-xs font-mono uppercase tracking-widest text-orange-500 mb-3">Key Milestones</h3>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <Clock size={16} className="text-orange-500 shrink-0 mt-1" />
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      <span className="text-white font-bold">Q1 2025:</span> Launch Anchor Market with 30+ Merchants.
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <MapPin size={16} className="text-orange-500 shrink-0 mt-1" />
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      <span className="text-white font-bold">Q4 2025:</span> Achieve Cash Flow positive per market.
                    </p>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4 border-b border-zinc-800 pb-2">Investment Inquiry</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">TS</div>
                    <div>
                      <p className="text-sm font-bold text-white leading-none">Torrance Stroman</p>
                      <p className="text-[10px] text-zinc-500">Founder & CEO</p>
                    </div>
                  </div>
                  <a 
                    href="mailto:invest@cravenusa.com?subject=Investment Inquiry - Crave'n Inc."
                    className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-orange-500 transition-all flex items-center justify-center gap-2 group"
                  >
                    Contact Investor Relations
                    <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Disclaimer */}
          <div className="p-6 bg-black border-t border-zinc-800 text-[10px] text-zinc-600 leading-relaxed uppercase tracking-tighter text-center">
            Confidential: This summary is for accredited investors only. It does not constitute an offer to sell or a solicitation of an offer to buy any securities. Refer to the full PPM dated Dec 2025 for comprehensive risk factors and legal disclosures.
          </div>
        </div>
      </div>
    );
  };

  // Basic Version Component (PPM Summary)
  const BasicVersion = () => {
    return (
      <div className="min-h-screen bg-white text-gray-900 font-sans p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="text-orange-500" size={20} />
              <span className="text-sm font-mono uppercase tracking-widest text-orange-500">Executive Summary</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Crave'n Inc.
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl">
              Executive Summary from Private Placement Memorandum (PPM)
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            <section className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Company Overview</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Crave'n Inc. is a technology-enabled on-demand local commerce platform spanning five divisions —
                Crave'n Food, Crave'n Grocery, Crave'n Retail, Crave'n Convenience, and Crave'n Express (CX) for
                same-day courier and logistics — designed to serve underserved secondary markets (Tier-2 and
                Tier-3 cities) with fair, transparent, and sustainable infrastructure. Unlike incumbent platforms
                that extract 30%+ commissions from merchants, Crave'n operates on a merchant-first model with an
                industry-leading 15% commission cap across every division.
              </p>
            </section>

            <section className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Market Opportunity</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The combined U.S. on-demand markets that Crave'n serves — food delivery, grocery, retail,
                convenience, and same-day courier/logistics — represent several hundred billion dollars annually,
                with the fastest growth occurring in secondary markets where current platforms fail to provide
                sustainable economics. These markets represent a significant untapped opportunity for a multi-vertical
                platform optimized for lower-density operations.
              </p>
            </section>

            <section className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Business Model</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-2">Revenue Streams</h3>
                  <ul className="text-gray-700 space-y-1 text-sm">
                    <li>• 15% merchant commission</li>
                    <li>• 10% service fee</li>
                    <li>• $2.99 base delivery fee + $0.50/mile</li>
                  </ul>
                </div>
                <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-2">Unit Economics</h3>
                  <ul className="text-gray-700 space-y-1 text-sm">
                    <li>• Gross margin: 20.5%</li>
                    <li>• Average order value: $11.99</li>
                    <li>• Gross profit per order: $2.46</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Financial Projections</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Year</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Revenue</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Profit</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Markets</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">2026</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">$5M</td>
                      <td className="border border-gray-300 px-4 py-2 text-right text-green-600">Break-even</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">3 Markets</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">2027</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">$18M</td>
                      <td className="border border-gray-300 px-4 py-2 text-right text-green-600">$2.5M</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">5 Markets</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">2028</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">$40M+</td>
                      <td className="border border-gray-300 px-4 py-2 text-right text-green-600">$8M+</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">10+ Markets</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Use of Funds</h2>
              <div className="space-y-3">
                {[
                  { label: "Market Launch & Operations", percentage: "38%" },
                  { label: "Liquidity Creation", percentage: "27%" },
                  { label: "Product & Infrastructure", percentage: "22%" },
                  { label: "Customer Acquisition", percentage: "10%" },
                  { label: "G&A Buffer", percentage: "3%" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-gray-700 font-medium">{item.label}</span>
                    <span className="text-gray-900 font-bold">{item.percentage}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Investment Terms</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-orange-50 rounded-lg border border-orange-200">
                  <h3 className="font-bold text-gray-900 mb-3">Seed Round</h3>
                  <ul className="text-gray-700 space-y-2 text-sm">
                    <li><strong>Target Raise:</strong> $3,000,000</li>
                    <li><strong>Valuation Cap:</strong> $18,000,000</li>
                    <li><strong>Instrument:</strong> SAFE</li>
                    <li><strong>Discount:</strong> 10%</li>
                  </ul>
                </div>
                <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-3">Key Milestones</h3>
                  <ul className="text-gray-700 space-y-2 text-sm">
                    <li><strong>Q1 2025:</strong> Launch Anchor Market</li>
                    <li><strong>Q4 2025:</strong> Achieve Cash Flow Positive</li>
                    <li><strong>2026:</strong> Expand to 3 Markets</li>
                    <li><strong>2027:</strong> Scale to 5 Markets</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Disclaimer */}
            <div className="mt-12 p-6 bg-gray-100 rounded-lg border border-gray-300">
              <p className="text-xs text-gray-600 leading-relaxed text-center">
                <strong>Confidential:</strong> This executive summary is for accredited investors only. It does not constitute 
                an offer to sell or a solicitation of an offer to buy any securities. Refer to the full Private Placement 
                Memorandum (PPM) dated December 2025 for comprehensive risk factors, legal disclosures, and complete terms.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'basic'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={18} />
                <span>PPM Summary</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('digital')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'digital'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap size={18} />
                <span>Digital Version</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="w-full">
        {activeTab === 'basic' ? <BasicVersion /> : <DigitalVersion />}
      </div>
    </div>
  );
};

export default ExecutiveSummary;

