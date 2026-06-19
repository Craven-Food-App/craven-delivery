// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, ArrowRight, Package, Phone, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { CXJobDetailSheet } from "./CXJobDetailSheet";
import { CXPickupProofSheet, CXDropoffProofSheet } from "./CXProofSheets";

const NEXT_STATUS: Record<string, string> = {
  accepted: "en_route_pickup",
  en_route_pickup: "picked_up",
  picked_up: "en_route_dropoff",
  en_route_dropoff: "delivered",
};
const NEXT_LABEL: Record<string, string> = {
  accepted: "Start trip to pickup",
  en_route_pickup: "I've arrived — verify pickup",
  picked_up: "Start trip to drop-off",
  en_route_dropoff: "I've arrived — complete delivery",
};

export function CXDriverJobsPage({ onClose }: { onClose?: () => void }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [optIn, setOptIn] = useState(false);
  const [verified, setVerified] = useState(false);
  const [available, setAvailable] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [proofJob, setProofJob] = useState<{ job: any; kind: "pickup" | "dropoff" } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: prefs } = await supabase
        .from("driver_preferences")
        .select("cx_opt_in, cx_tier_verified")
        .eq("driver_id", user.id)
        .maybeSingle();
      setOptIn(!!prefs?.cx_opt_in);
      setVerified(!!prefs?.cx_tier_verified);
      await loadJobs(user.id, !!prefs?.cx_tier_verified);
      setLoading(false);
    })();
  }, []);

  const loadJobs = async (uid: string, isVerified: boolean) => {
    // Available = posted jobs offered to my tier
    const { data: avail } = await supabase
      .from("cx_jobs")
      .select("*, cx_job_stops(*)")
      .in("status", ["posted", "offered"])
      .is("assigned_driver_id", null)
      .order("created_at", { ascending: false })
      .limit(50);
    // If not verified, only show jobs that have widened to general pool (dispatch_round > 1) or are in fallback
    const filtered = (avail ?? []).filter((j: any) =>
      isVerified ? true : (j.dispatch_round ?? 1) > 1 || j.tier_open === true,
    );
    setAvailable(filtered);

    const { data: mineRows } = await supabase
      .from("cx_jobs")
      .select("*, cx_job_stops(*)")
      .eq("assigned_driver_id", uid)
      .in("status", ["accepted", "en_route_pickup", "picked_up", "en_route_dropoff"])
      .order("created_at", { ascending: false });
    setMine(mineRows ?? []);
  };

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`cx_driver_${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cx_jobs" }, () => {
        loadJobs(userId, verified);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, verified]);

  const accept = async (jobId: string) => {
    setBusy(jobId);
    const { data, error } = await supabase.functions.invoke("cx-accept-job", { body: { job_id: jobId } });
    setBusy(null);
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? "Couldn't accept");
      return;
    }
    toast.success("Job accepted");
    if (userId) loadJobs(userId, verified);
  };

  const advance = async (job: any) => {
    const next = NEXT_STATUS[job.status];
    if (!next) return;
    // Gate the picked_up / delivered transitions behind the proof sheets.
    if (next === "picked_up") {
      setProofJob({ job, kind: "pickup" });
      return;
    }
    if (next === "delivered") {
      setProofJob({ job, kind: "dropoff" });
      return;
    }
    setBusy(job.id);
    const { data, error } = await supabase.functions.invoke("cx-update-status", {
      body: { job_id: job.id, status: next },
    });
    setBusy(null);
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? "Couldn't update");
      return;
    }
    if (userId) loadJobs(userId, verified);
  };

  if (loading) {
    return <div className="p-6 text-center text-sm text-slate-500">Loading CX queue…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="sticky top-0 z-10 bg-[#0F172A] text-white px-4 py-3 flex items-center gap-2" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <Truck className="h-5 w-5 text-orange-400" />
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.18em] text-orange-400 font-bold">CRAVE'N EXPRESS</div>
          <div className="text-sm font-semibold">Courier jobs</div>
        </div>
        {verified && (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[10px]">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        )}
        {onClose && (
          <button onClick={onClose} className="p-1">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!optIn && (
        <Card className="m-3 p-4 border-amber-200 bg-amber-50">
          <div className="text-sm font-semibold text-amber-900">CX is turned off</div>
          <p className="text-xs text-amber-800 mt-1">
            Turn on Crave'N Express in Account → Preferences to start receiving courier jobs.
          </p>
        </Card>
      )}

      <div className="p-3 space-y-4">
        {mine.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold px-1">Your active job</div>
            {mine.map((j) => (
              <ActiveJobCard key={j.id} job={j} busy={busy === j.id} onAdvance={() => advance(j)} />
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold px-1">Available</div>
          {available.length === 0 ? (
            <Card className="p-6 text-center text-sm text-slate-500">No CX jobs available right now.</Card>
          ) : (
            available.map((j) => (
              <AvailableJobCard
                key={j.id}
                job={j}
                busy={busy === j.id}
                onOpen={() => setSelectedJob(j)}
              />
            ))
          )}
        </div>
      </div>

      {selectedJob && (
        <CXJobDetailSheet
          job={selectedJob}
          busy={busy === selectedJob.id}
          onClose={() => setSelectedJob(null)}
          onAccept={async () => {
            await accept(selectedJob.id);
            setSelectedJob(null);
          }}
        />
      )}

      {proofJob && (() => {
        const stops = (proofJob.job.cx_job_stops ?? [])
          .slice()
          .sort((a: any, b: any) => a.sequence - b.sequence);
        const stop =
          proofJob.kind === "pickup"
            ? stops.find((s: any) => s.stop_type === "pickup")
            : stops.find((s: any) => s.stop_type === "dropoff" && !s.completed_at) ||
              stops.find((s: any) => s.stop_type === "dropoff");
        if (!stop) {
          setProofJob(null);
          return null;
        }
        const close = () => setProofJob(null);
        const confirmed = () => {
          setProofJob(null);
          if (userId) loadJobs(userId, verified);
        };
        return proofJob.kind === "pickup" ? (
          <CXPickupProofSheet job={proofJob.job} stop={stop} onClose={close} onConfirmed={confirmed} />
        ) : (
          <CXDropoffProofSheet job={proofJob.job} stop={stop} onClose={close} onConfirmed={confirmed} />
        );
      })()}
    </div>
  );
}

function jobAddresses(j: any) {
  const stops = (j.cx_job_stops ?? []).slice().sort((a: any, b: any) => a.sequence - b.sequence);
  const pickup = stops.find((s: any) => s.stop_type === "pickup");
  const dropoffs = stops.filter((s: any) => s.stop_type === "dropoff");
  return { pickup, dropoffs };
}

function AvailableJobCard({ job, busy, onOpen }: { job: any; busy: boolean; onOpen: () => void }) {
  const { pickup, dropoffs } = useMemo(() => jobAddresses(job), [job]);
  return (
    <Card className="p-4 active:scale-[0.99] transition-transform cursor-pointer" onClick={onOpen}>
      <div className="flex items-center justify-between mb-2">
        <Badge className="bg-orange-500 text-white capitalize">{(job.job_type || "").replace("_", " ")}</Badge>
        <div className="text-lg font-extrabold tabular-nums text-emerald-700">
          ${((job.driver_payout_offer_cents || 0) / 100).toFixed(2)}
        </div>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Pickup</div>
            <div className="truncate">{pickup?.address ?? "—"}</div>
          </div>
        </div>
        {dropoffs.map((d: any, i: number) => (
          <div className="flex items-start gap-2" key={d.id ?? i}>
            <ArrowRight className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                Drop-off {dropoffs.length > 1 ? i + 1 : ""}
              </div>
              <div className="truncate">{d.address}</div>
            </div>
          </div>
        ))}
      </div>
      {job.notes && (
        <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded p-2 border">{job.notes}</div>
      )}
      <Button
        disabled={busy}
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        className="w-full mt-3 bg-orange-500 hover:bg-orange-600 h-11 font-semibold"
      >
        View details
      </Button>
    </Card>
  );
}

function ActiveJobCard({ job, busy, onAdvance }: { job: any; busy: boolean; onAdvance: () => void }) {
  const { pickup, dropoffs } = useMemo(() => jobAddresses(job), [job]);
  const nextLabel = NEXT_LABEL[job.status];
  const current =
    job.status === "accepted" || job.status === "en_route_pickup"
      ? { label: "Heading to pickup", addr: pickup?.address, phone: pickup?.contact_phone }
      : { label: "Heading to drop-off", addr: dropoffs[0]?.address, phone: dropoffs[0]?.contact_phone };

  return (
    <Card className="p-4 border-orange-300 bg-orange-50/40">
      <div className="flex items-center justify-between mb-2">
        <Badge className="bg-[#0F172A] text-white">{job.status.replace(/_/g, " ")}</Badge>
        <div className="text-base font-bold tabular-nums text-emerald-700">
          ${((job.driver_payout_offer_cents || 0) / 100).toFixed(2)}
        </div>
      </div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{current.label}</div>
      <div className="font-semibold text-sm mt-0.5 flex items-center gap-2">
        <Package className="h-4 w-4 text-orange-500" />
        <span className="truncate">{current.addr ?? "—"}</span>
      </div>
      {current.phone && (
        <a href={`tel:${current.phone}`} className="text-xs text-blue-600 mt-1 inline-flex items-center gap-1">
          <Phone className="h-3 w-3" /> {current.phone}
        </a>
      )}
      {nextLabel && (
        <Button
          disabled={busy}
          onClick={onAdvance}
          className="w-full mt-3 bg-orange-500 hover:bg-orange-600 h-11 font-semibold"
        >
          {busy ? "Updating…" : nextLabel}
        </Button>
      )}
    </Card>
  );
}