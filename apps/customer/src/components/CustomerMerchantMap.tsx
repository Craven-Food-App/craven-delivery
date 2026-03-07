import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DEFAULT_CENTER: [number, number] = [-83.55, 41.65]; // Toledo, OH
const HEAD_SIZE = 28;
const TAIL_HEIGHT = 10;

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
  const hasFittedRef = useRef(false);
  const [token, setToken] = useState<string | null>(null);
  const [merchants, setMerchants] = useState<MerchantLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get Mapbox token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('get-mapbox-token');
        const t = (data as { token?: string })?.token;
        if (!cancelled && t) setToken(t);
        else if (!cancelled) setError('Map unavailable');
      } catch (e) {
        if (!cancelled) setError('Map unavailable');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch all marketplace locations (restaurant, retail, mall)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const types = ['restaurant', 'retail', 'mall'];
      const allRows: any[] = [];
      for (const pType of types) {
        const { data, err } = await (supabase as any).rpc('get_marketplace_restaurants', {
          p_lat: null,
          p_lng: null,
          p_search: null,
          p_cuisine: null,
          p_limit: 1500,
          p_marketplace_type: pType,
        });
        if (err) {
          if (!cancelled) setError(err.message || 'Could not load locations');
          setLoading(false);
          return;
        }
        if (data && Array.isArray(data)) allRows.push(...data);
      }
      const byId = new Map<string, any>();
      for (const row of allRows) byId.set(row.id, row);
      const list = (Array.from(byId.values()) as any[])
        .filter((r: any) => r.lat != null && r.lng != null)
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          logo_url: r.image_url || r.logo_url || null,
          latitude: Number(r.lat),
          longitude: Number(r.lng),
          marketplace_type: r.marketplace_type || null,
          cuisine_type: r.cuisine_type || null,
          address: r.address != null ? String(r.address).trim() || null : null,
          status: r.status === 'ACTIVE' ? 'ACTIVE' : r.status === 'COMING_SOON' ? 'COMING_SOON' : 'REQUESTABLE',
          parent_location: r.parent_location || null,
        } as MerchantLocation));
      if (!cancelled) {
        setMerchants(list);
        setError(list.length === 0 ? 'No locations to show' : null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Init map
  useEffect(() => {
    if (!token || !mapContainer.current) return;
    mapboxgl.accessToken = token;
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: DEFAULT_CENTER,
      zoom: 10,
    });
    m.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current = m;
    return () => {
      markersRef.current.forEach((mr) => mr.remove());
      markersRef.current = [];
      m.remove();
      map.current = null;
    };
  }, [token]);

  // Add markers when map and merchants ready
  useEffect(() => {
    if (!map.current || merchants.length === 0) return;
    const m = map.current;
    markersRef.current.forEach((mr) => mr.remove());
    markersRef.current = [];

    merchants.forEach((merchant) => {
      const lat = merchant.latitude;
      const lng = merchant.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const borderColor = merchant.status === 'ACTIVE' ? '#f97316' : '#6b7280';
      const bgColor = merchant.logo_url ? 'transparent' : '#f9fafb';

      const el = document.createElement('div');
      el.style.cssText = `
        width: ${HEAD_SIZE}px; height: ${HEAD_SIZE + TAIL_HEIGHT}px;
        display: flex; flex-direction: column; align-items: center;
        cursor: pointer; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3)); z-index: 5;
      `;
      const inner = document.createElement('div');
      inner.style.cssText = 'display: flex; flex-direction: column; align-items: center; transition: transform 0.15s ease;';
      el.appendChild(inner);

      const head = document.createElement('div');
      head.style.cssText = `
        width: ${HEAD_SIZE}px; height: ${HEAD_SIZE}px; border-radius: 50%;
        background: ${bgColor}; border: 1.5px solid ${borderColor};
        overflow: hidden; display: flex; align-items: center; justify-content: center;
      `;
      if (merchant.logo_url) {
        const img = document.createElement('img');
        img.src = merchant.logo_url;
        img.alt = merchant.name;
        img.style.cssText = `width: ${HEAD_SIZE}px; height: ${HEAD_SIZE}px; object-fit: contain; border-radius: 50%;`;
        img.onerror = () => {
          head.innerHTML = '';
          const span = document.createElement('span');
          span.textContent = merchant.name.charAt(0).toUpperCase();
          span.style.cssText = 'font-weight: 700; font-size: 12px; color: #f97316;';
          head.appendChild(span);
        };
        head.appendChild(img);
      } else {
        const span = document.createElement('span');
        span.textContent = merchant.name.charAt(0).toUpperCase();
        span.style.cssText = 'font-weight: 700; font-size: 12px; color: #f97316;';
        head.appendChild(span);
      }
      const tail = document.createElement('div');
      tail.style.cssText = `
        width: 0; height: 0;
        border-left: 7px solid transparent; border-right: 7px solid transparent;
        border-top: ${TAIL_HEIGHT}px solid ${borderColor}; margin-top: -1px;
      `;
      inner.appendChild(head);
      inner.appendChild(tail);
      el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.15)'; });
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

      const popup = new mapboxgl.Popup({ offset: [0, -(HEAD_SIZE + TAIL_HEIGHT)], closeButton: true, maxWidth: '240px' })
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

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(m);
      markersRef.current.push(marker);
    });

    if (!hasFittedRef.current && merchants.length > 0) {
      hasFittedRef.current = true;
      const lngs = merchants.map((x) => x.longitude).filter(Number.isFinite);
      const lats = merchants.map((x) => x.latitude).filter(Number.isFinite);
      if (lngs.length && lats.length) {
        const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
        const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
        m.fitBounds([sw, ne], { padding: 60, maxZoom: 14, duration: 800 });
      }
    }
  }, [token, merchants]);

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Restaurants & stores near you</h2>
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
};

export default CustomerMerchantMap;
