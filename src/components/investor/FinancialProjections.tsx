import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  TrendingUp, 
  ShieldCheck, 
  Globe, 
  BarChart4, 
  Zap, 
  ArrowUpRight, 
  MapPin, 
  Clock,
  ChevronRight,
  DollarSign,
  Users,
  LineChart,
  Activity,
  ArrowDownRight,
  ArrowLeft
} from 'lucide-react';

const FinancialProjections: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'summary' | 'projections'>('summary');

  const stats = [
    { label: "Target Raise", value: "$3,000,000", icon: <Target className="text-orange-500" size={18} /> },
    { label: "Valuation Cap", value: "$18,000,000", icon: <TrendingUp className="text-orange-500" size={18} /> },
    { label: "Instrument", value: "SAFE", icon: <ShieldCheck className="text-orange-500" size={18} /> },
    { label: "Discount", value: "10%", icon: <Zap className="text-orange-500" size={18} /> }
  ];

  const financialData = [
    { year: '2025 (P)', rev: '$0.8M', gp: '$0.12M', net: '($0.4M)', orders: '25K' },
    { year: '2026 (E)', rev: '$5.2M', gp: '$1.04M', net: '$0.05M', orders: '150K' },
    { year: '2027 (E)', rev: '$18.4M', gp: '$3.86M', net: '$2.2M', orders: '520K' },
    { year: '2028 (E)', rev: '$42.1M', gp: '$8.90M', net: '$7.8M', orders: '1.2M' },
  ];

  const kpis = [
    { label: "LTV / CAC", value: "3.2x", trend: "+12%", status: "Healthy" },
    { label: "Avg. Order Value", value: "$34.50", trend: "+5%", status: "Stable" },
    { label: "Driver Retention", value: "88%", trend: "+2%", status: "Top Tier" },
    { label: "Merchant Churn", value: "<1.5%", trend: "-0.5%", status: "Optimal" }
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans p-4 md:p-8 selection:bg-orange-500 selection:text-black">
      {/* Container */}
      <div className="max-w-6xl mx-auto border border-zinc-800 bg-[#050505] shadow-2xl overflow-hidden rounded-2xl">
        
        {/* Header Section */}
        <div className="relative p-8 md:p-10 border-b border-zinc-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-mono uppercase tracking-[0.3em] text-orange-500">Investor Dashboard</span>
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-white mb-2">
                CRAVE'N <span className="text-zinc-500">FINANCIALS</span>
              </h1>
              <p className="text-lg text-zinc-400 font-light max-w-xl">
                Infrastructure for the next $150B delivery frontier. 
                <span className="text-white"> Strategic Projections 2025-2028.</span>
              </p>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
              <button 
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'summary' ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                Summary
              </button>
              <button 
                onClick={() => setActiveTab('projections')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'projections' ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                Projections
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'summary' ? (
          <>
            {/* Investment Highlights Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-800 bg-zinc-900/10">
              {stats.map((stat, i) => (
                <div key={i} className="p-6 border-r last:border-r-0 border-zinc-800 flex flex-col items-center justify-center text-center hover:bg-zinc-900/50 transition-colors">
                  <div className="mb-2 p-2 bg-orange-500/10 rounded-lg">{stat.icon}</div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</span>
                  <span className="text-xl font-bold text-white">{stat.value}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3">
              <div className="md:col-span-2 p-8 md:p-10 border-r border-zinc-800 space-y-10">
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-6 uppercase tracking-wider">
                    <Activity size={18} className="text-orange-500" /> 
                    Core KPIs & Efficiency
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {kpis.map((kpi, i) => (
                      <div key={i} className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800 group hover:border-orange-500/50 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-zinc-500 uppercase font-mono tracking-tighter">{kpi.label}</span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold">{kpi.trend}</span>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-3xl font-black text-white">{kpi.value}</span>
                          <span className="text-[10px] text-zinc-600 font-bold uppercase">{kpi.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-orange-500/5 p-8 rounded-3xl border border-orange-500/10">
                  <h3 className="text-lg font-bold text-white mb-4">Strategic Moat</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm">
                    Unlike national competitors optimized for Tier-1 density, Crave'n utilizes a <span className="text-white font-bold">low-overhead logistics stack</span> specifically engineered for Tier-2/3 cities. By reducing merchant commission to 15% while maintaining a 7% net margin per order, we create a barrier to entry that extractive models cannot match.
                  </p>
                </section>
              </div>

              <div className="p-8 md:p-10 bg-zinc-900/20 space-y-8">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-6 border-b border-zinc-800 pb-2">Unit Economics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 text-xs uppercase">Avg. Gross Order</span>
                      <span className="text-white font-bold">$35.00</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-zinc-800/50 pb-2">
                      <span className="text-zinc-400 text-xs uppercase">Commission (15%)</span>
                      <span className="text-emerald-500 font-bold">+$5.25</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 text-xs uppercase">Driver Payout</span>
                      <span className="text-rose-500 font-bold">-$4.10</span>
                    </div>
                    <div className="flex justify-between text-sm p-3 bg-white/5 rounded-lg">
                      <span className="text-white text-xs font-black uppercase tracking-widest">Net Contribution</span>
                      <span className="text-orange-500 font-black">+$1.15</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4 border-b border-zinc-800 pb-2">Investment Ask</h3>
                  <p className="text-3xl font-black text-white mb-2">$3.0M</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Scaling to 10 markets and reaching corporate profitability by Q3 2026.
                  </p>
                  <a 
                    href="mailto:invest@cravenusa.com?subject=Data Room Request - Financial Projections"
                    className="w-full mt-6 py-4 bg-orange-500 text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-orange-400 transition-all flex items-center justify-center gap-2"
                  >
                    Request Data Room
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Projections Tab */
          <div className="p-8 md:p-12 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <BarChart4 className="text-orange-500" />
                  Financial Forecast
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="pb-4 text-xs font-mono text-zinc-500 uppercase">Fiscal Year</th>
                        <th className="pb-4 text-xs font-mono text-zinc-500 uppercase">Gross Revenue</th>
                        <th className="pb-4 text-xs font-mono text-zinc-500 uppercase text-right">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {financialData.map((d, i) => (
                        <tr key={i} className="group hover:bg-zinc-900/50">
                          <td className="py-5 font-bold text-zinc-300">{d.year}</td>
                          <td className="py-5">
                            <span className="text-white font-black text-lg">{d.rev}</span>
                            <div className="text-[10px] text-zinc-600 font-mono uppercase">{d.orders} Orders</div>
                          </td>
                          <td className="py-5 text-right">
                            <span className={`font-bold ${d.net.includes('(') ? 'text-zinc-600' : 'text-emerald-500 text-lg'}`}>
                              {d.net}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-zinc-900/20 p-8 rounded-3xl border border-zinc-800 flex flex-col justify-center">
                <h4 className="text-xs font-mono text-orange-500 uppercase tracking-[0.2em] mb-8">Revenue Growth Visualization</h4>
                <div className="flex items-end gap-4 h-64 border-b border-zinc-800 pb-2">
                  <div className="flex-1 bg-zinc-800 rounded-t-lg h-[15%] relative group transition-all hover:bg-orange-500/20">
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-600">2025</span>
                  </div>
                  <div className="flex-1 bg-zinc-800 rounded-t-lg h-[35%] relative group transition-all hover:bg-orange-500/20">
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-600">2026</span>
                  </div>
                  <div className="flex-1 bg-orange-900/50 rounded-t-lg h-[65%] relative group transition-all hover:bg-orange-500/40">
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-400">2027</span>
                  </div>
                  <div className="flex-1 bg-orange-500 rounded-t-lg h-[100%] relative group transition-all">
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-orange-500">2028</span>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="p-4 border border-zinc-800 rounded-xl bg-black">
                    <p className="text-[10px] text-zinc-500 uppercase mb-1">Exit Multiple (Est.)</p>
                    <p className="text-xl font-black text-white">8.5x - 12x</p>
                  </div>
                  <div className="p-4 border border-zinc-800 rounded-xl bg-black">
                    <p className="text-[10px] text-zinc-500 uppercase mb-1">Target EBITDA</p>
                    <p className="text-xl font-black text-white">18.5%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Disclaimer */}
        <div className="p-6 bg-black border-t border-zinc-800 text-[10px] text-zinc-600 leading-relaxed uppercase tracking-tighter text-center">
          Forward-looking statements involve risks and uncertainties. Projections are based on current management estimates and internal modeling as of Dec 2025. Actual results may vary based on market conditions and competitive landscape.
        </div>
      </div>
    </div>
  );
};

export default FinancialProjections;

