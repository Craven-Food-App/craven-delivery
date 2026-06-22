import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Radio, Truck, Users, Clock, Settings, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CXLogo } from "@/components/cx/CXLogo";

type Job = {
  id: string;
  created_at: string;
  requester_type: string;
  dispatch_mode: string;
  dispatch_radius_miles: number;
  cx_exclusive_until: string | null;
  eligible_feeder_tiers: string[];
  dispatch_status: string;
  claimed_by_pool: string | null;
  total_charge_cents: number | null;
  notes: string | null;
};

type Settings = {
  id: string;
  default_radius_miles: number;
  cx_exclusive_seconds: number;
  eligible_feeder_tiers: string[];
  customer_dispatch_mode: "dual" | "cx_priority";
  merchant_dispatch_mode: "dual" | "cx_priority";
  company_dispatch_mode: "dual" | "cx_priority";
  auto_dispatch_enabled: boolean;
};

export default function CXDispatchConsole() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    document.title = "Dispatch Console — Crave'N Express";
    void load();
    const t = setInterval(() => setNow(Date.now()), 1000);
    const ch = supabase
      .channel("cx-dispatch-console")
      .on("postgres_changes", { event: "*", schema: "public", table: "cx_jobs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "cx_dispatch_events" }, load)
      .subscribe();
    return () => {
      clearInterval(t);
      supabase.removeChannel(ch);
    };
  }, []);

  async function load() {
    setLoading(true);
    const [jobsRes, settingsRes] = await Promise.all([
      supabase
        .from("cx_jobs")
        .select(
          "id, created_at, requester_type, dispatch_mode, dispatch_radius_miles, cx_exclusive_until, eligible_feeder_tiers, dispatch_status, claimed_by_pool, total_charge_cents, notes",
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("cx_dispatch_settings").select("*").eq("singleton", true).maybeSingle(),
    ]);
    if (jobsRes.data) setJobs(jobsRes.data as Job[]);
    if (settingsRes.data) setSettings(settingsRes.data as Settings);
    setLoading(false);
  }

  async function saveSettings(next: Partial<Settings>) {
    if (!settings) return;
    setSavingSettings(true);
    const { error } = await supabase
      .from("cx_dispatch_settings")
      .update(next)
      .eq("id", settings.id);
    setSavingSettings(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    setSettings({ ...settings, ...next });
    toast({ title: "Saved" });
  }

  async function fanOutNow(jobId: string) {
    const { error } = await supabase
      .from("cx_jobs")
      .update({ cx_exclusive_until: new Date().toISOString() })
      .eq("id", jobId);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    await supabase.from("cx_dispatch_events").insert({
      job_id: jobId,
      event_type: "broadcast_feeder",
      pool: "feeder",
      metadata: { reason: "manual_fanout" },
    });
    toast({ title: "Broadcast to Feeders", description: "Top-tier Feeders can now claim this job." });
    void load();
  }

  async function cancelJob(jobId: string) {
    const { error } = await supabase
      .from("cx_jobs")
      .update({ dispatch_status: "cancelled", status: "cancelled" })
      .eq("id", jobId);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Job cancelled" });
    void load();
  }

  async function runTick() {
    await supabase.functions.invoke("cx-dispatch-tick", { body: {} });
    void load();
  }

  const openJobs = useMemo(
    () => jobs.filter((j) => j.dispatch_status === "broadcasting" || j.dispatch_status === "pending"),
    [jobs],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/cx/portal" className="p-2 -ml-2 rounded-md hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <CXLogo size="sm" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Dispatch Console</div>
              <div className="text-[11px] text-slate-500">Live package & shipment dispatch</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={runTick}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Run tick
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-[1fr_320px] gap-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Radio className="h-4 w-4 text-orange-500" /> Live jobs
              <Badge variant="secondary" className="ml-1">{openJobs.length}</Badge>
            </h1>
            {loading && <span className="text-xs text-slate-500">Loading…</span>}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2">Requester</th>
                  <th className="text-left px-3 py-2">Mode</th>
                  <th className="text-left px-3 py-2">Radius</th>
                  <th className="text-left px-3 py-2">CX window</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">
                      No dispatch jobs yet.
                    </td>
                  </tr>
                )}
                {jobs.map((j) => {
                  const exclusiveLeft = j.cx_exclusive_until
                    ? Math.max(0, Math.floor((new Date(j.cx_exclusive_until).getTime() - now) / 1000))
                    : 0;
                  const inExclusive = exclusiveLeft > 0;
                  return (
                    <tr key={j.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 capitalize">
                        <div className="font-medium">{j.requester_type}</div>
                        <div className="text-[11px] text-slate-500">{new Date(j.created_at).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={j.dispatch_mode === "dual" ? "default" : "outline"}>
                          {j.dispatch_mode === "dual" ? (
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Dual</span>
                          ) : (
                            <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> CX priority</span>
                          )}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{j.dispatch_radius_miles} mi</td>
                      <td className="px-3 py-2">
                        {j.dispatch_mode === "cx_priority" ? (
                          inExclusive ? (
                            <span className="inline-flex items-center gap-1 text-orange-600 font-medium">
                              <Clock className="h-3 w-3" /> {exclusiveLeft}s left
                            </span>
                          ) : (
                            <span className="text-slate-400">Lapsed</span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={j.dispatch_status} pool={j.claimed_by_pool} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {(j.dispatch_status === "broadcasting" || j.dispatch_status === "pending") && (
                          <div className="inline-flex gap-1">
                            {j.dispatch_mode === "cx_priority" && inExclusive && (
                              <Button size="sm" variant="outline" onClick={() => fanOutNow(j.id)}>
                                Fan out
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => cancelJob(j.id)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-500" /> Defaults
            </h2>
            {!settings ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Auto-dispatch</Label>
                  <Switch
                    checked={settings.auto_dispatch_enabled}
                    onCheckedChange={(v) => saveSettings({ auto_dispatch_enabled: v })}
                    disabled={savingSettings}
                  />
                </div>
                <div>
                  <Label className="text-xs">Default radius (miles)</Label>
                  <Input
                    type="number"
                    value={settings.default_radius_miles}
                    onChange={(e) => setSettings({ ...settings, default_radius_miles: Number(e.target.value) })}
                    onBlur={() => saveSettings({ default_radius_miles: settings.default_radius_miles })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">CX-exclusive window (seconds)</Label>
                  <Input
                    type="number"
                    value={settings.cx_exclusive_seconds}
                    onChange={(e) => setSettings({ ...settings, cx_exclusive_seconds: Number(e.target.value) })}
                    onBlur={() => saveSettings({ cx_exclusive_seconds: settings.cx_exclusive_seconds })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Eligible Feeder tiers</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["feeder", "pro", "elite", "ultimate"] as const).map((tier) => {
                      const active = settings.eligible_feeder_tiers.includes(tier);
                      return (
                        <button
                          key={tier}
                          onClick={() => {
                            const next = active
                              ? settings.eligible_feeder_tiers.filter((t) => t !== tier)
                              : [...settings.eligible_feeder_tiers, tier];
                            saveSettings({ eligible_feeder_tiers: next });
                          }}
                          className={`text-xs px-2 py-1 rounded-md border capitalize ${
                            active
                              ? "bg-orange-50 border-orange-300 text-orange-700"
                              : "bg-white border-slate-200 text-slate-500"
                          }`}
                        >
                          {tier}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ModeSelect
                  label="Customer requests"
                  value={settings.customer_dispatch_mode}
                  onChange={(v) => saveSettings({ customer_dispatch_mode: v })}
                />
                <ModeSelect
                  label="Merchant shipments"
                  value={settings.merchant_dispatch_mode}
                  onChange={(v) => saveSettings({ merchant_dispatch_mode: v })}
                />
                <ModeSelect
                  label="Company shipments"
                  value={settings.company_dispatch_mode}
                  onChange={(v) => saveSettings({ company_dispatch_mode: v })}
                />
              </>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function StatusBadge({ status, pool }: { status: string; pool: string | null }) {
  const map: Record<string, string> = {
    pending: "bg-slate-100 text-slate-700",
    broadcasting: "bg-orange-100 text-orange-700",
    claimed: "bg-emerald-100 text-emerald-700",
    expired: "bg-slate-100 text-slate-500",
    cancelled: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${map[status] || "bg-slate-100"}`}>
      {status === "claimed" && pool ? `Claimed · ${pool}` : status}
    </span>
  );
}

function ModeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "dual" | "cx_priority";
  onChange: (v: "dual" | "cx_priority") => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 grid grid-cols-2 gap-1 rounded-md border border-slate-200 p-0.5">
        {(["dual", "cx_priority"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`text-xs py-1 rounded ${
              value === v ? "bg-orange-500 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {v === "dual" ? "Dual" : "CX priority"}
          </button>
        ))}
      </div>
    </div>
  );
}