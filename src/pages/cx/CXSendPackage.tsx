import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, MapPin, User, Phone, Box, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Size = "envelope" | "small" | "medium" | "large";

const SIZE_OPTIONS: { id: Size; title: string; desc: string; price: number }[] = [
  { id: "envelope", title: "Envelope", desc: "Up to 1 lb · documents", price: 6.99 },
  { id: "small", title: "Small box", desc: "Up to 5 lbs · shoebox", price: 9.99 },
  { id: "medium", title: "Medium box", desc: "Up to 20 lbs · carry-on", price: 14.99 },
  { id: "large", title: "Large item", desc: "Up to 50 lbs · fits in a sedan", price: 22.99 },
];

const SPEED_OPTIONS = [
  { id: "asap", title: "ASAP", desc: "Picked up in 30 min", extra: 0 },
  { id: "2hr", title: "Within 2 hours", desc: "Flexible window", extra: -2 },
  { id: "scheduled", title: "Schedule for later", desc: "Pick a time", extra: 0 },
];

export default function CXSendPackage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [size, setSize] = useState<Size>("small");
  const [speed, setSpeed] = useState<string>("asap");
  const [pickup, setPickup] = useState({ name: "", phone: "", address: "", notes: "" });
  const [dropoff, setDropoff] = useState({ name: "", phone: "", address: "", notes: "" });
  const [description, setDescription] = useState("");

  useEffect(() => {
    document.title = "Send a Package — Crave'N Express";
  }, []);

  const sizeMeta = SIZE_OPTIONS.find((s) => s.id === size)!;
  const speedMeta = SPEED_OPTIONS.find((s) => s.id === speed)!;
  const total = Math.max(4.99, sizeMeta.price + speedMeta.extra);

  const submit = () => {
    if (!pickup.address || !dropoff.address) {
      toast({ title: "Missing address", description: "Pickup and drop-off addresses are required.", variant: "destructive" });
      return;
    }
    toast({ title: "Request submitted", description: "We're finding a Feeder to pick up your package." });
    setTimeout(() => navigate("/"), 1200);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 rounded-md hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-orange-500 grid place-items-center text-white text-xs font-bold">CX</div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Send a Package</div>
              <div className="text-[11px] text-slate-500">Crave'N Express · same-day courier</div>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`flex-1 h-1.5 rounded-full ${step >= n ? "bg-orange-500" : "bg-slate-200"}`} />
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {step === 1 && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">What are you sending?</h1>
              <p className="text-sm text-slate-500 mt-1">Pick the size that best fits your item.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSize(opt.id)}
                  className={`text-left p-4 rounded-xl border-2 transition ${
                    size === opt.id ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <Box className={`h-5 w-5 ${size === opt.id ? "text-orange-500" : "text-slate-400"}`} />
                    <span className="font-semibold text-slate-900">${opt.price.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 font-semibold">{opt.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
            <div>
              <Label htmlFor="desc" className="text-sm">Item description (optional)</Label>
              <Textarea
                id="desc"
                placeholder="e.g. Birthday gift, fragile vase"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <h2 className="font-semibold mb-2">When?</h2>
              <div className="space-y-2">
                {SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSpeed(opt.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${
                      speed === opt.id ? "border-teal-500 bg-teal-50" : "border-slate-200"
                    }`}
                  >
                    <Clock className={`h-5 w-5 ${speed === opt.id ? "text-teal-600" : "text-slate-400"}`} />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{opt.title}</div>
                      <div className="text-xs text-slate-500">{opt.desc}</div>
                    </div>
                    {opt.extra !== 0 && (
                      <span className="text-xs font-semibold text-teal-700">{opt.extra > 0 ? "+" : ""}${Math.abs(opt.extra).toFixed(2)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Pickup &amp; drop-off</h1>
              <p className="text-sm text-slate-500 mt-1">Tell the courier where to go.</p>
            </div>

            {[
              { title: "Pickup", icon: MapPin, color: "orange", state: pickup, set: setPickup },
              { title: "Drop-off", icon: MapPin, color: "teal", state: dropoff, set: setDropoff },
            ].map(({ title, icon: Icon, color, state, set }) => (
              <div key={title} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color === "orange" ? "text-orange-500" : "text-teal-600"}`} />
                  <h3 className="font-semibold">{title}</h3>
                </div>
                <div>
                  <Label className="text-xs">Address</Label>
                  <Input value={state.address} onChange={(e) => set({ ...state, address: e.target.value })} placeholder="Street, city, state" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Contact name</Label>
                    <Input value={state.name} onChange={(e) => set({ ...state, name: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input type="tel" value={state.phone} onChange={(e) => set({ ...state, phone: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notes (gate code, apt #, etc.)</Label>
                  <Input value={state.notes} onChange={(e) => set({ ...state, notes: e.target.value })} className="mt-1" />
                </div>
              </div>
            ))}
          </section>
        )}

        {step === 3 && (
          <section className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold">Review &amp; confirm</h1>
              <p className="text-sm text-slate-500 mt-1">Double-check the details before we dispatch.</p>
            </div>
            <div className="rounded-xl border border-slate-200 divide-y">
              <Row label="Item" value={`${sizeMeta.title} · ${sizeMeta.desc}`} />
              {description && <Row label="Description" value={description} />}
              <Row label="Speed" value={speedMeta.title} />
              <Row label="Pickup" value={pickup.address || "—"} sub={pickup.name ? `${pickup.name} · ${pickup.phone}` : undefined} />
              <Row label="Drop-off" value={dropoff.address || "—"} sub={dropoff.name ? `${dropoff.name} · ${dropoff.phone}` : undefined} />
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="flex justify-between text-sm"><span className="text-slate-600">Courier fee</span><span>${sizeMeta.price.toFixed(2)}</span></div>
              {speedMeta.extra !== 0 && (
                <div className="flex justify-between text-sm mt-1"><span className="text-slate-600">Timing</span><span>{speedMeta.extra > 0 ? "+" : "-"}${Math.abs(speedMeta.extra).toFixed(2)}</span></div>
              )}
              <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between font-semibold">
                <span>Total</span><span className="text-orange-600">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
              <p>Proof-of-pickup and proof-of-delivery photos are captured by the courier. Items up to $100 are covered by Crave'N's standard protection.</p>
            </div>
          </section>
        )}
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 z-40">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} className="flex-1">Back</Button>
          ) : (
            <div className="hidden sm:block flex-1 text-xs text-slate-500">
              <span className="font-semibold text-slate-900">${total.toFixed(2)}</span> estimated total
            </div>
          )}
          {step < 3 ? (
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}>
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={submit}>
              <Package className="h-4 w-4 mr-2" /> Request pickup · ${total.toFixed(2)}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-4 py-3 flex items-start justify-between gap-4">
      <span className="text-xs uppercase tracking-wide text-slate-500 mt-0.5">{label}</span>
      <div className="text-right">
        <div className="text-sm font-medium text-slate-900">{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
