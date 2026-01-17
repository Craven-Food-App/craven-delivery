import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, MapPin, Navigation, Clock, Phone, MessageCircle, Truck, User, Star, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DriverTrackingModalProps {
  orderId: string;
  driverId?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DriverLocation {
  lat: number;
  lng: number;
  updated_at: string;
}

interface DriverInfo {
  id: string;
  name: string;
  phone?: string;
  vehicle_type?: string;
  rating?: number;
  current_location?: DriverLocation;
}

const DriverTrackingModal: React.FC<DriverTrackingModalProps> = ({ 
  orderId, 
  driverId, 
  isOpen, 
  onClose 
}) => {
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [driverMarker, setDriverMarker] = useState<any>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && driverId) {
      fetchDriverInfo();
      initializeMap();
    }
  }, [isOpen, driverId]);

  useEffect(() => {
    if (isOpen && driverId) {
      // Set up real-time subscription for driver location updates
      const channel = supabase
        .channel(`driver_location_${driverId}`)
        .on(
          'postgres_changes' as any,
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'craver_locations' as any,
            filter: `craver_id=eq.${driverId}`
          } as any,
          (payload: any) => {
            console.log('Driver location updated:', payload);
            if (payload.new) {
              const locationData = {
                lat: payload.new.latitude,
                lng: payload.new.longitude,
                updated_at: payload.new.updated_at
              };
              updateDriverLocation(locationData);
            }
          }
        )
        .subscribe();

      // Auto-refresh every 10 seconds
      const interval = setInterval(() => {
        if (!refreshing) {
          fetchDriverLocation();
        }
      }, 10000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [isOpen, driverId]);

  const fetchDriverInfo = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('driver_profiles' as any)
        .select(`
          id,
          user_id,
          phone_number,
          vehicle_type,
          rating
        `)
        .eq('user_id', driverId)
        .single();

      if (error) {
        console.error('Error fetching driver info:', error);
        toast({
          title: "Error loading driver info",
          description: "Could not load driver information",
          variant: "destructive"
        });
        return;
      }

      setDriver({
        id: (data as any)?.user_id || driverId || '',
        name: 'Driver',
        phone: (data as any)?.phone_number,
        vehicle_type: (data as any)?.vehicle_type,
        rating: (data as any)?.rating
      } as any);
      await fetchDriverLocation();
    } catch (error) {
      console.error('Error fetching driver info:', error);
      toast({
        title: "Error",
        description: "Failed to load driver information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverLocation = async () => {
    try {
      setRefreshing(true);
      
      const { data, error } = await supabase
        .from('craver_locations' as any)
        .select('latitude, longitude, updated_at')
        .eq('craver_id', driverId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching driver location:', error);
        return;
      }

      if (data && driver) {
        const locationData = {
          lat: (data as any).latitude,
          lng: (data as any).longitude,
          updated_at: (data as any).updated_at
        };
        const updatedDriver = {
          ...driver,
          current_location: locationData
        };
        setDriver(updatedDriver);
        updateDriverLocation(locationData);
      }
    } catch (error) {
      console.error('Error fetching driver location:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const initializeMap = async () => {
    if (!mapContainer.current) return;

    try {
      // Dynamically import Mapbox GL JS
      const mapboxgl = await import('mapbox-gl');
      
      // Get Mapbox token from edge function
      const { data: tokenData } = await supabase.functions.invoke('get-mapbox-token');
      const token = tokenData?.token || 'pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWVxb21qbTQyNTRnMm1vaHg5bDZwcmw2In0.aOsYrL2B0cjfcCGW1jHAdw';
      
      (mapboxgl as any).accessToken = token;

      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-83.5552, 41.6639], // Default to Toledo, OH
        zoom: 13
      });

      setMap(mapInstance);

      // Add navigation controls
      mapInstance.addControl(new mapboxgl.NavigationControl());
      mapInstance.addControl(new mapboxgl.FullscreenControl());

      // Wait for map to load
      mapInstance.on('load', () => {
        if (driver?.current_location) {
          updateDriverLocation(driver.current_location);
        }
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        title: "Map Error",
        description: "Could not load the map. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updateDriverLocation = (location: DriverLocation) => {
    if (!map) return;

    // Remove existing marker
    if (driverMarker) {
      driverMarker.remove();
    }

    // Create new marker
    const mapboxgl = require('mapbox-gl');
    const marker = new mapboxgl.Marker({
      color: '#3b82f6',
      scale: 1.2
    })
      .setLngLat([location.lng, location.lat])
      .addTo(map);

    setDriverMarker(marker);

    // Center map on driver location
    map.flyTo({
      center: [location.lng, location.lat],
      zoom: 15,
      duration: 1000
    });
  };

  const formatLastUpdate = (updatedAt: string) => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffMinutes = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        <Card className="shadow-2xl border-0 bg-white">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Navigation className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Track Your Driver</h2>
                  <p className="text-blue-100 text-sm">Real-time location updates</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchDriverLocation}
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <div>
                    <h3 className="font-semibold text-lg">Loading Driver Information</h3>
                    <p className="text-sm text-muted-foreground">Please wait while we fetch your driver's details...</p>
                  </div>
                </div>
              </div>
            ) : driver ? (
              <div className="space-y-6">
                {/* Driver Info Header */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {driver.name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-gray-900">{driver.name || 'Driver'}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium">{driver.rating || '4.8'}</span>
                          </div>
                          <span className="text-sm text-gray-600">•</span>
                          <span className="text-sm text-gray-600">{driver.vehicle_type || 'Car'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {driver.phone && (
                        <Button variant="outline" size="sm" className="text-blue-600 border-blue-300">
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="text-blue-600 border-blue-300">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Map Container */}
                <div className="bg-gray-50 rounded-xl p-6 border">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Driver Location
                    </h4>
                    {driver.current_location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>Updated {formatLastUpdate(driver.current_location.updated_at)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div 
                    ref={mapContainer}
                    className="w-full h-96 rounded-lg border border-gray-200"
                    style={{ minHeight: '384px' }}
                  />
                  
                  {!driver.current_location && (
                    <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                      <div className="text-center">
                        <Truck className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Driver location not available</p>
                        <p className="text-sm text-gray-500">Location will appear when driver starts delivery</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Truck className="h-6 w-6 text-green-600" />
                    </div>
                    <h5 className="font-semibold text-sm">Status</h5>
                    <p className="text-xs text-gray-600">On the way</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <h5 className="font-semibold text-sm">ETA</h5>
                    <p className="text-xs text-gray-600">8-12 minutes</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <User className="h-6 w-6 text-orange-600" />
                    </div>
                    <h5 className="font-semibold text-sm">Driver</h5>
                    <p className="text-xs text-gray-600">{driver.name || 'Assigned'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Driver Not Found</h3>
                <p className="text-gray-600">We couldn't find the driver information for this order.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DriverTrackingModal;
