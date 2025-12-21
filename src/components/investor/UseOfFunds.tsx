import React from 'react';
import { 
  PieChart, 
  MapPin, 
  Cpu, 
  Megaphone, 
  Briefcase, 
  ShieldCheck, 
  ArrowUpRight, 
  Zap, 
  Target,
  Users,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';

const UseOfFunds: React.FC = () => {
  const fundingAllocation = [
    { 
      category: "Market Operations & Expansion", 
      amount: "$1,140,000", 
      percentage: "38%", 
      icon: <MapPin className="text-orange-500" size={24} />,
      color: "bg-orange-500",
      description: "Direct deployment into anchor and secondary markets to establish dominance.",
      items: [
        { label: "City Launch Teams", desc: "Operations managers and local lead drivers for 10 new hubs.", cost: "$450k" },
        { label: "Logistics Infrastructure", desc: "Warehouse staging, charging stations, and local delivery hubs.", cost: "$380k" },
        { label: "Hardware & Kits", desc: "Proprietary insulated delivery units and driver safety gear.", cost: "$310k" }
      ]
    },
    { 
      category: "Technology & Engineering", 
      amount: "$750,000", 
      percentage: "25%", 
      icon: <Cpu className="text-orange-500" size={24} />,
      color: "bg-blue-500",
      description: "Scaling the platform to handle 1.2M+ annual orders with AI-driven efficiency.",
      items: [
        { label: "Routing Engine v2", desc: "AI optimization for non-grid based rural/secondary corridors.", cost: "$300k" },
        { label: "Merchant Portal", desc: "Self-service analytics and POS integration API suite.", cost: "$250k" },
        { label: "Platform Security", desc: "SOC2 compliance and high-availability cloud infrastructure.", cost: "$200k" }
      ]
    },
    { 
      category: "Customer & Merchant Acquisition", 
      amount: "$660,000", 
      percentage: "22%", 
      icon: <Megaphone className="text-orange-500" size={24} />,
      color: "bg-emerald-500",
      description: "Aggressive growth hacking targeting 3.2x LTV/CAC ratio.",
      items: [
        { label: "Hyper-Local Digital Ads", desc: "Geofenced social media and search campaigns per city.", cost: "$320k" },
        { label: "B2B Sales Force", desc: "Merchant acquisition team for local restaurant chains.", cost: "$240k" },
        { label: "Loyalty Program", desc: "User retention incentives and referral bonuses.", cost: "$100k" }
      ]
    },
    { 
      category: "General & Administrative", 
      amount: "$450,000", 
      percentage: "15%", 
      icon: <Briefcase className="text-orange-500" size={24} />,
      color: "bg-zinc-500",
      description: "Maintaining corporate governance and strategic agility.",
      items: [
        { label: "Legal & Regulatory", desc: "Multi-state compliance and IP protection filings.", cost: "$180k" },
        { label: "Strategic Hiring", desc: "HR, Finance, and Legal executive support.", cost: "$150k" },
        { label: "Strategic Reserve", desc: "10% contingency for rapid market shifts.", cost: "$120k" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans p-4 md:p-12 selection:bg-orange-500 selection:text-black">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-orange-500 text-black px-3 py-1 rounded text-xs font-black uppercase tracking-widest">
                Deployment Plan
              </span>
              <span className="text-zinc-600 font-mono text-xs">REF: PPM DEC-2025</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">
              USE OF <span className="text-zinc-500">FUNDS.</span>
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl font-light">
              Detailed capital allocation for the <span className="text-white font-medium">$3,000,000</span> Seed round, focused on hyper-local density and unit profitability.
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-right hidden md:block">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Total Target Raise</p>
            <p className="text-4xl font-black text-white">$3,000,000</p>
          </div>
        </div>

        {/* Visual Bar Map */}
        <div className="w-full h-4 bg-zinc-900 rounded-full flex overflow-hidden mb-16 shadow-2xl shadow-orange-500/10">
          <div className="h-full bg-orange-500 w-[38%]" title="Operations - 38%"></div>
          <div className="h-full bg-orange-400 w-[25%]" title="Tech - 25%"></div>
          <div className="h-full bg-orange-300 w-[22%]" title="Growth - 22%"></div>
          <div className="h-full bg-zinc-700 w-[15%]" title="Admin - 15%"></div>
        </div>

        {/* Detailed Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {fundingAllocation.map((section, idx) => (
            <div key={idx} className="bg-[#0A0A0A] border border-zinc-800 rounded-3xl overflow-hidden group hover:border-orange-500/40 transition-all duration-500">
              <div className="p-8 border-b border-zinc-800/50 bg-gradient-to-br from-zinc-900/50 to-transparent">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-zinc-800 rounded-2xl text-orange-500 group-hover:scale-110 transition-transform duration-500">
                    {section.icon}
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black text-white tracking-tighter">{section.percentage}</span>
                    <p className="text-xs text-orange-500 font-mono font-bold uppercase">{section.amount}</p>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{section.category}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed italic">{section.description}</p>
              </div>
              
              <div className="p-8 space-y-6">
                {section.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-start gap-4">
                    <div className="flex gap-4">
                      <div className="mt-1">
                        <CheckCircle2 size={14} className="text-zinc-700 group-hover:text-orange-500 transition-colors" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-200">{item.label}</h4>
                        <p className="text-xs text-zinc-500">{item.desc}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-1 rounded">
                      {item.cost}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Strategy Highlights */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-orange-500 p-10 rounded-[3rem] text-black relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-3xl font-black tracking-tighter mb-4 flex items-center gap-3">
                <Zap size={32} />
                The Efficiency Multiplier
              </h3>
              <p className="text-lg font-medium leading-relaxed max-w-xl mb-8">
                By leveraging proprietary logistics tech, we maintain a <span className="underline decoration-4">40% lower OpEx per order</span> compared to industry standards. This ensures that every dollar of investment translates directly to faster market entry and deeper regional penetration.
              </p>
              <div className="flex gap-4">
                <div className="bg-black/10 p-4 rounded-2xl backdrop-blur-sm border border-black/5">
                  <p className="text-[10px] uppercase font-black mb-1 opacity-70">Payback Period</p>
                  <p className="text-2xl font-black">14 Months</p>
                </div>
                <div className="bg-black/10 p-4 rounded-2xl backdrop-blur-sm border border-black/5">
                  <p className="text-[10px] uppercase font-black mb-1 opacity-70">Market Runway</p>
                  <p className="text-2xl font-black">22 Months</p>
                </div>
              </div>
            </div>
            {/* Background Decorative Element */}
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-black/5 rounded-full blur-[100px]"></div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <ShieldCheck className="text-orange-500" />
                Capital Guardrails
              </h3>
              <ul className="space-y-4">
                <li className="text-xs text-zinc-400 flex items-start gap-2 leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 shrink-0"></div>
                  Quarterly re-allocation based on market-specific ROI performance.
                </li>
                <li className="text-xs text-zinc-400 flex items-start gap-2 leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 shrink-0"></div>
                  Phased hiring tied to GMV (Gross Merchandise Volume) milestones.
                </li>
                <li className="text-xs text-zinc-400 flex items-start gap-2 leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 shrink-0"></div>
                  Third-party audit oversight for all technology and R&D spending.
                </li>
              </ul>
            </div>
            <a 
              href="mailto:invest@cravenusa.com?subject=Request Full PPM - Use of Funds"
              className="mt-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-orange-500 hover:text-white transition-all duration-300 text-center"
            >
              Download Full PPM
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-zinc-900 text-center">
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-[0.2em]">
            Confidential & Proprietary © 2025 Crave'n Inc. | Ohio Corporation
          </p>
        </div>
      </div>
    </div>
  );
};

export default UseOfFunds;

