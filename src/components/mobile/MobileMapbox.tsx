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

interface MobileMapboxProps {
  className?: string;
  onZoneStatusChange?: (info: { isInZone: boolean; zone: DeliveryZone | null }) => void;
}

const ZONE_SOURCE_ID = 'delivery-zones';
const ZONE_FILL_LAYER_ID = 'delivery-zones-fill';
const ZONE_LINE_LAYER_ID = 'delivery-zones-outline';

export const MobileMapbox: React.FC<MobileMapboxProps> = ({
  className = '',
  onZoneStatusChange,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const navigationControlAdded = useRef<boolean>(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const { location, startTracking, isTracking } = useDriverLocation();
  const [showRecenter, setShowRecenter] = useState(false);
  const [zones, setZones] = useState<DeliveryZone[]>(() => DELIVERY_ZONES.map((zone) => ({ ...zone })));

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
    (lat: number, lng: number, animate = false, heading?: number) => {
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
        map.current.flyTo({ center: [lng, lat], zoom: Math.max(map.current.getZoom() || 14, 14), essential: true });
      } else {
        map.current.setCenter([lng, lat]);
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
    
    // Only update map center if user hasn't manually panned (check if map was recently moved by user)
    // For now, we'll update the center smoothly without animation to follow driver
    map.current.setCenter([location.longitude, location.latitude]);
    
    // Update zone status
    const zone = getZoneForLocation([location.latitude, location.longitude], zones);
    const isInZone = Boolean(zone);
    if (onZoneStatusChange) {
      onZoneStatusChange({ isInZone, zone });
    }
    
    setShowRecenter(true);
  }, [isMapReady, location, calculateRotation, zones, onZoneStatusChange]);


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
      `}</style>
      <div ref={mapContainer} className="w-full h-full" style={{ pointerEvents: 'auto' }} />

      {isMapReady && (
        <>
          {/* Recenter button - right side */}
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
                const currentHeading = location?.heading;
                applyDriverLocation(lat, lng, true, currentHeading);
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
          
          {/* Schedule button - left side (opposite to attribution) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // TODO: Open schedule modal for future feeding times
              console.log('Schedule future feeding times');
            }}
            className="absolute z-[100] w-10 h-10 rounded-full bg-white/95 backdrop-blur shadow-xl flex items-center justify-center hover:bg-white active:scale-95 transition-all cursor-pointer"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 350px)', left: '16px', pointerEvents: 'auto' }}
            aria-label="Schedule future feeding times"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-700">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
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
