import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Order {
  id: string;
  pickup_name: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_name: string;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  payout_cents: number;
  distance_km: number;
  status: 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';
  assigned_craver_id?: string | null;
}

interface MapProps {
  orders: Order[];
  activeOrder: Order | null;
  onOrderClick: (order: Order) => void;
}

const Map: React.FC<MapProps> = ({ orders, activeOrder, onOrderClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTokenInput, setShowTokenInput] = useState(true);
  const [manualToken, setManualToken] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [fetchedToken, setFetchedToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Try to fetch Mapbox token from Supabase Edge Function automatically
    const fetchToken = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('get-mapbox-token', { body: {} });
        if (error) throw error as any;
        const token = (data as any)?.token;
        if (token) {
          setFetchedToken(token);
          setShowTokenInput(false);
        } else {
          console.warn('No Mapbox token returned; falling back to manual input');
          setShowTokenInput(true);
        }
      } catch (err: any) {
        console.warn('Failed to fetch Mapbox token from Edge Function:', err?.message || err);
        setShowTokenInput(true);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  // Initialize map once container and token are ready
  useEffect(() => {
    if (mapContainer.current && fetchedToken && !initialized && !map.current) {
      initializeMap(fetchedToken);
    }
  }, [fetchedToken, initialized]);

  useEffect(() => {
    if (map.current && initialized && !loading) {
      console.log('Updating map markers with orders:', orders.length);
      updateMapMarkers();
    }
  }, [orders, activeOrder, initialized, loading]);

  const initializeMap = async (token: string) => {
    if (!mapContainer.current || !token.trim()) {
      console.log('Missing container or token');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Initializing map with manual token...');
      
      mapboxgl.accessToken = token;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-122.4194, 37.7749], // San Francisco
        zoom: 12,
        preserveDrawingBuffer: true,
        antialias: true
      });

      map.current.addControl(
        new mapboxgl.NavigationControl(),
        'top-right'
      );

      // Wait for map to load before adding features
      map.current.on('load', () => {
        console.log('Map loaded successfully');
        addOrderMarkers();
        getUserLocation();
        setLoading(false);
        setInitialized(true);
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setError('Map failed to load. Please check your Mapbox token.');
        setLoading(false);
      });

    } catch (error: any) {
      console.error('Map initialization error:', error);
      setError(error.message || 'Failed to load map');
      setLoading(false);
    }
  };

  const addOrderMarkers = () => {
    if (!map.current) return;

    // Add pending orders as individual markers
    const pendingOrders = orders.filter(order => order.status === 'pending');
    
    pendingOrders.forEach(order => {
      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'order-marker';
      markerEl.style.width = '40px';
      markerEl.style.height = '40px';
      markerEl.style.borderRadius = '50%';
      markerEl.style.cursor = 'pointer';
      markerEl.style.border = '3px solid white';
      markerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      markerEl.style.display = 'flex';
      markerEl.style.alignItems = 'center';
      markerEl.style.justifyContent = 'center';
      markerEl.style.color = 'white';
      markerEl.style.fontWeight = 'bold';
      markerEl.style.fontSize = '12px';
      
      // Color based on payout
      if (order.payout_cents >= 1000) {
        markerEl.style.backgroundColor = '#ef4444'; // High payout - red
      } else if (order.payout_cents >= 700) {
        markerEl.style.backgroundColor = '#f97316'; // Medium payout - orange
      } else {
        markerEl.style.backgroundColor = '#eab308'; // Low payout - yellow
      }
      
      markerEl.textContent = `$${(order.payout_cents / 100).toFixed(0)}`;

      // Add click handler
      markerEl.addEventListener('click', () => {
        onOrderClick(order);
      });

      new mapboxgl.Marker(markerEl)
        .setLngLat([order.pickup_lng, order.pickup_lat])
        .setPopup(
          new mapboxgl.Popup().setHTML(`
            <div class="p-3">
              <h3 class="font-semibold text-green-600">${order.pickup_name}</h3>
              <p class="text-sm">${order.pickup_address}</p>
              <p class="text-lg font-bold text-green-600">$${(order.payout_cents / 100).toFixed(2)}</p>
              <p class="text-xs text-gray-600">${order.distance_km} km</p>
              <button onclick="acceptOrder('${order.id}')" class="mt-2 px-3 py-1 bg-green-600 text-white rounded text-sm">
                Accept Order
              </button>
            </div>
          `)
        )
        .addTo(map.current);
    });
  };

  const addHeatmapLayer = () => {
    if (!map.current) return;

    // Add hotspot source for order density
    map.current.addSource('hotspots', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    // Add heatmap layer for hotspots
    map.current.addLayer({
      id: 'order-heatmap',
      type: 'heatmap',
      source: 'hotspots',
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'payout'],
          0, 0,
          1000, 1
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          15, 3
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(236,222,239,0)',
          0.2, 'rgb(208,209,230)',
          0.4, 'rgb(166,189,219)',
          0.6, 'rgb(103,169,207)',
          0.8, 'rgb(28,144,153)',
          1, 'rgb(1,108,89)'
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 2,
          15, 20
        ],
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 1,
          15, 0.8
        ]
      }
    });
  };

  const addOrderClusters = () => {
    if (!map.current) return;

    // Add order clusters source
    map.current.addSource('orders', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    // Clustered circles
    map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'orders',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6',
          10,
          '#f1f075',
          30,
          '#f28cb1'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          10,
          30,
          30,
          40
        ]
      }
    });

    // Cluster count
    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'orders',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    // Individual orders
    map.current.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'orders',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'case',
          ['>=', ['get', 'payout'], 1000], '#ff4444', // High payout - red
          ['>=', ['get', 'payout'], 700], '#ff8844', // Medium payout - orange  
          '#ffbb44' // Low payout - yellow
        ],
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'payout'],
          400, 8,
          1200, 16
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff'
      }
    });

    // Click handlers for clusters and individual orders
    map.current.on('click', 'clusters', (e) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: ['clusters']
      });
      const clusterId = features[0].properties!.cluster_id;
      const source = map.current!.getSource('orders') as mapboxgl.GeoJSONSource;
      if (source && 'getClusterExpansionZoom' in source) {
        (source as any).getClusterExpansionZoom(
          clusterId,
          (err: any, zoom: number) => {
            if (err) return;
            
            map.current!.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: zoom
            });
          }
        );
      }
    });

    map.current.on('click', 'unclustered-point', (e) => {
      const coordinates = (e.features![0].geometry as any).coordinates.slice();
      const orderId = e.features![0].properties!.id;
      const order = orders.find(o => o.id === orderId);
      
      if (order) {
        onOrderClick(order);
      }
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'clusters', () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'clusters', () => {
      map.current!.getCanvas().style.cursor = '';
    });
    map.current.on('mouseenter', 'unclustered-point', () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'unclustered-point', () => {
      map.current!.getCanvas().style.cursor = '';
    });
  };

  const updateMapMarkers = () => {
    if (!map.current) return;
    
    // Remove existing order markers
    document.querySelectorAll('.order-marker').forEach(el => el.remove());
    
    // Add new markers
    addOrderMarkers();

    // Add active order route if exists
    if (activeOrder) {
      // Add pickup marker
      const pickupEl = document.createElement('div');
      pickupEl.className = 'active-order-marker';
      pickupEl.style.width = '30px';
      pickupEl.style.height = '30px';
      pickupEl.style.borderRadius = '50%';
      pickupEl.style.backgroundColor = '#22c55e';
      pickupEl.style.border = '3px solid white';
      pickupEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      new mapboxgl.Marker(pickupEl)
        .setLngLat([activeOrder.pickup_lng, activeOrder.pickup_lat])
        .addTo(map.current);

      // Add dropoff marker
      const dropoffEl = document.createElement('div');
      dropoffEl.className = 'active-order-marker';
      dropoffEl.style.width = '30px';
      dropoffEl.style.height = '30px';
      dropoffEl.style.borderRadius = '50%';
      dropoffEl.style.backgroundColor = '#8b5cf6';
      dropoffEl.style.border = '3px solid white';
      dropoffEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      new mapboxgl.Marker(dropoffEl)
        .setLngLat([activeOrder.dropoff_lng, activeOrder.dropoff_lat])
        .addTo(map.current);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Add user location marker
          const userEl = document.createElement('div');
          userEl.style.width = '20px';
          userEl.style.height = '20px';
          userEl.style.borderRadius = '50%';
          userEl.style.backgroundColor = '#3b82f6';
          userEl.style.border = '3px solid white';
          userEl.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';

          new mapboxgl.Marker(userEl)
            .setLngLat([longitude, latitude])
            .addTo(map.current!);

          // Center map on user location
          map.current!.easeTo({
            center: [longitude, latitude],
            zoom: 13
          });
        },
        (error) => {
          console.warn('Location access denied', error);
        }
      );
    }
  };

  const handleManualToken = () => {
    if (!manualToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Mapbox token",
        variant: "destructive",
      });
      return;
    }
    
    setShowTokenInput(false);
    setFetchedToken(manualToken);
  };

  if (showTokenInput || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20 rounded-lg p-4">
        {loading && (
          <div className="flex flex-col items-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        )}
        
        {showTokenInput && (
          <div className="w-full max-w-md space-y-4">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Enter Mapbox Token</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get your free token from{' '}
                <a 
                  href="https://mapbox.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary hover:underline"
                >
                  mapbox.com
                </a>
              </p>
            </div>
            
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="pk.eyJ1Ijoi..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualToken()}
              />
              <Button onClick={handleManualToken}>
                Load Map
              </Button>
            </div>
          </div>
        )}
        
        {error && <p className="text-sm text-destructive mt-4">{error}</p>}
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-full rounded-lg" />;
};

export default Map;
