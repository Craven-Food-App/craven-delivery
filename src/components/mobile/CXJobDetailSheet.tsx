// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, DollarSign, ArrowRight, HelpCircle } from "lucide-react";

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;

function metersToMiles(m?: number | null) {
  if (!m) return null;
  return m / 1609.344;
}
function secondsToHrMin(s?: number | null) {
  if (!s) return null;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}hr ${m}min` : `${m}min`;
}
function cityState(addr?: string | null) {
  if (!addr) return "—";
  // grab "City, ST" if present
  const parts = addr.split(",").map((p) => p.trim());
  if (parts.length >= 3) {
    const st = parts[parts.length - 2].split(" ")[0] || parts[parts.length - 2];
    return `${parts[parts.length - 3]}, ${st}`;
  }
  return parts.slice(0, 2).join(", ");
}
function completeByTime(job: any) {
  const t = job.dispatch_deadline_at || job.expires_at || null;
  if (!t) return { time: "Flexible", day: "" };
  const d = new Date(t);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  return { time, day: isToday ? "Today" : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) };
}

function staticMapUrl(stops: any[]) {
  if (!BROWSER_KEY || stops.length === 0) return null;
  const markers: string[] = [];
  const pickup = stops.find((s) => s.stop_type === "pickup");
  const dropoffs = stops.filter((s) => s.stop_type === "dropoff");
  if (pickup?.latitude && pickup?.longitude) {
    markers.push(`markers=color:0x0F172A%7Clabel:S%7C${pickup.latitude},${pickup.longitude}`);
  }
  const last = dropoffs[dropoffs.length - 1];
  if (last?.latitude && last?.longitude) {
    markers.push(`markers=color:0x0F172A%7Clabel:E%7C${last.latitude},${last.longitude}`);
  }
  dropoffs.slice(0, -1).forEach((d) => {
    if (d.latitude && d.longitude) markers.push(`markers=size:small%7Ccolor:0x0F172A%7C${d.latitude},${d.longitude}`);
  });
  const pathPts = stops
    .filter((s) => s.latitude && s.longitude)
    .map((s) => `${s.latitude},${s.longitude}`)
    .join("%7C");
  const path = pathPts ? `&path=color:0x0F172AFF%7Cweight:4%7C${pathPts}` : "";
  return `https://maps.googleapis.com/maps/api/staticmap?size=640x320&scale=2&maptype=roadmap&${markers.join("&")}${path}&key=${BROWSER_KEY}`;
}

export function CXJobDetailSheet({
  job,
  onClose,
  onAccept,
  busy,
}: {
  job: any;
  onClose: () => void;
  onAccept: () => void;
  busy: boolean;
}) {
  const [merchantName, setMerchantName] = useState<string>("");
  const [showItems, setShowItems] = useState(false);

  const stops = useMemo(
    () => (job.cx_job_stops ?? []).slice().sort((a: any, b: any) => a.sequence - b.sequence),
    [job],
  );
  const pickup = stops.find((s: any) => s.stop_type === "pickup");
  const dropoffs = stops.filter((s: any) => s.stop_type === "dropoff");

  useEffect(() => {
    (async () => {
      if (!job.courier_restaurant_id) return;
      const { data } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", job.courier_restaurant_id)
        .maybeSingle();
      setMerchantName(data?.name ?? "Courier Job");
    })();
  }, [job.courier_restaurant_id]);

  const miles = metersToMiles(job.estimated_distance_meters);
  const dur = secondsToHrMin(job.estimated_duration_seconds);
  const due = completeByTime(job);
  const payout = ((job.driver_payout_offer_cents || 0) / 100).toFixed(2);
  const mapUrl = staticMapUrl(stops);

  if (showItems) {
    return <ItemSummaryView stops={dropoffs} pickup={pickup} onBack={() => setShowItems(false)} job={job} />;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      {/* Header */}
      <div
        className="bg-[#0F2A2A] text-white px-4 pb-3 flex items-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <button onClick={onClose} className="p-1 -ml-1" aria-label="Close">
          <X className="h-6 w-6" />
        </button>
        <div className="flex-1 text-center text-base font-semibold pr-6">Available Gig</div>
      </div>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto">
        {/* Map */}
        <div className="bg-slate-200 h-64 w-full relative">
          {mapUrl ? (
            <img src={mapUrl} alt="Route map" className="w-full h-full object-cover" />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">Map unavailable</div>
          )}
        </div>

        {/* Merchant + price */}
        <div className="px-5 pt-5 text-center">
          <div className="text-xs tracking-widest text-slate-500 font-semibold uppercase">
            {merchantName || "Courier Job"}
          </div>
          <div className="text-5xl font-extrabold mt-2 tabular-nums text-slate-900">${payout}</div>
          <div className="text-sm text-slate-700 mt-2">
            {miles ? `${miles.toFixed(0)} mi` : "—"}{dur ? ` (${dur})` : ""} · {dropoffs.length} {dropoffs.length === 1 ? "Delivery" : "Deliveries"}
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mt-1">
            <span>{cityState(pickup?.address)}</span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span>{cityState(dropoffs[dropoffs.length - 1]?.address)}</span>
          </div>

          {/* Toll/parking pill */}
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full border-2 border-emerald-400/70 bg-emerald-50/40">
            <span className="h-5 w-5 rounded-full border-2 border-emerald-600 flex items-center justify-center">
              <DollarSign className="h-3 w-3 text-emerald-700" />
            </span>
            <span className="text-xs font-semibold tracking-wider text-slate-800">TOLL/PARKING REIMBURSED</span>
          </div>
        </div>

        {/* Pickup / Complete by */}
        <div className="grid grid-cols-2 gap-3 px-5 mt-6">
          <div>
            <div className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold tracking-widest px-2 py-1 rounded">
              PICK UP
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2 leading-tight">
              {job.pickup_at ? new Date(job.pickup_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Immediately"}
            </div>
            <div className="text-xs text-slate-500 mt-1">After Acceptance</div>
          </div>
          <div className="text-right">
            <div className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold tracking-widest px-2 py-1 rounded">
              COMPLETE BY
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2 leading-tight">{due.time}</div>
            <div className="text-xs text-slate-500 mt-1">{due.day}</div>
          </div>
        </div>

        {/* Item Summary */}
        <div className="px-5 mt-6">
          <div className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold tracking-widest px-2 py-1 rounded">
            ITEM SUMMARY
          </div>
          <div className="mt-3 border rounded-xl p-4 grid grid-cols-2 gap-y-4">
            <SummaryCell label="Total Items" value={String(dropoffs.length)} />
            <SummaryCell label="Job Type" value={(job.job_type || "").replace(/_/g, " ")} />
            <SummaryCell label="Stops" value={String(stops.length)} />
            <SummaryCell label="Distance" value={miles ? `${miles.toFixed(0)} mi` : "—"} />
            <button
              onClick={() => setShowItems(true)}
              className="col-span-2 text-emerald-700 text-sm font-semibold py-1"
            >
              View All Items
            </button>
          </div>
        </div>

        {/* Delivery Summary */}
        <div className="px-5 mt-6 pb-32">
          <div className="flex items-center justify-between">
            <div className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold tracking-widest px-2 py-1 rounded">
              DELIVERY SUMMARY
            </div>
          </div>
          <div className="mt-3 flex items-start justify-between">
            <div className="text-2xl font-bold text-slate-900">
              {dropoffs.length} {dropoffs.length === 1 ? "Delivery" : "Deliveries"}
            </div>
            <button onClick={() => setShowItems(true)} className="text-emerald-700 text-sm font-semibold">
              View All
            </button>
          </div>
          {job.notes && (
            <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line">{job.notes}</p>
          )}
        </div>
      </div>

      {/* Sticky accept button */}
      <div
        className="border-t bg-white px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <Button
          disabled={busy}
          onClick={onAccept}
          className="w-full h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-base font-bold tracking-wide"
        >
          {busy ? "ACCEPTING…" : "ACCEPT JOB"}
        </Button>
      </div>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold text-slate-900 mt-0.5 capitalize">{value}</div>
    </div>
  );
}

function ItemSummaryView({ stops, pickup, onBack, job }: { stops: any[]; pickup: any; onBack: () => void; job: any }) {
  const totalItems = stops.reduce((acc, s) => acc + (Number(s.package_quantity) || 1), 0);
  return (
    <div className="fixed inset-0 z-[110] bg-white flex flex-col">
      <div
        className="bg-[#0F2A2A] text-white px-4 pb-3 flex items-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <button onClick={onBack} className="p-1 -ml-1" aria-label="Back">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 text-center text-base font-semibold pr-6">Item Summary</div>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Item Summary</h2>
          <HelpCircle className="h-5 w-5 text-slate-400" />
        </div>
        <div className="mt-4 border rounded-xl p-4 grid grid-cols-2 gap-y-4">
          <SummaryCell label="Total Items" value={String(totalItems)} />
          <SummaryCell label="Job Type" value={(job.job_type || "").replace(/_/g, " ")} />
          <SummaryCell label="Stops" value={String(stops.length)} />
          <SummaryCell label="Status" value="Available" />
        </div>

        {pickup && (
          <div className="mt-6">
            <div className="text-sm text-slate-500">Pickup</div>
            <div className="border-t mt-2 pt-3 text-sm text-slate-800">
              <div className="font-medium">{pickup.address}</div>
              {pickup.contact_name && <div className="text-slate-600 mt-1">Contact: {pickup.contact_name}</div>}
              {pickup.pickup_instructions && (
                <div className="mt-2 rounded-lg bg-orange-50 border border-orange-200 p-3">
                  <div className="text-[10px] font-bold tracking-widest text-orange-700 uppercase mb-1">
                    Pickup Instructions
                  </div>
                  <div className="text-sm text-slate-800 whitespace-pre-line">{pickup.pickup_instructions}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-6">
          {stops.map((s, i) => (
            <div key={s.id ?? i}>
              <div className="text-sm text-slate-500">Drop-off {i + 1}</div>
              <div className="border-t mt-2 pt-2 text-sm text-slate-800">
                <div className="font-medium">{s.address}</div>
                {s.contact_name && <div className="text-slate-600 mt-1">Contact: {s.contact_name}</div>}

                {(s.package_image_url || s.package_weight_lbs || s.package_dimensions || s.package_quantity || s.package_description) && (
                  <div className="mt-3 rounded-xl border bg-slate-50 overflow-hidden">
                    {s.package_image_url && (
                      <img
                        src={s.package_image_url}
                        alt="Package"
                        className="w-full h-40 object-cover bg-slate-200"
                        onError={(e) => ((e.currentTarget.style.display = "none"))}
                      />
                    )}
                    <div className="p-3 grid grid-cols-3 gap-3">
                      <PkgCell label="Qty" value={s.package_quantity ? String(s.package_quantity) : "1"} />
                      <PkgCell label="Weight" value={s.package_weight_lbs ? `${s.package_weight_lbs} lbs` : "—"} />
                      <PkgCell label="Dimensions" value={s.package_dimensions ?? "—"} />
                    </div>
                    {s.package_description && (
                      <div className="px-3 pb-3 text-xs text-slate-600">{s.package_description}</div>
                    )}
                  </div>
                )}

                {s.pickup_instructions && (
                  <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <div className="text-[10px] font-bold tracking-widest text-amber-700 uppercase mb-1">
                      Delivery Instructions
                    </div>
                    <div className="text-sm text-slate-800 whitespace-pre-line">{s.pickup_instructions}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PkgCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className="text-sm font-semibold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}