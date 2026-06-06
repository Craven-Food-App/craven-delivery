/**
 * Order tracking utilities — emits append-only audit events and GPS breadcrumbs
 * for forensic-grade pickup/delivery records.
 *
 * Use cases:
 *   - logOrderEvent(...): stage transitions (accepted, en_route, arrived,
 *     pickup_photo, delivered, off_route, geofence_blocked, etc.).
 *   - recordBreadcrumb(...): high-frequency GPS samples while a delivery is live.
 *   - haversineMeters(...) / pointToPolylineMeters(...): geometry helpers.
 */
import { supabase } from '@/integrations/supabase/client';

export type OrderTrackingEventType =
  | 'order_accepted'
  | 'en_route_to_store'
  | 'arrived_at_store'
  | 'pickup_photo_captured'
  | 'order_picked_up'
  | 'en_route_to_customer'
  | 'off_route_detected'
  | 'off_route_resolved'
  | 'arrived_at_customer'
  | 'geofence_blocked'
  | 'geofence_override'
  | 'delivery_photo_captured'
  | 'order_delivered'
  | 'order_cancelled'
  | 'support_action';

export interface TrackingEventInput {
  orderId: string;
  eventType: OrderTrackingEventType;
  lat?: number | null;
  lng?: number | null;
  accuracyM?: number | null;
  heading?: number | null;
  speedMps?: number | null;
  distanceToTargetM?: number | null;
  photoUrl?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface BreadcrumbInput {
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  accuracyM?: number | null;
  heading?: number | null;
  speedMps?: number | null;
  distanceFromRouteM?: number | null;
  distanceToDropoffM?: number | null;
  isOffRoute?: boolean;
  stage?: string | null;
}

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Approximate distance from a point to the nearest segment of a [lng,lat] polyline. */
export function pointToPolylineMeters(
  lat: number,
  lng: number,
  polyline: Array<[number, number]> | null | undefined,
): number | null {
  if (!polyline || polyline.length < 2) return null;
  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const [aLng, aLat] = polyline[i];
    const [bLng, bLat] = polyline[i + 1];
    // sample 5 points along the segment for a cheap polyline distance
    for (let t = 0; t <= 1; t += 0.25) {
      const sLat = aLat + (bLat - aLat) * t;
      const sLng = aLng + (bLng - aLng) * t;
      const d = haversineMeters(lat, lng, sLat, sLng);
      if (d < min) min = d;
    }
  }
  return Number.isFinite(min) ? min : null;
}

export async function getCurrentPosition(
  timeoutMs = 8000,
): Promise<GeolocationPosition | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 5000 },
    );
  });
}

export async function logOrderEvent(input: TrackingEventInput): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from('order_tracking_events').insert({
      order_id: input.orderId,
      driver_id: user?.id ?? null,
      actor_user_id: user?.id ?? null,
      actor_role: 'feeder',
      event_type: input.eventType,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      accuracy_m: input.accuracyM ?? null,
      heading: input.heading ?? null,
      speed_mps: input.speedMps ?? null,
      distance_to_target_m: input.distanceToTargetM ?? null,
      photo_url: input.photoUrl ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    // never break the delivery UX on logging failure
    console.warn('[orderTracking] logOrderEvent failed', err);
  }
}

/** Convenience: capture GPS and log an event with the position embedded. */
export async function logOrderEventWithPosition(
  input: Omit<TrackingEventInput, 'lat' | 'lng' | 'accuracyM' | 'heading' | 'speedMps'>,
  extra?: { distanceToTargetM?: number | null },
): Promise<GeolocationPosition | null> {
  const pos = await getCurrentPosition();
  await logOrderEvent({
    ...input,
    lat: pos?.coords.latitude ?? null,
    lng: pos?.coords.longitude ?? null,
    accuracyM: pos?.coords.accuracy ?? null,
    heading: pos?.coords.heading ?? null,
    speedMps: pos?.coords.speed ?? null,
    distanceToTargetM: extra?.distanceToTargetM ?? null,
  });
  return pos;
}

export async function recordBreadcrumb(input: BreadcrumbInput): Promise<void> {
  try {
    await (supabase as any).from('order_location_breadcrumbs').insert({
      order_id: input.orderId,
      driver_id: input.driverId,
      lat: input.lat,
      lng: input.lng,
      accuracy_m: input.accuracyM ?? null,
      heading: input.heading ?? null,
      speed_mps: input.speedMps ?? null,
      distance_from_route_m: input.distanceFromRouteM ?? null,
      distance_to_dropoff_m: input.distanceToDropoffM ?? null,
      is_off_route: input.isOffRoute ?? false,
      stage: input.stage ?? null,
    });
  } catch (err) {
    console.warn('[orderTracking] recordBreadcrumb failed', err);
  }
}

export async function openRouteDeviation(params: {
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  distanceFromRouteM: number;
}): Promise<string | null> {
  try {
    const { data } = await (supabase as any)
      .from('order_route_deviations')
      .insert({
        order_id: params.orderId,
        driver_id: params.driverId,
        start_lat: params.lat,
        start_lng: params.lng,
        max_distance_from_route_m: params.distanceFromRouteM,
      })
      .select('id')
      .maybeSingle();
    return data?.id ?? null;
  } catch (err) {
    console.warn('[orderTracking] openRouteDeviation failed', err);
    return null;
  }
}

export async function closeRouteDeviation(params: {
  deviationId: string;
  lat: number;
  lng: number;
  maxDistanceM: number;
}): Promise<void> {
  try {
    await (supabase as any)
      .from('order_route_deviations')
      .update({
        ended_at: new Date().toISOString(),
        end_lat: params.lat,
        end_lng: params.lng,
        max_distance_from_route_m: params.maxDistanceM,
        resolved: true,
      })
      .eq('id', params.deviationId);
  } catch (err) {
    console.warn('[orderTracking] closeRouteDeviation failed', err);
  }
}

/** Dropoff geofence radius (meters). Driver must be within this to mark delivered. */
export const DELIVERY_GEOFENCE_RADIUS_M = 120;

/** Route deviation threshold (meters) — distance from planned polyline. */
export const ROUTE_DEVIATION_THRESHOLD_M = 300;