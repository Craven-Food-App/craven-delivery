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
  const [activeTab, setActiveTab] = useState<'summary' | 'projections' | 'use-of-funds'>('summary');

  const stats = [
    { label: "Target Raise", value: "$3,000,000", icon: <Target className="text-orange-500" size={18} /> },
    { label: "Pre-Money Valuation", value: "$15,000,000", icon: <TrendingUp className="text-orange-500" size={18} /> },
    { label: "Instrument", value: "SAFE", icon: <ShieldCheck className="text-orange-500" size={18} /> },
    { label: "Discount", value: "20%", icon: <Zap className="text-orange-500" size={18} /> }
  ];

  // Real projections: Pre-revenue in 2026, scaling through 2029
  const financialData = [
    { 
      year: '2026', 
      phase: 'Launch & Validate',
      rev: '$0', gp: '$0', net: '($1.8M)', orders: '0', 
      burn: '$150K/mo', markets: '1-2', merchants: '25-50', drivers: '15-30',
      milestones: ['Platform launch Q2', 'First 50 merchants onboarded', 'Beta market validation', 'Seed round close'],
      isPreRevenue: true
    },
    { 
      year: 'H2 2026', 
      phase: 'First Revenue',
      rev: '$180K', gp: '$27K', net: '($1.2M)', orders: '5,200', 
      burn: '$140K/mo', markets: '2', merchants: '75', drivers: '40',
      milestones: ['First revenue Q3', 'Product-market fit signal', 'Unit economics validation'],
      isPreRevenue: false
    },
    { 
      year: '2027', 
      phase: 'Growth & Expansion',
      rev: '$2.4M', gp: '$480K', net: '($850K)', orders: '68,000', 
      burn: '$105K/mo', markets: '4-6', merchants: '200+', drivers: '120',
      milestones: ['Expand to 4 Tier-2/3 markets', 'Series A readiness', 'Break-even run rate by Q4'],
      isPreRevenue: false
    },
    { 
      year: '2028', 
      phase: 'Scale',
      rev: '$12.5M', gp: '$2.8M', net: '$620K', orders: '350,000', 
      burn: 'Cash-flow positive', markets: '10-15', merchants: '600+', drivers: '400',
      milestones: ['Corporate profitability', '10+ markets live', 'Series A / growth round'],
      isPreRevenue: false
    },
    { 
      year: '2029', 
      phase: 'Dominance',
      rev: '$38M', gp: '$8.7M', net: '$4.2M', orders: '1.1M', 
      burn: 'Profitable', markets: '25+', merchants: '1,500+', drivers: '900+',
      milestones: ['Regional market leadership', 'Sustainable 11% net margin', 'Expansion into adjacent verticals'],
      isPreRevenue: false
    },
  ];

  const kpis = [
    { label: "Target LTV / CAC", value: "3.0x+", trend: "By Q4 2027", status: "Target" },
    { label: "Avg. Order Value", value: "$35.00", trend: "Market Avg", status: "Benchmark" },
    { label: "Target Driver Retention", value: "85%+", trend: "vs 60% Industry", status: "Goal" },
    { label: "Merchant Commission", value: "15%", trend: "vs 30% Competitors", status: "Moat" }
  ];

  const useOfFunds = [
    { category: 'Engineering & Product', amount: '$1,050,000', pct: '35%', detail: 'Platform development, mobile apps, logistics engine, DevOps' },
    { category: 'Sales & Market Launch', amount: '$600,000', pct: '20%', detail: 'Merchant acquisition, market launches in 2-4 Tier-2/3 cities' },
    { category: 'Operations & Logistics', amount: '$450,000', pct: '15%', detail: 'Driver onboarding, support, dispatch optimization' },
    { category: 'Marketing & Growth', amount: '$375,000', pct: '12.5%', detail: 'Customer acquisition, brand building, local marketing' },
    { category: 'G&A / Legal / Compliance', amount: '$300,000', pct: '10%', detail: 'Corporate overhead, legal, insurance, accounting' },
    { category: 'Reserve / Contingency', amount: '$225,000', pct: '7.5%', detail: '18-month runway buffer at reduced burn' },
  ];

  const assumptions = [
    { label: 'Current Revenue', value: '$0', note: 'Pre-revenue as of Q1 2026' },
    { label: 'Avg. Order Value', value: '$35.00', note: 'Based on Tier-2/3 market basket analysis' },
    { label: 'Commission Rate', value: '15%', note: 'vs. 25-30% industry standard' },
    { label: 'Delivery Fee (Avg)', value: '$4.99', note: 'Customer-facing; subsidized during launch' },
    { label: 'Driver Cost / Delivery', value: '$4.10', note: 'Per-delivery payout, all-in' },
    { label: 'CAC (Customer)', value: '$12-18', note: 'Targeting <$15 blended by 2027' },
    { label: 'Monthly Burn (2026)', value: '$150K', note: '18-month runway on $3M raise' },
    { label: 'Gross Margin Target', value: '20-23%', note: 'At scale (2028+)' },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans p-4 md:p-8 selection:bg-orange-500 selection:text-black">
      <div className="max-w-6xl mx-auto border border-zinc-800 bg-[#050505] shadow-2xl overflow-hidden rounded-2xl">
        
        {/* Header */}
        <div className="relative p-8 md:p-10 border-b border-zinc-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-mono uppercase tracking-[0.3em] text-orange-500">Pre-Revenue · Seed Stage</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-2">
                CRAVE'N <span className="text-zinc-500">FINANCIALS</span>
              </h1>
              <p className="text-lg text-zinc-400 font-light max-w-xl">
                Last-mile delivery infrastructure for underserved Tier-2/3 markets. 
                <span className="text-white"> Projections 2026–2029.</span>
              </p>
            </div>
            
            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 flex-wrap">
              {(['summary', 'projections', 'use-of-funds'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                >
                  {tab === 'use-of-funds' ? 'Use of Funds' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'summary' ? (
          <>
            {/* Investment Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-800 bg-zinc-900/10">
              {stats.map((stat, i) => (
                <div key={i} className="p-6 border-r last:border-r-0 border-zinc-800 flex flex-col items-center justify-center text-center hover:bg-zinc-900/50 transition-colors">
                  <div className="mb-2 p-2 bg-orange-500/10 rounded-lg">{stat.icon}</div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</span>
                  <span className="text-xl font-bold text-white">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Pre-Revenue Status Banner */}
            <div className="border-b border-zinc-800 bg-orange-500/5 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Activity size={18} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-orange-500 uppercase tracking-wider mb-1">Pre-Revenue Status · Q1 2026</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Crave'n is currently pre-revenue with a fully built platform in final testing. We are raising a $3M Seed round to fund market launch, 
                    merchant onboarding, and initial driver network buildout across our first 2 target markets. Platform launch is targeted for Q2 2026 with 
                    first revenue expected Q3 2026.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3">
              <div className="md:col-span-2 p-8 md:p-10 border-r border-zinc-800 space-y-10">
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-6 uppercase tracking-wider">
                    <Target size={18} className="text-orange-500" /> 
                    Target Metrics (At Scale)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {kpis.map((kpi, i) => (
                      <div key={i} className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800 group hover:border-orange-500/50 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-zinc-500 uppercase font-mono tracking-tighter">{kpi.label}</span>
                          <span className="text-[10px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full font-bold">{kpi.trend}</span>
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
                  <p className="text-zinc-400 leading-relaxed text-sm mb-4">
                    Unlike national competitors optimized for Tier-1 density, Crave'n is purpose-built for <span className="text-white font-bold">Tier-2 and Tier-3 cities</span> where 
                    DoorDash and Uber Eats have limited presence or have pulled out entirely. Our model reduces merchant commission to 15% (vs. 25-30% industry) while 
                    targeting a 7% net margin per order at scale — creating a structural advantage incumbents cannot replicate without cannibalizing their own economics.
                  </p>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center p-3 bg-black/40 rounded-xl border border-zinc-800">
                      <p className="text-lg font-black text-white">$150B+</p>
                      <p className="text-[9px] text-zinc-500 uppercase">US Delivery TAM</p>
                    </div>
                    <div className="text-center p-3 bg-black/40 rounded-xl border border-zinc-800">
                      <p className="text-lg font-black text-white">40%</p>
                      <p className="text-[9px] text-zinc-500 uppercase">Underserved Markets</p>
                    </div>
                    <div className="text-center p-3 bg-black/40 rounded-xl border border-zinc-800">
                      <p className="text-lg font-black text-orange-500">$60B</p>
                      <p className="text-[9px] text-zinc-500 uppercase">Addressable SAM</p>
                    </div>
                  </div>
                </section>

                {/* Key Assumptions */}
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-6 uppercase tracking-wider">
                    <LineChart size={18} className="text-orange-500" /> 
                    Key Assumptions
                  </h3>
                  <div className="space-y-2">
                    {assumptions.map((a, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-b-0">
                        <div className="flex-1">
                          <span className="text-sm text-zinc-300">{a.label}</span>
                          <span className="text-[10px] text-zinc-600 ml-2">{a.note}</span>
                        </div>
                        <span className="text-sm font-bold text-white">{a.value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="p-8 md:p-10 bg-zinc-900/20 space-y-8">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-6 border-b border-zinc-800 pb-2">Unit Economics (Target)</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 text-xs uppercase">Avg. Gross Order</span>
                      <span className="text-white font-bold">$35.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 text-xs uppercase">Commission (15%)</span>
                      <span className="text-emerald-500 font-bold">+$5.25</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 text-xs uppercase">Delivery Fee</span>
                      <span className="text-emerald-500 font-bold">+$4.99</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-zinc-800/50 pb-2">
                      <span className="text-zinc-400 text-xs uppercase">Total Revenue / Order</span>
                      <span className="text-white font-bold">$10.24</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 text-xs uppercase">Driver Payout</span>
                      <span className="text-rose-500 font-bold">-$4.10</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 text-xs uppercase">Payment Processing</span>
                      <span className="text-rose-500 font-bold">-$1.05</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 text-xs uppercase">Support / Ops</span>
                      <span className="text-rose-500 font-bold">-$0.85</span>
                    </div>
                    <div className="flex justify-between text-sm p-3 bg-white/5 rounded-lg mt-2">
                      <span className="text-white text-xs font-black uppercase tracking-widest">Net Contribution</span>
                      <span className="text-orange-500 font-black">+$4.24</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 italic">*Target unit economics at 500+ orders/day/market</p>
                  </div>
                </div>

                <div className="pt-6">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4 border-b border-zinc-800 pb-2">Seed Round</h3>
                  <p className="text-3xl font-black text-white mb-1">$3.0M</p>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-1">
                    SAFE · 20% Discount · $15M Pre-Money Cap
                  </p>
                  <p className="text-xs text-zinc-600 leading-relaxed mb-4">
                    18-month runway to first revenue and Series A readiness.
                  </p>
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Runway</span>
                      <span className="text-white font-bold">18 months</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Monthly Burn</span>
                      <span className="text-white font-bold">~$150K</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Path to Profitability</span>
                      <span className="text-white font-bold">Q2 2028</span>
                    </div>
                  </div>
                  <a 
                    href="mailto:invest@cravenusa.com?subject=Data Room Request - Seed Round"
                    className="w-full py-4 bg-orange-500 text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-orange-400 transition-all flex items-center justify-center gap-2"
                  >
                    Request Data Room
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'projections' ? (
          <div className="p-8 md:p-12 space-y-12">
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <BarChart4 className="text-orange-500" />
                Financial Forecast · 2026–2029
              </h3>
              
              {/* Timeline Cards */}
              <div className="space-y-4">
                {financialData.map((d, i) => (
                  <div key={i} className={`p-6 rounded-2xl border transition-all ${d.isPreRevenue ? 'border-orange-500/30 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700'}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Year & Phase */}
                      <div className="lg:w-40 flex-shrink-0">
                        <div className="text-xl font-black text-white">{d.year}</div>
                        <div className="text-[10px] text-orange-500 uppercase tracking-wider font-bold">{d.phase}</div>
                      </div>
                      
                      {/* Financial Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase mb-1">Revenue</p>
                          <p className={`text-lg font-black ${d.rev === '$0' ? 'text-zinc-600' : 'text-white'}`}>{d.rev}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase mb-1">Net Income</p>
                          <p className={`text-lg font-bold ${d.net.includes('(') ? 'text-rose-400' : 'text-emerald-500'}`}>{d.net}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase mb-1">Orders</p>
                          <p className="text-lg font-bold text-zinc-300">{d.orders}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase mb-1">Markets</p>
                          <p className="text-lg font-bold text-zinc-300">{d.markets}</p>
                        </div>
                      </div>

                      {/* Operational */}
                      <div className="lg:w-48 flex-shrink-0 text-right">
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Burn Rate</p>
                        <p className="text-sm font-bold text-zinc-300">{d.burn}</p>
                        <p className="text-[10px] text-zinc-600 mt-1">{d.merchants} merchants · {d.drivers} drivers</p>
                      </div>
                    </div>
                    
                    {/* Milestones */}
                    <div className="mt-4 pt-4 border-t border-zinc-800/50 flex flex-wrap gap-2">
                      {d.milestones.map((m, j) => (
                        <span key={j} className="text-[10px] px-3 py-1 bg-zinc-800/50 text-zinc-400 rounded-full border border-zinc-700/50">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Revenue Growth Visualization */}
              <div className="bg-zinc-900/20 p-8 rounded-3xl border border-zinc-800">
                <h4 className="text-xs font-mono text-orange-500 uppercase tracking-[0.2em] mb-8">Revenue Growth Trajectory</h4>
                <div className="flex items-end gap-3 h-64 border-b border-zinc-800 pb-2">
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-zinc-800/50 rounded-t-lg h-[1%] relative transition-all hover:bg-orange-500/20 border border-zinc-700/30" style={{ minHeight: '4px' }}>
                    </div>
                    <span className="mt-2 text-[10px] font-bold text-zinc-600">H1 2026</span>
                    <span className="text-[9px] text-zinc-700">$0</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-zinc-700 rounded-t-lg h-[2%] relative transition-all hover:bg-orange-500/20" style={{ minHeight: '8px' }}>
                    </div>
                    <span className="mt-2 text-[10px] font-bold text-zinc-600">H2 2026</span>
                    <span className="text-[9px] text-zinc-700">$180K</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-orange-900/50 rounded-t-lg h-[8%] relative transition-all hover:bg-orange-500/30" style={{ minHeight: '20px' }}>
                    </div>
                    <span className="mt-2 text-[10px] font-bold text-zinc-400">2027</span>
                    <span className="text-[9px] text-zinc-600">$2.4M</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-orange-600 rounded-t-lg h-[33%] relative transition-all hover:bg-orange-500/80">
                    </div>
                    <span className="mt-2 text-[10px] font-bold text-orange-400">2028</span>
                    <span className="text-[9px] text-orange-600">$12.5M</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-orange-500 rounded-t-lg h-[100%] relative transition-all">
                    </div>
                    <span className="mt-2 text-[10px] font-bold text-orange-500">2029</span>
                    <span className="text-[9px] text-orange-500">$38M</span>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border border-zinc-800 rounded-xl bg-black">
                    <p className="text-[10px] text-zinc-500 uppercase mb-1">Breakeven</p>
                    <p className="text-lg font-black text-white">Q2 2028</p>
                  </div>
                  <div className="p-4 border border-zinc-800 rounded-xl bg-black">
                    <p className="text-[10px] text-zinc-500 uppercase mb-1">Target Net Margin</p>
                    <p className="text-lg font-black text-white">11%</p>
                  </div>
                  <div className="p-4 border border-zinc-800 rounded-xl bg-black">
                    <p className="text-[10px] text-zinc-500 uppercase mb-1">Exit Multiple (Est.)</p>
                    <p className="text-lg font-black text-white">8x–12x</p>
                  </div>
                  <div className="p-4 border border-zinc-800 rounded-xl bg-black">
                    <p className="text-[10px] text-zinc-500 uppercase mb-1">Series A Target</p>
                    <p className="text-lg font-black text-white">Q1 2028</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Use of Funds Tab */
          <div className="p-8 md:p-12 space-y-10">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <DollarSign className="text-orange-500" />
              Use of Funds · $3.0M Seed
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Allocation Table */}
              <div className="space-y-3">
                {useOfFunds.map((item, i) => (
                  <div key={i} className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-white">{item.category}</span>
                      <div className="text-right">
                        <span className="text-sm font-black text-orange-500">{item.amount}</span>
                        <span className="text-[10px] text-zinc-500 ml-2">{item.pct}</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500">{item.detail}</p>
                    {/* Progress bar */}
                    <div className="mt-3 w-full bg-zinc-800 rounded-full h-1.5">
                      <div 
                        className="bg-orange-500 h-1.5 rounded-full transition-all"
                        style={{ width: item.pct }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary & Timeline */}
              <div className="space-y-6">
                <div className="p-8 bg-zinc-900/20 rounded-3xl border border-zinc-800">
                  <h4 className="text-xs font-mono text-orange-500 uppercase tracking-[0.2em] mb-6">18-Month Deployment Timeline</h4>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <div className="w-px h-full bg-zinc-800"></div>
                      </div>
                      <div className="pb-6">
                        <p className="text-sm font-bold text-white">Months 1–6 · Build & Launch</p>
                        <p className="text-xs text-zinc-500 mt-1">Complete platform, launch first 2 markets, onboard initial merchants and drivers. Heavy engineering spend.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-orange-500/70"></div>
                        <div className="w-px h-full bg-zinc-800"></div>
                      </div>
                      <div className="pb-6">
                        <p className="text-sm font-bold text-white">Months 7–12 · Validate & Grow</p>
                        <p className="text-xs text-zinc-500 mt-1">Achieve product-market fit, reach 75+ merchants, 5K+ orders. Shift spend toward sales and operations.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-orange-500/40"></div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Months 13–18 · Scale & Raise</p>
                        <p className="text-xs text-zinc-500 mt-1">Expand to 4-6 markets, demonstrate unit economics, prepare for Series A at $2M+ ARR run rate.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border border-orange-500/20 rounded-2xl bg-orange-500/5">
                  <h4 className="text-sm font-bold text-orange-500 mb-3">Key Milestones for Series A Readiness</h4>
                  <ul className="space-y-2 text-xs text-zinc-400">
                    <li className="flex items-start gap-2"><ChevronRight size={12} className="text-orange-500 mt-0.5 flex-shrink-0" /> $200K+ MRR run rate</li>
                    <li className="flex items-start gap-2"><ChevronRight size={12} className="text-orange-500 mt-0.5 flex-shrink-0" /> 4+ markets live with repeatable playbook</li>
                    <li className="flex items-start gap-2"><ChevronRight size={12} className="text-orange-500 mt-0.5 flex-shrink-0" /> LTV/CAC &gt; 3.0x validated</li>
                    <li className="flex items-start gap-2"><ChevronRight size={12} className="text-orange-500 mt-0.5 flex-shrink-0" /> Gross margin trending toward 20%+</li>
                    <li className="flex items-start gap-2"><ChevronRight size={12} className="text-orange-500 mt-0.5 flex-shrink-0" /> Clear path to break-even within 12 months</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-black border-t border-zinc-800 text-[10px] text-zinc-600 leading-relaxed uppercase tracking-tighter text-center">
          Forward-looking statements involve risks and uncertainties. All projections are based on internal management estimates as of March 2026. 
          Crave'n Inc. is currently pre-revenue. Actual results may vary materially based on market conditions, execution, and competitive dynamics.
        </div>
      </div>
    </div>
  );
};

export default FinancialProjections;
