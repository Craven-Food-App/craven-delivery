import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MapPin } from 'lucide-react';
import { createCravenMarkerElement, CRAVEN_PIN_URL } from '@/utils/createCravenMapPin';

interface DeliveryMapProps {
  pickupAddress?: any;
  dropoffAddress?: any;
  showRoute?: boolean;
  className?: string;
  editable?: boolean;
  onLocationChange?: (lng: number, lat: number) => void;
  customPinIcon?: string;
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  pickupAddress,
  dropoffAddress,
  showRoute = false,
  className = '',
  editable = false,
  onLocationChange,
  customPinIcon
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevEditableRef = useRef(editable);

  // When editable changes, update map interactivity without full re-init
  useEffect(() => {
    if (!map.current) return;
    if (prevEditableRef.current === editable) return;
    prevEditableRef.current = editable;

    if (editable) {
      // Enable map dragging; hide the actual marker so the CSS overlay pin is the only one visible
      map.current.dragPan.enable();
      map.current.scrollZoom.enable();
      map.current.touchZoomRotate.enable();
      if (marker.current) {
        marker.current.getElement().style.display = 'none';
      }
    } else {
      // Lock the map again; show the real marker at the current center
      const center = map.current.getCenter();
      if (marker.current) {
        marker.current.setLngLat([center.lng, center.lat]);
        marker.current.getElement().style.display = '';
      }
      map.current.dragPan.disable();
      map.current.scrollZoom.disable();
      map.current.touchZoomRotate.disable();
    }
  }, [editable]);

  // Fire onLocationChange whenever the map stops moving while in editable mode
  const handleMoveEnd = useCallback(() => {
    if (!map.current || !editable || !onLocationChange) return;
    const center = map.current.getCenter();
    onLocationChange(center.lng, center.lat);
  }, [editable, onLocationChange]);

  // Attach / detach moveend listener
  useEffect(() => {
    if (!map.current) return;
    map.current.on('moveend', handleMoveEnd);
    return () => {
      map.current?.off('moveend', handleMoveEnd);
    };
  }, [handleMoveEnd]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initMap = async () => {
      try {
        // Get Mapbox token
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
        
        if (tokenError) {
          console.error('Error getting Mapbox token:', tokenError);
          setError('Failed to load map');
          setIsLoading(false);
          return;
        }

        const mapboxgl = (window as any).mapboxgl;
        if (!mapboxgl) {
          console.error('Mapbox GL not loaded');
          setError('Map library not loaded');
          setIsLoading(false);
          return;
        }

        mapboxgl.accessToken = tokenData.token;

        // Get current location
        let currentLocation: [number, number] = [-83.5379, 41.6528]; // Toledo fallback
        
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              enableHighAccuracy: true, 
              timeout: 5000 
            });
          });
          currentLocation = [position.coords.longitude, position.coords.latitude];
        } catch (geoError) {
          console.warn('Geolocation error, using fallback:', geoError);
        }

        // Helper function to parse address
        const parseAddress = (addr: any): string => {
          if (!addr) return '';
          if (typeof addr === 'string') return addr;
          if (addr.address) return addr.address;
          const parts = [
            addr.street_address || addr.street,
            addr.city,
            addr.state,
            addr.zip_code || addr.zip
          ].filter(Boolean);
          return parts.join(', ');
        };

        // Geocode addresses
        const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
          if (!address) return null;
          
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${tokenData.token}&limit=1`
            );
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
              return data.features[0].center;
            }
          } catch (err) {
            console.error('Geocoding error:', err);
          }
          
          return null;
        };

        // Get pickup coordinates
        let pickupCoords: [number, number] | null = null;
        if (pickupAddress) {
          const pickupAddr = parseAddress(pickupAddress);
          if (pickupAddr) {
            pickupCoords = await geocodeAddress(pickupAddr);
          }
        }

        // Get dropoff coordinates
        let dropoffCoords: [number, number] | null = null;
        if (dropoffAddress) {
          const dropoffAddr = parseAddress(dropoffAddress);
          if (dropoffAddr) {
            dropoffCoords = await geocodeAddress(dropoffAddr);
          }
        }

        // Determine map center
        let center: [number, number] = currentLocation;
        if (pickupCoords && !dropoffCoords) {
          center = pickupCoords;
        } else if (dropoffCoords && !pickupCoords) {
          center = dropoffCoords;
        } else if (pickupCoords && dropoffCoords) {
          center = [
            (pickupCoords[0] + dropoffCoords[0]) / 2,
            (pickupCoords[1] + dropoffCoords[1]) / 2
          ];
        }

        // Initialize map — always interactive so we can toggle drag later
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: dropoffCoords || center,
          zoom: 15,
          interactive: true
        });

        // Start locked (non-editable) — only panning/zooming when editable
        if (!editable) {
          map.current.dragPan.disable();
          map.current.scrollZoom.disable();
          map.current.touchZoomRotate.disable();
        }

        map.current.on('load', async () => {
          // Place the main delivery pin (visible when NOT adjusting; hidden during adjust)
          const pinIcon = customPinIcon || CRAVEN_PIN_URL;
          if (dropoffCoords && pinIcon) {
            const el = createCravenMarkerElement(40, 'Delivery Location');
            
            marker.current = new mapboxgl.Marker({
              element: el,
              draggable: false, // Never draggable — we use the fixed-center pattern instead
              anchor: 'bottom'
            })
              .setLngLat(dropoffCoords)
              .addTo(map.current);

            // If starting in editable mode, hide the real marker
            if (editable) {
              el.style.display = 'none';
            }
          } else {
            // Fallback: Craven branded markers
            if (!editable) {
              const locEl = createCravenMarkerElement(36, 'Your Location');
              new mapboxgl.Marker({ element: locEl, anchor: 'center' })
                .setLngLat(currentLocation)
                .addTo(map.current);
            }

            if (pickupCoords) {
              const pickupEl = createCravenMarkerElement(36, 'Pickup');
              new mapboxgl.Marker({ element: pickupEl, anchor: 'center' })
                .setLngLat(pickupCoords)
                .addTo(map.current);
            }

            if (dropoffCoords && !editable) {
              const dropEl = createCravenMarkerElement(36, 'Dropoff');
              new mapboxgl.Marker({ element: dropEl, anchor: 'center' })
                .setLngLat(dropoffCoords)
                .addTo(map.current);
            }
          }

          // Draw route if requested
          if (showRoute && pickupCoords && dropoffCoords) {
            try {
              const waypoints = `${currentLocation[0]},${currentLocation[1]};${pickupCoords[0]},${pickupCoords[1]};${dropoffCoords[0]},${dropoffCoords[1]}`;
              const routeResponse = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&access_token=${tokenData.token}`
              );
              const routeData = await routeResponse.json();

              if (routeData.routes && routeData.routes.length > 0) {
                const route = routeData.routes[0].geometry;

                map.current.addSource('route', {
                  type: 'geojson',
                  data: {
                    type: 'Feature',
                    properties: {},
                    geometry: route
                  }
                });

                map.current.addLayer({
                  id: 'route',
                  type: 'line',
                  source: 'route',
                  layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                  },
                  paint: {
                    'line-color': '#ef4444',
                    'line-width': 4
                  }
                });

                const bounds = new mapboxgl.LngLatBounds();
                bounds.extend(currentLocation);
                if (pickupCoords) bounds.extend(pickupCoords);
                if (dropoffCoords) bounds.extend(dropoffCoords);
                
                map.current.fitBounds(bounds, { padding: 50 });
              }
            } catch (routeErr) {
              console.error('Route fetch error:', routeErr);
            }
          } else {
            // Center on dropoff for delivery details view
            if (dropoffCoords) {
              map.current.setCenter(dropoffCoords);
              map.current.setZoom(15);
            } else {
              const bounds = new mapboxgl.LngLatBounds();
              bounds.extend(currentLocation);
              if (pickupCoords) bounds.extend(pickupCoords);
              
              if (bounds.isEmpty()) {
                map.current.setCenter(center);
                map.current.setZoom(15);
              } else {
                map.current.fitBounds(bounds, { padding: 50 });
              }
            }
          }

          setIsLoading(false);
        });

      } catch (err) {
        console.error('Map initialization error:', err);
        setError('Failed to initialize map');
        setIsLoading(false);
      }
    };

    // Load Mapbox script if not loaded
    if (!(window as any).mapboxgl) {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.onload = initMap;
      document.head.appendChild(script);

      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    } else {
      initMap();
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [pickupAddress, dropoffAddress, showRoute]);

  if (error) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-red-100 ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-4">
            <MapPin className="h-12 w-12 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-600">Map unavailable</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ minHeight: '256px' }}
      />

      {/* Fixed center pin overlay — visible only when adjusting */}
      {editable && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <div className="flex flex-col items-center">
            <img
              src={customPinIcon || CRAVEN_PIN_URL}
              alt="Delivery pin"
              style={{ width: 44, height: 44, marginBottom: -4 }}
            />
            {/* Shadow dot beneath the pin tip */}
            <div
              className="rounded-full bg-black/20"
              style={{ width: 8, height: 4 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryMap;
