// @ts-nocheck
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Clock } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-200 text-slate-700",
  posted: "bg-amber-100 text-amber-800",
  offered: "bg-blue-100 text-blue-800",
  accepted: "bg-indigo-100 text-indigo-800",
  en_route_pickup: "bg-indigo-100 text-indigo-800",
  picked_up: "bg-purple-100 text-purple-800",
  en_route_dropoff: "bg-purple-100 text-purple-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-700",
  failed: "bg-rose-100 text-rose-800",
};

export function CXJobList({ jobs }: { jobs: any[] }) {
  if (!jobs?.length) {
    return <div className="text-center py-10 text-sm text-slate-500">No jobs yet.</div>;
  }
  return (
    <div className="space-y-2">
      {jobs.map((j) => {
        const stops = (j.cx_job_stops ?? []).sort((a: any, b: any) => a.sequence - b.sequence);
        const pickup = stops.find((s: any) => s.stop_type === "pickup");
        const dropoff = stops.filter((s: any) => s.stop_type === "dropoff").pop();
        return (
          <div key={j.id} className="rounded-xl border bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge className="bg-orange-500 text-white">{j.job_type.replace("_"," ")}</Badge>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[j.status] ?? "bg-slate-100 text-slate-700"}`}>
                  {j.status.replace(/_/g," ")}
                </span>
              </div>
              <div className="text-sm font-semibold tabular-nums">
                ${((j.total_charge_cents || 0) / 100).toFixed(2)}
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-700 flex items-center gap-1 truncate">
              <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0"/>
              <span className="truncate">{pickup?.address ?? "—"}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0"/>
              <span className="truncate">{dropoff?.address ?? "—"}</span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{new Date(j.created_at).toLocaleString()}</span>
              <span className="tabular-nums">Driver: ${((j.driver_payout_offer_cents||0)/100).toFixed(2)}</span>
              <span className="tabular-nums">+ Base: ${((j.platform_base_cents||0)/100).toFixed(2)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}