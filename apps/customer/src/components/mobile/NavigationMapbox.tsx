import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Navigation, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  MapPin,
  Clock,
  Route,
  AlertTriangle
} from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SpeedLimitSign } from './SpeedLimitSign';

interface NavigationMapboxProps {
  destination: {
    address: string;
    latitude?: number;
    longitude?: number;
    name?: string;
  };
  onNavigationComplete?: () => void;
  className?: string;
}

export const NavigationMapbox: React.FC<NavigationMapboxProps> = ({
  destination,
  onNavigationComplete,
  className = ""
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const scriptLoaded = useRef(false);
  const driverMarker = useRef<any>(null);
  const destinationMarker = useRef<any>(null);
  const routeLayer = useRef<any>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loadingMap, setLoadingMap] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  const { location } = useDriverLocation();
  const { 
    navigationState, 
    navigationSettings, 
    startNavigation, 
    stopNavigation,
    updateSettings 
  } = useNavigation();

  // Get Mapbox token
  useEffect(() => {
    const getMapboxToken = async () => {
      try {
        const response = await supabase.functions.invoke('get-mapbox-token');
        if (response.data?.token) {
          setMapboxToken(response.data.token);
        } else {
          setMapError('Unable to load map services');
        }
      } catch (error) {
        console.error('Error getting Mapbox token:', error);
        setMapError('Map services unavailable');
      }
    };

    getMapboxToken();
  }, []);

  // Load Mapbox resources
  useEffect(() => {
    if (!mapboxToken || scriptLoaded.current) return;

    const loadMapboxResources = async () => {
      try {
        // Load Mapbox CSS
        const link = document.createElement('link');
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        // Load Mapbox JS
        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
        script.onload = () => {
          scriptLoaded.current = true;
          initializeMap();
        };
        script.onerror = () => {
          setMapError('Failed to load map resources');
          setLoadingMap(false);
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Mapbox:', error);
        setMapError('Map initialization failed');
        setLoadingMap(false);
      }
    };

    loadMapboxResources();
  }, [mapboxToken]);

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken || !window.mapboxgl) return;

    try {
      (window.mapboxgl as any).accessToken = mapboxToken;

      map.current = new window.mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/navigation-day-v1',
        center: location ? [location.longitude, location.latitude] : [-74.006, 40.7128],
        zoom: 15,
        pitch: 60,
        bearing: 0
      });

      // Add navigation controls
      map.current.addControl(new window.mapboxgl.NavigationControl({
        visualizePitch: true
      }), 'top-right');

      map.current.on('load', () => {
        setIsMapReady(true);
        setLoadingMap(false);
        
        // Add markers and route if navigation is active
        if (navigationState.isNavigating) {
          displayRoute();
        }
      });

      map.current.on('error', (e: any) => {
        console.error('Map error:', e);
        setMapError('Map display error');
      });

    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Unable to initialize map');
      setLoadingMap(false);
    }
  };

  // Update driver marker position
  useEffect(() => {
    if (!isMapReady || !location || !map.current) return;

    updateDriverMarker();
  }, [location, isMapReady]);

  const updateDriverMarker = () => {
    if (!map.current || !location) return;

    if (driverMarker.current) {
      driverMarker.current.setLngLat([location.longitude, location.latitude]);
      
      // Update rotation if heading is available
      if (location.heading !== undefined) {
        const element = driverMarker.current.getElement();
        element.style.transform = `rotate(${location.heading}deg)`;
      }
    } else {
      // Create driver marker
      const el = document.createElement('div');
      el.className = 'driver-marker';
      el.style.cssText = `
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
      `;

      // Add direction arrow
      const arrow = document.createElement('div');
      arrow.style.cssText = `
        position: absolute;
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 8px solid #3b82f6;
      `;
      el.appendChild(arrow);

      driverMarker.current = new window.mapboxgl.Marker(el)
        .setLngLat([location.longitude, location.latitude])
        .addTo(map.current);
    }

    // Auto-center map on driver when navigating
    if (navigationState.isNavigating) {
      map.current.easeTo({
        center: [location.longitude, location.latitude],
        duration: 1000
      });
    }
  };

  const displayRoute = () => {
    if (!map.current || !navigationState.currentRoute) return;

    const route = navigationState.currentRoute;
    
    // Add route layer
    if (map.current.getSource('route')) {
      map.current.getSource('route').setData({
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      });
    } else {
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry
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
          'line-color': '#3b82f6',
          'line-width': 5,
          'line-opacity': 0.75
        }
      });
    }

    // Add destination marker
    if (destination.latitude && destination.longitude) {
      if (destinationMarker.current) {
        destinationMarker.current.setLngLat([destination.longitude, destination.latitude]);
      } else {
        const el = document.createElement('div');
        el.className = 'destination-marker';
        el.style.cssText = `
          width: 30px;
          height: 30px;
          background: #ef4444;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
        `;
        el.innerHTML = '📍';

        destinationMarker.current = new window.mapboxgl.Marker(el)
          .setLngLat([destination.longitude, destination.latitude])
          .addTo(map.current);
      }
    }

    // Fit map to show route
    const coordinates = route.geometry.coordinates;
    const bounds = new window.mapboxgl.LngLatBounds();
    coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
    
    map.current.fitBounds(bounds, {
      padding: 50,
      duration: 1000
    });
  };

  const handleStartNavigation = async () => {
    await startNavigation(destination);
  };

  const handleStopNavigation = () => {
    stopNavigation();
    if (onNavigationComplete) {
      onNavigationComplete();
    }
  };

  const toggleVoiceGuidance = () => {
    updateSettings({ voiceGuidance: !navigationSettings.voiceGuidance });
  };

  const recenterMap = () => {
    if (location && map.current) {
      map.current.easeTo({
        center: [location.longitude, location.latitude],
        zoom: 16,
        duration: 1000
      });
    }
  };

  if (mapError) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{mapError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Navigation Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Navigation Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                <span className="font-semibold">
                  {navigationState.isNavigating ? 'Navigating' : 'Ready to Navigate'}
                </span>
              </div>
              <Badge variant={navigationState.isNavigating ? 'default' : 'secondary'}>
                {navigationSettings.provider === 'mapbox' ? 'In-App' : 'External'}
              </Badge>
            </div>

            {/* Route Info */}
            {navigationState.isNavigating && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {navigationState.routeDuration?.toFixed(0) || '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">min</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {navigationState.routeDistance?.toFixed(1) || '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">mi</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {navigationState.estimatedArrival ? 
                      navigationState.estimatedArrival.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      }) : '—'
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">ETA</div>
                </div>
              </div>
            )}

            {/* Next Turn Instruction */}
            {navigationState.nextTurn && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {navigationState.nextTurn}
                  </span>
                </div>
                {navigationState.distanceToNext && (
                  <div className="text-xs text-blue-600 mt-1">
                    in {navigationState.distanceToNext.toFixed(1)} mi
                  </div>
                )}
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              {!navigationState.isNavigating ? (
                <Button
                  onClick={handleStartNavigation}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Start Navigation
                </Button>
              ) : (
                <Button
                  onClick={handleStopNavigation}
                  variant="destructive"
                  className="flex-1"
                >
                  Stop Navigation
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={toggleVoiceGuidance}
                disabled={!navigationState.isNavigating}
              >
                {navigationSettings.voiceGuidance ? 
                  <Volume2 className="h-4 w-4" /> : 
                  <VolumeX className="h-4 w-4" />
                }
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={recenterMap}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            <div 
              ref={mapContainer} 
              className="w-full h-80 rounded-lg bg-gray-100"
            />

            {loadingMap && (
              <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Loading map...</p>
                </div>
              </div>
            )}

            {/* Speed Limit Sign Overlay */}
            {location && (
              <div className="absolute top-4 right-4">
                <SpeedLimitSign
                  currentSpeed={location.speed ? location.speed * 2.237 : 0} // Convert m/s to mph
                  location={{
                    latitude: location.latitude,
                    longitude: location.longitude
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};