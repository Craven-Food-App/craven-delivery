import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAPBOX_CONFIG } from '@/config/mapbox';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import {
  DELIVERY_ZONES,
  DeliveryZone,
  getZoneForLocation,
  getZoneStyle,
  randomizeZoneDemand,
  zonesToGeoJSON,
} from '@/data/deliveryZones';
import driverNavIcon from '@/assets/driver_nav_icon.png';
import { supabase } from '@/integrations/supabase/client';
import { isPngLogo } from '@/utils/logoUtils';

interface MerchantLocation {
  id: string;
  name: string;
  logo_url: string | null;
  latitude: number;
  longitude: number;
  merchant_category: string | null;
  cuisine_type: string | null;
  address?: string | null;
  phone?: string | null;
  active_order_count?: number;
}

interface MobileMapboxProps {
  className?: string;
  onZoneStatusChange?: (info: { isInZone: boolean; zone: DeliveryZone | null }) => void;
  resetToDefaultZoom?: boolean; // When true, resets map to default zoom
  onScheduleClick?: () => void; // Open schedule page
}

const ZONE_SOURCE_ID = 'delivery-zones';
const ZONE_FILL_LAYER_ID = 'delivery-zones-fill';
const ZONE_LINE_LAYER_ID = 'delivery-zones-outline';

export const MobileMapbox: React.FC<MobileMapboxProps> = ({
  className = '',
  onZoneStatusChange,
  resetToDefaultZoom = false,
  onScheduleClick,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const navigationControlAdded = useRef<boolean>(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const { location, startTracking, isTracking } = useDriverLocation();
  const [showRecenter, setShowRecenter] = useState(false);
  const [zones, setZones] = useState<DeliveryZone[]>(() => DELIVERY_ZONES.map((zone) => ({ ...zone })));
  const merchantMarkersRef = useRef<any[]>([]);
  const [merchants, setMerchants] = useState<MerchantLocation[]>([]);
  const userHasPanned = useRef(false);

  const driverLocation = useMemo<[number, number] | null>(() => {
    if (location) {
      return [location.latitude, location.longitude];
    }
    return null;
  }, [location]);

  const updateZoneLayers = useCallback(
    (zonesData: DeliveryZone[]) => {
      if (!map.current) return;
      
      // Check if map style is loaded before adding sources
      if (!map.current.isStyleLoaded()) {
        // Wait for style to load
        map.current.once('style.load', () => {
          updateZoneLayers(zonesData);
        });
        return;
      }

      const geoJson = zonesToGeoJSON(zonesData);
      const source = map.current.getSource(ZONE_SOURCE_ID);

      if (source) {
        source.setData(geoJson);
        return;
      }

      try {
        map.current.addSource(ZONE_SOURCE_ID, {
          type: 'geojson',
          data: geoJson,
        });

        if (!map.current.getLayer(ZONE_FILL_LAYER_ID)) {
          map.current.addLayer({
            id: ZONE_FILL_LAYER_ID,
            type: 'fill',
            source: ZONE_SOURCE_ID,
            paint: {
              'fill-color': ['get', 'fillColor'],
              'fill-opacity': ['coalesce', ['get', 'fillOpacity'], 0.4],
            },
          });
        }

        if (!map.current.getLayer(ZONE_LINE_LAYER_ID)) {
          map.current.addLayer({
            id: ZONE_LINE_LAYER_ID,
            type: 'line',
            source: ZONE_SOURCE_ID,
            paint: {
              'line-width': 2,
              'line-color': ['get', 'strokeColor'],
            },
          });
        }
      } catch (error) {
        console.error('Error adding zone layers:', error);
        // Retry after a short delay if style isn't ready
        setTimeout(() => {
          if (map.current && map.current.isStyleLoaded()) {
            updateZoneLayers(zonesData);
          }
        }, 100);
      }
    },
    []
  );

  // Calculate rotation based on heading
  // East/West: rotate to point direction, North/South: keep right-side up
  const calculateRotation = useCallback((heading: number | undefined): number => {
    if (heading === undefined || heading === null) return 0;
    
    // Normalize heading to 0-360
    const normalizedHeading = ((heading % 360) + 360) % 360;
    
    // For North (0°) and South (180°), keep right-side up (0° rotation)
    if (normalizedHeading >= 315 || normalizedHeading < 45) return 0; // North (0°)
    if (normalizedHeading >= 135 && normalizedHeading < 225) return 0; // South (180°)
    
    // For East (90°), rotate 90° clockwise so hand points East
    if (normalizedHeading >= 45 && normalizedHeading < 135) {
      return 90; // Point East
    }
    
    // For West (270°), rotate -90° (or 270° clockwise) so hand points West
    if (normalizedHeading >= 225 && normalizedHeading < 315) {
      return -90; // Point West
    }
    
    return 0;
  }, []);

  const applyDriverLocation = useCallback(
    (lat: number, lng: number, animate = false, heading?: number, zoom?: number) => {
      if (!map.current || !marker.current) return;

      marker.current.setLngLat([lng, lat]);
      
      // Update rotation if heading is available
      if (heading !== undefined && heading !== null) {
        const rotation = calculateRotation(heading);
        const element = marker.current.getElement();
        if (element) {
          element.style.transform = `rotate(${rotation}deg)`;
        }
      }
      
      if (animate) {
        // Use provided zoom, or maximum zoom (20), or current zoom, or minimum 14
        const targetZoom = zoom ?? 20; // Default to maximum zoom (20) when centering
        const finalZoom = Math.min(targetZoom, map.current.getMaxZoom?.() || 20);
        map.current.flyTo({ center: [lng, lat], zoom: finalZoom, essential: true });
      } else {
        map.current.setCenter([lng, lat]);
        if (zoom !== undefined) {
          const finalZoom = Math.min(zoom, map.current.getMaxZoom?.() || 20);
          map.current.setZoom(finalZoom);
        }
      }

      const zone = getZoneForLocation([lat, lng], zones);
      const isInZone = Boolean(zone);

      if (onZoneStatusChange) {
        onZoneStatusChange({ isInZone, zone });
      }
    },
    [onZoneStatusChange, zones, calculateRotation]
  );

  // Start location tracking immediately when component mounts
  useEffect(() => {
    if (!isTracking) {
      startTracking();
    }
  }, [startTracking, isTracking]);

  // Initialize map only once on mount
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initMap = () => {
      if (!(window as any).mapboxgl) {
        console.error('Mapbox GL JS not loaded');
        return;
      }

      (window as any).mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;

      try {
        // Use config default for initial center - location will update via separate effect
        const initialCenter = [MAPBOX_CONFIG.center[0], MAPBOX_CONFIG.center[1]];
        
        map.current = new (window as any).mapboxgl.Map({
          container: mapContainer.current,
          style: MAPBOX_CONFIG.style,
          center: initialCenter,
          zoom: MAPBOX_CONFIG.zoom,
          attributionControl: false, // Disable the default attribution (i) button
        });

        map.current.on('load', () => {
          setIsMapReady(true);
          
          // Track user panning to stop auto-centering
          map.current.on('dragstart', () => {
            userHasPanned.current = true;
            setShowRecenter(true);
          });
          
          if (map.current) {
            // Add navigation control only once
            if (!navigationControlAdded.current) {
              try {
                // Remove any existing navigation controls first
                const existingControls = map.current.getContainer().querySelectorAll('.mapboxgl-ctrl-group');
                existingControls.forEach((ctrl: any) => {
                  if (ctrl.closest('.mapboxgl-ctrl-top-right')) {
                    ctrl.remove();
                  }
                });
                
                const ctrl = new (window as any).mapboxgl.NavigationControl({ visualizePitch: true });
                map.current.addControl(ctrl, 'top-right');
                navigationControlAdded.current = true;
              } catch (error) {
                console.error('Failed to add navigation control', error);
              }
            }
            
            // Wait for style to be fully loaded before adding zones
            if (map.current.isStyleLoaded()) {
              updateZoneLayers(zones);
            } else {
              map.current.once('style.load', () => {
                updateZoneLayers(zones);
              });
            }
          }
        });

        map.current.on('error', (e: any) => {
          console.error('Mapbox error:', e);
        });

        // Initialize marker at config default - will be updated when location is available
        const initialMarkerPos = [MAPBOX_CONFIG.center[0], MAPBOX_CONFIG.center[1]];
        
        // Create custom marker element with driver icon
        const el = document.createElement('div');
        el.className = 'driver-location-marker';
        el.style.cssText = `
          width: 41px;
          height: 41px;
          background-image: url('${driverNavIcon}');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          cursor: pointer;
        `;
        
        marker.current = new (window as any).mapboxgl.Marker({
          element: el,
          anchor: 'center'
        })
          .setLngLat(initialMarkerPos)
          .addTo(map.current);
      } catch (error) {
        console.error('Error initializing Mapbox:', error);
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
      script.onerror = () => {
        console.error('Failed to load Mapbox GL JS');
      };
      document.head.appendChild(script);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        navigationControlAdded.current = false;
      }
    };
  }, []); // Only run once on mount

  // Remove this useEffect - zones are updated in the map load handler
  // This was causing duplicate calls and race conditions

  // Update map when driver location changes (real-time updates)
  useEffect(() => {
    if (!isMapReady || !map.current || !marker.current) return;
    if (!location) return;
    
    // Update marker position
    marker.current.setLngLat([location.longitude, location.latitude]);
    
    // Update rotation if heading is available
    if (location.heading !== undefined && location.heading !== null) {
      const rotation = calculateRotation(location.heading);
      const element = marker.current.getElement();
      if (element) {
        element.style.transform = `rotate(${rotation}deg)`;
      }
    }
    
    // Only auto-center if user hasn't manually panned
    if (!userHasPanned.current) {
      map.current.setCenter([location.longitude, location.latitude]);
    }
    
    // Update zone status
    const zone = getZoneForLocation([location.latitude, location.longitude], zones);
    const isInZone = Boolean(zone);
    if (onZoneStatusChange) {
      onZoneStatusChange({ isInZone, zone });
    }
    
    setShowRecenter(true);
  }, [isMapReady, location, calculateRotation, zones, onZoneStatusChange]);

  // Reset map to default zoom when resetToDefaultZoom prop changes to true
  useEffect(() => {
    if (!isMapReady || !map.current || !resetToDefaultZoom) return;
    
    // Reset to default zoom from config
    map.current.flyTo({
      zoom: MAPBOX_CONFIG.zoom,
      essential: true,
      duration: 500 // Smooth animation
    });
  }, [resetToDefaultZoom, isMapReady]);

  // Fetch merchant locations
  useEffect(() => {
    const fetchMerchants = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, logo_url, latitude, longitude, merchant_category, cuisine_type, address, phone')
        .eq('is_active', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (!error && data) {
        // Fetch active order counts per merchant for demand glow
        let countMap: Record<string, number> = {};
        try {
          const { data: orderCounts } = await supabase
            .from('orders')
            .select('restaurant_id')
            .or('status.eq.pending,status.eq.confirmed,status.eq.preparing,status.eq.ready');
          (orderCounts || []).forEach((o: any) => {
            countMap[o.restaurant_id] = (countMap[o.restaurant_id] || 0) + 1;
          });
        } catch (e) {
          console.warn('Could not fetch order counts for demand glow:', e);
        }

        setMerchants((data as MerchantLocation[]).map(m => ({
          ...m,
          active_order_count: countMap[m.id] || 0,
        })));
      }
    };
    fetchMerchants();
  }, []);

  // Render merchant markers on map
  useEffect(() => {
    if (!isMapReady || !map.current || merchants.length === 0) return;

    // Clear existing merchant markers
    merchantMarkersRef.current.forEach(m => m.remove());
    merchantMarkersRef.current = [];

    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;

    merchants.forEach((merchant) => {
      if (!merchant.latitude || !merchant.longitude) return;

      // Demand glow: yellow (1-2 orders), orange (3-4), red (5+)
      const demand = merchant.active_order_count || 0;
      let glowStyle = '';
      let borderColor = '#ff6600';
      if (demand >= 5) {
        glowStyle = 'box-shadow: 0 0 8px 5px rgba(239,68,68,0.55), 0 0 18px 10px rgba(239,68,68,0.25), 0 0 30px 15px rgba(239,68,68,0.1);';
        borderColor = '#ef4444';
      } else if (demand >= 3) {
        glowStyle = 'box-shadow: 0 0 6px 4px rgba(249,115,22,0.5), 0 0 14px 8px rgba(249,115,22,0.2), 0 0 24px 12px rgba(249,115,22,0.08);';
        borderColor = '#f97316';
      } else if (demand >= 1) {
        glowStyle = 'box-shadow: 0 0 5px 3px rgba(234,179,8,0.45), 0 0 12px 6px rgba(234,179,8,0.18), 0 0 20px 10px rgba(234,179,8,0.06);';
        borderColor = '#eab308';
      }

      // Single element — no wrapper. Glow is applied via box-shadow directly.
      const el = document.createElement('div');
      el.className = 'merchant-map-marker';
      
      const hasPng = isPngLogo(merchant.logo_url);
      const bgColor = hasPng ? '#ffffff' : '#f9fafb';
      const size = 22;

      el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${merchant.logo_url ? 'transparent' : bgColor};
        border: 1px solid ${borderColor};
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.15s ease;
        ${glowStyle || 'box-shadow: 0 1px 4px rgba(0,0,0,0.25);'}
        ${demand >= 1 ? 'animation: demandPulse 2s ease-in-out infinite;' : ''}
      `;

      if (merchant.logo_url) {
        const img = document.createElement('img');
        img.src = merchant.logo_url;
        img.alt = merchant.name;
        img.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          object-fit: contain;
          border-radius: 50%;
        `;
        img.onerror = () => {
          el.innerHTML = '';
          const fallback = document.createElement('span');
          fallback.textContent = merchant.name.charAt(0).toUpperCase();
          fallback.style.cssText = 'font-weight: 700; font-size: 11px; color: #ff6600;';
          el.appendChild(fallback);
        };
        el.appendChild(img);
      } else {
        const fallback = document.createElement('span');
        fallback.textContent = merchant.name.charAt(0).toUpperCase();
        fallback.style.cssText = 'font-weight: 700; font-size: 11px; color: #ff6600;';
        el.appendChild(fallback);
      }

      // Hover effect
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      // Navigate popup with merchant info
      const demandLabel = demand >= 5 ? '🔴 High Demand' : demand >= 3 ? '🟠 Moderate' : demand >= 1 ? '🟡 Building' : '';
      const categoryLabel = merchant.cuisine_type || merchant.merchant_category || 'Restaurant';
      const addressText = merchant.address ? `<p style="margin:2px 0;font-size:11px;color:#6b7280;">${merchant.address}</p>` : '';
      const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${merchant.latitude},${merchant.longitude}`;

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: true, maxWidth: '220px' })
        .setHTML(`
          <div style="padding:8px;font-family:system-ui,sans-serif;">
            <p style="margin:0 0 2px;font-size:13px;font-weight:700;">${merchant.name}</p>
            <p style="margin:0 0 4px;font-size:10px;color:#9ca3af;text-transform:uppercase;">${categoryLabel}</p>
            ${addressText}
            ${demandLabel ? `<p style="margin:4px 0;font-size:11px;font-weight:600;">${demandLabel}</p>` : ''}
            <a href="${navUrl}" target="_blank" rel="noopener noreferrer"
               style="display:block;margin-top:6px;padding:6px 0;background:#ff6600;color:#fff;text-align:center;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">
              Navigate →
            </a>
          </div>
        `);

      const markerInstance = new mapboxgl.Marker({ element: el })
        .setLngLat([merchant.longitude, merchant.latitude])
        .setPopup(popup)
        .addTo(map.current);

      merchantMarkersRef.current.push(markerInstance);
    });

    return () => {
      merchantMarkersRef.current.forEach(m => m.remove());
      merchantMarkersRef.current = [];
    };
  }, [isMapReady, merchants]);


  const legendItems = useMemo(() => {
    return zones.map((zone) => {
      const style = getZoneStyle(zone.demand);
      return {
        id: zone.id,
        name: zone.name,
        demand: style.demandLabel,
        textClass: style.textClass,
        badgeClass: style.badgeClass,
        borderColor: style.strokeColor,
      };
    });
  }, [zones]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <style>{`
        .mapboxgl-ctrl-top-right {
          top: calc(env(safe-area-inset-top, 0px) + 30px) !important;
        }
        .mapboxgl-ctrl-bottom-right {
          bottom: calc(env(safe-area-inset-bottom, 0px) + 350px) !important;
        }
        @keyframes demandPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <div ref={mapContainer} className="w-full h-full" style={{ pointerEvents: 'auto' }} />

      {isMapReady && (
        <>
          {/* Schedule button - Left side */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onScheduleClick) {
                onScheduleClick();
              }
            }}
            className="absolute z-[100] w-12 h-12 rounded-full bg-white/95 backdrop-blur shadow-xl flex items-center justify-center hover:bg-white active:scale-95 transition-all cursor-pointer"
            style={{ top: 'calc(50% + 20px)', left: '11px', transform: 'translateY(-50%)', pointerEvents: 'auto' }}
            aria-label="Schedule future feeding times"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-gray-700">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
          
          {/* Recenter button - Right side */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              // Try to get location from multiple sources
              let lat: number | null = null;
              let lng: number | null = null;
              
              if (location) {
                lat = location.latitude;
                lng = location.longitude;
              } else if (driverLocation) {
                lat = driverLocation[0];
                lng = driverLocation[1];
              } else if (marker.current) {
                // Fallback: get current marker position
                const currentPos = marker.current.getLngLat();
                lat = currentPos.lat;
                lng = currentPos.lng;
              }
              
              if (lat !== null && lng !== null && map.current && marker.current) {
                userHasPanned.current = false; // Reset panning so map follows driver again
                const currentHeading = location?.heading;
                const maxZoom = map.current.getMaxZoom?.() || 20;
                applyDriverLocation(lat, lng, true, currentHeading, maxZoom);
              }
            }}
            className="absolute z-[100] w-12 h-12 rounded-full bg-white/95 backdrop-blur shadow-xl flex items-center justify-center hover:bg-white active:scale-95 transition-all cursor-pointer"
            style={{ top: 'calc(50% + 20px)', right: '11px', transform: 'translateY(-50%)', pointerEvents: 'auto' }}
            aria-label="Recenter on driver location"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-gray-700">
              <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </>
      )}

      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMapbox;
