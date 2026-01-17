import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, MapPin, Truck, CheckCircle, Phone, MessageCircle, Package, ChefHat, AlertCircle, X, Minimize2, RefreshCw, User, Navigation, Timer, Star, Shield, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DriverTrackingModal from "./DriverTrackingModal";

interface OrderTrackingBoxProps {
  orderId: string;
  onClose: () => void;
}

interface OrderDetails {
  id: string;
  order_status: string;
  total_cents: number;
  estimated_delivery_time: string;
  created_at: string;
  delivery_address?: any;
  driver_id?: string;
  restaurants?: {
    name: string;
    phone?: string;
    address: string;
    image_url?: string;
  };
}

const OrderTrackingBox: React.FC<OrderTrackingBoxProps> = ({ orderId, onClose }) => {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showDriverTracking, setShowDriverTracking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      
      // Set up real-time subscription
      const channel = supabase
        .channel(`order_${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`
          },
          () => {
            fetchOrderDetails();
          }
        )
        .subscribe();

      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        if (!refreshing) {
          fetchOrderDetails(true);
        }
      }, 30000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [orderId]);

  const fetchOrderDetails = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('Fetching order details for ID:', orderId);
      
      // First, let's try a simple query to see if the order exists
      const { data: simpleData, error: simpleError } = await supabase
        .from('orders')
        .select('id, order_status, total_cents')
        .eq('id', orderId)
        .single();
        
      console.log('Simple query result:', { simpleData, simpleError });
      
      if (simpleError) {
        console.error('Simple query failed:', simpleError);
        toast({
          title: "Error loading order",
          description: `Order not found or access denied: ${simpleError.message}`,
          variant: "destructive"
        });
        return;
      }
      
      // If simple query works, try the full query
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_status,
          total_cents,
          estimated_delivery_time,
          created_at,
          delivery_address,
          driver_id,
          restaurants (
            name,
            phone,
            address,
            image_url
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Error fetching order details:', error);
        console.error('Order ID:', orderId);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        toast({
          title: "Error loading order",
          description: `Failed to load order details: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      
      console.log('Order data fetched:', data);
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({
        title: "Error loading order",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending: { label: 'Order Placed', color: 'secondary', icon: Clock },
      confirmed: { label: 'Confirmed', color: 'secondary', icon: CheckCircle },
      preparing: { label: 'Being Prepared', color: 'secondary', icon: Clock },
      ready: { label: 'Ready for Pickup', color: 'secondary', icon: CheckCircle },
      picked_up: { label: 'Out for Delivery', color: 'default', icon: Truck },
      delivered: { label: 'Delivered', color: 'secondary', icon: CheckCircle },
      canceled: { label: 'Canceled', color: 'destructive', icon: Clock }
    };

    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  const getProgressSteps = (currentStatus: string) => {
    const steps = [
      { key: 'pending', label: 'Order Placed', icon: Package },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
      { key: 'preparing', label: 'Preparing', icon: ChefHat },
      { key: 'ready', label: 'Ready', icon: CheckCircle },
      { key: 'picked_up', label: 'Out for Delivery', icon: Truck },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle }
    ];

    const currentIndex = steps.findIndex(step => step.key === currentStatus);
    
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex
    }));
  };

  const getProgressPercentage = (currentStatus: string) => {
    const steps = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered'];
    const currentIndex = steps.findIndex(step => step === currentStatus);
    return currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <Card className="shadow-2xl border-0 bg-white">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Order Tracking</h2>
                  <p className="text-orange-100 text-sm">Real-time updates</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchOrderDetails(true)}
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                  <div>
                    <h3 className="font-semibold text-lg">Loading Order Details</h3>
                    <p className="text-sm text-muted-foreground">Please wait while we fetch your order information...</p>
                  </div>
                </div>
              </div>
            ) : order ? (
              <div className="space-y-6">
                {/* Order Info Header */}
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    {order.restaurants?.image_url && (
                      <img 
                        src={order.restaurants.image_url} 
                        alt={order.restaurants.name}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-orange-100"
                      />
                    )}
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">{order.restaurants?.name}</h3>
                      <p className="text-sm text-gray-600">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2">
                    <Badge 
                      variant={getStatusInfo(order.order_status).color as any} 
                      className="text-sm px-4 py-2 font-semibold"
                    >
                      {getStatusInfo(order.order_status).label}
                    </Badge>
                    {order.order_status === 'canceled' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>

                {/* Progress Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg">Order Progress</h4>
                    <span className="text-sm font-medium text-gray-600">
                      {Math.round(getProgressPercentage(order.order_status))}% Complete
                    </span>
                  </div>
                  
                  <Progress 
                    value={getProgressPercentage(order.order_status)} 
                    className="h-3 mb-6" 
                  />

                  {/* Progress Steps */}
                  <div className="space-y-4">
                    {getProgressSteps(order.order_status).map((step, index) => {
                      const Icon = step.icon;
                      return (
                        <div key={step.key} className="flex items-center space-x-4">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                            step.completed 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : step.current 
                                ? 'border-orange-500 text-orange-500 bg-orange-50' 
                                : 'border-gray-300 text-gray-400'
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${
                                step.completed 
                                  ? 'text-green-700' 
                                  : step.current 
                                    ? 'text-orange-600' 
                                    : 'text-gray-500'
                              }`}>
                                {step.label}
                              </span>
                              {step.completed && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            {step.current && (
                              <p className="text-sm text-orange-600 mt-1">Currently in progress</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Driver Info (if assigned) */}
                {order.driver_id && (order.order_status === 'picked_up' || order.order_status === 'in_transit') && (
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">Your Driver</h4>
                        <p className="text-sm text-gray-600">Meet your delivery partner</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          D
                        </div>
                        <div>
                          <p className="font-semibold">Driver Assigned</p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium">4.8</span>
                            </div>
                            <span className="text-sm text-gray-600">•</span>
                            <span className="text-sm text-gray-600">Car</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-blue-600 border-blue-300">
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                        <Button variant="outline" size="sm" className="text-blue-600 border-blue-300">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Order Summary */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Order Summary
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total</span>
                        <span className="font-semibold text-lg">${(order.total_cents / 100).toFixed(2)}</span>
                      </div>
                      
                      {order.estimated_delivery_time && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Est. Delivery</span>
                          <span className="font-medium">
                            {new Date(order.estimated_delivery_time).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-gray-600">Order Time</span>
                        <span className="font-medium">
                          {new Date(order.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Delivery Info
                    </h4>
                    <div className="space-y-3">
                      {order.delivery_address && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Delivery Address</p>
                          <p className="font-medium text-sm">
                            {typeof order.delivery_address === 'string' 
                              ? order.delivery_address 
                              : `${order.delivery_address.street}, ${order.delivery_address.city}`
                            }
                          </p>
                        </div>
                      )}
                      
                      {order.restaurants?.address && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Restaurant</p>
                          <p className="font-medium text-sm">{order.restaurants.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {order.restaurants?.phone && (
                    <Button variant="outline" className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Restaurant
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Get Support
                  </Button>
                  {order.driver_id && (
                    <Button 
                      variant="outline" 
                      className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50"
                      onClick={() => setShowDriverTracking(true)}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Track Driver
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Order Not Found</h3>
                <p className="text-gray-600">We couldn't find the order you're looking for.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Driver Tracking Modal */}
      <DriverTrackingModal
        orderId={orderId}
        driverId={order?.driver_id}
        isOpen={showDriverTracking}
        onClose={() => setShowDriverTracking(false)}
      />
    </div>
  );
};

export default OrderTrackingBox;