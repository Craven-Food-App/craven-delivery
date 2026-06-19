// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, PlusCircle, History, ListChecks, LogOut } from "lucide-react";
import { CXPostJobForm } from "@/components/cx/CXPostJobForm";
import { CXJobList } from "@/components/cx/CXJobList";

type Tab = "dashboard" | "post" | "active" | "history";

export default function CXPortal() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);

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

  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-50">Loading…</div>;

  if (!restaurant) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
        <Card className="max-w-md p-6 text-center">
          <Truck className="h-10 w-10 mx-auto text-orange-500 mb-3"/>
          <h2 className="text-xl font-bold">Your CX account isn't active yet</h2>
          <p className="text-sm text-slate-600 mt-2">
            Your courier application is under review. We'll email you when access is granted.
          </p>
          <Button asChild className="mt-4 bg-orange-500 hover:bg-orange-600"><Link to="/cx">Back</Link></Button>
        </Card>
      </div>
    );
  }

  const stats = {
    active: active.length,
    today: jobs.filter(j => new Date(j.created_at).toDateString() === new Date().toDateString()).length,
    spend: jobs.reduce((s,j) => s + (j.total_charge_cents || 0), 0),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0F172A] text-white px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-orange-500 grid place-items-center font-bold">CX</div>
          <div className="leading-tight">
            <div className="text-xs tracking-wide text-orange-400 font-semibold">CRAVE'N EXPRESS</div>
            <div className="text-sm font-semibold truncate max-w-[60vw]">{restaurant.name}</div>
          </div>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => nav("/cx"))}
          className="text-slate-300 hover:text-white text-sm flex items-center gap-1">
          <LogOut className="h-4 w-4"/> Sign out
        </button>
      </header>

      <nav className="bg-white border-b sticky top-[64px] z-20 overflow-x-auto">
        <div className="flex gap-1 px-2 sm:px-4 py-2 min-w-max">
          {([
            ["dashboard", "Dashboard", ListChecks],
            ["post", "Post a Job", PlusCircle],
            ["active", `Active (${active.length})`, Truck],
            ["history", "History", History],
          ] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k as Tab)}
              className={`px-3 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition ${
                tab === k ? "bg-orange-500 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}>
              <Icon className="h-4 w-4"/>{label}
            </button>
          ))}
        </div>
      </nav>

      <main className="px-3 sm:px-6 py-5 max-w-5xl mx-auto">
        {tab === "dashboard" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Active jobs</div>
                <div className="text-2xl font-bold tabular-nums mt-1">{stats.active}</div>
              </Card>
              <Card className="p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Posted today</div>
                <div className="text-2xl font-bold tabular-nums mt-1">{stats.today}</div>
              </Card>
              <Card className="p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Lifetime spend</div>
                <div className="text-2xl font-bold tabular-nums mt-1">${(stats.spend / 100).toFixed(2)}</div>
              </Card>
            </div>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Recent activity</div>
                <Badge variant="outline" className="border-orange-500 text-orange-600">CX</Badge>
              </div>
              <CXJobList jobs={jobs.slice(0, 5)} />
            </Card>
          </div>
        )}
        {tab === "post" && <CXPostJobForm restaurant={restaurant} userId={user.id} onPosted={() => setTab("active")} />}
        {tab === "active" && <CXJobList jobs={active} />}
        {tab === "history" && <CXJobList jobs={completed} />}
      </main>
    </div>
  );
}