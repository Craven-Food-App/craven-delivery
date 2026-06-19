import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Truck, Route, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function CXLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] via-[#0F172A] to-[#1E293B] text-white">
      <Helmet>
        <title>Crave'N Express (CX) — On-Demand Couriers, Powered by Crave'N</title>
        <meta name="description" content="Crave'N Express (CX) gives courier companies instant access to thousands of Feeder drivers for on-demand, scheduled, and multi-stop deliveries. Set your driver payout, we handle dispatch." />
        <link rel="canonical" href="https://cravenusa.com/cx" />
      </Helmet>

      <header className="px-4 sm:px-8 py-5 flex items-center justify-between border-b border-white/10">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-orange-500 grid place-items-center font-bold text-white">CX</div>
          <div className="leading-tight">
            <div className="text-sm tracking-wide text-orange-400 font-semibold">CRAVE'N EXPRESS</div>
            <div className="text-xs text-slate-300">Courier marketplace</div>
          </div>
        </Link>
        <Link to="/cx/portal" className="text-sm text-slate-200 hover:text-white underline-offset-4 hover:underline">
          Already a courier? Sign in
        </Link>
      </header>

      <main className="px-4 sm:px-8 max-w-6xl mx-auto pt-12 pb-20">
        <section className="text-center">
          <span className="inline-block text-xs tracking-[0.2em] text-orange-400 font-semibold uppercase mb-4">
            Crave'N Express · CX
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            On-demand drivers,<br/>
            <span className="text-orange-500">on your terms.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
            Courier companies, retailers, and local businesses tap into Crave'N's Feeder network for
            same-day pickups, scheduled runs, and multi-stop routes. You set the driver payout. We dispatch.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
              <Link to="/cx/signup">Sign up as a courier <ArrowRight className="ml-2 h-4 w-4"/></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Link to="/cx/portal">Open courier portal</Link>
            </Button>
          </div>
        </section>

        <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Clock, title: "On-demand", body: "Post a single pickup → dropoff. Nearest opted-in Feeder accepts in seconds." },
            { icon: Truck, title: "Scheduled", body: "Book drivers ahead for time-windowed pickups across your service area." },
            { icon: Route, title: "Bulk routes", body: "Drop in 10+ stops. We optimize the route via Google Maps and assign one driver." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Icon className="h-6 w-6 text-orange-400 mb-3"/>
              <div className="text-lg font-semibold">{title}</div>
              <p className="text-sm text-slate-300 mt-1">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-3xl bg-white/5 border border-white/10 p-6 sm:p-10">
          <div className="flex items-start gap-4">
            <ShieldCheck className="h-7 w-7 text-orange-400 shrink-0 mt-1"/>
            <div>
              <h2 className="text-2xl font-bold">Stacked, transparent pricing</h2>
              <p className="text-slate-300 mt-2">
                You decide what the driver earns per job. Crave'N adds a flat platform base fee on top.
                Drivers see your offer up front — higher payouts mean faster acceptance.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-xl bg-black/30 p-4">
                  <div className="text-slate-400 text-xs uppercase tracking-wide">You set</div>
                  <div className="text-orange-400 font-bold text-lg mt-1">Driver payout</div>
                </div>
                <div className="rounded-xl bg-black/30 p-4">
                  <div className="text-slate-400 text-xs uppercase tracking-wide">We add</div>
                  <div className="text-white font-bold text-lg mt-1">Platform base</div>
                </div>
                <div className="rounded-xl bg-orange-500/20 p-4 border border-orange-500/40">
                  <div className="text-orange-200 text-xs uppercase tracking-wide">Your total</div>
                  <div className="text-white font-bold text-lg mt-1">Per job</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-4 sm:px-8 py-8 border-t border-white/10 text-center text-xs text-slate-400">
        Crave'N Express is a service of Crave'N, Inc. · <Link to="/legal/terms" className="underline-offset-4 hover:underline">Terms</Link> · <Link to="/privacy-policy" className="underline-offset-4 hover:underline">Privacy</Link>
      </footer>
    </div>
  );
}