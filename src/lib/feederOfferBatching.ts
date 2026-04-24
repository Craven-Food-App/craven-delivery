/**
 * Geo rules for offering multiple orders as one "batch" to a feeder:
 * same restaurant (pickup), and every drop-off is within a max road-ish distance
 * of every other in the set (clique in miles). This excludes e.g. Toledo vs Bowling Green.
 */

import type { OrderAssignment } from '@/components/mobile/feederOrderTypes';

export const DEFAULT_MAX_BATCH_DROPOFF_MILES = 10;

const EARTH_RADIUS_MILES = 3959;

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_MILES * c;
}

/** Parse lat/lng from order dropoff JSON (common shapes in this codebase). */
export function getDropoffLatLng(addr: unknown): { lat: number; lng: number } | null {
  if (addr == null) return null;
  if (typeof addr === 'string') return null;
  if (typeof addr !== 'object') return null;
  const a = addr as Record<string, unknown>;
  const lat = Number(a.lat ?? a.latitude);
  const lng = Number(a.lng ?? a.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return null;
}

/**
 * Group orders for one restaurant into batch clusters: each cluster is a clique
 * in `maxMiles` (all pairwise drop-off distances <= maxMiles). Orders without
 * coordinates stay as singles.
 */
export function clusterBatchableOrders(
  sameRestaurant: OrderAssignment[],
  maxMiles: number
): OrderAssignment[][] {
  if (sameRestaurant.length <= 1) {
    return sameRestaurant.length ? [sameRestaurant] : [];
  }
  const withCoord: OrderAssignment[] = [];
  const noCoord: OrderAssignment[] = [];
  for (const o of sameRestaurant) {
    if (getDropoffLatLng(o.dropoff_address)) withCoord.push(o);
    else noCoord.push(o);
  }
  const out: OrderAssignment[][] = [];
  const remaining = [...withCoord];
  while (remaining.length) {
    const cluster: OrderAssignment[] = [remaining.shift()!];
    for (let i = 0; i < remaining.length; ) {
      const cand = remaining[i];
      const c = getDropoffLatLng(cand.dropoff_address);
      if (!c) {
        i++;
        continue;
      }
      const ok = cluster.every((o) => {
        const oc = getDropoffLatLng(o.dropoff_address);
        if (!oc) return false;
        return haversineMiles(c, oc) <= maxMiles;
      });
      if (ok) {
        cluster.push(cand);
        remaining.splice(i, 1);
      } else {
        i++;
      }
    }
    out.push(cluster);
  }
  for (const o of noCoord) {
    out.push([o]);
  }
  return out;
}

export type OfferRow =
  | { kind: 'single'; offer: OrderAssignment }
  | { kind: 'batch'; offers: OrderAssignment[]; minExpiresAt: string };

/**
 * Build UI rows: batch clusters (same restaurant + proximity) and singles.
 */
export function buildOfferDisplayRows(
  offers: OrderAssignment[],
  maxDropoffMiles: number = DEFAULT_MAX_BATCH_DROPOFF_MILES
): OfferRow[] {
  if (offers.length === 0) return [];
  const byRestaurant = new Map<string, OrderAssignment[]>();
  for (const o of offers) {
    // Without restaurant_id, never batch with other rows (each offer is its own group).
    const k = o.restaurant_id
      ? `r:${o.restaurant_id}`
      : `only:${o.assignment_id}`;
    if (!byRestaurant.has(k)) byRestaurant.set(k, []);
    byRestaurant.get(k)!.push(o);
  }
  const rows: OfferRow[] = [];
  for (const [, list] of byRestaurant) {
    const clusters = clusterBatchableOrders(list, maxDropoffMiles);
    for (const c of clusters) {
      if (c.length === 1) {
        rows.push({ kind: 'single', offer: c[0] });
      } else {
        const times = c.map((x) => new Date(x.expires_at).getTime());
        const minT = Math.min(...times);
        const minExp = c.find((x) => new Date(x.expires_at).getTime() === minT)?.expires_at ?? c[0].expires_at;
        rows.push({ kind: 'batch', offers: c, minExpiresAt: minExp });
      }
    }
  }
  rows.sort(
    (a, b) =>
      new Date(a.kind === 'batch' ? a.minExpiresAt : a.offer.expires_at).getTime() -
      new Date(b.kind === 'batch' ? b.minExpiresAt : b.offer.expires_at).getTime()
  );
  return rows;
}

export function sumPayoutCents(offers: OrderAssignment[]): number {
  return offers.reduce((s, o) => s + (o.payout_cents || 0), 0);
}
