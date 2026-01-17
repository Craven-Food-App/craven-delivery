import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapPin, Navigation, Clock } from 'lucide-react';

// --- GLOBAL VARIABLES (For Single File Compatibility) ---
// Using the real Mapbox Public Token provided by the user.
const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWZpbXN4NmUwMG0wMmpxNDNkc2lmNWhiIn0._lEfvdpBUJpz-RYDV02ZAA";

// --- MOCK UI COMPONENTS (Replaces Shadcn/UI and other imports) ---

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
    {children}
  </div>
);
const Button = ({ children, onClick = () => {}, className = '' }) => (
    <button
      onClick={onClick}
      className={`h-10 px-4 text-sm font-medium rounded-xl transition duration-150 active:scale-[0.98] bg-orange-600 text-white hover:bg-orange-700 shadow-md ${className}`}
    >
      {children}
    </button>
);


// --- MAPBOX CSS INJECTION ---
const MapboxGlobalStyle = () => (
    <style>{`
        .mapboxgl-map {
            font: 12px/20px 'Helvetica Neue', Arial, Helvetica, sans-serif;
            position: relative;
        }
        .mapboxgl-marker {
            cursor: pointer;
        }
    `}</style>
);


// --- MAPBOX UTILITIES ---

// Checks if the mapboxgl library has finished loading in the window
const checkMapboxReady = () => typeof (window as any).mapboxgl !== 'undefined';

// --- ORDER MAP PREVIEW COMPONENT ---

interface Address {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  street?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  address?: string;
}

interface RouteInfo {
  miles: number;
  minutes: number;
}

interface OrderMapPreviewProps {
  pickupAddress: Address | string;
  dropoffAddress: Address | string;
  routeInfo?: RouteInfo;
  className?: string;
}

const OrderMapPreview: React.FC<OrderMapPreviewProps> = ({
  pickupAddress,
  dropoffAddress,
  routeInfo,
  className
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null); // Use 'any' for mapboxgl.Map object
  const [routeData, setRouteData] = useState<RouteInfo | null>(null);
  const [isMapboxLoaded, setIsMapboxLoaded] = useState(checkMapboxReady());
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to format address string for geocoding
  const buildAddress = (addr: Address | string) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    if (addr.address) return addr.address;
    const parts = [addr.street, addr.city, addr.state, addr.zip_code].filter(Boolean);
    return parts.join(', ');
  };

  // Main Effect for Map Initialization and Routing
  useEffect(() => {
    if (!mapContainer.current) return;

    // Wait until mapboxgl is loaded
    if (!isMapboxLoaded) {
      // Set up an interval to check for library readiness
      const interval = setInterval(() => {
        if (checkMapboxReady()) {
          setIsMapboxLoaded(true);
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    }

    const initializeMap = async () => {
      // Use the global mapboxgl object
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl) return;
      
      setIsLoading(true);

      // Set Mapbox access token using the provided value.
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      
      const geocode = async (addr: Address | string): Promise<[number, number] | null> => {
        const q = buildAddress(addr);
        if (!q || !mapboxgl.accessToken) return null;

        // Note: Mapbox token is already set globally, but we pass it for clarity
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?limit=1&access_token=${mapboxgl.accessToken}`);
        const j = await res.json();
        const c = j?.features?.[0]?.center;
        // Mapbox coordinates are [longitude, latitude]
        return Array.isArray(c) && c.length === 2 ? [Number(c[0]), Number(c[1])] : null;
      };

      // Extract or geocode coordinates
      let pickupLat = Number((pickupAddress as Address)?.lat ?? (pickupAddress as Address)?.latitude);
      let pickupLng = Number((pickupAddress as Address)?.lng ?? (pickupAddress as Address)?.longitude);
      let dropoffLat = Number((dropoffAddress as Address)?.lat ?? (dropoffAddress as Address)?.latitude);
      let dropoffLng = Number((dropoffAddress as Address)?.lng ?? (dropoffAddress as Address)?.longitude);

      if (isNaN(pickupLat) || isNaN(pickupLng)) {
        const g = await geocode(pickupAddress);
        if (g) { pickupLng = g[0]; pickupLat = g[1]; }
      }
      if (isNaN(dropoffLat) || isNaN(dropoffLng)) {
        const g = await geocode(dropoffAddress);
        if (g) { dropoffLng = g[0]; dropoffLat = g[1]; }
      }

      if ([pickupLat, pickupLng, dropoffLat, dropoffLng].some(isNaN)) {
        console.error('Invalid or ungeocodable coordinates. Cannot initialize map.');
        setIsLoading(false);
        return;
      }

      // Cleanup existing map instance if present
      if (map.current) {
        map.current.remove();
      }

      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        // Mapbox center uses [Lng, Lat]
        center: [pickupLng, pickupLat], 
        zoom: 13,
        attributionControl: false,
        interactive: false // Make it non-interactive for preview
      });

      map.current.on('load', async () => {
        if (!map.current) return;

        // Add pickup marker (Orange)
        new mapboxgl.Marker({ color: '#f97316' })
          .setLngLat([pickupLng, pickupLat])
          .addTo(map.current);

        // Add dropoff marker (Green)
        new mapboxgl.Marker({ color: '#22c55e' })
          .setLngLat([dropoffLng, dropoffLat])
          .addTo(map.current);

        // Fetch and display route
        try {
          const routeResponse = await fetch(
            // Mapbox Directions uses Lng,Lat;Lng,Lat
            `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
          );
          const routeResult = await routeResponse.json();

          if (routeResult.routes && routeResult.routes.length > 0) {
            const route = routeResult.routes[0];
            const newRouteData: RouteInfo = {
              miles: Number((route.distance / 1609.34).toFixed(1)), // Convert meters to miles
              minutes: Math.round(route.duration / 60) // Convert seconds to minutes
            };
            setRouteData(newRouteData);

            // Add route line
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
                'line-color': '#3b82f6', // Blue route line
                'line-width': 4,
                'line-opacity': 0.8
              }
            });

            // Fit map to show both markers and route
            const bounds = new mapboxgl.LngLatBounds();
            bounds.extend([pickupLng, pickupLat]);
            bounds.extend([dropoffLng, dropoffLat]);
            
            map.current.fitBounds(bounds, {
              padding: 40,
              maxZoom: 15
            });
          }
        } catch (error) {
          console.error('Failed to fetch route:', error);
        }
        setIsLoading(false);
      });
    };

    if (isMapboxLoaded) {
      initializeMap();
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isMapboxLoaded, pickupAddress, dropoffAddress]); // Dependency array updated

  const displayRouteInfo = routeInfo || routeData;

  return (
    <Card className={`overflow-hidden ${className}`}>
      {MapboxGlobalStyle()}
      
      <div 
        ref={mapContainer} 
        className="w-full h-72 bg-gray-100 relative" // Increased height for better preview
      >
        {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-100/80 backdrop-blur-sm text-gray-700">
                <svg className="animate-spin h-8 w-8 text-orange-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className='text-sm font-medium'>Calculating route...</p>
                <p className='text-xs text-gray-500 mt-1'>
                    Loading map data...
                </p>
            </div>
        )}
      </div>
      
      {displayRouteInfo && (
        <div className="p-4 border-t">
          
          <div className="bg-orange-50 rounded-xl p-4 mb-4 shadow-sm">
            <div className="text-sm text-orange-600 mb-1 font-semibold">Estimated Trip Details</div>
            
            <div className='flex justify-between items-center mt-2'>
                <div className="flex items-center gap-3">
                    <Navigation className="h-6 w-6 text-orange-700" />
                    <div className='flex flex-col'>
                        <span className="font-bold text-xl text-orange-800">
                            {displayRouteInfo.miles.toFixed(1)} miles
                        </span>
                        <span className="text-xs text-gray-500">Distance</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-gray-500" />
                    <div className='flex flex-col text-right'>
                        <span className="font-bold text-xl text-gray-800">
                            {displayRouteInfo.minutes} mins
                        </span>
                        <span className="text-xs text-gray-500">Travel Time</span>
                    </div>
                </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded-full shadow-md"></div>
              <span className='font-semibold text-gray-700'>Pickup</span>
            </div>
            <div className="flex-1 mx-3 border-t-2 border-dashed border-gray-300"></div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full shadow-md"></div>
              <span className='font-semibold text-gray-700'>Dropoff</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};


// --- MAIN APPLICATION WRAPPER ---

const App = () => {
    // Mock addresses for demonstration (these will be geocoded by Mapbox)
    const mockPickup = useMemo(() => ({
        street: '151 3rd St',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94103'
    }), []);

    const mockDropoff = useMemo(() => ({
        address: '1088 Howard St, San Francisco, CA 94103'
    }), []);
    
    // Optional: Pre-calculated route info (will be overwritten by Mapbox Directions API result)
    const mockRouteInfo = {
        miles: 2.1,
        minutes: 8
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center font-sans">
            <div className="max-w-xl w-full space-y-6">
                <h1 className="text-2xl font-bold text-gray-800 text-center">Delivery Map & Route Summary</h1>

                <OrderMapPreview
                    pickupAddress={mockPickup}
                    dropoffAddress={mockDropoff}
                    // Since we're using a real token, we can omit the mockRouteInfo to ensure the
                    // component fetches and displays the live calculated route data.
                    // routeInfo={mockRouteInfo} 
                    className="w-full"
                />
                
                <Button className='w-full'>
                    Proceed to Delivery
                </Button>
            </div>
             {/* Mapbox Script Loader - MUST be included for mapboxgl object to exist */}
            <script src='https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js'></script>
        </div>
    );
};

export { OrderMapPreview };
export default App;
