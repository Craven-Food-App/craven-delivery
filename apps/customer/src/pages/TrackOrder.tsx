import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Clock, Phone, CheckCircle, Truck, Utensils, Navigation } from 'lucide-react';

const TrackOrder: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  // Real-time driver location tracking
  useEffect(() => {
    if (!driver?.user_id) return;

    const channel = supabase
      .channel(`driver-location-${driver.user_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'driver_profiles',
        filter: `user_id=eq.${driver.user_id}`
      }, (payload) => {
        const newData = payload.new as any;
        if (newData.current_latitude && newData.current_longitude) {
          setDriverLocation({
            lat: newData.current_latitude,
            lng: newData.current_longitude
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver?.user_id]);

  // Send notification to driver
  const notifyDriver = async (driverId: string, orderId: string) => {
    try {
      // Create notification log for when driver checks their app
      const { error: logError } = await supabase
        .from('notification_logs')
        .insert({
          notification_type: 'order_assigned',
          title: 'New Order Assigned!',
          body: `You have been assigned to order #${orderId.slice(0, 8)}`,
          user_id: driverId,
          data: { order_id: orderId }
        } as any);

      if (logError) {
        console.error('Error logging notification:', logError);
      }

      // Update driver status to show they have a pending order
      const { error: statusError } = await supabase
        .from('driver_profiles')
        .update({ 
          status: 'busy',
          is_available: false 
        })
        .eq('user_id', driverId);

      if (statusError) {
        console.error('Error updating driver status:', statusError);
      }

      console.log('Driver notification logged - they will see it when they open the driver app');
    } catch (error) {
      console.error('Error notifying driver:', error);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapLoaded && mapRef.current) {
      initializeMap();
    }
  }, [mapLoaded]);

  // Update map when driver location changes
  useEffect(() => {
    if (mapInstance.current && driverLocation) {
      updateDriverMarker();
    }
  }, [driverLocation]);

  const initializeMap = async () => {
    try {
      // Load Mapbox GL JS
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl) {
        // Load Mapbox script if not already loaded
        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
        script.onload = () => {
          const link = document.createElement('link');
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
          link.rel = 'stylesheet';
          document.head.appendChild(link);
          createMap();
        };
        document.head.appendChild(script);
      } else {
        createMap();
      }
    } catch (error) {
      console.error('Error loading map:', error);
    }
  };

  const createMap = () => {
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;

    // Use a default location if no driver location
    const center = driverLocation || { lat: 40.7128, lng: -74.0060 }; // NYC default

    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom: 13,
      accessToken: 'pk.eyJ1IjoiY3JhdmVuLWRlbGl2ZXJ5IiwiYSI6ImNsdGJ0dGJ0dGJ0dGIifQ.example' // Replace with real token
    });

    mapInstance.current.on('load', () => {
      setMapLoaded(true);
      if (driverLocation) {
        updateDriverMarker();
      }
    });
  };

  const updateDriverMarker = () => {
    if (!mapInstance.current || !driverLocation) return;

    // Remove existing marker
    const existingMarker = document.querySelector('.driver-marker');
    if (existingMarker) {
      existingMarker.remove();
    }

    // Add new marker
    const marker = document.createElement('div');
    marker.className = 'driver-marker';
    marker.style.cssText = `
      width: 40px;
      height: 40px;
      background: #f97316;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
    `;
    marker.innerHTML = '🚚';

    new (window as any).mapboxgl.Marker(marker)
      .setLngLat([driverLocation.lng, driverLocation.lat])
      .addTo(mapInstance.current);

    // Center map on driver
    mapInstance.current.flyTo({
      center: [driverLocation.lng, driverLocation.lat],
      zoom: 15
    });
  };

  const createTestDriver = async () => {
    try {
      // First, try to find an existing online driver
      const { data: onlineDrivers, error: driversError } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('is_available', true)
        .eq('status', 'online')
        .limit(1);

      if (driversError) {
        console.error('Error fetching drivers:', driversError);
      }

      if (onlineDrivers && onlineDrivers.length > 0) {
        // Use existing online driver
        const existingDriver = onlineDrivers[0];
        
      // Assign driver to order
      const { error: updateError } = await supabase
        .from('orders')
        .update({ driver_id: existingDriver.user_id })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Send notification to driver
      await notifyDriver(existingDriver.user_id, orderId);

      setDriver(existingDriver);
      if (existingDriver.current_latitude && existingDriver.current_longitude) {
        setDriverLocation({
          lat: existingDriver.current_latitude,
          lng: existingDriver.current_longitude
        });
      }

      toast({ title: "Success", description: "Assigned existing online driver!" });
        return;
      }

      // If no online drivers, create a test one
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Error", description: "Please log in to create test driver", variant: "destructive" });
        return;
      }

      // Create test driver profile
      const { data: driverProfile, error: driverError } = await supabase
        .from('driver_profiles')
        .upsert({
          user_id: user.id,
          vehicle_type: 'car',
          license_plate: 'TEST123',
          current_latitude: 40.7128 + (Math.random() - 0.5) * 0.01,
          current_longitude: -74.0060 + (Math.random() - 0.5) * 0.01,
          is_available: true,
          status: 'online'
        })
        .select()
        .single();

      if (driverError) {
        console.error('Driver creation error:', driverError);
        throw driverError;
      }

      // Assign driver to order
      const { error: updateError } = await supabase
        .from('orders')
        .update({ driver_id: user.id })
        .eq('id', orderId);

      if (updateError) {
        console.error('Order update error:', updateError);
        throw updateError;
      }

      // Send notification to driver
      await notifyDriver(user.id, orderId);

      setDriver(driverProfile);
      setDriverLocation({
        lat: driverProfile.current_latitude,
        lng: driverProfile.current_longitude
      });

      toast({ title: "Success", description: "Test driver created and assigned!" });
    } catch (error) {
      console.error('Error creating test driver:', error);
      toast({ 
        title: "Error", 
        description: `Failed to create test driver: ${error.message || 'Unknown error'}`, 
        variant: "destructive" 
      });
    }
  };

  const fetchOrderDetails = async () => {
    try {
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          restaurants (
            id,
            name,
            address,
            phone,
            latitude,
            longitude
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);
      setRestaurant(orderData.restaurants);

      // Fetch driver if assigned
      if (orderData.driver_id) {
        const { data: driverData } = await supabase
          .from('driver_profiles')
          .select('*')
          .eq('user_id', orderData.driver_id)
          .single();
        setDriver(driverData);
        
        // Set initial driver location
        if (driverData?.current_latitude && driverData?.current_longitude) {
          setDriverLocation({
            lat: driverData.current_latitude,
            lng: driverData.current_longitude
          });
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({ title: "Error", description: "Could not load order details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'preparing': return 'text-orange-600 bg-orange-100';
      case 'ready': return 'text-purple-600 bg-purple-100';
      case 'picked_up': return 'text-indigo-600 bg-indigo-100';
      case 'in_transit': return 'text-cyan-600 bg-cyan-100';
      case 'delivered': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Order received';
      case 'confirmed': return 'Restaurant confirmed';
      case 'preparing': return 'Preparing your order';
      case 'ready': return 'Ready for pickup';
      case 'picked_up': return 'Driver picked up';
      case 'in_transit': return 'On the way';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order not found</h1>
          <p className="text-gray-600 mb-6">The order you're looking for doesn't exist.</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
              <p className="text-gray-600">Order #{order.order_number || order.id.slice(0, 8)}</p>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.order_status)}`}>
              {getStatusText(order.order_status)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Restaurant Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Utensils className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{restaurant?.name}</h3>
                  <p className="text-sm text-gray-600">{restaurant?.address}</p>
                  <p className="text-sm text-gray-600">{restaurant?.phone}</p>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Delivery Address</h3>
                  <p className="text-sm text-gray-600">
                    {order.delivery_address?.name}<br />
                    {order.delivery_address?.address}
                  </p>
                  {order.delivery_address?.special_instructions && (
                    <p className="text-sm text-gray-500 mt-1">
                      Note: {order.delivery_address.special_instructions}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Driver Info (if assigned) */}
            {driver && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Your Driver</h3>
                    <p className="text-sm text-gray-600">Test Driver</p>
                    <p className="text-sm text-gray-600">Vehicle: {driver.vehicle_type} • {driver.license_plate}</p>
                    {driverLocation && (
                      <p className="text-xs text-green-600 mt-1">📍 Live location tracking active</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-orange-600 mb-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Assigned</span>
                    </div>
                    <p className="text-xs text-gray-500">Driver will see notification in app</p>
                  </div>
                </div>
              </div>
            )}

            {/* Live Map */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Live Tracking</h3>
                <div className="flex items-center gap-3">
                  {driverLocation && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Driver location updating</span>
                    </div>
                  )}
                  {!driver && (
                    <button
                      onClick={createTestDriver}
                      className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-md"
                    >
                      Assign Driver
                    </button>
                  )}
                </div>
              </div>
              
              <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
                <div ref={mapRef} className="w-full h-full" />
                {!mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading map...</p>
                    </div>
                  </div>
                )}
              </div>
              
              {driverLocation && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <Navigation className="w-4 h-4" />
                    <span>Driver location: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}</span>
                  </div>
                </div>
              )}
              
              {!driver && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Clock className="w-4 h-4" />
                    <span>No driver assigned. Click "Assign Driver" to find an available driver!</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${(order.subtotal_cents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery fee</span>
                  <span>${(order.delivery_fee_cents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>${(order.tax_cents / 100).toFixed(2)}</span>
                </div>
                {order.tip_cents > 0 && (
                  <div className="flex justify-between">
                    <span>Tip</span>
                    <span>${(order.tip_cents / 100).toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-3 mt-4">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${(order.total_cents / 100).toFixed(2)}</span>
                </div>
              </div>

              {order.estimated_delivery_time && (
                <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-orange-700">
                    <Clock className="w-4 h-4" />
                    <span>Estimated delivery: {new Date(order.estimated_delivery_time).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;