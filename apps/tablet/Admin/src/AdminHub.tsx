import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@admin/components/ui/CardShim";

interface Metric {
  label: string;
  value: number | string;
  description?: string;
}

interface DriverStatusCount {
  status: string;
  count: number;
}

const APP_BASE_URL =
  (import.meta as any).env?.VITE_PUBLIC_APP_URL || "https://cravenusa.com";

const AdminHub: React.FC = () => {
  const [driverMetrics, setDriverMetrics] = useState<Metric[]>([]);
  const [driverStatusBreakdown, setDriverStatusBreakdown] = useState<DriverStatusCount[]>([]);
  const [merchantMetrics, setMerchantMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const now = new Date();
        const since7 = new Date(now);
        since7.setDate(since7.getDate() - 7);
        const since30 = new Date(now);
        since30.setDate(since30.getDate() - 30);

        const { data: allDrivers, error: allErr } = await supabase
          .from("unified_driver_applications")
          .select("id, status, created_at, waitlist_position");
        if (allErr) throw allErr;

        const waitlistCount = (allDrivers ?? []).filter((d) => d.status === "waitlist").length;
        const newDrivers7 = (allDrivers ?? []).filter(
          (d) => d.created_at && new Date(d.created_at) >= since7
        ).length;
        const newDrivers30 = (allDrivers ?? []).filter(
          (d) => d.created_at && new Date(d.created_at) >= since30
        ).length;

        const statusCounts: Record<string, number> = {};
        (allDrivers ?? []).forEach((d) => {
          const s = d.status ?? "unknown";
          statusCounts[s] = (statusCounts[s] ?? 0) + 1;
        });
        setDriverStatusBreakdown(
          Object.entries(statusCounts)
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => b.count - a.count)
        );

        setDriverMetrics([
          { label: "Driver applications (total)", value: allDrivers?.length ?? 0 },
          { label: "Waitlist count", value: waitlistCount, description: "Currently on waitlist" },
          { label: "New applications (7 days)", value: newDrivers7 },
          { label: "New applications (30 days)", value: newDrivers30 },
          { label: "Active drivers", value: statusCounts["active"] ?? 0 },
        ]);

        const { data: allRestaurants, error: restErr } = await supabase
          .from("restaurants")
          .select("id, created_at, is_active");
        if (restErr) throw restErr;

        const newMerchants7 = (allRestaurants ?? []).filter(
          (r) => r.created_at && new Date(r.created_at) >= since7
        ).length;
        const newMerchants30 = (allRestaurants ?? []).filter(
          (r) => r.created_at && new Date(r.created_at) >= since30
        ).length;
        const activeMerchants = (allRestaurants ?? []).filter((r) => r.is_active !== false).length;

        setMerchantMetrics([
          { label: "Merchants (total)", value: allRestaurants?.length ?? 0 },
          { label: "Active merchants", value: activeMerchants },
          { label: "New merchants (7 days)", value: newMerchants7 },
          { label: "New merchants (30 days)", value: newMerchants30 },
        ]);
      } catch (e) {
        console.error("Failed to load admin metrics", e);
        setDriverMetrics([{ label: "Driver metrics unavailable", value: "—" }]);
        setMerchantMetrics([{ label: "Merchant metrics unavailable", value: "—" }]);
      } finally {
        setLoading(false);
      }
    };

    void fetchMetrics();
  }, []);

  const goToPortal = (path: string) => {
    const url = `${APP_BASE_URL}${path}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const cardTextColor = "#0f172a";
  const mutedColor = "#64748b";
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: mutedColor,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 12,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 24,
        gap: 24,
        minHeight: "100vh",
        background: "#f8fafc",
        color: cardTextColor,
      }}
    >
      <header style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: cardTextColor }}>
          Crave&apos;n Admin Hub
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: mutedColor }}>
          Executive tablet view — driver and merchant metrics, waitlist and progress.
        </p>
      </header>

      {loading ? (
        <div style={{ fontSize: 14, color: mutedColor }}>Loading metrics…</div>
      ) : (
        <>
          <section>
            <div style={sectionTitleStyle}>Driver metrics</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              {driverMetrics.map((m) => (
                <Card key={m.label}>
                  <CardContent>
                    <div style={{ fontSize: 12, color: mutedColor }}>{m.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: cardTextColor }}>
                      {m.value}
                    </div>
                    {m.description && (
                      <div style={{ fontSize: 11, color: mutedColor, marginTop: 4 }}>
                        {m.description}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <div style={sectionTitleStyle}>Driver progress (by status)</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {driverStatusBreakdown.map(({ status, count }) => (
                <Card key={status}>
                  <CardContent>
                    <div style={{ fontSize: 12, color: mutedColor }}>
                      {status.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: cardTextColor }}>
                      {count}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <div style={sectionTitleStyle}>Merchant metrics</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              {merchantMetrics.map((m) => (
                <Card key={m.label}>
                  <CardContent>
                    <div style={{ fontSize: 12, color: mutedColor }}>{m.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: cardTextColor }}>
                      {m.value}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginTop: 8,
        }}
      >
        <button
          type="button"
          onClick={() => goToPortal("/driver-operations")}
          style={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            padding: 18,
            textAlign: "left",
            cursor: "pointer",
            color: cardTextColor,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700 }}>Driver Operations</div>
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 4 }}>
            Open feeder dashboards and tools for cravers on the road.
          </div>
        </button>

        <button
          type="button"
          onClick={() => goToPortal("/merchant-operations")}
          style={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            padding: 18,
            textAlign: "left",
            cursor: "pointer",
            color: cardTextColor,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700 }}>Merchant Operations</div>
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 4 }}>
            Jump into merchant portals to assist partners and monitor stores.
          </div>
        </button>
      </section>
    </div>
  );
};

export default AdminHub;
