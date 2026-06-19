// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  Plus,
  Truck,
  Route,
  Users,
  Receipt,
  Settings as SettingsIcon,
  LogOut,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { CXPostJobForm } from "@/components/cx/CXPostJobForm";
import { CXJobList } from "@/components/cx/CXJobList";
import cravenLogo from "@/assets/craven-logo.png";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "post", label: "Post Job", icon: Plus },
  { id: "active", label: "Active", icon: Truck },
  { id: "route", label: "Route Builder", icon: Route },
  { id: "drivers", label: "Driver Pool", icon: Users },
  { id: "invoices", label: "Invoices", icon: Receipt },
  { id: "settings", label: "Settings", icon: SettingsIcon },
] as const;

type TabId = typeof TABS[number]["id"];

export default function CourierPortalView({
  restaurant,
  userId,
  userName,
}: {
  restaurant: any;
  userId: string;
  userName: string;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverPool, setDriverPool] = useState<any[]>([]);

  const billingActive = useMemo(() => {
    const s = (restaurant as any)?.cx_subscription_status;
    return s === "active" || s === "trialing";
  }, [restaurant]);

  const loadJobs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cx_jobs")
      .select("*, cx_job_stops(*)")
      .eq("courier_restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setJobs(data ?? []);
    setLoading(false);
  };

  const loadDrivers = async () => {
    const { data: verified } = await supabase
      .from("cx_driver_verification")
      .select("driver_id, status, vehicle_type, max_package_weight_lbs")
      .eq("status", "approved")
      .limit(200);
    setDriverPool(verified ?? []);
  };

  useEffect(() => {
    if (!restaurant?.id) return;
    loadJobs();
    loadDrivers();
    const ch = supabase
      .channel(`cx_jobs_courier_${restaurant.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cx_jobs", filter: `courier_restaurant_id=eq.${restaurant.id}` },
        () => loadJobs(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id]);

  const active = jobs.filter((j) =>
    ["posted", "offered", "accepted", "en_route_pickup", "picked_up", "en_route_dropoff"].includes(j.status),
  );
  const completed = jobs.filter((j) => j.status === "delivered");
  const failed = jobs.filter((j) => ["cancelled", "failed", "dispatch_failed"].includes(j.status));

  const stats = {
    activeCount: active.length,
    todayCount: jobs.filter((j) => new Date(j.created_at).toDateString() === new Date().toDateString()).length,
    totalCharged: jobs.reduce((s, j) => s + (j.total_charge_cents || 0), 0) / 100,
    completedCount: completed.length,
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/restaurant/auth");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-[#0F172A] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <img src={cravenLogo} alt="Crave'N" className="h-7 w-auto" />
          <div className="hidden sm:block h-6 w-px bg-white/20" />
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-[0.18em] text-orange-400">CRAVE'N EXPRESS</div>
            <div className="text-sm font-semibold truncate">{restaurant?.name ?? "Courier"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={billingActive ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}>
            {billingActive ? "Active" : "Setup required"}
          </Badge>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {!billingActive && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs sm:text-sm text-amber-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            Your CX subscription isn't active yet. Posting jobs is disabled until billing is set up.
          </span>
          <Button size="sm" variant="outline" className="border-amber-400 text-amber-900 h-7" onClick={() => setTab("settings")}>
            Set up billing
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="flex-1 flex flex-col">
        <div className="bg-white border-b sticky top-[56px] sm:top-[60px] z-30">
          <div className="overflow-x-auto">
            <TabsList className="bg-transparent h-auto p-1 gap-1 inline-flex w-max">
              {TABS.map(({ id, label, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs sm:text-sm gap-1.5 px-3 py-2 whitespace-nowrap"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <div className="flex-1 p-3 sm:p-5 max-w-5xl w-full mx-auto">
          <TabsContent value="dashboard" className="mt-0 space-y-3">
            <div>
              <div className="text-xs text-slate-500">Welcome back, {userName}</div>
              <h1 className="text-xl sm:text-2xl font-extrabold">Dispatch overview</h1>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <StatCard label="Active jobs" value={stats.activeCount} accent="bg-orange-50 text-orange-700" />
              <StatCard label="Posted today" value={stats.todayCount} accent="bg-blue-50 text-blue-700" />
              <StatCard label="Delivered" value={stats.completedCount} accent="bg-emerald-50 text-emerald-700" />
              <StatCard label="Billed total" value={`$${stats.totalCharged.toFixed(2)}`} accent="bg-slate-100 text-slate-800" />
            </div>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Recent jobs</h2>
                <Button size="sm" variant="link" className="text-orange-600" onClick={() => setTab("active")}>
                  View all
                </Button>
              </div>
              {loading ? (
                <div className="text-sm text-slate-500 py-6 text-center">Loading…</div>
              ) : (
                <CXJobList jobs={jobs.slice(0, 5)} />
              )}
            </Card>
          </TabsContent>

          <TabsContent value="post" className="mt-0">
            {!billingActive ? (
              <BillingGate onSetup={() => setTab("settings")} />
            ) : (
              <CXPostJobForm
                restaurant={restaurant}
                userId={userId}
                onPosted={() => {
                  loadJobs();
                  setTab("active");
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-0 space-y-3">
            <h2 className="text-base font-semibold">Active jobs</h2>
            {active.length === 0 ? (
              <Card className="p-6 text-center text-sm text-slate-500">No active jobs.</Card>
            ) : (
              <CXJobList jobs={active} />
            )}
            {failed.length > 0 && (
              <>
                <h2 className="text-base font-semibold pt-4">Needs attention</h2>
                <CXJobList jobs={failed.slice(0, 5)} />
              </>
            )}
          </TabsContent>

          <TabsContent value="route" className="mt-0">
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Multi-stop route</div>
              <p className="text-sm text-slate-600 mb-3">
                Build a bulk route with multiple drop-offs. Stops are auto-sequenced to keep drive time and cost down.
              </p>
              {billingActive ? (
                <CXPostJobForm
                  restaurant={restaurant}
                  userId={userId}
                  onPosted={() => {
                    loadJobs();
                    setTab("active");
                  }}
                />
              ) : (
                <BillingGate onSetup={() => setTab("settings")} />
              )}
            </Card>
          </TabsContent>

          <TabsContent value="drivers" className="mt-0 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Verified courier-tier drivers</h2>
              <Badge variant="outline">{driverPool.length} approved</Badge>
            </div>
            {driverPool.length === 0 ? (
              <Card className="p-6 text-center text-sm text-slate-500">
                No courier-tier drivers in your region yet. Crave'N is actively recruiting.
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {driverPool.map((d) => (
                  <Card key={d.driver_id} className="p-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                      {(d.driver_id || "").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">Driver #{(d.driver_id || "").slice(0, 8)}</div>
                      <div className="text-xs text-slate-500">
                        {d.vehicle_type ?? "Vehicle n/a"} · up to {d.max_package_weight_lbs ?? "—"} lbs
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>
                  </Card>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500">
              Read-only directory. Job dispatch is automatic and tiered — verified drivers get first dibs.
            </p>
          </TabsContent>

          <TabsContent value="invoices" className="mt-0">
            <Card className="p-4">
              <h2 className="text-base font-semibold mb-3">Invoices</h2>
              <p className="text-sm text-slate-600 mb-3">
                Billing runs through Stripe. Open your billing portal for invoices, receipts, payment methods, and plan changes.
              </p>
              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={async () => {
                  const { data, error } = await supabase.functions.invoke("cx-customer-portal", {
                    body: { restaurant_id: restaurant.id },
                  });
                  if (error || data?.error) {
                    toast.error(data?.error ?? error?.message ?? "Could not open billing portal");
                    return;
                  }
                  if (data?.url) window.open(data.url, "_blank");
                }}
              >
                Open billing portal
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-0 space-y-3">
            <Card className="p-4">
              <h2 className="text-base font-semibold mb-1">Subscription</h2>
              <p className="text-sm text-slate-600">
                Status:{" "}
                <Badge className={billingActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}>
                  {(restaurant as any)?.cx_subscription_status ?? "inactive"}
                </Badge>
              </p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                {!billingActive && (
                  <Button
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={async () => {
                      const { data, error } = await supabase.functions.invoke("cx-create-checkout", {
                        body: { restaurant_id: restaurant.id },
                      });
                      if (error || data?.error) {
                        toast.error(data?.error ?? error?.message ?? "Could not start checkout");
                        return;
                      }
                      if (data?.url) window.open(data.url, "_blank");
                    }}
                  >
                    Choose a plan
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={async () => {
                    const { data, error } = await supabase.functions.invoke("cx-customer-portal", {
                      body: { restaurant_id: restaurant.id },
                    });
                    if (error || data?.error) {
                      toast.error(data?.error ?? error?.message ?? "Could not open billing portal");
                      return;
                    }
                    if (data?.url) window.open(data.url, "_blank");
                  }}
                >
                  Manage billing
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-base font-semibold mb-1">Company profile</h2>
              <div className="text-sm text-slate-700 space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {restaurant?.name}
                </div>
                <div className="text-xs text-slate-500">{restaurant?.address}</div>
                <div className="text-xs text-slate-500">{restaurant?.contact_email ?? restaurant?.email}</div>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-base font-semibold mb-1">Documents</h2>
              <p className="text-sm text-slate-600">
                Commercial auto insurance, business license, and W-9 are required to stay live. Manage them under{" "}
                <button className="text-orange-600 underline" onClick={() => navigate("/merchant/documents")}>
                  business documents
                </button>
                .
              </p>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: any; accent: string }) {
  return (
    <Card className={`p-3 ${accent}`}>
      <div className="text-[10px] uppercase tracking-wide font-semibold opacity-80">{label}</div>
      <div className="text-xl sm:text-2xl font-extrabold tabular-nums mt-1">{value}</div>
    </Card>
  );
}

function BillingGate({ onSetup }: { onSetup: () => void }) {
  return (
    <Card className="p-6 text-center space-y-3">
      <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
      <h3 className="font-semibold">Activate billing to post jobs</h3>
      <p className="text-sm text-slate-600">
        Choose a CX plan to start dispatching Crave'N Feeders. You can manage or cancel anytime.
      </p>
      <Button className="bg-orange-500 hover:bg-orange-600" onClick={onSetup}>
        Set up billing
      </Button>
    </Card>
  );
}