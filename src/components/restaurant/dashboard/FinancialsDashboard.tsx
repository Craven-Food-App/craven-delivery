import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";

// ── Styles ───────────────────────────────────────────────────────────────────

const FinancialsStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    .financials * { box-sizing: border-box; }
    .financials .tab-pill {
      cursor: pointer; border: none; font-family: 'IBM Plex Sans', sans-serif;
      transition: background 0.15s, color 0.15s;
    }
    .financials .tab-pill:hover { background: #fff7ed !important; color: #ea580c !important; }
    .financials .tx-row { transition: background 0.12s; cursor: pointer; }
    .financials .tx-row:hover { background: #fffaf7 !important; }
    .financials .stat-card { transition: box-shadow 0.15s, transform 0.15s; }
    .financials .stat-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important; transform: translateY(-1px); }
    .financials .select-wrap { position: relative; display: inline-flex; align-items: center; }
    .financials .select-wrap svg { position: absolute; right: 10px; pointer-events: none; color: #9ca3af; }
    .financials .select-input {
      border: 1px solid #e5e7eb; border-radius: 7px; padding: 7px 32px 7px 12px;
      font-size: 12.5px; font-family: 'IBM Plex Sans', sans-serif; color: #374151;
      background: #fff; outline: none; appearance: none; cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .financials .select-input:focus { border-color: #ea580c; box-shadow: 0 0 0 3px rgba(234,88,12,0.1); }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .financials .bar-fill {
      background: linear-gradient(90deg, #ea580c 0%, #f97316 50%, #ea580c 100%);
      background-size: 200% auto;
      animation: shimmer 2.2s linear infinite;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .financials .fade-up { animation: fadeUp 0.28s ease both; }
  `}</style>
);

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
  completed: { label: "Completed", bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  refunded: { label: "Refunded", bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  pending: { label: "Pending", bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" },
  scheduled: { label: "Scheduled", bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
  paid: { label: "Paid", bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
};

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
      {children}
      <div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em", padding: "2px 9px", borderRadius: 99, background: s.bg, color: s.text, border: `1px solid ${s.border}`, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

// ── Data types ───────────────────────────────────────────────────────────────

interface PayoutData {
  totalRevenue: number;
  totalCommission: number;
  netPayout: number;
  orderCount: number;
  commissionRate: number;
}

interface OrderRow {
  id: string;
  order_number: string | null;
  total_cents: number;
  created_at: string;
  delivery_method: string | null;
  order_status: string;
}

const RANGES = ["Last 7 days", "Last 30 days", "Last 90 days", "This year", "All time"] as const;

function getRangeDates(range: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (range) {
    case "Last 7 days":
      start.setDate(end.getDate() - 7);
      break;
    case "Last 30 days":
      start.setDate(end.getDate() - 30);
      break;
    case "Last 90 days":
      start.setDate(end.getDate() - 90);
      break;
    case "This year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "All time":
      start.setFullYear(2020, 0, 1);
      break;
    default:
      start.setDate(end.getDate() - 7);
  }
  return { start, end };
}

// ── Main component ──────────────────────────────────────────────────────────

interface FinancialsDashboardProps {
  restaurantId?: string;
}

export default function FinancialsDashboard({ restaurantId: restaurantIdProp }: FinancialsDashboardProps) {
  const [tab, setTab] = useState<"transactions" | "payouts" | "statements">("transactions");
  const [range, setRange] = useState<string>("Last 7 days");
  const [restaurantId, setRestaurantId] = useState<string | null>(restaurantIdProp ?? null);
  const [loading, setLoading] = useState(true);
  const [payoutData, setPayoutData] = useState<PayoutData | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const resolveRestaurant = useCallback(async () => {
    if (restaurantIdProp) {
      setRestaurantId(restaurantIdProp);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data?.[0]) setRestaurantId(data[0].id);
  }, [restaurantIdProp]);

  useEffect(() => {
    resolveRestaurant();
  }, [resolveRestaurant]);

  useEffect(() => {
    if (!restaurantId) return;
    const { start, end } = getRangeDates(range);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await supabase.functions.invoke("calculate-restaurant-payouts", {
          body: { restaurantId, startDate: startIso, endDate: endIso },
        });
        const raw = response?.data;
        if (!cancelled && raw) {
          const isCents = typeof raw.totalRevenue === "number" && raw.totalRevenue > 1000;
          setPayoutData({
            totalRevenue: isCents ? raw.totalRevenue / 100 : (raw.totalRevenue ?? 0),
            totalCommission: isCents ? (raw.totalCommission ?? 0) / 100 : (raw.totalCommission ?? 0),
            netPayout: isCents ? (raw.netPayout ?? 0) / 100 : (raw.netPayout ?? 0),
            orderCount: raw.orderCount ?? 0,
            commissionRate: raw.commissionRate ?? 5,
          });
        } else if (!cancelled) {
          setPayoutData(null);
        }

        const { data: ordersData } = await supabase
          .from("orders")
          .select("id, order_number, total_cents, created_at, delivery_method, order_status")
          .eq("restaurant_id", restaurantId)
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .in("order_status", ["delivered", "cancelled"])
          .order("created_at", { ascending: false })
          .limit(100);
        if (!cancelled) setOrders(ordersData || []);
      } catch (e) {
        if (!cancelled) setPayoutData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [restaurantId, range]);

  const formatCurrency = (dollars: number) =>
    `$${Math.abs(dollars).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatCents = (cents: number) => formatCurrency(cents / 100);

  const getTimeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const commissionRate = payoutData?.commissionRate ?? 5;
  const rateMult = commissionRate / 100;

  const transactionsForList = orders.map((o) => {
    const amount = (o.total_cents || 0) / 100;
    const isRefunded = o.order_status === "cancelled";
    const commission = isRefunded ? 0 : amount * rateMult;
    const net = isRefunded ? 0 : amount - commission;
    return {
      id: o.order_number || o.id.slice(-8).toUpperCase(),
      date: new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      ago: getTimeAgo(o.created_at),
      amount: formatCurrency(amount),
      commission: formatCurrency(commission),
      net: formatCurrency(net),
      status: isRefunded ? "refunded" : "completed",
      type: (o.delivery_method || "delivery") === "pickup" ? "Pickup" : "Delivery",
    };
  });

  const completedOrders = orders.filter((o) => o.order_status === "delivered");
  const totalRevenue = payoutData ? payoutData.totalRevenue : completedOrders.reduce((s, o) => s + (o.total_cents || 0) / 100, 0);
  const totalCommission = payoutData ? payoutData.totalCommission : totalRevenue * rateMult;
  const netPayout = payoutData ? payoutData.netPayout : totalRevenue - totalCommission;
  const displayOrderCount = payoutData ? payoutData.orderCount : completedOrders.length;

  const dailyBuckets: Record<string, number> = {};
  orders.forEach((o) => {
    if (o.order_status !== "delivered") return;
    const key = new Date(o.created_at).toISOString().slice(0, 10);
    dailyBuckets[key] = (dailyBuckets[key] || 0) + (o.total_cents || 0) / 100;
  });
  const sortedDays = Object.keys(dailyBuckets).sort();
  const dailyValues = sortedDays.map((d) => dailyBuckets[d]);
  const maxDaily = dailyValues.length ? Math.max(...dailyValues, 0.01) : 1;
  const barHeights = dailyValues.length ? dailyValues.map((v) => Math.round((v / maxDaily) * 100)) : [];

  const ytdStart = new Date();
  ytdStart.setMonth(0, 1);
  ytdStart.setHours(0, 0, 0, 0);
  const ytdOrders = orders.filter((o) => new Date(o.created_at) >= ytdStart && o.order_status === "delivered");
  const ytdRevenue = ytdOrders.reduce((s, o) => s + (o.total_cents || 0) / 100, 0);
  const ytdCommission = ytdRevenue * rateMult;
  const ytdNet = ytdRevenue - ytdCommission;

  const byMonth: Record<string, { orders: number; gross: number; fee: number; net: number }> = {};
  orders.forEach((o) => {
    if (o.order_status !== "delivered") return;
    const key = new Date(o.created_at).toLocaleString("en-US", { month: "long", year: "numeric" });
    if (!byMonth[key]) byMonth[key] = { orders: 0, gross: 0, fee: 0, net: 0 };
    const amt = (o.total_cents || 0) / 100;
    byMonth[key].orders += 1;
    byMonth[key].gross += amt;
    byMonth[key].fee += amt * rateMult;
    byMonth[key].net += amt - amt * rateMult;
  });
  const statements = Object.entries(byMonth)
    .map(([period, v]) => ({ period, ...v }))
    .sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());

  const nextPayoutDate = (() => {
    const d = new Date();
    const day = d.getDay();
    const daysUntilMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
    d.setDate(d.getDate() + daysUntilMonday);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  })();

  const downloadCSV = () => {
    const rows: string[][] = [
      ["Order ID", "Date", "Gross", "Commission", "Net", "Status", "Type"],
      ...transactionsForList.map((tx) => [tx.id, tx.date, tx.amount, tx.commission, tx.net, tx.status, tx.type]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financials-transactions-${range.replace(/\s/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    let y = 24;
    doc.setFontSize(16);
    doc.text("Financials Summary", 20, y);
    y += 20;
    doc.setFontSize(10);
    doc.text(`Period: ${range} · Generated ${new Date().toLocaleDateString("en-US")}`, 20, y);
    y += 24;
    doc.setFontSize(11);
    doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 20, y);
    y += 16;
    doc.text(`Commission (${commissionRate}%): ${formatCurrency(totalCommission)}`, 20, y);
    y += 16;
    doc.text(`Net Payout: ${formatCurrency(netPayout)}`, 20, y);
    y += 24;
    doc.setFontSize(10);
    doc.text("Recent Transactions", 20, y);
    y += 14;
    const colWidths = [50, 50, 35, 40, 35, 30];
    const headers = ["Order ID", "Date", "Gross", "Commission", "Net", "Status"];
    doc.setFont(undefined, "bold");
    headers.forEach((h, i) => doc.text(h, 20 + colWidths.slice(0, i).reduce((s, w) => s + w, 0), y));
    doc.setFont(undefined, "normal");
    y += 10;
    transactionsForList.slice(0, 20).forEach((tx) => {
      const line = [tx.id, tx.date, tx.amount, tx.commission, tx.net, tx.status];
      let x = 20;
      line.forEach((cell, i) => {
        doc.text(String(cell).slice(0, 12), x, y);
        x += colWidths[i];
      });
      y += 12;
    });
    doc.save(`financials-${range.replace(/\s/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <>
      <FinancialsStyles />
      <div
        className="financials"
        style={{
          fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
          background: "#fff",
          borderTop: "1px solid #e5e7eb",
          borderBottom: "1px solid #e5e7eb",
          borderRadius: 0,
          boxShadow: "none",
          width: "100%",
          margin: "32px 0 0 0",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 28px 0", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { id: "transactions" as const, label: "Transactions" },
                { id: "payouts" as const, label: "Payouts" },
                { id: "statements" as const, label: "Statements" },
              ].map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="tab-pill"
                    onClick={() => setTab(t.id)}
                    style={{
                      padding: "9px 16px",
                      borderRadius: "7px 7px 0 0",
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      color: active ? "#ea580c" : "#6b7280",
                      background: active ? "#fff" : "transparent",
                      borderBottom: active ? "2px solid #ea580c" : "2px solid transparent",
                      marginBottom: -1,
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {!loading && (
                <>
                  <button
                    type="button"
                    onClick={downloadCSV}
                    style={{
                      padding: "7px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#ea580c",
                      background: "#fff7ed",
                      border: "1px solid #fed7aa",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Download CSV
                  </button>
                  <button
                    type="button"
                    onClick={downloadPDF}
                    style={{
                      padding: "7px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#374151",
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Download PDF
                  </button>
                </>
              )}
              <div className="select-wrap">
                <select
                  className="select-input"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                >
                  {RANGES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {loading ? (
            <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="stat-card" style={{ padding: "16px 18px", borderRadius: 10, border: "1px solid #f3f4f6", background: "#f9fafb", minHeight: 100 }} />
                ))}
              </div>
              <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading financial data…</p>
            </div>
          ) : tab === "transactions" ? (
            <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[
                  { label: "Total Revenue", value: formatCurrency(totalRevenue), sub: `From ${displayOrderCount} orders`, icon: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />, color: "#111827" },
                  { label: "Commission", value: formatCurrency(totalCommission), sub: `${commissionRate}% platform fee`, icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>, color: "#ea580c" },
                  { label: "Net Payout", value: formatCurrency(netPayout), sub: "After commission", icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>, color: "#16a34a" },
                ].map((card, i) => (
                  <div key={i} className="stat-card" style={{ padding: "16px 18px", borderRadius: 10, border: "1px solid #f3f4f6", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "#6b7280" }}>{card.label}</span>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: i === 0 ? "#f9fafb" : i === 1 ? "#fff7ed" : "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={i === 0 ? "#9ca3af" : i === 1 ? "#ea580c" : "#16a34a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{card.icon}</svg>
                      </div>
                    </div>
                    <p style={{ fontSize: 22, fontWeight: 700, color: card.color, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "-0.5px", marginBottom: 3 }}>{card.value}</p>
                    <p style={{ fontSize: 11.5, color: "#9ca3af" }}>{card.sub}</p>
                  </div>
                ))}
              </div>
              <div>
                <SectionHead>Daily Revenue</SectionHead>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 56, padding: "0 2px" }}>
                  {barHeights.length === 0 ? (
                    <div style={{ width: "100%", textAlign: "center", color: "#9ca3af", fontSize: 12, lineHeight: "56px" }}>No daily data for this range</div>
                  ) : (
                    barHeights.map((h, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <div className={h > 60 ? "bar-fill" : ""} style={{ width: "100%", height: `${h}%`, borderRadius: "3px 3px 0 0", background: h > 60 ? undefined : "#f3f4f6", transition: "height 0.3s" }} />
                      </div>
                    ))
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 10.5, color: "#9ca3af" }}>{sortedDays[0] ? new Date(sortedDays[0]).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
                  <span style={{ fontSize: 10.5, color: "#9ca3af" }}>{sortedDays.length ? new Date(sortedDays[sortedDays.length - 1]).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
                </div>
              </div>
              <div>
                <SectionHead>Recent Transactions</SectionHead>
                <div style={{ borderRadius: 8, border: "1px solid #f3f4f6", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr 90px", padding: "8px 16px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                    {["Order ID", "Date", "Gross", "Commission", "Net", "Status"].map((h, i) => (
                      <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>{h}</span>
                    ))}
                  </div>
                  {transactionsForList.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No transactions in this period</div>
                  ) : (
                    transactionsForList.map((tx, i) => (
                      <div key={i} className="tx-row" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr 90px", padding: "11px 16px", borderBottom: i < transactionsForList.length - 1 ? "1px solid #f9fafb" : "none", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", fontFamily: "'IBM Plex Mono', monospace" }}>#{tx.id}</span>
                          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>{tx.type}</span>
                        </div>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{tx.ago}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", fontFamily: "'IBM Plex Mono', monospace" }}>{tx.amount}</span>
                        <span style={{ fontSize: 12.5, color: "#ea580c", fontFamily: "'IBM Plex Mono', monospace" }}>−{tx.commission}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: tx.status === "refunded" ? "#9ca3af" : "#16a34a", fontFamily: "'IBM Plex Mono', monospace" }}>{tx.status === "refunded" ? "—" : tx.net}</span>
                        <Badge status={tx.status} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : tab === "payouts" ? (
            <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ padding: "14px 18px", borderRadius: 10, background: "#fff7ed", border: "1.5px solid #fed7aa", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c2410c", marginBottom: 3 }}>Next Scheduled Payout</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#111827", fontFamily: "'IBM Plex Mono', monospace" }}>{formatCurrency(netPayout)}</p>
                  <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Estimated arrival: <strong style={{ color: "#374151" }}>{nextPayoutDate}</strong> · ACH Direct Deposit</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Payout account</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: "'IBM Plex Mono', monospace" }}>••••••• 4821</p>
                  <p style={{ fontSize: 11, color: "#ea580c", fontWeight: 500, marginTop: 4, cursor: "pointer" }}>Edit bank details →</p>
                </div>
              </div>
              <div>
                <SectionHead>Payout History</SectionHead>
                <div style={{ borderRadius: 8, border: "1px solid #f3f4f6", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr 90px", padding: "8px 16px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                    {["Payout ID", "Date", "Orders", "Gross", "Net", "Status"].map((h, i) => (
                      <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>{h}</span>
                    ))}
                  </div>
                  {completedOrders.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No payouts in this period</div>
                  ) : (
                    <div className="tx-row" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr 90px", padding: "11px 16px", alignItems: "center" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#111827", fontFamily: "'IBM Plex Mono', monospace" }}>PAY-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}</span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span style={{ fontSize: 12.5, color: "#374151" }}>{completedOrders.length} orders</span>
                      <span style={{ fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace", color: "#374151" }}>{formatCurrency(totalRevenue)}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", fontFamily: "'IBM Plex Mono', monospace" }}>{formatCurrency(netPayout)}</span>
                      <Badge status="scheduled" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <SectionHead>Payout Settings</SectionHead>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Payout Schedule", value: "Weekly (Every Monday)" },
                    { label: "Minimum Payout", value: "$50.00" },
                    { label: "Currency", value: "USD — US Dollar" },
                    { label: "Platform Fee", value: `${commissionRate}% per transaction` },
                  ].map((row, i) => (
                    <div key={i} style={{ padding: "11px 14px", borderRadius: 8, border: "1px solid #f3f4f6", background: "#f9fafb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{row.label}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", fontFamily: "'IBM Plex Mono', monospace" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                  { label: "YTD Revenue", value: formatCurrency(ytdRevenue), color: "#111827" },
                  { label: "YTD Commission", value: formatCurrency(ytdCommission), color: "#ea580c" },
                  { label: "YTD Net", value: formatCurrency(ytdNet), color: "#16a34a" },
                  { label: "Total Orders", value: String(ytdOrders.length), color: "#111827" },
                ].map((s, i) => (
                  <div key={i} className="stat-card" style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #f3f4f6", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <p style={{ fontSize: 10.5, color: "#9ca3af", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: "'IBM Plex Mono', monospace" }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <SectionHead>Monthly Statements</SectionHead>
                <div style={{ borderRadius: 8, border: "1px solid #f3f4f6", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr 80px", padding: "8px 16px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                    {["Period", "Orders", "Gross Revenue", "Platform Fee", "Net Earned", ""].map((h, i) => (
                      <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>{h}</span>
                    ))}
                  </div>
                  {statements.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No statements for this period</div>
                  ) : (
                    statements.map((s, i) => (
                      <div key={i} className="tx-row" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr 80px", padding: "12px 16px", borderBottom: i < statements.length - 1 ? "1px solid #f9fafb" : "none", alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{s.period}</span>
                        <span style={{ fontSize: 12.5, color: "#374151" }}>{s.orders} orders</span>
                        <span style={{ fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace", color: "#374151" }}>{formatCurrency(s.gross)}</span>
                        <span style={{ fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace", color: "#ea580c" }}>−{formatCurrency(s.fee)}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", fontFamily: "'IBM Plex Mono', monospace" }}>{formatCurrency(s.net)}</span>
                        <button type="button" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: "#ea580c", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          PDF
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div style={{ padding: "12px 16px", borderRadius: 8, background: "#f9fafb", border: "1px solid #f3f4f6" }}>
                <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Statements are generated on the 1st of each month for the prior month. PDFs are retained for 24 months.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
