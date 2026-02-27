import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface CustomerOrderForList {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  order_items: Array<{
    quantity: number;
    price_cents: number;
    name: string;
    special_instructions?: string | null;
    modifiers?: Array<{ price_cents?: number }>;
  }>;
  subtotal_cents: number;
  delivery_fee_cents?: number;
  tax_cents: number;
  total_cents: number;
  delivery_method: "delivery" | "pickup";
  delivery_address?: string | Record<string, unknown> | null;
  order_status: string;
  created_at: string;
  order_number?: string | null;
  pickup_code?: string | null;
  driver_name?: string | null;
  driver_vehicle?: string | null;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
  delivered: { label: "Delivered", bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  pending: { label: "Pending", bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" },
  confirmed: { label: "Confirmed", bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" },
  preparing: { label: "Preparing", bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" },
  ready: { label: "Ready", bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
  out_for_delivery: { label: "Out for delivery", bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
  cancelled: { label: "Cancelled", bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
};

function getStatusStyle(status: string) {
  return STATUS_MAP[status] ?? { label: status.replace(/_/g, " "), bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
}

function formatAddress(addr: string | Record<string, unknown> | null | undefined): string {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  if (typeof addr === "object" && addr !== null && "street" in addr) {
    const o = addr as Record<string, unknown>;
    return [o.street, o.city, o.state, o.zip].filter(Boolean).join(", ");
  }
  return "";
}

const Icon = ({ d, size = 13 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="merchant-order-copy-btn"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      style={{
        border: "none",
        background: "rgba(234,88,12,0.08)",
        color: copied ? "#059669" : "#ea580c",
        width: 26,
        height: 26,
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {copied ? <span style={{ fontSize: 11, fontWeight: 700 }}>✓</span> : <CopyIcon />}
    </button>
  );
}

interface OrderRowProps {
  order: CustomerOrderForList;
  getStatusLabel: (s: string) => string;
  onUpdateStatus?: (orderId: string, newStatus: string) => void;
  onRefund?: (orderId: string, amountCents?: number) => void;
  canRefund?: (order: CustomerOrderForList) => boolean;
}

function OrderRow({ order, getStatusLabel, onUpdateStatus, onRefund, canRefund }: OrderRowProps) {
  const [open, setOpen] = useState(false);
  const [showPartialRefund, setShowPartialRefund] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  const [showPrintTicket, setShowPrintTicket] = useState(false);
  const statusLabel = getStatusLabel(order.order_status);
  const s = getStatusStyle(order.order_status);

  const displayId = order.order_number || order.id.slice(-8).toUpperCase();
  const dateStr = format(new Date(order.created_at), "M/d/yyyy, h:mm a");
  const totalStr = `$${(order.total_cents / 100).toFixed(2)}`;
  const pickupCode = order.pickup_code || "—";
  const address = formatAddress(order.delivery_address);

  const subtotalStr = `$${(order.subtotal_cents / 100).toFixed(2)}`;
  const shippingCents = order.delivery_fee_cents ?? 0;
  const shippingStr = `$${(shippingCents / 100).toFixed(2)}`;
  const taxStr = `$${(order.tax_cents / 100).toFixed(2)}`;

  const items = order.order_items.map((item) => {
    const modCents = (item.modifiers?.reduce((sum, m) => sum + (m.price_cents ?? 0), 0) ?? 0) * item.quantity;
    const lineCents = item.price_cents * item.quantity + modCents;
    return {
      qty: item.quantity,
      name: item.name,
      note: item.special_instructions || null,
      price: `$${(lineCents / 100).toFixed(2)}`,
    };
  });

  const openPrintTicket = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPrintTicket(true);
  };

  const ticketContent = (
    <div
      className="print-ticket-content"
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: 16,
        fontSize: 14,
        color: "#111",
        minWidth: 320,
      }}
    >
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-ticket-content,
          .print-ticket-content * { visibility: visible; }
          .print-ticket-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            background: white !important;
            padding: 16px !important;
          }
          .print-ticket-actions { visibility: hidden !important; }
        }
      `}</style>
      <h1 style={{ fontSize: 18, margin: "0 0 12px", borderBottom: "2px solid #ea580c", paddingBottom: 6 }}>
        Order #{displayId}
      </h1>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
        <span>Date</span>
        <span>{dateStr}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
        <span>Pickup code</span>
        <span style={{ fontWeight: 700 }}>{pickupCode}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
        <span>Customer</span>
        <span>{order.customer_name}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
        <span>{order.delivery_method === "delivery" ? "Address" : "Pickup"}</span>
        <span>{address || "—"}</span>
      </div>
      {order.delivery_method === "delivery" && (
        <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
          <span>Driver</span>
          <span>
            {order.driver_name || order.driver_vehicle
              ? [order.driver_name, order.driver_vehicle].filter(Boolean).join(order.driver_name && order.driver_vehicle ? " · " : "")
              : "No driver assigned"}
          </span>
        </div>
      )}
      <div style={{ margin: "12px 0", borderTop: "1px solid #eee", paddingTop: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ margin: "6px 0" }}>
            {item.qty}× {item.name} — {item.price}
            {item.note && <><br /><small>Note: {item.note}</small></>}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
        <span>Subtotal</span>
        <span>{subtotalStr}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
        <span>Shipping</span>
        <span>{shippingStr}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
        <span>Tax</span>
        <span>{taxStr}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 8, borderTop: "2px solid #111", fontSize: 16, fontWeight: 700 }}>
        <span>Total</span>
        <span>{totalStr}</span>
      </div>
    </div>
  );

  const allowRefund = (canRefund ?? (() => true))(order) && onRefund && order.order_status !== "cancelled";
  const canUpdateStatus = order.order_status !== "delivered" && order.order_status !== "cancelled";
  const nextStatusMap: Record<string, string | null> = {
    pending: "confirmed",
    confirmed: "preparing",
    preparing: "ready",
    ready: "out_for_delivery",
    out_for_delivery: "delivered",
    delivered: null,
    cancelled: null,
  };
  const nextStatus = nextStatusMap[order.order_status] ?? null;

  return (
    <div style={{ borderBottom: "1px solid #f3f4f6" }}>
      <div
        className={`merchant-order-row${open ? " active" : ""}`}
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto auto",
          alignItems: "center",
          gap: 16,
          padding: "13px 24px",
          background: open ? "#fffaf7" : "#fff",
        }}
      >
        <div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#111827",
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "0.03em",
            }}
          >
            #{displayId}
          </span>
          <span style={{ fontSize: 11.5, color: "#9ca3af", marginLeft: 10 }}>{dateStr}</span>
        </div>
        <span style={{ fontSize: 11.5, color: "#6b7280", fontWeight: 500 }}>
          {order.delivery_method === "delivery" ? "Delivery" : "Pickup"}
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.05em",
            padding: "2px 9px",
            borderRadius: 99,
            background: s.bg,
            color: s.text,
            border: `1px solid ${s.border}`,
            whiteSpace: "nowrap",
          }}
        >
          {statusLabel}
        </span>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: open ? "#ea580c" : "#111827",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {totalStr}
        </span>
        <span style={{ color: "#9ca3af" }}>
          <ChevronIcon open={open} />
        </span>
      </div>

      <div
        className="merchant-order-expand-panel"
        style={{ maxHeight: open ? "800px" : "0px", opacity: open ? 1 : 0 }}
      >
        {open && (
          <div
            className="merchant-order-detail-inner"
            style={{
              padding: "0 24px 20px",
              background: "#fffaf7",
              borderTop: "1px solid #f3f4f6",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "14px 0 14px" }}>
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f9fafb", border: "1px solid #f3f4f6" }}>
                <p style={{ margin: "0 0 3px", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9ca3af" }}>
                  Order Number
                </p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827", fontFamily: "'IBM Plex Mono', monospace" }}>
                  {displayId}
                </p>
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "#fff7ed",
                  border: "1.5px solid #fed7aa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ margin: "0 0 3px", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c2410c" }}>
                    Pickup Code
                  </p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#ea580c", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em" }}>
                    {pickupCode}
                  </p>
                </div>
                {pickupCode !== "—" && <CopyButton value={pickupCode} />}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16 }}>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9ca3af" }}>
                  Customer
                </p>
                {[
                  { icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", val: order.customer_name, bold: true },
                  { icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6", val: order.customer_email || "—" },
                  { icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.6 1.32h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z", val: order.customer_phone || "—" },
                  { icon: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", val: address || "—" },
                  ...(order.delivery_method === "delivery"
                    ? [{ icon: "M18 18H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2z", val: order.driver_name || order.driver_vehicle ? [order.driver_name, order.driver_vehicle].filter(Boolean).join(order.driver_name && order.driver_vehicle ? " · " : "") : "No driver assigned", bold: false as boolean }]
                    : []),
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 5 }}>
                    <span style={{ color: "#9ca3af", flexShrink: 0, marginTop: 1 }}>
                      <Icon d={r.icon} />
                    </span>
                    <span style={{ fontSize: 12.5, color: r.bold ? "#111827" : "#374151", fontWeight: r.bold ? 600 : 400, lineHeight: 1.4 }}>
                      {r.val}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <p style={{ margin: "0 0 8px", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9ca3af" }}>
                  Items ({items.length})
                </p>
                <div style={{ borderRadius: 8, border: "1px solid #f3f4f6", overflow: "hidden", marginBottom: 8 }}>
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="merchant-order-item-row"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        padding: "8px 12px",
                        gap: 10,
                        borderBottom: i < items.length - 1 ? "1px solid #f9fafb" : "none",
                        background: "#fff",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: "#ea580c",
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            borderRadius: 4,
                            padding: "0px 6px",
                            flexShrink: 0,
                            fontFamily: "'IBM Plex Mono', monospace",
                            marginTop: 1,
                          }}
                        >
                          {item.qty}×
                        </span>
                        <div>
                          <span style={{ fontSize: 12.5, fontWeight: 500, color: "#111827" }}>{item.name}</span>
                          {item.note && (
                            <p style={{ margin: "1px 0 0", fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>
                              Note: {item.note}
                            </p>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#111827", fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>
                  {[
                    { label: "Subtotal", val: subtotalStr },
                    { label: "Shipping", val: shippingStr },
                    { label: "Tax", val: taxStr },
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11.5, color: "#6b7280" }}>{r.label}</span>
                      <span style={{ fontSize: 11.5, color: "#374151", fontFamily: "'IBM Plex Mono', monospace" }}>{r.val}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 7, borderTop: "1px solid #e5e7eb" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Total</span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#ea580c", fontFamily: "'IBM Plex Mono', monospace" }}>{totalStr}</span>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <a
                    href={`/support?order=${encodeURIComponent(displayId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      textDecoration: "none",
                    }}
                  >
                    Report issue / Contact support
                  </a>
                  <button
                    type="button"
                    onClick={openPrintTicket}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 6,
                      border: "1px solid #6b7280",
                      background: "#fff",
                      color: "#374151",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Print ticket
                  </button>
                  {allowRefund && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPartialRefund(true);
                        }}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 6,
                          border: "1px solid #b91c1c",
                          background: "#fff",
                          color: "#b91c1c",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Partial refund
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRefund(order.id);
                        }}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 6,
                          border: "none",
                          background: "#b91c1c",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Full refund
                      </button>
                      {showPartialRefund && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                          <input
                            type="number"
                            min="1"
                            max={Math.floor(order.total_cents / 100)}
                            step="0.01"
                            placeholder="Amount (e.g. 10.50)"
                            value={partialAmount}
                            onChange={(e) => setPartialAmount(e.target.value)}
                            style={{
                              width: 120,
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid #e5e7eb",
                              fontSize: 12,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span style={{ fontSize: 11.5, color: "#6b7280" }}>Max ${(order.total_cents / 100).toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const dollars = parseFloat(partialAmount);
                              if (!Number.isFinite(dollars) || dollars <= 0 || dollars * 100 > order.total_cents) return;
                              onRefund(order.id, Math.round(dollars * 100));
                              setShowPartialRefund(false);
                              setPartialAmount("");
                            }}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 6,
                              border: "none",
                              background: "#b91c1c",
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Refund amount
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPartialRefund(false);
                              setPartialAmount("");
                            }}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 6,
                              border: "1px solid #d1d5db",
                              background: "#fff",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </>
                  )}
                {canUpdateStatus && onUpdateStatus && (
                  <>
                    {nextStatus && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateStatus(order.id, nextStatus);
                        }}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 6,
                          border: "none",
                          background: "#ea580c",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Mark as {nextStatus.replace(/_/g, " ")}
                      </button>
                    )}
                    {order.order_status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(order.id, "cancelled");
                          }}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 6,
                            border: "1px solid #dc2626",
                            background: "#fff",
                            color: "#dc2626",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Cancel order
                        </button>
                      </>
                    )}
                  </>
                )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showPrintTicket} onOpenChange={setShowPrintTicket}>
        <DialogContent className="max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Order #{displayId} — Print ticket</DialogTitle>
          </DialogHeader>
          {ticketContent}
          <div className="print-ticket-actions" style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Button
              type="button"
              onClick={() => window.print()}
              className="bg-[#ea580c] hover:bg-[#c2410c]"
            >
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MerchantOrderListProps {
  orders: CustomerOrderForList[];
  getStatusLabel: (status: string) => string;
  onUpdateStatus?: (orderId: string, newStatus: string) => void;
  onRefund?: (orderId: string, amountCents?: number) => void;
  canRefund?: (order: CustomerOrderForList) => boolean;
}

export default function MerchantOrderList({ orders, getStatusLabel, onUpdateStatus, onRefund, canRefund }: MerchantOrderListProps) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .merchant-order-row {
          cursor: pointer;
          transition: background 0.13s ease;
        }
        .merchant-order-row:hover { background: #fffaf7 !important; }
        .merchant-order-row.active { background: #fffaf7 !important; }
        .merchant-order-expand-panel {
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease;
        }
        .merchant-order-copy-btn { transition: background 0.15s, transform 0.12s; cursor: pointer; }
        .merchant-order-copy-btn:hover { background: rgba(234,88,12,0.14) !important; }
        .merchant-order-item-row:hover { background: #fafafa !important; }
        @keyframes merchantOrderFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .merchant-order-detail-inner { animation: merchantOrderFadeIn 0.2s ease both; }
      `}</style>

      <div
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
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px" }}>
              Recent Orders
            </h2>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", fontFamily: "'IBM Plex Mono', monospace" }}>
            {orders.length} orders
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto auto",
            gap: 16,
            padding: "8px 24px",
            background: "#f9fafb",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          {["Order / Date", "Type", "Status", "Total", ""].map((h, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>
              {h}
            </span>
          ))}
        </div>

        {orders.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No orders yet</div>
        ) : (
          orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              getStatusLabel={getStatusLabel}
              onUpdateStatus={onUpdateStatus}
              onRefund={onRefund}
              canRefund={canRefund}
            />
          ))
        )}
      </div>
    </>
  );
}
