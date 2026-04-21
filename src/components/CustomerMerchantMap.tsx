import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createCravenMarkerElement } from '@/utils/createCravenMapPin';
import merchantPinActive from '@/assets/merchant_pin.png';
import merchantPinGrey from '@/assets/merchant_grey_pin.png';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';

/** Map view + RPC fallback when geolocation is unavailable (matches RestaurantGrid). */
const DEFAULT_CENTER: [number, number] = [-83.54, 41.65];
const FALLBACK_USER_LAT = 41.65;
const FALLBACK_USER_LNG = -83.54;
/** Display width for branded pin art; height follows intrinsic aspect ratio. */
const MERCHANT_PIN_WIDTH_PX = 36;
/** Popup sits above the pin tip (~full marker height). */
const MERCHANT_PIN_POPUP_OFFSET_PX = 44;

/** Circular mask aligned to the hollow in merchant_pin / merchant_grey_pin art (% of pin width). */
const LOGO_HOLE_WIDTH_PCT = 52;
const LOGO_HOLE_TOP_PCT = 17;
/** Many logo assets have transparent padding; scale past the mask so the mark fills the ring. */
const LOGO_RASTER_ZOOM_PCT = 130;

/** fitBounds: street-level when pins cluster; single-point uses fixed zoom. */
const MAP_FIT_PADDING = { top: 72, bottom: 100, left: 48, right: 48 } as const;
const MAP_FIT_MAX_ZOOM = 17;
const SINGLE_POINT_ZOOM = 17;

/** Defensive guard: reject pins far outside the delivery radius so a single
 *  stale/synthetic row can't yank fitBounds across a continent. */
const MAX_PIN_DISTANCE_MILES = 40;

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return Number.POSITIVE_INFINITY;
  }
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

interface MerchantLocation {
  id: string;
  name: string;
  logo_url: string | null;
  image_url: string | null;
  latitude: number;
  longitude: number;
  marketplace_type: string | null;
  cuisine_type: string | null;
  address: string | null;
  status: string;
  parent_location: string | null;
  request_count?: number | null;
}

interface QuickMenuItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
}

interface CustomerMerchantMapProps {
  onClose: () => void;
  targetLocation?: { lat: number; lng: number } | null;
}

export const CustomerMerchantMap: React.FC<CustomerMerchantMapProps> = ({ onClose, targetLocation = null }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasFittedRef = useRef(false);
  const hasFittedWithUserRef = useRef(false);
  const [token, setToken] = useState<string | null>(null);
  const [merchants, setMerchants] = useState<MerchantLocation[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantLocation | null>(null);
  const [quickItems, setQuickItems] = useState<QuickMenuItem[]>([]);
  const [quickItemsLoading, setQuickItemsLoading] = useState(false);
  const [quickQty, setQuickQty] = useState<Record<string, number>>({});
  const [requestingMerchant, setRequestingMerchant] = useState(false);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const effectiveLocation = targetLocation ?? userLocation;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('get-mapbox-token');
        const t = (data as { token?: string })?.token;
        if (!cancelled && t) setToken(t);
        else if (!cancelled) setError('Map unavailable');
      } catch {
        if (!cancelled) setError('Map unavailable');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const RADIUS_MILES = 30;
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const mapRow = (r: any): MerchantLocation => ({
        id: r.id,
        name: r.name,
        logo_url: r.image_url || r.logo_url || null,
        image_url: r.image_url || null,
        latitude: Number(r.lat),
        longitude: Number(r.lng),
        marketplace_type: r.marketplace_type || null,
        cuisine_type: r.cuisine_type || r.category || null,
        address: r.address != null ? String(r.address).trim() || null : null,
        status: r.status === 'ACTIVE' ? 'ACTIVE' : r.status === 'COMING_SOON' ? 'COMING_SOON' : 'REQUESTABLE',
        parent_location: r.parent_location || null,
        request_count: r.request_count ?? null,
      });
      const lat = effectiveLocation?.lat ?? FALLBACK_USER_LAT;
      const lng = effectiveLocation?.lng ?? FALLBACK_USER_LNG;
      // get_marketplace_map_pins excludes synthetic marketplace_chains rows
      // so every pin sits on its real storefront coordinates.
      const { data, error: rpcError } = await (supabase as any).rpc('get_marketplace_map_pins', {
        p_lat: lat,
        p_lng: lng,
        p_radius_miles: RADIUS_MILES,
        p_marketplace_type: null,
        p_limit: 1500,
      });
      if (rpcError) {
        if (!cancelled) {
          setError(rpcError.message || 'Could not load locations');
          setLoading(false);
        }
        return;
      }
      const rows: any[] = Array.isArray(data) ? data : [];
      const byId = new Map<string, any>();
      for (const row of rows) byId.set(row.id, row);
      const list = (Array.from(byId.values()) as any[])
        .filter((r: any) => {
          const rlat = Number(r.lat);
          const rlng = Number(r.lng);
          if (!Number.isFinite(rlat) || !Number.isFinite(rlng)) return false;
          if (rlat < -90 || rlat > 90 || rlng < -180 || rlng > 180) return false;
          // Ignore merchants whose coordinates are still placeholder / out of
          // the delivery radius — keeps the map centered on real storefronts.
          const d = haversineMiles(rlat, rlng, lat, lng);
          return d <= MAX_PIN_DISTANCE_MILES;
        })
        .map((r: any) => mapRow(r));
      if (!cancelled) {
        setMerchants(list);
        setError(list.length === 0 ? 'No locations to show' : null);
        if (list.length > 0 && !selectedMerchant) setSelectedMerchant(list[0]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token, effectiveLocation?.lat, effectiveLocation?.lng]);

  useEffect(() => {
    if (!token || !mapContainer.current) return;
    mapboxgl.accessToken = token;
    const container = mapContainer.current;
    const m = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/light-v11',
      center: DEFAULT_CENTER,
      zoom: 10,
    });
    m.addControl(new mapboxgl.NavigationControl(), 'top-right');
    const onResize = () => {
      m.resize();
    };
    m.once('load', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    map.current = m;
    return () => {
      ro.disconnect();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      markersRef.current.forEach((mr) => mr.remove());
      markersRef.current = [];
      m.remove();
      map.current = null;
    };
  }, [token]);

  // Only recenter when there are no merchant pins yet; otherwise fitBounds in
  // the markers effect frames user + pins at the correct zoom.
  useEffect(() => {
    if (!map.current || !effectiveLocation || merchants.length > 0) return;
    map.current.setCenter([effectiveLocation.lng, effectiveLocation.lat]);
  }, [effectiveLocation?.lat, effectiveLocation?.lng, merchants.length]);

  useEffect(() => {
    if (!map.current || !navigator.geolocation) return;
    const m = map.current;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled || !map.current) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        userMarkerRef.current?.remove();
        const el = createCravenMarkerElement(40, 'You are here');
        el.style.zIndex = '10';
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
        })
          .setLngLat([lng, lat])
          .addTo(m);
        userMarkerRef.current = marker;
      },
      () => { /* user denied or unavailable */ },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!selectedMerchant || selectedMerchant.status !== 'ACTIVE') {
      setQuickItems([]);
      setQuickItemsLoading(false);
      setQuickQty({});
      return;
    }
    let cancelled = false;
    (async () => {
      setQuickItemsLoading(true);
      const { data, error: itemsError } = await supabase
        .from('menu_items')
        .select('id, name, description, image_url, price_cents, is_available')
        .eq('restaurant_id', selectedMerchant.id)
        .eq('is_available', true)
        .limit(8);
      if (!cancelled) {
        if (itemsError) {
          setQuickItems([]);
          setQuickQty({});
        } else {
          const mapped = (data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description || null,
            image_url: item.image_url || null,
            price_cents: item.price_cents || 0,
          }));
          setQuickItems(mapped);
          const defaultQty: Record<string, number> = {};
          mapped.forEach((item: QuickMenuItem) => { defaultQty[item.id] = 1; });
          setQuickQty(defaultQty);
        }
        setQuickItemsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedMerchant?.id, selectedMerchant?.status]);

  useEffect(() => {
    if (!selectedMerchant) {
      setSelectedPhone(null);
      return;
    }
    let cancelled = false;
    (async () => {
      let phone: string | null = null;
      const { data: restaurantRow } = await supabase
        .from('restaurants')
        .select('phone')
        .eq('id', selectedMerchant.id)
        .maybeSingle();
      phone = (restaurantRow as any)?.phone ?? null;
      if (!phone) {
        const { data: masterRow } = await supabase
          .from('restaurants_master')
          .select('phone')
          .eq('id', selectedMerchant.id)
          .maybeSingle();
        phone = (masterRow as any)?.phone ?? null;
      }
      if (!cancelled) setSelectedPhone(phone);
    })();
    return () => { cancelled = true; };
  }, [selectedMerchant?.id]);

  const normalizeTel = (value: string) => value.replace(/[^\d+]/g, '');

  const handleQuickAdd = async (item: QuickMenuItem) => {
    if (!selectedMerchant) return;
    const qty = Math.max(1, quickQty[item.id] ?? 1);
    await addToCart(
      {
        id: item.id,
        name: item.name,
        price_cents: item.price_cents,
        quantity: qty,
        image_url: item.image_url || undefined,
      },
      selectedMerchant.id
    );
    setPanelMessage(`Added ${qty} ${item.name}${qty > 1 ? 's' : ''} to cart.`);
  };

  const handleRequestMerchant = async () => {
    if (!selectedMerchant || selectedMerchant.status === 'ACTIVE' || requestingMerchant) return;
    setRequestingMerchant(true);
    const { data, error: reqError } = await (supabase as any).rpc('request_restaurant', {
      p_restaurant_master_id: selectedMerchant.id,
    });
    if (reqError || !data?.ok) {
      setPanelMessage("Couldn't submit request right now. Please try again.");
      setRequestingMerchant(false);
      return;
    }
    const updatedCount = data.request_count as number | undefined;
    setMerchants((prev) => prev.map((m) => (
      m.id === selectedMerchant.id ? { ...m, request_count: updatedCount ?? m.request_count } : m
    )));
    setSelectedMerchant((prev) => (
      prev ? { ...prev, request_count: updatedCount ?? prev.request_count } : prev
    ));
    setPanelMessage("Thanks! Your request was submitted. Share this merchant so friends can request too.");
    setRequestingMerchant(false);
  };

  const handleShareRequest = async () => {
    if (!selectedMerchant) return;
    const copy = `Help bring ${selectedMerchant.name} to Crave'n Delivery. Request this merchant in the app so they can start selling fast.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Request ${selectedMerchant.name}`, text: copy });
      } else {
        await navigator.clipboard.writeText(copy);
      }
      setPanelMessage('Share message ready — thank you for helping grow local merchants.');
    } catch {
      // no-op if user cancels share
    }
  };

  useEffect(() => {
    if (!map.current || merchants.length === 0) return;
    const m = map.current;
    markersRef.current.forEach((mr) => mr.remove());
    markersRef.current = [];

    merchants.forEach((merchant) => {
      const lat = merchant.latitude;
      const lng = merchant.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const isActive = merchant.status === 'ACTIVE';

      // Branded pin art: bottom of the element is the map anchor (pin tip at lat/lng).
      // Logo sits in the hollow ring; no CSS filter on the root (WebKit marker bug).
      const el = document.createElement('div');
      el.style.cssText = `
        display: flex; justify-content: center; width: ${MERCHANT_PIN_WIDTH_PX}px;
        cursor: pointer; z-index: 5;
        ${!isActive ? 'opacity: 0.95;' : ''}
      `;
      const inner = document.createElement('div');
      inner.style.cssText = `
        position: relative; width: ${MERCHANT_PIN_WIDTH_PX}px; line-height: 0;
        transition: transform 0.15s ease;
      `;
      el.appendChild(inner);

      const pinImg = document.createElement('img');
      pinImg.src = isActive ? merchantPinActive : merchantPinGrey;
      pinImg.alt = '';
      pinImg.draggable = false;
      pinImg.style.cssText = 'width: 100%; height: auto; display: block; user-select: none;';
      inner.appendChild(pinImg);

      const hole = document.createElement('div');
      const holeMask = `
        position: absolute; left: 50%; top: ${LOGO_HOLE_TOP_PCT}%; transform: translateX(-50%);
        width: ${LOGO_HOLE_WIDTH_PCT}%; aspect-ratio: 1; border-radius: 50%; overflow: hidden;
        background: #fff; pointer-events: none;
      `;
      if (merchant.logo_url) {
        hole.style.cssText = holeMask;
        const logo = document.createElement('img');
        logo.src = merchant.logo_url;
        logo.alt = merchant.name;
        logo.style.cssText = `
          position: absolute; left: 50%; top: 50%;
          width: ${LOGO_RASTER_ZOOM_PCT}%; height: ${LOGO_RASTER_ZOOM_PCT}%;
          transform: translate(-50%, -50%);
          object-fit: cover; object-position: center; display: block;
        `;
        logo.onerror = () => {
          hole.innerHTML = '';
          hole.style.cssText = `${holeMask} display: flex; align-items: center; justify-content: center;`;
          const span = document.createElement('span');
          span.textContent = merchant.name.charAt(0).toUpperCase();
          span.style.cssText = 'font-weight: 700; font-size: 10px; color: #f97316;';
          hole.appendChild(span);
        };
        hole.appendChild(logo);
      } else {
        hole.style.cssText = `${holeMask} display: flex; align-items: center; justify-content: center;`;
        const span = document.createElement('span');
        span.textContent = merchant.name.charAt(0).toUpperCase();
        span.style.cssText = `font-weight: 700; font-size: 10px; color: ${isActive ? '#f97316' : '#6b7280'};`;
        hole.appendChild(span);
      }
      inner.appendChild(hole);

      el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.12)'; });
      el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });

      el.addEventListener('click', () => {
        setSelectedMerchant(merchant);
        setPanelMessage(null);
        m.easeTo({
          center: [lng, lat],
          offset: [0, 120],
          duration: 450,
        });
      });

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([lng, lat])
        .addTo(m);
      markersRef.current.push(marker);
    });

    requestAnimationFrame(() => {
      m.resize();
    });

    const lngs = merchants.map((x) => x.longitude).filter(Number.isFinite);
    const lats = merchants.map((x) => x.latitude).filter(Number.isFinite);
    if (effectiveLocation) {
      lngs.push(effectiveLocation.lng);
      lats.push(effectiveLocation.lat);
    }
    const shouldFit = lngs.length > 0 && lats.length > 0;
    const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
    const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
    const lngSpan = ne[0] - sw[0];
    const latSpan = ne[1] - sw[1];
    const isDegenerate = lngSpan < 1e-7 && latSpan < 1e-7;

    const runFit = () => {
      if (isDegenerate) {
        m.jumpTo({ center: [sw[0], sw[1]], zoom: SINGLE_POINT_ZOOM, duration: 500 });
        return;
      }
      m.fitBounds([sw, ne], {
        padding: MAP_FIT_PADDING,
        maxZoom: MAP_FIT_MAX_ZOOM,
        duration: 800,
      });
    };

    if (shouldFit && !hasFittedRef.current) {
      hasFittedRef.current = true;
      if (effectiveLocation) hasFittedWithUserRef.current = true;
      runFit();
    } else if (shouldFit && effectiveLocation && !hasFittedWithUserRef.current) {
      hasFittedWithUserRef.current = true;
      runFit();
    }
  }, [token, merchants, effectiveLocation]);

  const shell = (
    <div
      className="fixed inset-0 bg-white flex flex-col"
      style={{ touchAction: 'none', zIndex: 1300 }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">
          Restaurants & stores near you
          {merchants.length > 0 && (
            <span className="block text-xs font-normal text-gray-500 mt-0.5">
              {merchants.length} location{merchants.length !== 1 ? 's' : ''} on map
            </span>
          )}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close map">
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="relative flex-1 min-h-0">
        {error && (
          <div className="absolute top-4 left-4 right-4 z-10 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-500 border-t-transparent mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
        {selectedMerchant && (
          <div
            className="absolute left-0 right-0 bottom-0 z-20 bg-white border-t border-gray-200 shadow-2xl"
            style={{
              height: '32%',
              minHeight: 280,
              maxHeight: '45%',
              paddingBottom: 'max(env(safe-area-inset-bottom), 14px)',
            }}
          >
            <div className="h-full flex flex-col px-4 py-3 overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex items-start gap-3">
                  {selectedMerchant.logo_url && (
                    <img
                      src={selectedMerchant.logo_url}
                      alt={selectedMerchant.name}
                      className="w-10 h-10 object-contain rounded-sm bg-transparent shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{selectedMerchant.name}</h3>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {selectedMerchant.cuisine_type || selectedMerchant.marketplace_type || 'Merchant'}
                    </p>
                    {selectedMerchant.address && (
                      <p className="text-sm text-gray-600 truncate mt-1">{selectedMerchant.address}</p>
                    )}
                    {selectedPhone && (
                      <a
                        href={`tel:${normalizeTel(selectedPhone)}`}
                        className="text-sm font-semibold text-orange-500 mt-1 inline-block"
                      >
                        {selectedPhone}
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-gray-500 text-sm"
                  onClick={() => setSelectedMerchant(null)}
                >
                  Close
                </button>
              </div>
              {selectedMerchant.status === 'ACTIVE' ? (
                <div className="mt-3 min-h-0 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-800">Quick order</p>
                    <button
                      type="button"
                      className="text-sm font-semibold text-orange-600"
                      onClick={() => navigate(`/restaurant/${selectedMerchant.id}/menu`)}
                    >
                      Full menu
                    </button>
                  </div>
                  {quickItemsLoading ? (
                    <p className="text-sm text-gray-500">Loading menu...</p>
                  ) : quickItems.length === 0 ? (
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-600">No quick items available yet. Tap to view full merchant menu.</p>
                      <Button
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => navigate(`/restaurant/${selectedMerchant.id}/menu`)}
                      >
                        Order here
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
                      {quickItems.map((item) => (
                        <div
                          key={item.id}
                          className="min-w-[132px] max-w-[132px] rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-left snap-start shrink-0"
                        >
                          {item.image_url && (
                            <img src={item.image_url} alt={item.name} className="w-full h-11 object-cover rounded-md mb-1" />
                          )}
                          <p className="text-[11px] font-semibold text-gray-900 truncate leading-tight">{item.name}</p>
                          <p className="text-[10px] text-gray-500 truncate leading-tight">{item.description || 'Tap to order fast'}</p>
                          <p className="text-[11px] font-semibold text-orange-600 mt-0.5">${(item.price_cents / 100).toFixed(2)}</p>
                          <div className="mt-1 flex items-center gap-1">
                            <button
                              type="button"
                              className="h-5 w-5 rounded border border-gray-300 text-[10px] leading-none text-gray-700 flex items-center justify-center"
                              onClick={() => setQuickQty((prev) => ({ ...prev, [item.id]: Math.max(1, (prev[item.id] ?? 1) - 1) }))}
                            >
                              -
                            </button>
                            <span className="text-[10px] font-semibold text-gray-800 min-w-[10px] text-center">{quickQty[item.id] ?? 1}</span>
                            <button
                              type="button"
                              className="h-5 w-5 rounded border border-gray-300 text-[10px] leading-none text-gray-700 flex items-center justify-center"
                              onClick={() => setQuickQty((prev) => ({ ...prev, [item.id]: Math.min(20, (prev[item.id] ?? 1) + 1) }))}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              className="ml-auto h-5 px-1.5 rounded bg-orange-500 text-white text-[10px] leading-none font-semibold flex items-center"
                              onClick={() => handleQuickAdd(item)}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 min-h-0 flex-1 flex flex-col">
                  <p className="text-sm text-gray-700">
                    This merchant is not active on Crave&apos;n yet. With your help, we can get them onboarded and selling in no time.
                    Request this merchant and share with a friend so they can request too.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Requests so far: {selectedMerchant.request_count ?? 0}
                  </p>
                  {panelMessage && <p className="text-xs text-green-700 mt-1">{panelMessage}</p>}
                  <div className="mt-auto flex gap-2">
                    <Button
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={handleRequestMerchant}
                      disabled={requestingMerchant}
                    >
                      {requestingMerchant ? 'Requesting...' : 'Request merchant'}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleShareRequest}
                    >
                      Share request
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(shell, document.body);
};

export default CustomerMerchantMap;
