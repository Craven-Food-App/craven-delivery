// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MapPin, ArrowRight, Clock, Phone, MessageSquare, LifeBuoy, User,
  Car, Star, Package, FileImage, PenLine, Navigation, ShieldCheck,
  CheckCircle2, Copy
} from "lucide-react";

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

function fmt(ts?: string | null) {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function ProofImage({ src, alt }: { src?: string | null; alt: string }) {
  const [resolved, setResolved] = useState<string | null>(src && !src.includes("/delivery-photos/") ? src : null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let cancel = false;
    setErr(false);
    if (!src) { setResolved(null); return; }
    const idx = src.indexOf("/delivery-photos/");
    if (idx < 0) { setResolved(src); return; }
    setResolved(null);
    const path = decodeURIComponent(src.substring(idx + "/delivery-photos/".length).split("?")[0]);
    supabase.storage.from("delivery-photos").createSignedUrl(path, 60 * 60).then(({ data, error }) => {
      if (cancel) return;
      if (error || !data?.signedUrl) { setResolved(src); setErr(true); return; }
      setResolved(data.signedUrl);
    });
    return () => { cancel = true; };
  }, [src]);
  if (!src) return <div className="aspect-video w-full rounded-md bg-slate-100 grid place-items-center text-xs text-slate-400">No photo</div>;
  if (!resolved) return <div className="aspect-video w-full rounded-md bg-slate-100 grid place-items-center text-xs text-slate-400">Loading…</div>;
  if (err) return <div className="aspect-video w-full rounded-md bg-slate-100 grid place-items-center text-xs text-rose-500">Photo unavailable</div>;
  return <img src={resolved} alt={alt} className="w-full rounded-md object-cover max-h-64 border" />;
}

export function CXJobDetailModal({ job, open, onOpenChange }: { job: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [driver, setDriver] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);

  const stops = useMemo(
    () => (job?.cx_job_stops ?? []).slice().sort((a: any, b: any) => a.sequence - b.sequence),
    [job]
  );
  const pickup = stops.find((s: any) => s.stop_type === "pickup");
  const dropoffs = stops.filter((s: any) => s.stop_type === "dropoff");

  useEffect(() => {
    if (!open || !job?.id) return;
    (async () => {
      const [{ data: ev }, drv] = await Promise.all([
        supabase.from("cx_job_events").select("*").eq("job_id", job.id).order("created_at", { ascending: true }),
        job.assigned_driver_id
          ? supabase.from("driver_profiles").select("*").eq("user_id", job.assigned_driver_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      setEvents(ev ?? []);
      let drvFull = drv?.data ?? null;
      if (job.assigned_driver_id) {
        const { data: prof } = await supabase
          .from("user_profiles").select("full_name, phone, email, avatar_url")
          .eq("user_id", job.assigned_driver_id).maybeSingle();
        drvFull = { ...(drvFull || {}), profile: prof };
      }
      setDriver(drvFull);
    })();

    const ch = supabase
      .channel(`cx_job_events_${job.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "cx_job_events", filter: `job_id=eq.${job.id}` },
        (payload: any) => { if (payload.new) setEvents((p) => [...p, payload.new]); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, job?.id]);

  const postNote = async () => {
    if (!note.trim()) return;
    setPosting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cx_job_events").insert({
      job_id: job.id,
      event_type: "merchant_note",
      notes: note.trim(),
      actor_id: user?.id ?? null,
      metadata: { source: "cx_portal" },
    } as any);
    setPosting(false);
    if (error) { toast.error("Could not post note"); return; }
    setNote("");
    toast.success("Note added to job timeline");
  };

  const copyJob = () => {
    navigator.clipboard.writeText(job.id);
    toast.success("Job ID copied");
  };

  if (!job) return null;
  const driverName = driver?.profile?.full_name || "Unassigned";
  const driverPhone = driver?.profile?.phone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 pt-5 pb-3 sticky top-0 bg-white z-10 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Badge className="bg-orange-500 text-white">{job.job_type?.replace("_"," ")}</Badge>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[job.status] ?? "bg-slate-100 text-slate-700"}`}>
                  {job.status?.replace(/_/g," ")}
                </span>
              </DialogTitle>
              <button onClick={copyJob} className="mt-1 text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <Copy className="h-3 w-3" /> Job #{String(job.id).slice(0, 8).toUpperCase()}
              </button>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold tabular-nums">${((job.total_charge_cents || 0) / 100).toFixed(2)}</div>
              <div className="text-[11px] text-slate-500">Driver ${((job.driver_payout_offer_cents || 0)/100).toFixed(2)} · Base ${((job.platform_base_cents || 0)/100).toFixed(2)}</div>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 space-y-5">
          {/* ROUTE SUMMARY */}
          <section className="rounded-lg border bg-slate-50/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Route</div>
            <div className="text-sm flex items-center gap-1 flex-wrap">
              <MapPin className="h-3.5 w-3.5 text-orange-500" />
              <span className="truncate max-w-[40%]">{pickup?.address ?? "—"}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate max-w-[50%]">{dropoffs[dropoffs.length-1]?.address ?? "—"}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div><div className="text-slate-500">Created</div><div className="font-medium">{fmt(job.created_at)}</div></div>
              <div><div className="text-slate-500">Pickup</div><div className="font-medium">{fmt(job.pickup_at)}</div></div>
              <div><div className="text-slate-500">Distance</div><div className="font-medium tabular-nums">{job.estimated_distance_meters ? (job.estimated_distance_meters/1609).toFixed(1)+" mi" : "—"}</div></div>
              <div><div className="text-slate-500">ETA</div><div className="font-medium tabular-nums">{job.estimated_duration_seconds ? Math.round(job.estimated_duration_seconds/60)+" min" : "—"}</div></div>
            </div>
          </section>

          {/* DRIVER */}
          <section className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Assigned Driver</div>
              {driver?.rating != null && (
                <span className="text-[11px] text-amber-600 flex items-center gap-1"><Star className="h-3 w-3 fill-amber-500 text-amber-500" />{Number(driver.rating).toFixed(2)}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200 grid place-items-center overflow-hidden">
                {driver?.profile?.avatar_url
                  ? <img src={driver.profile.avatar_url} alt="" className="h-full w-full object-cover"/>
                  : <User className="h-5 w-5 text-slate-500"/>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{driverName}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                  {driver?.vehicle_make && <span className="flex items-center gap-1"><Car className="h-3 w-3"/>{driver.vehicle_year ?? ""} {driver.vehicle_make} {driver.vehicle_model}</span>}
                  {driver?.license_plate && <span>Plate {driver.license_plate}</span>}
                  {driver?.tier_status && <span className="uppercase">{driver.tier_status}</span>}
                </div>
              </div>
              {job.assigned_driver_id ? (
                <div className="flex items-center gap-1">
                  {driverPhone && (
                    <>
                      <Button asChild size="sm" variant="outline" className="h-8 px-2">
                        <a href={`tel:${driverPhone}`}><Phone className="h-3.5 w-3.5 mr-1"/>Call</a>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8 px-2">
                        <a href={`sms:${driverPhone}`}><MessageSquare className="h-3.5 w-3.5 mr-1"/>Text</a>
                      </Button>
                    </>
                  )}
                </div>
              ) : <span className="text-xs text-slate-400">No driver yet</span>}
            </div>
          </section>

          {/* STOPS WITH PROOF */}
          <section className="space-y-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Pickup & Proof</div>
            {pickup && (
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm flex items-center gap-1"><MapPin className="h-4 w-4 text-orange-500"/>Pickup</div>
                  {pickup.completed_at && <span className="text-[11px] text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/>{fmt(pickup.completed_at)}</span>}
                </div>
                <div className="text-sm mt-1">{pickup.address}</div>
                {(pickup.contact_name || pickup.contact_phone) && (
                  <div className="text-[11px] text-slate-500 mt-1">{pickup.contact_name} {pickup.contact_phone && `· ${pickup.contact_phone}`}</div>
                )}
                {pickup.pickup_instructions && (
                  <div className="mt-2 text-[12px] bg-orange-50 border border-orange-100 rounded p-2 text-orange-900">{pickup.pickup_instructions}</div>
                )}
                <div className="mt-3">
                  <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><FileImage className="h-3 w-3"/>Pickup photo</div>
                  <ProofImage src={pickup.pickup_photo_url} alt="Pickup proof" />
                  {pickup.package_verified_at && (
                    <div className="mt-1 text-[11px] text-emerald-600 flex items-center gap-1"><ShieldCheck className="h-3 w-3"/>Package verified {fmt(pickup.package_verified_at)}</div>
                  )}
                </div>
              </div>
            )}
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Drop-offs & Proof</div>
            {dropoffs.map((d: any, i: number) => (
              <div key={d.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-purple-500"/>Stop {i+1}
                    {d.signature_required && <Badge variant="outline" className="ml-1 border-amber-400 text-amber-700 text-[10px]"><PenLine className="h-2.5 w-2.5 mr-1"/>Signature required</Badge>}
                  </div>
                  {d.completed_at && <span className="text-[11px] text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/>{fmt(d.completed_at)}</span>}
                </div>
                <div className="text-sm">{d.address}</div>
                {(d.contact_name || d.contact_phone) && (
                  <div className="text-[11px] text-slate-500">{d.contact_name} {d.contact_phone && `· ${d.contact_phone}`}</div>
                )}
                {/* package */}
                <div className="rounded-md border bg-slate-50/60 p-2">
                  <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><Package className="h-3 w-3"/>Package</div>
                  {d.package_image_url && <img src={d.package_image_url} alt="" className="w-full max-h-36 object-cover rounded mb-2 border"/>}
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div><div className="text-slate-500">Qty</div><div className="font-medium tabular-nums">{d.package_quantity ?? 1}</div></div>
                    <div><div className="text-slate-500">Weight</div><div className="font-medium tabular-nums">{d.package_weight_lbs ? `${d.package_weight_lbs} lb` : "—"}</div></div>
                    <div><div className="text-slate-500">Dim</div><div className="font-medium">{d.package_dimensions || "—"}</div></div>
                  </div>
                  {d.package_description && <div className="mt-1 text-[12px] text-slate-700">{d.package_description}</div>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><FileImage className="h-3 w-3"/>Drop-off photo</div>
                    <ProofImage src={d.dropoff_photo_url} alt="Drop-off proof"/>
                  </div>
                  {d.signature_required && (
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><PenLine className="h-3 w-3"/>Signature {d.signer_name && `· ${d.signer_name}`}</div>
                      <ProofImage src={d.signature_url} alt="Signature"/>
                    </div>
                  )}
                </div>
                {d.proof_notes && <div className="text-[12px] bg-slate-50 border rounded p-2 text-slate-700">{d.proof_notes}</div>}
              </div>
            ))}
          </section>

          {/* TIMELINE */}
          <section className="rounded-lg border p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1"><Navigation className="h-3 w-3"/>Order Timeline</div>
            {events.length === 0 ? (
              <div className="text-xs text-slate-500">No events recorded yet.</div>
            ) : (
              <ol className="space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="text-[12px] flex gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{e.event_type.replace(/_/g," ")}</span>
                        <span className="text-slate-500 tabular-nums text-[11px]">{fmt(e.created_at)}</span>
                      </div>
                      {e.notes && <div className="text-slate-600">{e.notes}</div>}
                      {(e.lat && e.lng) && <div className="text-[10px] text-slate-400 tabular-nums">{Number(e.lat).toFixed(5)}, {Number(e.lng).toFixed(5)}{e.accuracy_m ? ` · ±${Math.round(e.accuracy_m)}m` : ""}</div>}
                      {e.photo_url && <div className="mt-1"><ProofImage src={e.photo_url} alt="Event photo"/></div>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* COMMS */}
          <section className="rounded-lg border p-3 space-y-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-1"><LifeBuoy className="h-3 w-3"/>Communication & Support</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button asChild variant="outline" className="h-9" disabled={!driverPhone}>
                <a href={driverPhone ? `tel:${driverPhone}` : "#"}><Phone className="h-3.5 w-3.5 mr-1"/>Call Driver</a>
              </Button>
              <Button asChild variant="outline" className="h-9" disabled={!driverPhone}>
                <a href={driverPhone ? `sms:${driverPhone}` : "#"}><MessageSquare className="h-3.5 w-3.5 mr-1"/>Text Driver</a>
              </Button>
              <Button asChild className="h-9 bg-orange-500 hover:bg-orange-600 text-white">
                <a href={`mailto:support@cravenusa.com?subject=CX%20Job%20${String(job.id).slice(0,8).toUpperCase()}`}><LifeBuoy className="h-3.5 w-3.5 mr-1"/>Crave'N Support</a>
              </Button>
            </div>
            {(pickup?.contact_phone || dropoffs[dropoffs.length-1]?.contact_phone) && (
              <div className="text-[11px] text-slate-500">
                Customer contact{dropoffs[dropoffs.length-1]?.contact_phone && <a className="text-orange-600 ml-1 underline" href={`tel:${dropoffs[dropoffs.length-1].contact_phone}`}>{dropoffs[dropoffs.length-1].contact_phone}</a>}
              </div>
            )}
            <Separator/>
            <div>
              <div className="text-[11px] text-slate-500 mb-1">Add internal note to job timeline</div>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible to your team and Crave'N support…" rows={2}/>
              <div className="flex justify-end mt-2">
                <Button onClick={postNote} disabled={posting || !note.trim()} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                  {posting ? "Saving…" : "Post note"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}