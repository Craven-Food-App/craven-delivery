import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Truck, PackageCheck, MapPin, Clock } from "lucide-react";

const features = [
  { icon: Truck, title: "On-demand & scheduled", desc: "Single pickup, scheduled windows, or multi-stop bulk routes." },
  { icon: MapPin, title: "Optimized routing", desc: "Stops automatically sequenced to keep drive time and cost down." },
  { icon: PackageCheck, title: "Same platform you trust", desc: "Couriers use the standard Crave'N merchant portal, billed like any other merchant." },
  { icon: Clock, title: "Live Feeder dispatch", desc: "Verified couriers get first dibs; falls back to any opted-in Feeder." },
];

const CXIntroSection = () => {
  return (
    <section className="py-16 px-4 bg-[#0F172A] text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-10 lg:items-end justify-between mb-10">
          <div className="max-w-2xl">
            <span className="inline-block text-xs font-bold tracking-[0.2em] text-orange-400 mb-3">
              INTRODUCING CRAVE'N EXPRESS · CX
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">
              Courier &amp; same-day delivery, powered by the Crave'N Feeder network.
            </h2>
            <p className="text-slate-300 mt-4 text-base md:text-lg">
              Crave'N Express is the dispatch arm of Crave'N for courier and delivery
              companies. Sign your courier service up as a merchant, post pickups,
              schedule routes, and tap into thousands of opted-in Crave'N Feeders —
              all from the same merchant portal restaurants and retailers already use.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
              <Link to="/cx/apply">Sign up as a courier company</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent">
              <Link to="/cx">Need a courier? Find one →</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl bg-white/5 border border-white/10 p-5">
              <f.icon className="h-6 w-6 text-orange-400 mb-3" />
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CXIntroSection;