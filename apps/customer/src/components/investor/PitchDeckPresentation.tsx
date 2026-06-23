import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  TrendingUp, 
  Users, 
  Store, 
  Truck, 
  Target, 
  BarChart3, 
  PieChart, 
  ShieldCheck, 
  MapPin, 
  DollarSign,
  Layers,
  Zap,
  ArrowLeft
} from 'lucide-react';

const PitchDeckPresentation: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    // SLIDE 1: Title
    {
      type: 'hero',
      title: "Crave'n Delivery Platform",
      subtitle: "Fair, fast, transparent on-demand commerce — food, grocery, retail, convenience &amp; courier (CX) — for underserved local markets",
      tag: "Seed Round Pitch",
      content: (
        <div className="mt-12 flex items-center justify-center space-x-4 opacity-80">
          <div className="h-px w-12 bg-orange-500"></div>
          <span className="text-sm tracking-widest uppercase">Empowering Local Economies</span>
          <div className="h-px w-12 bg-orange-500"></div>
        </div>
      )
    },

    // SLIDE 2: Vision
    {
      title: "Vision",
      subtitle: "Sustainable infrastructure for the long haul",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h2 className="text-4xl md:text-5xl font-light leading-tight max-w-4xl">
            Build the most trusted <span className="text-orange-500 font-semibold">local delivery infrastructure</span> with sustainable unit economics from day one.
          </h2>
        </div>
      )
    },

    // SLIDE 3: Problem
    {
      title: "The Problem",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          {[
            { title: "Merchants", desc: "Face excessive commissions (30%+) that eat all margins.", icon: <Store className="text-orange-500" /> },
            { title: "Drivers", desc: "Earn unpredictably with 'hidden' algorithms and low base pay.", icon: <Truck className="text-orange-500" /> },
            { title: "Customers", desc: "See opaque pricing, service fees, and inflated menu prices.", icon: <Users className="text-orange-500" /> }
          ].map((item, i) => (
            <div key={i} className="p-8 bg-zinc-900 rounded-2xl border border-zinc-800">
              <div className="mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      )
    },

    // SLIDE 4: Opportunity
    {
      title: "The Opportunity",
      content: (
        <div className="flex flex-col md:flex-row items-center gap-12 mt-12">
          <div className="flex-1">
            <h3 className="text-3xl font-bold mb-6">Secondary Cities are Ignored</h3>
            <p className="text-xl text-zinc-300 leading-relaxed">
              Tier-2 and Tier-3 markets demand affordable delivery. Current incumbents use "one-size-fits-all" extractive economics that don't scale profitably in lower-density regions.
            </p>
          </div>
          <div className="flex-1 bg-orange-500/10 p-12 rounded-3xl border border-orange-500/20">
            <div className="text-6xl font-bold text-orange-500 mb-2">Tier 2/3</div>
            <div className="text-xl font-medium uppercase tracking-wider">The New Frontier</div>
          </div>
        </div>
      )
    },

    // SLIDE 5: Solution
    {
      title: "The Solution",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8">
          <div className="space-y-6">
            <h3 className="text-4xl font-bold">Optimized for Density</h3>
            <p className="text-zinc-400 text-lg">We don't try to be everything to everyone. We win through hyper-local efficiency.</p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3"><ShieldCheck className="text-green-500" /> Transparent Fee Structure</li>
              <li className="flex items-center gap-3"><ShieldCheck className="text-green-500" /> Sustainable Merchant Commissions</li>
              <li className="flex items-center gap-3"><ShieldCheck className="text-green-500" /> Algorithm-Free Driver Payouts</li>
            </ul>
          </div>
          <div className="bg-zinc-800 rounded-2xl overflow-hidden relative min-h-[300px] flex items-center justify-center">
             <Layers size={120} className="text-orange-500 opacity-20 absolute" />
             <div className="z-10 text-center px-8">
                <p className="font-mono text-orange-500 mb-2">CRAVE'N STACK</p>
                <p className="text-2xl font-bold">Hyper-Local Logistics Engine</p>
             </div>
          </div>
        </div>
      )
    },

    // SLIDE 6: Product Overview
    {
      title: "Product Overview",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {[
            { name: "Consumer App", icon: <Users />, features: ["Seamless Discovery", "Real-time Tracking", "Fair Pricing"] },
            { name: "Driver App", icon: <Truck />, features: ["Transparent Earnings", "Route Optimization", "Instant Payouts"] },
            { name: "Merchant Dashboard", icon: <Store />, features: ["Order Management", "Growth Analytics", "Direct Marketing"] }
          ].map((p, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl hover:border-orange-500 transition-colors">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-6 text-orange-500">
                {p.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{p.name}</h3>
              <ul className="text-zinc-500 space-y-2">
                {p.features.map((f, j) => <li key={j}>• {f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )
    },

    // SLIDE 7: Product Screens
    {
      title: "Product Screens",
      content: (
        <div className="flex flex-col items-center justify-center mt-8">
           <div className="flex flex-col md:flex-row items-end gap-6 mb-12">
              {/* Consumer App Mobile */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-t from-orange-500/50 to-transparent rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative w-40 h-80 bg-zinc-900 rounded-[2.2rem] border-[6px] border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
                  <div className="h-6 w-20 bg-zinc-800 self-center rounded-b-xl mb-2"></div>
                  <div className="px-4 space-y-3">
                    <div className="h-3 w-1/2 bg-zinc-800 rounded"></div>
                    <div className="h-20 w-full bg-orange-500/10 rounded-lg border border-orange-500/20"></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-12 bg-zinc-800 rounded"></div>
                      <div className="h-12 bg-zinc-800 rounded"></div>
                    </div>
                  </div>
                  <div className="mt-auto p-4 flex justify-between">
                    <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                    <div className="h-2 w-2 rounded-full bg-zinc-700"></div>
                    <div className="h-2 w-2 rounded-full bg-zinc-700"></div>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-zinc-500 mt-3 text-center uppercase tracking-widest">Consumer UI</p>
              </div>

              {/* Driver App Mobile */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-t from-orange-500/50 to-transparent rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative w-40 h-80 bg-zinc-900 rounded-[2.2rem] border-[6px] border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
                  <div className="h-6 w-20 bg-zinc-800 self-center rounded-b-xl mb-2"></div>
                  <div className="p-3 bg-zinc-800/50 mb-2 flex justify-between items-center">
                    <div className="h-2 w-8 bg-orange-500 rounded"></div>
                    <div className="h-4 w-4 rounded-full bg-zinc-700"></div>
                  </div>
                  <div className="flex-1 bg-zinc-800/20 m-2 rounded-lg border border-zinc-700/50 flex items-center justify-center">
                     <div className="w-4/5 h-4/5 border-2 border-dashed border-zinc-700 rounded-lg flex items-center justify-center">
                        <MapPin size={24} className="text-zinc-600" />
                     </div>
                  </div>
                  <div className="p-3 bg-orange-500 text-black text-[10px] font-bold text-center">GO ONLINE</div>
                </div>
                <p className="text-[10px] font-mono text-zinc-500 mt-3 text-center uppercase tracking-widest">Driver Mode</p>
              </div>

              {/* Merchant Portal Desktop - THE ADDED IMAGE */}
              <div className="relative group ml-4">
                <div className="absolute -inset-2 bg-orange-500/20 blur-2xl rounded-xl opacity-0 group-hover:opacity-100 transition duration-700"></div>
                <div className="relative w-[500px] h-[320px] bg-zinc-900 rounded-xl border-[8px] border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
                  {/* Window Header */}
                  <div className="h-8 bg-zinc-800 flex items-center px-4 gap-2 border-b border-zinc-700">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-600"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-600"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-600"></div>
                    </div>
                    <div className="mx-auto bg-black/20 px-4 py-0.5 rounded text-[10px] text-zinc-500 font-mono">merchants.craven.delivery/dashboard</div>
                  </div>

                  {/* The Image Content */}
                  <div className="flex-1 bg-black relative group-hover:scale-[1.02] transition-transform duration-700">
                    <img 
                      src="/Home.png" 
                      alt="Merchant Dashboard" 
                      className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const sibling = target.nextSibling as HTMLElement;
                        if (sibling) sibling.style.display = 'flex';
                      }}
                    />
                    {/* Fallback for previewing without the asset locally */}
                    <div className="absolute inset-0 hidden items-center justify-center bg-zinc-900 flex-col gap-2">
                       <BarChart3 size={48} className="text-orange-500" />
                       <p className="text-xs text-zinc-500 font-mono">MERCHANT_DASHBOARD_PREVIEW</p>
                    </div>
                    {/* Gloss Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-zinc-500 mt-3 text-center uppercase tracking-widest">Merchant Command Center</p>
              </div>
           </div>
           <p className="text-zinc-500 italic text-sm border-t border-zinc-800 pt-4 px-12">
             All systems integrated: <span className="text-orange-500">Live testing complete</span> across three core stakeholders.
           </p>
        </div>
      )
    },

    // SLIDE 8 & 9: Business Model & Revenue Engine
    {
      title: "Revenue Engine",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
          <div className="space-y-8">
            <div className="flex items-start gap-4">
               <div className="text-4xl font-bold text-orange-500">15%</div>
               <div>
                 <p className="font-bold">Commission</p>
                 <p className="text-zinc-500">Industry leading fair rate for merchants</p>
               </div>
            </div>
            <div className="flex items-start gap-4">
               <div className="text-4xl font-bold text-orange-500">10%</div>
               <div>
                 <p className="font-bold">Service Fee</p>
                 <p className="text-zinc-500">Transparent platform maintenance</p>
               </div>
            </div>
          </div>
          <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 flex flex-col justify-center">
            <h4 className="text-zinc-500 uppercase tracking-widest text-sm mb-4">Delivery Fee</h4>
            <div className="text-5xl font-bold mb-2">$2.99</div>
            <div className="text-2xl text-orange-500 font-medium">+ $0.50 / mile</div>
          </div>
        </div>
      )
    },

    // SLIDE 10: Unit Economics
    {
      title: "Unit Economics",
      content: (
        <div className="mt-12 overflow-hidden rounded-3xl border border-zinc-800">
          <table className="w-full text-left">
            <thead className="bg-zinc-900">
              <tr>
                <th className="p-6 text-zinc-500 font-medium">Metric (Per Avg. Order)</th>
                <th className="p-6 text-orange-500 font-bold text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-black">
              <tr>
                <td className="p-6">Gross Revenue</td>
                <td className="p-6 text-right font-bold">$11.99</td>
              </tr>
              <tr>
                <td className="p-6 text-zinc-400">Driver Payout & Ops</td>
                <td className="p-6 text-right text-zinc-400">($9.53)</td>
              </tr>
              <tr className="bg-orange-500/5">
                <td className="p-6 font-bold">Gross Profit</td>
                <td className="p-6 text-right font-bold text-orange-500">$2.46</td>
              </tr>
              <tr>
                <td className="p-6 font-bold">Gross Margin</td>
                <td className="p-6 text-right font-bold text-orange-500">20.5%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    },

    // SLIDE 11: Market Size
    {
      title: "Market Size",
      content: (
        <div className="flex flex-col items-center justify-center mt-12 text-center">
          <div className="relative mb-8">
            <div className="w-64 h-64 rounded-full border-4 border-orange-500/20 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border-4 border-orange-500/40 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-orange-500 flex items-center justify-center shadow-2xl shadow-orange-500/50">
                  <span className="text-2xl font-bold">$150B+</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-2xl max-w-2xl text-zinc-300">
            U.S. delivery market with the <span className="text-orange-500 font-bold">fastest growth</span> in underserved secondary regions.
          </p>
        </div>
      )
    },

    // SLIDE 13-16: Projections
    {
      title: "Market Expansion",
      content: (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          {[
            { year: "2025", markets: "1 Market", orders: "Launch", color: "bg-zinc-800" },
            { year: "2026", markets: "3 Markets", orders: "417K", color: "bg-zinc-900" },
            { year: "2027", markets: "5 Markets", orders: "1.5M", color: "bg-zinc-800 border-orange-500/50 border" },
            { year: "2028", markets: "10+ Markets", orders: "3M+", color: "bg-orange-500" }
          ].map((d, i) => (
            <div key={i} className={`${d.color} p-8 rounded-2xl flex flex-col justify-between min-h-[200px] ${d.year === '2028' ? 'text-black' : ''}`}>
              <div className="text-sm font-mono uppercase opacity-70">{d.year}</div>
              <div>
                <div className="text-2xl font-bold">{d.markets}</div>
                <div className="text-lg opacity-80">{d.orders} Orders</div>
              </div>
            </div>
          ))}
        </div>
      )
    },

    // SLIDE 17: Customer Economics
    {
      title: "Customer Economics",
      content: (
        <div className="flex flex-col md:flex-row gap-8 mt-12">
           <div className="flex-1 p-10 bg-zinc-900 rounded-3xl text-center">
              <div className="text-zinc-500 mb-2 uppercase tracking-tighter">CAC</div>
              <div className="text-6xl font-bold text-white">$20</div>
           </div>
           <div className="flex items-center justify-center text-4xl text-orange-500 font-bold">VS</div>
           <div className="flex-1 p-10 bg-orange-500 rounded-3xl text-center text-black">
              <div className="opacity-70 mb-2 uppercase tracking-tighter font-bold">LTV</div>
              <div className="text-6xl font-bold">$59</div>
           </div>
           <div className="w-full md:w-48 flex flex-col items-center justify-center p-6 bg-zinc-800 rounded-3xl">
              <div className="text-3xl font-bold text-green-500">3:1</div>
              <div className="text-xs text-zinc-500 font-mono">LTV:CAC</div>
           </div>
        </div>
      )
    },

    // SLIDE 18-19: Financial Outlook
    {
      title: "Financial Outlook",
      content: (
        <div className="space-y-6 mt-8">
          <div className="grid grid-cols-3 gap-6">
            <div className="p-6 bg-zinc-900 rounded-xl">
              <p className="text-zinc-500 text-sm">2026 Revenue</p>
              <h4 className="text-3xl font-bold">$5M</h4>
              <p className="text-green-500 text-xs">Break-even</p>
            </div>
            <div className="p-6 bg-zinc-900 rounded-xl">
              <p className="text-zinc-500 text-sm">2027 Revenue</p>
              <h4 className="text-3xl font-bold text-orange-500">$18M</h4>
              <p className="text-zinc-300 text-xs">$2.5M Profit</p>
            </div>
            <div className="p-6 bg-orange-500 rounded-xl text-black">
              <p className="opacity-80 text-sm">2028 Revenue</p>
              <h4 className="text-3xl font-bold">$40M+</h4>
              <p className="font-bold text-xs">$8M+ Profit</p>
            </div>
          </div>
          <div className="h-48 bg-zinc-900 rounded-xl border border-zinc-800 flex items-end p-6 gap-4">
             <div className="w-full bg-orange-500/20 h-1/4 rounded-t"></div>
             <div className="w-full bg-orange-500/40 h-1/2 rounded-t"></div>
             <div className="w-full bg-orange-500 h-full rounded-t"></div>
          </div>
        </div>
      )
    },

    // SLIDE 20-21: Competitive Landscape & Why We Win
    {
      title: "Why We Win",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <div className="p-8 bg-zinc-900 rounded-2xl border-l-4 border-orange-500">
             <h4 className="text-xl font-bold mb-4">Focused Local Play</h4>
             <p className="text-zinc-400">Incumbents (DoorDash/Uber) optimize for national scale. We optimize for local density and driver retention in specific corridors.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Fees", val: "Lower" },
              { label: "Payouts", val: "Better" },
              { label: "Density", val: "Faster" },
              { label: "Growth", val: "Disciplined" }
            ].map((item, i) => (
              <div key={i} className="p-4 bg-zinc-800 rounded-lg text-center">
                <p className="text-xs text-zinc-500 uppercase">{item.label}</p>
                <p className="text-lg font-bold text-orange-500">{item.val}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },

    // SLIDE 24: The Ask
    {
      title: "The Ask",
      content: (
        <div className="flex flex-col items-center justify-center mt-12 space-y-8">
           <div className="text-8xl font-black text-orange-500 tracking-tighter">$3M</div>
           <div className="text-2xl font-medium uppercase tracking-widest text-zinc-400">Seed Round</div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
              {["Launch Markets", "Prove Economics", "Reach Break-even"].map((goal, i) => (
                <div key={i} className="px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-full text-center font-bold">
                  {goal}
                </div>
              ))}
           </div>
        </div>
      )
    },

    // SLIDE 25: Use of Funds
    {
      title: "Use of Funds",
      content: (
        <div className="mt-12 space-y-4">
          {[
            { label: "Market Launch & Ops", pct: 38, color: "bg-orange-500" },
            { label: "Liquidity Creation", pct: 27, color: "bg-orange-600" },
            { label: "Product & Infrastructure", pct: 22, color: "bg-zinc-700" },
            { label: "Customer Acquisition", pct: 10, color: "bg-zinc-800" },
            { label: "G&A Buffer", pct: 3, color: "bg-zinc-900" },
          ].map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm font-mono">
                <span>{item.label}</span>
                <span className="font-bold">{item.pct}%</span>
              </div>
              <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`${item.color} h-full`} style={{ width: `${item.pct}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      )
    },

    // SLIDE 26: Closing
    {
      type: 'hero',
      title: "Crave'n",
      subtitle: "Building sustainable local delivery where incumbents cannot",
      content: (
        <div className="mt-12">
          <button 
            onClick={() => setCurrentSlide(0)}
            className="px-8 py-3 bg-orange-500 text-black font-bold rounded-full hover:bg-orange-400 transition-colors flex items-center gap-2"
          >
            Restart Presentation <ChevronRight size={18} />
          </button>
        </div>
      )
    }
  ];

  const next = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      if (e.key === 'ArrowLeft') prev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500 selection:text-black overflow-hidden flex flex-col">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-zinc-900 z-50">
        <div 
          className="h-full bg-orange-500 transition-all duration-300" 
          style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* Main Slide Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-6xl transition-all duration-500 transform translate-y-0 opacity-100">
          
          {slide.type === 'hero' ? (
            <div className="text-center space-y-6">
              {slide.tag && (
                <span className="px-4 py-1 border border-orange-500/50 text-orange-500 rounded-full text-xs font-mono uppercase tracking-[0.2em]">
                  {slide.tag}
                </span>
              )}
              <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white">
                {slide.title}
              </h1>
              <p className="text-xl md:text-3xl text-zinc-400 max-w-3xl mx-auto font-light leading-relaxed">
                {slide.subtitle}
              </p>
              {slide.content}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-10 w-2 bg-orange-500 rounded-full"></div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{slide.title}</h2>
              </div>
              {slide.subtitle && (
                <p className="text-xl text-zinc-500 font-light -mt-4 mb-8 italic">{slide.subtitle}</p>
              )}
              <div className="slide-body">
                {slide.content}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="p-8 flex items-center justify-between border-t border-zinc-900 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-600">
          <span className="text-orange-500 font-bold">{String(currentSlide + 1).padStart(2, '0')}</span>
          <span className="opacity-30">/</span>
          <span>{String(slides.length).padStart(2, '0')}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={prev}
            className="p-3 hover:bg-zinc-800 rounded-full transition-colors border border-transparent hover:border-zinc-700"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={next}
            className="p-3 bg-white text-black hover:bg-orange-500 hover:text-white rounded-full transition-all flex items-center gap-2 font-bold px-6 group"
          >
            {currentSlide === slides.length - 1 ? "Restart" : "Next"}
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </footer>

      {/* Background Decor */}
      <div className="fixed -bottom-32 -left-32 w-96 h-96 bg-orange-500/5 blur-[120px] pointer-events-none"></div>
      <div className="fixed -top-32 -right-32 w-96 h-96 bg-orange-500/5 blur-[120px] pointer-events-none"></div>
    </div>
  );
};

export default PitchDeckPresentation;

