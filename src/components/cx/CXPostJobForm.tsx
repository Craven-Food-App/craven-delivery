// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type JobType = "on_demand" | "scheduled" | "bulk_route";

export function CXPostJobForm({
  restaurant, userId, onPosted,
}: { restaurant: any; userId: string; onPosted: () => void }) {
  const [jobType, setJobType] = useState<JobType>("on_demand");
  const [pickupAt, setPickupAt] = useState<string>("");
  const [payoutDollars, setPayoutDollars] = useState<string>("8.00");
  const [notes, setNotes] = useState("");
  const [pickup, setPickup] = useState({ address: "", contact_name: "", contact_phone: "" });
  const [dropoffs, setDropoffs] = useState([{ address: "", contact_name: "", contact_phone: "", package_description: "" }]);
  const [pricing, setPricing] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cx_pricing_config").select("*")
        .eq("active", true).eq("job_type", jobType).maybeSingle();
      setPricing(data);
    })();
  }, [jobType]);

  const payoutCents = Math.round(parseFloat(payoutDollars || "0") * 100);
  const baseCents = pricing?.platform_base_cents ?? 0;
  const minCents = (pricing?.minimum_driver_payout_cents ?? 0)
    + (pricing?.per_stop_floor_cents ?? 0) * dropoffs.length;
  const totalCents = payoutCents + baseCents;
  const belowFloor = payoutCents < minCents;

  const addStop = () => setDropoffs((d) => [...d, { address: "", contact_name: "", contact_phone: "", package_description: "" }]);
  const removeStop = (i: number) => setDropoffs((d) => d.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!pickup.address || dropoffs.some((d) => !d.address)) {
      toast.error("All addresses are required"); return;
    }
    if (belowFloor) {
      toast.error(`Driver payout must be at least $${(minCents/100).toFixed(2)} for this job`); return;
    }
    if (jobType === "scheduled" && !pickupAt) {
      toast.error("Pick a scheduled pickup time"); return;
    }
    setSubmitting(true);
    try {
      const { data: job, error } = await supabase.from("cx_jobs").insert({
        courier_restaurant_id: restaurant.id,
        created_by: userId,
        job_type: jobType,
        status: "posted",
        pickup_at: jobType === "scheduled" ? new Date(pickupAt).toISOString() : null,
        driver_payout_offer_cents: payoutCents,
        platform_base_cents: baseCents,
        notes,
        region_id: restaurant.region_id ?? null,
      }).select().single();
      if (error) throw error;

      const stopsPayload = [
        { job_id: job.id, sequence: 0, stop_type: "pickup", ...pickup },
        ...dropoffs.map((d, i) => ({ job_id: job.id, sequence: i + 1, stop_type: "dropoff", ...d })),
      ];
      const { error: e2 } = await supabase.from("cx_job_stops").insert(stopsPayload);
      if (e2) throw e2;

      await supabase.from("cx_job_events").insert({
        job_id: job.id, actor_id: userId, event_type: "posted",
        metadata: { stops: stopsPayload.length, payout_cents: payoutCents },
      });

      supabase.functions.invoke("cx-dispatch-job", { body: { job_id: job.id } }).catch(() => {});

      toast.success("Job posted — dispatching now");
      onPosted();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not post job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Job type</div>
        <div className="grid grid-cols-3 gap-2">
          {(["on_demand","scheduled","bulk_route"] as JobType[]).map((t) => (
            <button key={t} onClick={() => setJobType(t)}
              className={`p-3 rounded-lg border text-sm font-medium transition ${
                jobType === t ? "bg-orange-500 text-white border-orange-500" : "bg-white border-slate-200 hover:border-orange-300"
              }`}>
              {t === "on_demand" ? "On-demand" : t === "scheduled" ? "Scheduled" : "Bulk route"}
            </button>
          ))}
        </div>
        {jobType === "scheduled" && (
          <div className="mt-3">
            <Label>Pickup time</Label>
            <Input type="datetime-local" value={pickupAt} onChange={(e) => setPickupAt(e.target.value)} className="mt-1"/>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Pickup</div>
        <Input placeholder="Pickup address" value={pickup.address} onChange={(e) => setPickup({...pickup, address: e.target.value})}/>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Input placeholder="Contact name" value={pickup.contact_name} onChange={(e) => setPickup({...pickup, contact_name: e.target.value})}/>
          <Input placeholder="Phone" value={pickup.contact_phone} onChange={(e) => setPickup({...pickup, contact_phone: e.target.value})}/>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">Drop-off{dropoffs.length>1?"s":""}</div>
          {jobType === "bulk_route" && (
            <Button size="sm" variant="outline" onClick={addStop}><Plus className="h-3 w-3 mr-1"/>Add stop</Button>
          )}
        </div>
        <div className="space-y-3">
          {dropoffs.map((d, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-600">Stop {i+1}</div>
                {dropoffs.length > 1 && (
                  <button onClick={() => removeStop(i)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5"/></button>
                )}
              </div>
              <Input placeholder="Address" value={d.address} onChange={(e) => {
                const c = [...dropoffs]; c[i].address = e.target.value; setDropoffs(c);
              }}/>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Contact" value={d.contact_name} onChange={(e) => {
                  const c = [...dropoffs]; c[i].contact_name = e.target.value; setDropoffs(c);
                }}/>
                <Input placeholder="Phone" value={d.contact_phone} onChange={(e) => {
                  const c = [...dropoffs]; c[i].contact_phone = e.target.value; setDropoffs(c);
                }}/>
              </div>
              <Input placeholder="Package description" value={d.package_description} onChange={(e) => {
                const c = [...dropoffs]; c[i].package_description = e.target.value; setDropoffs(c);
              }}/>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <Label>Driver payout offer (USD)</Label>
        <Input type="number" step="0.01" min={0} value={payoutDollars}
          onChange={(e) => setPayoutDollars(e.target.value)} className="mt-1"/>
        <div className={`text-xs mt-1 ${belowFloor ? "text-rose-600" : "text-slate-500"}`}>
          Minimum for this job: ${(minCents/100).toFixed(2)}
        </div>
        <div className="mt-3 rounded-lg bg-slate-50 border p-3 text-sm">
          <div className="flex justify-between"><span>Driver payout</span><span className="tabular-nums">${(payoutCents/100).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Crave'N platform base</span><span className="tabular-nums">${(baseCents/100).toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold border-t mt-2 pt-2"><span>You pay</span><span className="tabular-nums">${(totalCents/100).toFixed(2)}</span></div>
        </div>
      </Card>

      <Card className="p-4">
        <Label>Notes for the driver (optional)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="Gate code, parking, fragile, etc."/>
      </Card>

      <Button onClick={submit} disabled={submitting || belowFloor}
        className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base font-semibold">
        {submitting ? "Posting…" : "Post job & dispatch"}
      </Button>
    </div>
  );
}