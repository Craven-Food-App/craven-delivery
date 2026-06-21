/**
 * Mapbox map for delivery step one: driver location, store (restaurant) marker, and selectable route options.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { MAPBOX_CONFIG } from '@/config/mapbox';
import driverNavIcon from '@/assets/driver_nav_icon.png';

export interface StepOneMapProps {
  /** Store (restaurant) location. If not provided, storeAddress will be geocoded. Ignored when destination* are set. */
  storeLat?: number;
  storeLng?: number;
  storeAddress?: string;
  storeName?: string;
  /** When set, map shows route to customer (home marker) instead of store. */
  destinationLat?: number;
  destinationLng?: number;
  destinationAddress?: string;
  destinationName?: string;
  /**
   * Optional origin override. When provided, the map draws the route from this
   * origin to the destination (e.g. restaurant → customer for the dropoff leg)
   * instead of driver → destination. Used by the customer leg so the driver
   * sees the full route just like the CX courier accept sheet.
   */
  originLat?: number;
  originLng?: number;
  originAddress?: string;
  originLabel?: string;
  className?: string;
}

interface RouteOption {
  index: number;
  durationMin: number;
  distanceMi: number;
  geometry: GeoJSON.LineString;
}

export const StepOneMap: React.FC<StepOneMapProps> = ({
  storeLat,
  storeLng,
  storeAddress,
  storeName = 'Store',
  destinationLat,
  destinationLng,
  destinationAddress,
  destinationName = 'Customer',
  originLat,
  originLng,
  originAddress,
  originLabel = 'PICKUP',
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);
  const useCustomerDestination =
    (destinationLat != null && destinationLng != null) || !!destinationAddress?.trim();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const { location } = useDriverLocation();

  const driverLngLat = location ? [location.longitude, location.latitude] as [number, number] : null;
  const hasOriginOverride =
    (originLat != null && originLng != null) || !!originAddress?.trim();

  const geocode = useCallback(async (address: string, token: string): Promise<[number, number] | null> => {
    if (!address?.trim()) return null;
    try {
      const params = new URLSearchParams({
        access_token: token,
        limit: '1',
        country: 'US',
      });
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?${params}`
      );
      const data = await res.json();
      if (data.features?.[0]?.center) return data.features[0].center;
    } catch (e) {
      console.warn('Geocode error:', e);
    }
    return null;
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    let cancelled = false;
    const initMap = async () => {
      try {
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
        if (tokenError || !tokenData?.token) {
          setError('Map unavailable');
          setIsLoading(false);
          return;
        }
        const token = tokenData.token;
        const mapboxgl = (window as any).mapboxgl;
        if (!mapboxgl) {
          setError('Map library not loaded');
          setIsLoading(false);
          return;
        }
        mapboxgl.accessToken = token;

        let destCoords: [number, number] | null = null;
        if (useCustomerDestination) {
          if (destinationLat != null && destinationLng != null) {
            destCoords = [destinationLng, destinationLat];
          } else if (destinationAddress) {
            destCoords = await geocode(destinationAddress, token);
          }
        } else {
          if (storeLat != null && storeLng != null) {
            destCoords = [storeLng, storeLat];
          } else if (storeAddress) {
            destCoords = await geocode(storeAddress, token);
          }
        }
        // Resolve origin: explicit override (e.g. restaurant pickup) → driver location.
        let originCoords: [number, number] | null = null;
        if (hasOriginOverride) {
          if (originLat != null && originLng != null) {
            originCoords = [originLng, originLat];
          } else if (originAddress) {
            originCoords = await geocode(originAddress, token);
          }
        }
        if (!originCoords && driverLngLat) {
          originCoords = driverLngLat;
        }
        const hasOrigin = !!originCoords;
        const fallbackCenter = MAPBOX_CONFIG.center as [number, number];
        const destination = destCoords ?? fallbackCenter;
        const hasRealDestination = !!destCoords;
        const shouldFetchRoute = !!(
          hasOrigin && originCoords && destCoords && (
            Math.abs(Number(originCoords[0]) - Number(destCoords[0])) > 0.0005 ||
            Math.abs(Number(originCoords[1]) - Number(destCoords[1])) > 0.0005
          )
        );

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: destination,
          zoom: 13,
        });

        map.current.on('load', async () => {
          if (cancelled) return;
          const mapInstance = map.current;
          if (!mapInstance) return;

          // Crave'N CX-style labeled markers (matches courier sheet)
          const makeLabeledMarker = (label: string) => {
            const el = document.createElement('div');
            el.style.cssText =
              "width:54px;height:54px;border-radius:50%;background:#f97316;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;letter-spacing:0.05em;box-shadow:0 4px 12px rgba(0,0,0,0.25);border:3px solid #fff;";
            el.textContent = label;
            return el;
          };

          if (hasOrigin && originCoords) {
            driverMarkerRef.current = new mapboxgl.Marker({
              element: makeLabeledMarker(hasOriginOverride ? originLabel : 'START'),
              anchor: 'center',
            })
              .setLngLat(originCoords)
              .addTo(mapInstance);
          }

          if (hasRealDestination) {
            destinationMarkerRef.current = new mapboxgl.Marker({
              element: makeLabeledMarker('END'),
              anchor: 'center',
            })
              .setLngLat(destCoords)
              .addTo(mapInstance);
          }

          try {
            if (shouldFetchRoute && originCoords && destCoords) {
              const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?geometries=geojson&alternatives=true&overview=full&access_token=${token}`;
              const res = await fetch(url);
              const data = await res.json();
              if (cancelled) return;
              if (data.routes?.length) {
                const options: RouteOption[] = data.routes.map((r: any, i: number) => ({
                  index: i,
                  durationMin: (r.duration || 0) / 60,
                  distanceMi: (r.distance || 0) * 0.000621371,
                  geometry: r.geometry,
                }));
                setRouteOptions(options);
                const bounds = new mapboxgl.LngLatBounds();
                bounds.extend(originCoords);
                bounds.extend(destCoords);
                mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 16 });
              } else {
                const bounds = new mapboxgl.LngLatBounds();
                bounds.extend(destCoords);
                mapInstance.fitBounds(bounds, { padding: 80 });
              }
            } else {
              mapInstance.flyTo({ center: destination, zoom: 14, duration: 400 });
            }
          } catch (routeErr) {
            console.warn('Directions error:', routeErr);
            mapInstance.flyTo({ center: destination, zoom: 14, duration: 400 });
          }
          setIsLoading(false);
        });
      } catch (err) {
        console.error('StepOneMap init:', err);
        setError('Map failed to load');
        setIsLoading(false);
      }
    };

    if ((window as any).mapboxgl) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.onload = () => {
        const link = document.createElement('link');
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        initMap();
      };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      driverMarkerRef.current = null;
      destinationMarkerRef.current = null;
    };
  }, []);

  // Update driver position when location changes
  useEffect(() => {
    if (!map.current || !driverMarkerRef.current || !driverLngLat) return;
    driverMarkerRef.current.setLngLat(driverLngLat);
  }, [driverLngLat]);

  // Draw selected route when route options or selection change
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance?.getSource || !routeOptions.length) return;
    const route = routeOptions[selectedRouteIndex];
    if (!route?.geometry) return;

    try {
      if (mapInstance.getSource('step-one-route')) {
        (mapInstance.getSource('step-one-route') as any).setData({
          type: 'Feature',
          properties: {},
          geometry: route.geometry,
        });
      } else {
        mapInstance.addSource('step-one-route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: route.geometry },
        });
        mapInstance.addLayer({
          id: 'step-one-route-line',
          type: 'line',
          source: 'step-one-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#f97316', 'line-width': 4 },
        });
      }
    } catch (e) {
      console.warn('Route layer update:', e);
    }
  }, [routeOptions, selectedRouteIndex]);

  if (error) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <p className="text-sm text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <p className="text-sm text-gray-600">Loading map…</p>
        </div>
      )}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      {routeOptions.length > 1 && (
        <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-2 z-10 pointer-events-auto">
          {routeOptions.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedRouteIndex(i)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium shadow bg-white border border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-colors"
              style={{
                borderColor: selectedRouteIndex === i ? '#f26419' : undefined,
                backgroundColor: selectedRouteIndex === i ? '#fff4ed' : undefined,
              }}
            >
              Route {i + 1}: ~{Math.round(opt.durationMin)} min · {opt.distanceMi.toFixed(1)} mi
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
