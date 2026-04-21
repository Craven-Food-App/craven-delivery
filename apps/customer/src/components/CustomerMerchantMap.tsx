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

/** Map view + RPC fallback when geolocation is unavailable (matches RestaurantGrid). */
const DEFAULT_CENTER: [number, number] = [-83.54, 41.65];
const FALLBACK_USER_LAT = 41.65;
const FALLBACK_USER_LNG = -83.54;
/** Display width for branded pin art; height follows intrinsic aspect ratio. */
const MERCHANT_PIN_WIDTH_PX = 48;
/** Popup sits above the pin tip (~full marker height). */
const MERCHANT_PIN_POPUP_OFFSET_PX = 58;

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
  latitude: number;
  longitude: number;
  marketplace_type: string | null;
  cuisine_type: string | null;
  address: string | null;
  status: string;
  parent_location: string | null;
}

interface CustomerMerchantMapProps {
  onClose: () => void;
}

export const CustomerMerchantMap: React.FC<CustomerMerchantMapProps> = ({ onClose }) => {
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
        latitude: Number(r.lat),
        longitude: Number(r.lng),
        marketplace_type: r.marketplace_type || null,
        cuisine_type: r.cuisine_type || r.category || null,
        address: r.address != null ? String(r.address).trim() || null : null,
        status: r.status === 'ACTIVE' ? 'ACTIVE' : r.status === 'COMING_SOON' ? 'COMING_SOON' : 'REQUESTABLE',
        parent_location: r.parent_location || null,
      });
      const lat = userLocation?.lat ?? FALLBACK_USER_LAT;
      const lng = userLocation?.lng ?? FALLBACK_USER_LNG;
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
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token, userLocation?.lat, userLocation?.lng]);

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
    if (!map.current || !userLocation || merchants.length > 0) return;
    map.current.setCenter([userLocation.lng, userLocation.lat]);
  }, [userLocation?.lat, userLocation?.lng, merchants.length]);

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
      hole.style.cssText = `
        position: absolute; left: 50%; top: 22%; transform: translateX(-50%);
        width: 34%; aspect-ratio: 1; border-radius: 50%; overflow: hidden;
        background: #fff; display: flex; align-items: center; justify-content: center;
        pointer-events: none;
      `;
      if (merchant.logo_url) {
        const logo = document.createElement('img');
        logo.src = merchant.logo_url;
        logo.alt = merchant.name;
        logo.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
        logo.onerror = () => {
          hole.innerHTML = '';
          const span = document.createElement('span');
          span.textContent = merchant.name.charAt(0).toUpperCase();
          span.style.cssText = 'font-weight: 700; font-size: 11px; color: #f97316;';
          hole.appendChild(span);
        };
        hole.appendChild(logo);
      } else {
        const span = document.createElement('span');
        span.textContent = merchant.name.charAt(0).toUpperCase();
        span.style.cssText = `font-weight: 700; font-size: 11px; color: ${isActive ? '#f97316' : '#6b7280'};`;
        hole.appendChild(span);
      }
      inner.appendChild(hole);

      el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.12)'; });
      el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });

      const categoryLabel = merchant.cuisine_type || merchant.marketplace_type || 'Store';
      const parentLine = merchant.parent_location ? `<p style="margin:2px 0;font-size:11px;color:#6b7280;">${merchant.parent_location}</p>` : '';
      const addressLine = merchant.address ? `<p style="margin:2px 0;font-size:11px;color:#6b7280;">${merchant.address}</p>` : '';
      const statusLine = merchant.status !== 'ACTIVE' ? '<p style="margin:4px 0;font-size:11px;color:#6b7280;">Not on Crave\'n yet — request it!</p>' : '';
      const orderUrl = merchant.status === 'ACTIVE' ? `/restaurant/${merchant.id}/menu` : '#';
      const orderLink = merchant.status === 'ACTIVE'
        ? `<a href="${orderUrl}" style="display:block;margin-top:6px;padding:6px 0;background:#f97316;color:#fff;text-align:center;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">Order here</a>`
        : '';
      const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      const popup = new mapboxgl.Popup({ offset: [0, -MERCHANT_PIN_POPUP_OFFSET_PX], closeButton: true, maxWidth: '240px' })
        .setHTML(`
          <div style="padding:8px;font-family:system-ui,sans-serif;">
            <p style="margin:0 0 2px;font-size:14px;font-weight:700;">${merchant.name}</p>
            <p style="margin:0 0 4px;font-size:10px;color:#9ca3af;text-transform:uppercase;">${categoryLabel}</p>
            ${parentLine}
            ${addressLine}
            ${statusLine}
            ${orderLink}
            <a href="${navUrl}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:6px;padding:6px 0;background:#374151;color:#fff;text-align:center;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">Navigate →</a>
          </div>
        `);

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(m);
      markersRef.current.push(marker);
    });

    requestAnimationFrame(() => {
      m.resize();
    });

    const lngs = merchants.map((x) => x.longitude).filter(Number.isFinite);
    const lats = merchants.map((x) => x.latitude).filter(Number.isFinite);
    if (userLocation) {
      lngs.push(userLocation.lng);
      lats.push(userLocation.lat);
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
      if (userLocation) hasFittedWithUserRef.current = true;
      runFit();
    } else if (shouldFit && userLocation && !hasFittedWithUserRef.current) {
      hasFittedWithUserRef.current = true;
      runFit();
    }
  }, [token, merchants, userLocation]);

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
      </div>
    </div>
  );

  return createPortal(shell, document.body);
};

export default CustomerMerchantMap;
