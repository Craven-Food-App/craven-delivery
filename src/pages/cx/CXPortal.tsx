// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Truck, PlusCircle, History, LogOut, LayoutDashboard, Radio, Users,
  BarChart3, DollarSign, Activity, AlertTriangle, CheckCircle2, Clock,
  MapPin, ArrowRight, Search, Bell, ChevronRight, Menu, X, Signal,
  TrendingUp, TrendingDown, Package
} from "lucide-react";
import { CXPostJobForm } from "@/components/cx/CXPostJobForm";
import { CXJobList } from "@/components/cx/CXJobList";
import { CXLogo } from "@/components/cx/CXLogo";

type Tab = "dispatch" | "post" | "active" | "history" | "fleet" | "analytics";

export default function CXPortal() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("dispatch");
  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav("/cx/signup"); return; }
      setUser(user);
      // find courier restaurant for this user
      const { data: owned } = await supabase
        .from("restaurants").select("*")
        .eq("owner_id", user.id).eq("business_type", "courier_service")
        .maybeSingle();
      let r = owned;
      if (!r) {
        const { data: linked } = await supabase
          .from("restaurant_users").select("restaurant_id, restaurants(*)")
          .eq("user_id", user.id).maybeSingle();
        r = (linked as any)?.restaurants;
        if (r?.business_type !== "courier_service") r = null;
      }
      setRestaurant(r);
      setLoading(false);
    })();
  }, [nav]);

  useEffect(() => {
    if (!restaurant?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from("cx_jobs").select("*, cx_job_stops(*)")
        .eq("courier_restaurant_id", restaurant.id)
        .order("created_at", { ascending: false });
      setJobs(data ?? []);
    };
    load();
    const ch = supabase
      .channel("cx_jobs_courier_" + restaurant.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "cx_jobs",
        filter: `courier_restaurant_id=eq.${restaurant.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [restaurant?.id]);

  const active = useMemo(() => jobs.filter(j => !["delivered","cancelled","failed"].includes(j.status)), [jobs]);
  const completed = useMemo(() => jobs.filter(j => ["delivered","cancelled","failed"].includes(j.status)), [jobs]);

  if (loading) return (
    <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-400">
      <div className="flex items-center gap-3 text-sm">
        <Signal className="h-4 w-4 text-orange-500 animate-pulse" />
        Connecting to dispatch…
      </div>
    </div>
  );

  if (!restaurant) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
        <Card className="max-w-md p-6 text-center">
          <Truck className="h-10 w-10 mx-auto text-orange-500 mb-3"/>
          <h2 className="text-xl font-bold">Your CX account isn't active yet</h2>
          <p className="text-sm text-slate-400 mt-2">
            Your courier application is under review. We'll email you when access is granted.
          </p>
          <Button asChild className="mt-4 bg-orange-500 hover:bg-orange-600"><Link to="/cx">Back</Link></Button>
        </Card>
      </div>
    );
  }

  // ---- Dispatch metrics (live derived) ----
  const todayJobs = jobs.filter(j => new Date(j.created_at).toDateString() === now.toDateString());
  const yesterdayJobs = jobs.filter(j => {
    const d = new Date(j.created_at);
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return d.toDateString() === y.toDateString();
  });
  const delivered = jobs.filter(j => j.status === "delivered");
  const deliveredToday = todayJobs.filter(j => j.status === "delivered");
  const failed = jobs.filter(j => ["failed","cancelled"].includes(j.status));
  const inTransit = active.filter(j => ["picked_up","en_route_dropoff"].includes(j.status));
  const awaitingPickup = active.filter(j => ["accepted","en_route_pickup"].includes(j.status));
  const queued = active.filter(j => ["draft","posted","offered"].includes(j.status));

  const spendToday = todayJobs.reduce((s,j) => s + (j.total_charge_cents||0), 0);
  const spendYesterday = yesterdayJobs.reduce((s,j) => s + (j.total_charge_cents||0), 0);
  const spendDelta = spendYesterday > 0 ? ((spendToday - spendYesterday) / spendYesterday) * 100 : 0;

  const successRate = jobs.length ? (delivered.length / jobs.length) * 100 : 0;
  const avgTicket = delivered.length ? delivered.reduce((s,j)=>s+(j.total_charge_cents||0),0) / delivered.length / 100 : 0;

  const nav_items: Array<[Tab, string, any]> = [
    ["dispatch", "Dispatch", LayoutDashboard],
    ["post", "New Job", PlusCircle],
    ["active", "Active Ops", Radio],
    ["fleet", "Fleet", Users],
    ["analytics", "Analytics", BarChart3],
    ["history", "History", History],
  ];

  const StatusPill = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
      draft: "bg-slate-200 text-slate-400 border-slate-600",
      posted: "bg-amber-100 text-amber-700 border-amber-300",
      offered: "bg-blue-100 text-blue-700 border-blue-300",
      accepted: "bg-indigo-100 text-indigo-700 border-indigo-300",
      en_route_pickup: "bg-indigo-100 text-indigo-700 border-indigo-300",
      picked_up: "bg-purple-100 text-purple-700 border-purple-300",
      en_route_dropoff: "bg-purple-100 text-purple-700 border-purple-300",
      delivered: "bg-emerald-100 text-emerald-700 border-emerald-300",
      cancelled: "bg-slate-200 text-slate-400 border-slate-600",
      failed: "bg-rose-100 text-rose-700 border-rose-300",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${map[status] ?? "bg-slate-200 text-slate-400 border-slate-600"}`}>
        {status.replace(/_/g," ")}
      </span>
    );
  };

  const Kpi = ({ label, value, sub, icon: Icon, accent, trend }: any) => (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3 overflow-hidden">
      <div className={`absolute top-0 left-0 h-full w-0.5 ${accent}`}/>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400 font-semibold">{label}</div>
        <Icon className="h-3.5 w-3.5 text-slate-400"/>
      </div>
      <div className="mt-1.5 text-xl font-bold text-slate-900 tabular-nums leading-none">{value}</div>
      {sub && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-600"/>}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-rose-600"/>}
          <span>{sub}</span>
        </div>
      )}
    </div>
  );

  const PipelineColumn = ({ title, items, accent, icon: Icon }: any) => {
    const stops = (j: any) => (j.cx_job_stops ?? []).sort((a:any,b:any)=>a.sequence-b.sequence);
    return (
      <div className="bg-white border border-slate-200 rounded-lg flex flex-col min-h-[280px]">
        <div className={`flex items-center justify-between px-3 py-2 border-b border-slate-200 ${accent}`}>
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5"/>
            <span className="text-[11px] font-bold uppercase tracking-wider">{title}</span>
          </div>
          <span className="text-[11px] font-mono tabular-nums bg-slate-100 px-1.5 py-0.5 rounded">{items.length}</span>
        </div>
        <div className="p-2 space-y-1.5 flex-1 overflow-auto max-h-[420px]">
          {items.length === 0 && (
            <div className="text-center py-8 text-[11px] text-slate-400 font-mono">— EMPTY —</div>
          )}
          {items.map((j:any) => {
            const s = stops(j);
            const pickup = s.find((x:any)=>x.stop_type==="pickup");
            const dropoff = s.filter((x:any)=>x.stop_type==="dropoff").pop();
            return (
              <div key={j.id} className="bg-slate-50 border border-slate-200 hover:border-orange-400 rounded p-2 text-xs cursor-pointer transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-orange-600">#{j.id.slice(0,6).toUpperCase()}</span>
                  <StatusPill status={j.status}/>
                </div>
                <div className="text-slate-400 flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 text-orange-500 shrink-0"/>
                  <span className="truncate text-[11px]">{pickup?.address ?? "—"}</span>
                </div>
                <div className="text-slate-400 flex items-center gap-1 truncate mt-0.5">
                  <ArrowRight className="h-3 w-3 text-slate-400 shrink-0"/>
                  <span className="truncate text-[11px]">{dropoff?.address ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-200">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(j.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 tabular-nums">
                    ${((j.total_charge_cents||0)/100).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex">
      {/* Sidebar */}
      <aside className={`${navOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-60 bg-white border-r border-slate-200 flex flex-col transition-transform`}>
        <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CXLogo size="md" />
            <div className="leading-tight">
              <div className="text-[10px] tracking-[0.15em] text-orange-500 font-bold">CRAVE'N EXPRESS</div>
              <div className="text-[10px] text-slate-400 font-mono">DISPATCH v2.0</div>
            </div>
          </div>
          <button onClick={() => setNavOpen(false)} className="lg:hidden text-slate-400">
            <X className="h-4 w-4"/>
          </button>
        </div>
        <div className="px-3 py-3 border-b border-slate-200">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Operator</div>
          <div className="text-sm font-semibold text-slate-900 truncate">{restaurant.name}</div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/>
            <span className="text-[10px] text-emerald-600 font-mono uppercase tracking-wider">Online · Live</span>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-auto">
          {nav_items.map(([k, label, Icon]) => {
            const isActive = tab === k;
            const badge = k === "active" ? active.length : k === "history" ? completed.length : null;
            return (
              <button
                key={k}
                onClick={() => { setTab(k); setNavOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-[13px] font-medium transition ${
                  isActive
                    ? "bg-orange-500/10 text-orange-600 border-l-2 border-orange-500"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 border-l-2 border-transparent"
                }`}
              >
                <Icon className="h-4 w-4"/>
                <span className="flex-1 text-left">{label}</span>
                {badge !== null && badge > 0 && (
                  <span className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${isActive ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"}`}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={() => supabase.auth.signOut().then(() => nav("/cx"))}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-[13px] text-slate-400 hover:bg-rose-500/10 hover:text-rose-600 transition"
          >
            <LogOut className="h-4 w-4"/> Sign out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {navOpen && <div onClick={() => setNavOpen(false)} className="fixed inset-0 bg-black/40 z-30 lg:hidden"/>}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setNavOpen(true)} className="lg:hidden text-slate-400">
              <Menu className="h-5 w-5"/>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
              <span className="text-slate-400">DISPATCH</span>
              <ChevronRight className="h-3 w-3 text-slate-700"/>
              <span className="text-orange-600 uppercase">{tab}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <div className="hidden md:flex items-center gap-1.5 text-slate-400">
              <Signal className="h-3 w-3 text-emerald-600"/>
              <span>OPS NET</span>
            </div>
            <div className="text-slate-400 tabular-nums">
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} <span className="text-slate-400">LOCAL</span>
            </div>
            <button className="relative text-slate-400 hover:text-orange-600">
              <Bell className="h-4 w-4"/>
              {failed.length > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 bg-rose-500 rounded-full"/>}
            </button>
            <Button
              size="sm"
              onClick={() => setTab("post")}
              className="bg-orange-500 hover:bg-orange-600 text-slate-900 h-7 px-3 text-xs gap-1"
            >
              <PlusCircle className="h-3.5 w-3.5"/> New
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {tab === "dispatch" && (
            <div className="p-4 space-y-4">
              {/* KPI strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <Kpi label="Active" value={active.length} icon={Activity} accent="bg-orange-500" sub="Live in field"/>
                <Kpi label="In Transit" value={inTransit.length} icon={Truck} accent="bg-purple-500" sub={`${awaitingPickup.length} en route to pickup`}/>
                <Kpi label="Queue" value={queued.length} icon={Package} accent="bg-amber-500" sub="Awaiting assign"/>
                <Kpi label="Delivered Today" value={deliveredToday.length} icon={CheckCircle2} accent="bg-emerald-500" sub={`${delivered.length} lifetime`} trend="up"/>
                <Kpi label="Spend Today" value={`$${(spendToday/100).toFixed(0)}`} icon={DollarSign} accent="bg-blue-500" sub={`${spendDelta >= 0 ? "+" : ""}${spendDelta.toFixed(0)}% vs yest.`} trend={spendDelta>=0?"up":"down"}/>
                <Kpi label="Success Rate" value={`${successRate.toFixed(1)}%`} icon={ShieldCheckPlaceholder} accent="bg-emerald-500" sub={`${failed.length} failed`}/>
              </div>

              {/* Pipeline */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-orange-500"/>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Live Pipeline</h2>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">REALTIME · SUPABASE</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <PipelineColumn title="Queue" items={queued} icon={Package} accent="text-amber-400"/>
                  <PipelineColumn title="Pickup" items={awaitingPickup} icon={MapPin} accent="text-indigo-400"/>
                  <PipelineColumn title="In Transit" items={inTransit} icon={Truck} accent="text-purple-400"/>
                  <PipelineColumn title="Delivered" items={deliveredToday} icon={CheckCircle2} accent="text-emerald-600"/>
                </div>
              </div>

              {/* Secondary row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg">
                  <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-3.5 w-3.5 text-slate-400"/>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recent Activity</span>
                    </div>
                    <button onClick={() => setTab("history")} className="text-[11px] text-orange-600 hover:underline">View all →</button>
                  </div>
                  <div className="p-2">
                    <div className="bg-white rounded">
                      <CXJobList jobs={jobs.slice(0, 6)}/>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-3.5 w-3.5 text-slate-400"/>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Performance</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Avg Ticket</span><span className="text-slate-900 font-bold tabular-nums">${avgTicket.toFixed(2)}</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-orange-300" style={{ width: `${Math.min(100, avgTicket * 5)}%` }}/>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Success Rate</span><span className="text-slate-900 font-bold tabular-nums">{successRate.toFixed(1)}%</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${successRate}%` }}/>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Failure Rate</span><span className="text-slate-900 font-bold tabular-nums">{jobs.length ? ((failed.length/jobs.length)*100).toFixed(1) : "0.0"}%</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded overflow-hidden">
                        <div className="h-full bg-rose-500" style={{ width: `${jobs.length ? (failed.length/jobs.length)*100 : 0}%` }}/>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-center">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">Today</div>
                        <div className="text-base font-bold text-slate-900 tabular-nums">{todayJobs.length}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">Lifetime</div>
                        <div className="text-base font-bold text-slate-900 tabular-nums">{jobs.length}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "post" && (
            <div className="p-4">
              <div className="bg-white rounded-lg p-4 max-w-3xl mx-auto">
                <CXPostJobForm restaurant={restaurant} userId={user.id} onPosted={() => setTab("active")}/>
              </div>
            </div>
          )}

          {tab === "active" && (
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Radio className="h-4 w-4 text-orange-500"/>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active Operations</h2>
                <span className="text-[10px] font-mono text-slate-400">({active.length})</span>
              </div>
              <div className="bg-white rounded-lg p-3"><CXJobList jobs={active}/></div>
            </div>
          )}

          {tab === "history" && (
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-400"/>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Mission History</h2>
                <span className="text-[10px] font-mono text-slate-400">({completed.length})</span>
              </div>
              <div className="bg-white rounded-lg p-3"><CXJobList jobs={completed}/></div>
            </div>
          )}

          {tab === "fleet" && (
            <div className="p-4">
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
                <Users className="h-10 w-10 mx-auto text-slate-400 mb-3"/>
                <h3 className="text-base font-bold text-slate-900">Fleet Roster</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">Driver roster, availability, and performance metrics will appear here once couriers are onboarded to your operation.</p>
              </div>
            </div>
          )}

          {tab === "analytics" && (
            <div className="p-4">
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
                <BarChart3 className="h-10 w-10 mx-auto text-slate-400 mb-3"/>
                <h3 className="text-base font-bold text-slate-900">Operational Analytics</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">Throughput, on-time rate, average delivery time, and revenue trends will populate as job volume increases.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const ShieldCheckPlaceholder = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);