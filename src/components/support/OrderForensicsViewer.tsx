// @ts-nocheck
/**
 * Order Forensics Viewer
 *
 * Admin / support tool — every pickup & delivery on Crave'N produces an
 * append-only audit trail (order_tracking_events), high-frequency GPS
 * breadcrumbs (order_location_breadcrumbs), and off-route incident
 * records (order_route_deviations). This component lets a CS agent
 * search any order and inspect:
 *
 *   • merchant + customer pin
 *   • feeder GPS breadcrumb trail (color-coded for off-route)
 *   • pickup photo + GPS, delivery photo + GPS
 *   • every status timestamp with lat/lng + accuracy
 *   • off-route incidents and geofence overrides
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  MapPin,
  Camera,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Package,
  ShieldAlert,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';

interface OrderRow {
  id: string;
  order_number: string | null;
  order_status: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  driver_id: string | null;
  delivered_at: string | null;
  created_at: string;
  pickup_address: any;
  dropoff_address: any;
  delivery_address: any;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  pickup_photo_url: string | null;
  pickup_photo_lat: number | null;
  pickup_photo_lng: number | null;
  pickup_confirmed_at: string | null;
  delivery_photo_url: string | null;
  delivery_photo_lat: number | null;
  delivery_photo_lng: number | null;
  delivery_photo_timestamp: string | null;
  off_route_count: number | null;
  total_distance_traveled_m: number | null;
}

const EVENT_LABEL: Record<string, string> = {
  order_accepted: 'Order accepted',
  en_route_to_store: 'En route to merchant',
  arrived_at_store: 'Arrived at merchant',
  pickup_photo_captured: 'Pickup photo captured',
  order_picked_up: 'Order picked up',
  en_route_to_customer: 'En route to customer',
  off_route_detected: 'Off-route detected',
  off_route_resolved: 'Off-route resolved',
  arrived_at_customer: 'Arrived at customer',
  geofence_blocked: 'Geofence — too far from drop-off',
  geofence_override: 'Geofence override (feeder confirmed)',
  delivery_photo_captured: 'Delivery photo captured',
  order_delivered: 'Order delivered',
  order_cancelled: 'Order cancelled',
  support_action: 'Support action',
};

const EVENT_TONE: Record<string, string> = {
  off_route_detected: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
  off_route_resolved: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
  geofence_blocked: 'bg-red-500/20 text-red-700 border-red-500/30',
  geofence_override: 'bg-red-500/20 text-red-700 border-red-500/30',
  order_delivered: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
  order_picked_up: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
  delivery_photo_captured: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
  pickup_photo_captured: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
};

function formatAddr(a: any): string {
  if (!a) return '—';
  if (typeof a === 'string') return a;
  const street = a.street || a.address || a.address_line1 || a.line1 || '';
  const apt = a.apt_suite || a.apt || a.unit || '';
  const parts = [street, apt, a.city, a.state, a.zip || a.zip_code || a.postal_code]
    .filter(Boolean);
  return parts.join(', ') || '—';
}

function extractLatLng(a: any): { lat: number | null; lng: number | null } {
  if (!a || typeof a !== 'object') return { lat: null, lng: null };
  const lat = a.latitude ?? a.lat ?? null;
  const lng = a.longitude ?? a.lng ?? a.lon ?? null;
  return {
    lat: typeof lat === 'number' ? lat : lat != null ? Number(lat) : null,
    lng: typeof lng === 'number' ? lng : lng != null ? Number(lng) : null,
  };
}

function GpsLink({ lat, lng }: { lat: number | null | undefined; lng: number | null | undefined }) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return <span className="text-muted-foreground">—</span>;
  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-xs"
    >
      <MapPin className="h-3 w-3" />
      {lat.toFixed(6)}, {lng.toFixed(6)}
    </a>
  );
}

const OrderForensicsViewer: React.FC = () => {
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [deviations, setDeviations] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      let q = (supabase as any)
        .from('orders')
        .select(
          'id, order_number, order_status, customer_name, customer_phone, driver_id, delivered_at, feeder_delivery_completed_at, created_at, pickup_address, dropoff_address, delivery_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_photo_url, pickup_photo_lat, pickup_photo_lng, pickup_confirmed_at, delivery_photo_url, delivery_photo_lat, delivery_photo_lng, delivery_photo_timestamp, off_route_count, total_distance_traveled_m'
        )
        .order('created_at', { ascending: false })
        .limit(50);
      const term = query.trim();
      if (term) {
        q = q.or(
          `order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%,id.eq.${term}`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('loadOrders', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const loadDetails = useCallback(async (order: OrderRow) => {
    setSelected(order);
    setEvents([]);
    setBreadcrumbs([]);
    setDeviations([]);
    setConversation([]);
    try {
      const [ev, bc, dv, threads] = await Promise.all([
        (supabase as any)
          .from('order_tracking_events')
          .select('*')
          .eq('order_id', order.id)
          .order('occurred_at', { ascending: true }),
        (supabase as any)
          .from('order_location_breadcrumbs')
          .select('*')
          .eq('order_id', order.id)
          .order('recorded_at', { ascending: true })
          .limit(2000),
        (supabase as any)
          .from('order_route_deviations')
          .select('*')
          .eq('order_id', order.id)
          .order('started_at', { ascending: true }),
        (supabase as any)
          .from('order_support_threads')
          .select('id, channel, customer_included, driver_included')
          .eq('order_id', order.id),
      ]);
      setEvents(ev.data || []);
      setBreadcrumbs(bc.data || []);
      setDeviations(dv.data || []);
      const threadIds = (threads.data || []).map((t: any) => t.id);
      if (threadIds.length) {
        const { data: msgs } = await (supabase as any)
          .from('order_support_messages')
          .select('id, thread_id, sender_role, body, created_at, attachment_url')
          .in('thread_id', threadIds)
          .order('created_at', { ascending: true });
        setConversation(msgs || []);
      }
    } catch (err) {
      console.error('loadDetails', err);
    }
  }, []);

  const filtered = useMemo(() => orders, [orders]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-220px)]">
      {/* ----- Order list ----- */}
      <Card className="flex flex-col overflow-hidden">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
              placeholder="Order #, customer, phone, or ID"
              className="h-8"
            />
            <Button size="sm" onClick={loadOrders} disabled={loading}>
              {loading ? '…' : 'Search'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length} order{filtered.length === 1 ? '' : 's'} — most recent first
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {filtered.map((o) => (
              <button
                key={o.id}
                onClick={() => loadDetails(o)}
                className={`w-full text-left p-3 hover:bg-muted/50 transition ${
                  selected?.id === o.id ? 'bg-muted' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold">
                    #{o.order_number || o.id.slice(0, 8)}
                  </span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {o.order_status || 'unknown'}
                  </Badge>
                </div>
                <div className="text-sm mt-1 truncate">{o.customer_name || '—'}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(o.created_at), 'MMM d, h:mm a')}
                  {(o.off_route_count ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-amber-600">
                      <AlertTriangle className="h-3 w-3" /> {o.off_route_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No orders match.
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* ----- Detail panel ----- */}
      <Card className="overflow-hidden">
        {!selected ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Package className="h-12 w-12" />
            <p>Select an order to view its full forensic record.</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-5 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs font-mono text-muted-foreground">{selected.id}</div>
                  <h2 className="text-xl font-bold">
                    Order #{selected.order_number || selected.id.slice(0, 8)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.customer_name} · {selected.customer_phone || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize">{selected.order_status}</Badge>
                  {(selected.delivered_at || selected.feeder_delivery_completed_at) && (
                    <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Delivered {format(new Date((selected.delivered_at || selected.feeder_delivery_completed_at)!), 'MMM d, h:mm a')}
                    </Badge>
                  )}
                  {(selected.off_route_count ?? 0) > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {selected.off_route_count} off-route
                    </Badge>
                  )}
                </div>
              </div>

              {/* Pin summary */}
              {(() => null)()}
              <div className="grid sm:grid-cols-2 gap-3">
                {(() => {
                  return null;
                })()}
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                    <MapPin className="h-3.5 w-3.5 text-orange-500" />
                    PICKUP — MERCHANT
                  </div>
                  <p className="text-sm">{formatAddr(selected.pickup_address)}</p>
                  <div className="text-xs mt-1">
                    {(() => {
                      const fb = extractLatLng(selected.pickup_address);
                      return (
                        <GpsLink
                          lat={selected.pickup_lat ?? fb.lat}
                          lng={selected.pickup_lng ?? fb.lng}
                        />
                      );
                    })()}
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                    <Navigation className="h-3.5 w-3.5 text-orange-500" />
                    DROP-OFF — CUSTOMER
                  </div>
                  <p className="text-sm">
                    {formatAddr(selected.dropoff_address || selected.delivery_address)}
                  </p>
                  <div className="text-xs mt-1">
                    {(() => {
                      const fb = extractLatLng(
                        selected.dropoff_address || selected.delivery_address,
                      );
                      return (
                        <GpsLink
                          lat={selected.dropoff_lat ?? fb.lat}
                          lng={selected.dropoff_lng ?? fb.lng}
                        />
                      );
                    })()}
                  </div>
                </Card>
              </div>

              {/* Photos */}
              <div className="grid sm:grid-cols-2 gap-3">
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold mb-2">
                    <Camera className="h-3.5 w-3.5" /> PICKUP PROOF
                  </div>
                  {selected.pickup_photo_url ? (
                    <a href={selected.pickup_photo_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selected.pickup_photo_url}
                        alt="Pickup proof"
                        className="w-full h-48 object-cover rounded border"
                      />
                    </a>
                  ) : (
                    <div className="h-48 flex items-center justify-center bg-muted/40 rounded border text-xs text-muted-foreground">
                      No pickup photo
                    </div>
                  )}
                  <div className="mt-2 text-[11px] space-y-1">
                    <div>
                      <span className="text-muted-foreground">Captured:</span>{' '}
                      {selected.pickup_confirmed_at
                        ? format(new Date(selected.pickup_confirmed_at), 'MMM d, h:mm:ss a')
                        : '—'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>{' '}
                      <GpsLink lat={selected.pickup_photo_lat} lng={selected.pickup_photo_lng} />
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold mb-2">
                    <Camera className="h-3.5 w-3.5" /> DELIVERY PROOF
                  </div>
                  {selected.delivery_photo_url ? (
                    <a href={selected.delivery_photo_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selected.delivery_photo_url}
                        alt="Delivery proof"
                        className="w-full h-48 object-cover rounded border"
                      />
                    </a>
                  ) : (
                    <div className="h-48 flex items-center justify-center bg-muted/40 rounded border text-xs text-muted-foreground">
                      No delivery photo
                    </div>
                  )}
                  <div className="mt-2 text-[11px] space-y-1">
                    <div>
                      <span className="text-muted-foreground">Captured:</span>{' '}
                      {selected.delivery_photo_timestamp
                        ? format(new Date(selected.delivery_photo_timestamp), 'MMM d, h:mm:ss a')
                        : '—'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>{' '}
                      <GpsLink lat={selected.delivery_photo_lat} lng={selected.delivery_photo_lng} />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Off-route incidents */}
              {deviations.length > 0 && (
                <Card className="p-3 border-amber-500/40">
                  <div className="flex items-center gap-2 text-xs font-semibold mb-2 text-amber-700">
                    <ShieldAlert className="h-3.5 w-3.5" /> ROUTE DEVIATION INCIDENTS
                  </div>
                  <div className="space-y-2">
                    {deviations.map((d) => (
                      <div key={d.id} className="text-xs grid grid-cols-[110px_1fr] gap-2 border-l-2 border-amber-500 pl-2">
                        <span className="text-muted-foreground">
                          {format(new Date(d.started_at), 'MMM d, h:mm:ss a')}
                        </span>
                        <span>
                          Peak {Math.round(d.max_distance_from_route_m || 0)} m off planned route ·{' '}
                          {d.resolved ? 'resolved' : 'unresolved'}{' '}
                          {d.ended_at && `at ${format(new Date(d.ended_at), 'h:mm:ss a')}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Timeline */}
              <Card className="p-3">
                <div className="flex items-center gap-2 text-xs font-semibold mb-3">
                  <Clock className="h-3.5 w-3.5" /> EVENT TIMELINE ({events.length})
                </div>
                <div className="space-y-1.5">
                  {events.length === 0 && (
                    <p className="text-xs text-muted-foreground">No events recorded yet.</p>
                  )}
                  {events.map((e) => (
                    <div
                      key={e.id}
                      className={`text-xs rounded border px-2 py-1.5 grid grid-cols-[140px_1fr_auto] gap-2 items-center ${
                        EVENT_TONE[e.event_type] || 'bg-muted/30 border-border'
                      }`}
                    >
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {format(new Date(e.occurred_at), 'MMM d, HH:mm:ss')}
                      </span>
                      <div>
                        <div className="font-semibold">
                          {EVENT_LABEL[e.event_type] || e.event_type}
                        </div>
                        {e.notes && <div className="text-[11px] opacity-80">{e.notes}</div>}
                      </div>
                      <GpsLink lat={e.lat} lng={e.lng} />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Breadcrumbs */}
              <Card className="p-3">
                <div className="flex items-center gap-2 text-xs font-semibold mb-3">
                  <MessageSquare className="h-3.5 w-3.5" /> CONVERSATION TRANSCRIPT ({conversation.length})
                </div>
                {conversation.length === 0 ? (
                  <p className="text-xs text-muted-foreground mb-3">
                    No messages between feeder, customer, merchant, or support for this order.
                  </p>
                ) : (
                  <ScrollArea className="h-64 border rounded mb-3">
                    <div className="divide-y">
                      {conversation.map((m) => {
                        const tone =
                          m.sender_role === 'driver'   ? 'bg-orange-50 border-l-2 border-orange-500'  :
                          m.sender_role === 'customer' ? 'bg-emerald-50 border-l-2 border-emerald-500' :
                          m.sender_role === 'merchant' ? 'bg-amber-50 border-l-2 border-amber-500'    :
                          m.sender_role === 'support'  ? 'bg-blue-50 border-l-2 border-blue-500'      :
                                                          'bg-muted/40 border-l-2 border-border';
                        return (
                          <div key={m.id} className={`px-2 py-1.5 ${tone}`}>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="font-semibold uppercase">{m.sender_role}</span>
                              <span>{format(new Date(m.created_at), 'MMM d, h:mm:ss a')}</span>
                            </div>
                            <div className="text-xs mt-0.5 whitespace-pre-wrap">{m.body}</div>
                            {m.attachment_url && (
                              <a
                                href={m.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-primary hover:underline"
                              >
                                View attachment
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}

                <div className="flex items-center gap-2 text-xs font-semibold mb-2">
                  <Navigation className="h-3.5 w-3.5" /> FEEDER GPS TRAIL ({breadcrumbs.length})
                </div>
                {breadcrumbs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No breadcrumbs recorded.</p>
                ) : (
                  <>
                    <div className="mb-2">
                      <a
                        href={`https://www.google.com/maps/dir/${breadcrumbs
                          .filter((_, i) => i % Math.max(1, Math.floor(breadcrumbs.length / 20)) === 0)
                          .map((b) => `${b.lat},${b.lng}`)
                          .join('/')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3" /> Open trail in Google Maps
                      </a>
                    </div>
                    <ScrollArea className="h-56 border rounded">
                      <div className="divide-y text-[11px] font-mono">
                        {breadcrumbs.map((b) => (
                          <div
                            key={b.id}
                            className={`px-2 py-1 grid grid-cols-[110px_1fr_70px_70px] gap-2 ${
                              b.is_off_route ? 'bg-amber-500/10' : ''
                            }`}
                          >
                            <span className="text-muted-foreground">
                              {format(new Date(b.recorded_at), 'HH:mm:ss')}
                            </span>
                            <GpsLink lat={b.lat} lng={b.lng} />
                            <span className="text-right text-muted-foreground">
                              {b.distance_to_dropoff_m != null
                                ? `${Math.round(b.distance_to_dropoff_m)} m`
                                : '—'}
                            </span>
                            <span className="text-right">
                              {b.is_off_route ? (
                                <span className="text-amber-700">off-route</span>
                              ) : (
                                <span className="text-emerald-700">on route</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </Card>
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
};

export default OrderForensicsViewer;