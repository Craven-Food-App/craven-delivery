import { supabase } from '@/integrations/supabase/client';

/** Aligns with DB RPC `get_feeder_clean_pay_summary` payload (camelCase keys). */
export type FeederCleanPayFlowStage =
  | 'offered'
  | 'accepted'
  | 'enRouteToMerchant'
  | 'arrivedAtMerchant'
  | 'pickedUp'
  | 'enRouteToCustomer'
  | 'arrivedAtCustomer'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface FeederCleanPaySummary {
  orderId: string;
  feederId?: string | null;
  orderStatus?: string | null;
  error?: string;
  basePayCents: number;
  deliveryFeeShareCents: number;
  customerTipCents: number;
  promoBonusCents: number;
  adjustmentCents: number;
  totalGuaranteedCents: number;
  expectedFinalPayoutCents: number;
  finalPayoutCents: number | null;
  tipStatus: string;
  payoutStatus: string;
  cleanPayStatusLabel: string;
  adjustmentReason: string | null;
  offerLockedAt: string | null;
  offerAcceptedAt: string | null;
  pickupConfirmedAt: string | null;
  deliveryCompletedAt: string | null;
  cleanPayVerified: boolean;
  flowStage?: string | null;
  nextStepHint?: string | null;
  cancellationPayCents?: number;
  snapshot?: Record<string, unknown> | null;
}

function parseSummaryRow(data: unknown): FeederCleanPaySummary | null {
  if (!data || typeof data !== 'object') return null;
  const r = data as Record<string, unknown>;
  if (typeof r.orderId !== 'string') return null;
  return {
    orderId: r.orderId,
    feederId: (r.feederId as string) ?? null,
    orderStatus: (r.orderStatus as string) ?? null,
    error: r.error as string | undefined,
    basePayCents: Number(r.basePayCents ?? 0),
    deliveryFeeShareCents: Number(r.deliveryFeeShareCents ?? 0),
    customerTipCents: Number(r.customerTipCents ?? 0),
    promoBonusCents: Number(r.promoBonusCents ?? 0),
    adjustmentCents: Number(r.adjustmentCents ?? 0),
    totalGuaranteedCents: Number(r.totalGuaranteedCents ?? 0),
    expectedFinalPayoutCents: Number(r.expectedFinalPayoutCents ?? 0),
    finalPayoutCents: r.finalPayoutCents != null ? Number(r.finalPayoutCents) : null,
    tipStatus: String(r.tipStatus ?? ''),
    payoutStatus: String(r.payoutStatus ?? ''),
    cleanPayStatusLabel: String(r.cleanPayStatusLabel ?? ''),
    adjustmentReason: (r.adjustmentReason as string) ?? null,
    offerLockedAt: (r.offerLockedAt as string) ?? null,
    offerAcceptedAt: (r.offerAcceptedAt as string) ?? null,
    pickupConfirmedAt: (r.pickupConfirmedAt as string) ?? null,
    deliveryCompletedAt: (r.deliveryCompletedAt as string) ?? null,
    cleanPayVerified: Boolean(r.cleanPayVerified),
    flowStage: (r.flowStage as string) ?? null,
    nextStepHint: (r.nextStepHint as string) ?? null,
    cancellationPayCents: r.cancellationPayCents != null ? Number(r.cancellationPayCents) : undefined,
    snapshot: (r.snapshot as Record<string, unknown>) ?? null,
  };
}

/**
 * Single shared earnings source for offer screen, active delivery, and final receipt.
 */
export async function getFeederCleanPaySummary(
  orderId: string,
  flowStage?: FeederCleanPayFlowStage | null
): Promise<FeederCleanPaySummary | null> {
  const { data, error } = await supabase.rpc('get_feeder_clean_pay_summary', {
    p_order_id: orderId,
    p_flow_stage: flowStage ?? null,
  });
  if (error) {
    console.warn('get_feeder_clean_pay_summary', error);
    return null;
  }
  return parseSummaryRow(data);
}

export async function saveFeederCleanPayOfferAcceptance(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('save_feeder_clean_pay_offer_acceptance', {
    p_order_id: orderId,
  });
  if (error) return { ok: false, error: error.message };
  const row = data as { ok?: boolean; error?: string } | null;
  if (row && row.ok === false) return { ok: false, error: row.error || 'save_failed' };
  return { ok: true };
}

export async function syncFeederCleanPayAdjustmentAtPickup(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('sync_feeder_clean_pay_adjustment_at_pickup', {
    p_order_id: orderId,
  });
  if (error) return { ok: false, error: error.message };
  const row = data as { ok?: boolean; error?: string } | null;
  if (row && row.ok === false) return { ok: false, error: row.error || 'sync_failed' };
  return { ok: true };
}

export function formatCleanPayMoney(cents: number): string {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

/** Sum multiple live previews (e.g. batch offer) for display on a single offer card. */
export function mergeFeederCleanPaySummaries(list: FeederCleanPaySummary[]): FeederCleanPaySummary | null {
  if (!list.length) return null;
  const head = list[0];
  const merged: FeederCleanPaySummary = {
    ...head,
    orderId: list.map((x) => x.orderId).join(','),
    basePayCents: 0,
    deliveryFeeShareCents: 0,
    customerTipCents: 0,
    promoBonusCents: 0,
    adjustmentCents: 0,
    totalGuaranteedCents: 0,
    expectedFinalPayoutCents: 0,
    finalPayoutCents: null,
  };
  for (const s of list) {
    merged.basePayCents += s.basePayCents;
    merged.deliveryFeeShareCents += s.deliveryFeeShareCents;
    merged.customerTipCents += s.customerTipCents;
    merged.promoBonusCents += s.promoBonusCents;
    merged.adjustmentCents += s.adjustmentCents;
    merged.totalGuaranteedCents += s.totalGuaranteedCents;
    merged.expectedFinalPayoutCents += s.expectedFinalPayoutCents;
  }
  merged.cleanPayStatusLabel = head.cleanPayStatusLabel;
  merged.tipStatus = head.tipStatus;
  merged.payoutStatus = head.payoutStatus;
  return merged;
}
