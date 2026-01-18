import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MapPin } from 'lucide-react';

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
          const parts = [addr.street, addr.city, addr.state, addr.zip_code].filter(Boolean);
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

        // Determine map center - prioritize dropoff address (customer's delivery location)
        let center: [number, number] = currentLocation;
        let defaultZoom = 13;
        
        if (dropoffCoords) {
          // Default to customer's delivery address, zoomed in
          center = dropoffCoords;
          defaultZoom = 16; // Zoom in on delivery address
        } else if (pickupCoords && !dropoffCoords) {
          center = pickupCoords;
        } else if (pickupCoords && dropoffCoords) {
          // If both exist, prefer dropoff (customer address) but can show both
          center = dropoffCoords;
          defaultZoom = 15;
        }

        // Initialize map
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: center,
          zoom: defaultZoom,
          interactive: true // Always interactive to allow pan/zoom
        });

        map.current.on('load', async () => {
          // If we have a custom pin icon and dropoff coordinates, use it for the dropoff marker
          if (dropoffCoords && customPinIcon) {
            // Create custom marker element
            const el = document.createElement('div');
            el.className = 'custom-delivery-pin';
            el.style.cssText = `
              width: 40px;
              height: 40px;
              background-image: url('${customPinIcon}');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              cursor: ${editable ? 'move' : 'pointer'};
            `;
            
            marker.current = new mapboxgl.Marker({
              element: el,
              draggable: editable,
              anchor: 'bottom'
            })
              .setLngLat(dropoffCoords)
              .addTo(map.current);

            // Handle drag end to update location
            if (editable && onLocationChange) {
              marker.current.on('dragend', () => {
                const lngLat = marker.current.getLngLat();
                onLocationChange(lngLat.lng, lngLat.lat);
              });
            }

            // Allow clicking on map to move pin when editable
            if (editable && onLocationChange) {
              map.current.on('click', (e: any) => {
                const { lng, lat } = e.lngLat;
                marker.current.setLngLat([lng, lat]);
                onLocationChange(lng, lat);
              });
            }
          } else {
            // Add current location marker (blue) - only if not editable
            if (!editable) {
              new mapboxgl.Marker({ color: '#3b82f6' })
                .setLngLat(currentLocation)
                .addTo(map.current);
            }

            // Add pickup marker (red) - only if not editable
            if (pickupCoords && !editable) {
              new mapboxgl.Marker({ color: '#ef4444' })
                .setLngLat(pickupCoords)
                .addTo(map.current);
            }

            // Add dropoff marker - make it draggable if editable
            if (dropoffCoords) {
              if (editable) {
                // Create draggable orange pin for editable mode
                const el = document.createElement('div');
                el.className = 'editable-delivery-pin';
                el.style.cssText = `
                  width: 40px;
                  height: 40px;
                  background-color: #ff7a00;
                  border-radius: 50% 50% 50% 0;
                  transform: rotate(-45deg);
                  border: 3px solid white;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  cursor: move;
                `;
                // Add inner circle for better visibility
                const inner = document.createElement('div');
                inner.style.cssText = `
                  width: 20px;
                  height: 20px;
                  background-color: white;
                  border-radius: 50%;
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%) rotate(45deg);
                `;
                el.appendChild(inner);

                marker.current = new mapboxgl.Marker({
                  element: el,
                  draggable: true,
                  anchor: 'bottom'
                })
                  .setLngLat(dropoffCoords)
                  .addTo(map.current);

                // Handle drag end to update location
                if (onLocationChange) {
                  marker.current.on('dragend', () => {
                    const lngLat = marker.current.getLngLat();
                    onLocationChange(lngLat.lng, lngLat.lat);
                  });
                }

                // Allow clicking on map to move pin when editable
                map.current.on('click', (e: any) => {
                  const { lng, lat } = e.lngLat;
                  marker.current.setLngLat([lng, lat]);
                  if (onLocationChange) {
                    onLocationChange(lng, lat);
                  }
                });
              } else {
                // Non-editable green marker
                new mapboxgl.Marker({ color: '#22c55e' })
                  .setLngLat(dropoffCoords)
                  .addTo(map.current);
              }
            }
          }

          // Draw route if requested and we have coordinates
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

                // Fit map to show all markers
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
            // Default view: zoom in on dropoff address (customer's delivery location)
            if (dropoffCoords) {
              // Center and zoom in on delivery address
              map.current.setCenter(dropoffCoords);
              map.current.setZoom(16); // Zoomed in for precise location
            } else {
              // Fallback: fit to available markers
              const bounds = new mapboxgl.LngLatBounds();
              if (!editable) bounds.extend(currentLocation);
              if (pickupCoords) bounds.extend(pickupCoords);
              
              if (bounds.isEmpty()) {
                map.current.setCenter(center);
                map.current.setZoom(defaultZoom);
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

  // Handle editable mode changes
  useEffect(() => {
    if (!map.current || !marker.current) return;

    // Update marker draggability based on editable prop
    if (editable) {
      marker.current.setDraggable(true);
      // Add click handler to move pin
      const handleClick = (e: any) => {
        const { lng, lat } = e.lngLat;
        marker.current.setLngLat([lng, lat]);
        if (onLocationChange) {
          onLocationChange(lng, lat);
        }
      };
      map.current.on('click', handleClick);
      
      return () => {
        map.current?.off('click', handleClick);
      };
    } else {
      marker.current.setDraggable(false);
    }
  }, [editable, onLocationChange]);

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
    </div>
  );
};

export default DeliveryMap;

