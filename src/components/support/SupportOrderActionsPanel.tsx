// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Ban,
  Repeat2,
  Gift,
  DollarSign,
  Unlock,
  RefreshCw,
  ShieldCheck,
  Loader2,
  History,
} from "lucide-react";

interface Props {
  orderId: string;
  threadId: string;
  onAction?: (label: string) => void;
}

interface ActionRow {
  id: string;
  action_type: string;
  amount_cents: number | null;
  reason: string | null;
  performed_by_email: string | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  order_status: string;
  driver_id: string | null;
  accepted_driver_id: string | null;
  assigned_craver_id: string | null;
  cs_incentive_cents: number;
  cs_bonus_cents: number;
  merchant_adjust_authorized: boolean;
  cancelled_at: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  cancel_order: "Cancelled order",
  reassign_driver: "Reassigned driver",
  add_incentive: "Added driver incentive",
  add_bonus: "Added bonus pay",
  authorize_merchant_adjust: "Authorized merchant adjustment",
  revoke_merchant_adjust: "Revoked merchant adjustment",
  refund_customer: "Issued refund",
};

function dollars(c?: number | null) {
  return c == null ? "—" : `$${(c / 100).toFixed(2)}`;
}

export default function SupportOrderActionsPanel({ orderId, threadId, onAction }: Props) {
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [history, setHistory] = useState<ActionRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; email: string | null } | null>(null);

  const load = useCallback(async () => {
    const [{ data: o }, { data: h }] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_status, driver_id, accepted_driver_id, assigned_craver_id, cs_incentive_cents, cs_bonus_cents, merchant_adjust_authorized, cancelled_at")
        .eq("id", orderId)
        .maybeSingle(),
      supabase
        .from("support_order_actions")
        .select("id, action_type, amount_cents, reason, performed_by_email, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setOrder((o as OrderRow) ?? null);
    setHistory((h as ActionRow[]) ?? []);
  }, [orderId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setMe(data.user ? { id: data.user.id, email: data.user.email ?? null } : null),
    );
  }, []);

  useEffect(() => { load(); }, [load]);

  const logAction = useCallback(async (action_type: string, amount_cents: number | null, reason: string | null, metadata: Record<string, unknown> = {}) => {
    await supabase.from("support_order_actions").insert({
      order_id: orderId,
      thread_id: threadId,
      action_type,
      amount_cents,
      reason,
      metadata,
      performed_by: me?.id ?? null,
      performed_by_email: me?.email ?? null,
    });
    await supabase.from("order_support_messages").insert({
      thread_id: threadId,
      sender_role: "system",
      body: `${ACTION_LABELS[action_type] ?? action_type}${amount_cents != null ? ` — ${dollars(amount_cents)}` : ""}${reason ? ` (${reason})` : ""}.`,
    });
    onAction?.(ACTION_LABELS[action_type] ?? action_type);
  }, [orderId, threadId, me, onAction]);

  const cancelOrder = useCallback(async () => {
    const reason = window.prompt("Cancellation reason (visible to merchant, customer, feeder):");
    if (!reason) return;
    setBusy("cancel_order");
    await supabase.from("orders").update({
      order_status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: me?.id ?? null,
      cancellation_reason: reason,
    }).eq("id", orderId);
    await logAction("cancel_order", null, reason);
    await load();
    setBusy(null);
  }, [orderId, me, logAction, load]);

  const reassignDriver = useCallback(async () => {
    const reason = window.prompt("Why is this order being pushed to another feeder?");
    if (!reason) return;
    setBusy("reassign_driver");
    await supabase.from("orders").update({
      driver_id: null,
      accepted_driver_id: null,
      assigned_craver_id: null,
      accepted_at: null,
      order_status: "ready_for_pickup",
      broadcast_started_at: new Date().toISOString(),
    }).eq("id", orderId);
    await logAction("reassign_driver", null, reason);
    await load();
    setBusy(null);
  }, [orderId, logAction, load]);

  const addIncentive = useCallback(async () => {
    const raw = window.prompt("Driver incentive to add (USD, e.g. 3.50):");
    if (!raw) return;
    const cents = Math.round(parseFloat(raw) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return;
    const reason = window.prompt("Reason for incentive:") ?? "";
    setBusy("add_incentive");
    const next = (order?.cs_incentive_cents ?? 0) + cents;
    await supabase.from("orders").update({ cs_incentive_cents: next }).eq("id", orderId);
    await logAction("add_incentive", cents, reason);
    await load();
    setBusy(null);
  }, [orderId, order, logAction, load]);

  const addBonus = useCallback(async () => {
    const raw = window.prompt("Bonus pay to add to feeder payout (USD):");
    if (!raw) return;
    const cents = Math.round(parseFloat(raw) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return;
    const reason = window.prompt("Reason for bonus:") ?? "";
    setBusy("add_bonus");
    const next = (order?.cs_bonus_cents ?? 0) + cents;
    await supabase.from("orders").update({ cs_bonus_cents: next }).eq("id", orderId);
    await logAction("add_bonus", cents, reason);
    await load();
    setBusy(null);
  }, [orderId, order, logAction, load]);

  const toggleMerchantAdjust = useCallback(async () => {
    const enable = !order?.merchant_adjust_authorized;
    const reason = enable
      ? window.prompt("Why is the merchant authorized to adjust this order? (e.g. 86'd item, substitution)")
      : "Merchant adjustment window closed.";
    if (enable && !reason) return;
    setBusy("merchant_adjust");
    await supabase.from("orders").update({
      merchant_adjust_authorized: enable,
      merchant_adjust_authorized_at: enable ? new Date().toISOString() : null,
      merchant_adjust_authorized_by: enable ? me?.id ?? null : null,
    }).eq("id", orderId);
    await logAction(enable ? "authorize_merchant_adjust" : "revoke_merchant_adjust", null, reason ?? null);
    await load();
    setBusy(null);
  }, [orderId, order, me, logAction, load]);

  const issueRefund = useCallback(async () => {
    const raw = window.prompt("Refund amount to customer (USD):");
    if (!raw) return;
    const cents = Math.round(parseFloat(raw) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return;
    const reason = window.prompt("Reason for refund:") ?? "";
    setBusy("refund");
    await logAction("refund_customer", cents, reason);
    await load();
    setBusy(null);
  }, [logAction, load]);

  const Btn = ({ id, label, icon: Icon, onClick, tone = "default", disabled }: any) => (
    <button
      onClick={onClick}
      disabled={busy != null || disabled}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
        tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          : tone === "primary"
          ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
          : tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-border bg-background text-foreground hover:bg-accent"
      }`}
    >
      {busy === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
      {label}
    </button>
  );

  const isCancelled = order?.order_status === "cancelled" || !!order?.cancelled_at;

  return (
    <div className="border-t border-border bg-amber-50/40 px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
          <ShieldCheck className="h-3 w-3" /> CS Actions
        </span>
        <span className="text-[10px] text-muted-foreground">
          Incentive {dollars(order?.cs_incentive_cents)} · Bonus {dollars(order?.cs_bonus_cents)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Btn id="cancel_order" label={isCancelled ? "Cancelled" : "Cancel order"} icon={Ban} onClick={cancelOrder} tone="danger" disabled={isCancelled} />
        <Btn id="reassign_driver" label="Reassign feeder" icon={Repeat2} onClick={reassignDriver} tone="primary" disabled={isCancelled} />
        <Btn id="add_incentive" label="Add incentive" icon={Gift} onClick={addIncentive} tone="primary" />
        <Btn id="add_bonus" label="Add bonus pay" icon={DollarSign} onClick={addBonus} tone="primary" />
        <Btn
          id="merchant_adjust"
          label={order?.merchant_adjust_authorized ? "Revoke merchant edit" : "Authorize merchant edit"}
          icon={Unlock}
          onClick={toggleMerchantAdjust}
          tone={order?.merchant_adjust_authorized ? "success" : "default"}
        />
        <Btn id="refund" label="Refund customer" icon={RefreshCw} onClick={issueRefund} tone="danger" />
      </div>
      {history.length > 0 && (
        <details className="mt-2">
          <summary className="flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <History className="h-3 w-3" /> Action history ({history.length})
          </summary>
          <ul className="mt-1 space-y-0.5 pl-4">
            {history.map((h) => (
              <li key={h.id} className="text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">{ACTION_LABELS[h.action_type] ?? h.action_type}</span>
                {h.amount_cents != null && <> · {dollars(h.amount_cents)}</>}
                {h.reason && <> · {h.reason}</>}
                <span className="ml-1 opacity-60">
                  {new Date(h.created_at).toLocaleString()} {h.performed_by_email ? `by ${h.performed_by_email}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}