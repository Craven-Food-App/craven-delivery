// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, MapPin, DollarSign, Clock, User, Navigation, UserCheck, Plus, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  created_at: string;
  updated_at: string;
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
  assigned_feeder_id?: string | null;
}

interface Feeder {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [feeders, setFeeders] = useState<Feeder[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningOrders, setAssigningOrders] = useState<Set<string>>(new Set());
  const [showTestOrderDialog, setShowTestOrderDialog] = useState(false);
  const [creatingTestOrder, setCreatingTestOrder] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching orders:', error);
          toast({
            title: "Error",
            description: "Failed to load orders",
            variant: "destructive",
          });
          return;
        }

        setOrders((data || []) as any);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    const fetchCravers = async () => {
      try {
        const { data, error } = await supabase
          .from('feeder_applications')
          .select('id, user_id, first_name, last_name, email')
          .eq('status', 'approved');

        if (error) {
          console.error('Error fetching feeders:', error);
          return;
        }

        setCravers(data || []);
      } catch (error) {
        console.error('Error fetching feeders:', error);
      }
    };

    const loadData = async () => {
      await Promise.all([fetchOrders(), fetchCravers()]);
      setLoading(false);
    };

    loadData();

    // Set up real-time subscription for orders
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Admin order realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            setOrders(prevOrders => [newOrder, ...prevOrders]);
            
            toast({
              title: "New Order! 🆕",
              description: `Order from ${newOrder.pickup_name} - $${(newOrder.payout_cents / 100).toFixed(2)}`,
            });
          }
          
          if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            setOrders(prevOrders => 
              prevOrders.map(order => 
                order.id === updatedOrder.id ? updatedOrder : order
              )
            );
          }
          
          if (payload.eventType === 'DELETE') {
            const deletedOrder = payload.old as Order;
            setOrders(prevOrders => 
              prevOrders.filter(order => order.id !== deletedOrder.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      assigned: { variant: 'default' as const, color: 'bg-blue-100 text-blue-700', label: 'Assigned' },
      picked_up: { variant: 'default' as const, color: 'bg-orange-100 text-orange-700', label: 'Picked Up' },
      delivered: { variant: 'default' as const, color: 'bg-green-100 text-green-700', label: 'Delivered' },
      cancelled: { variant: 'destructive' as const, color: 'bg-red-100 text-red-700', label: 'Cancelled' }
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const assignOrder = async (orderId: string, feederId: string) => {
    setAssigningOrders(prev => new Set(prev).add(orderId));
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          assigned_feeder_id: feederId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error assigning order:', error);
        toast({
          title: "Error",
          description: "Failed to assign order",
          variant: "destructive",
        });
        return;
      }

      const feeder = feeders.find(c => c.user_id === feederId);
      toast({
        title: "Order Assigned! 🚗",
        description: `Order assigned to ${feeder?.first_name} ${feeder?.last_name}`,
      });
    } catch (error) {
      console.error('Error assigning order:', error);
      toast({
        title: "Error",
        description: "Failed to assign order",
        variant: "destructive",
      });
    } finally {
      setAssigningOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const createTestOrder = async () => {
    setCreatingTestOrder(true);
    
    try {
      // Get first restaurant for test order
      const { data: restaurants, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      if (restaurantError || !restaurants?.length) {
        toast({
          title: "Error",
          description: "No active restaurants found. Please add a restaurant first.",
          variant: "destructive",
        });
        return;
      }

      const restaurant = restaurants[0];
      
      // Create test order with realistic data
      const testOrder = {
        pickup_name: restaurant.name,
        pickup_address: restaurant.address,
        pickup_lat: restaurant.latitude || 40.7831,
        pickup_lng: restaurant.longitude || -73.9712,
        dropoff_name: "Test Customer",
        dropoff_address: "123 Test Street, Test City, TC 12345",
        dropoff_lat: (restaurant.latitude || 40.7831) + (Math.random() - 0.5) * 0.1,
        dropoff_lng: (restaurant.longitude || -73.9712) + (Math.random() - 0.5) * 0.1,
        payout_cents: Math.floor(Math.random() * 2000) + 500, // $5-25
        distance_km: Math.random() * 10 + 2, // 2-12 km
        status: 'pending' as const,
        restaurant_id: restaurant.id
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([testOrder])
        .select()
        .single();

      if (error) {
        console.error('Error creating test order:', error);
        toast({
          title: "Error",
          description: "Failed to create test order",
          variant: "destructive",
        });
        return;
      }

      // Trigger auto-assignment
      try {
        await supabase.functions.invoke('auto-assign-orders', {
          body: { orderId: data.id }
        });
        
        toast({
          title: "Test Order Created! 🧪",
          description: `Test order created and auto-assignment triggered. Payout: $${(testOrder.payout_cents / 100).toFixed(2)}`,
        });
      } catch (autoAssignError) {
        console.error('Auto-assignment error:', autoAssignError);
        toast({
          title: "Test Order Created! 🧪",
          description: `Test order created successfully. Payout: $${(testOrder.payout_cents / 100).toFixed(2)}`,
        });
      }

      setShowTestOrderDialog(false);
    } catch (error) {
      console.error('Error creating test order:', error);
      toast({
        title: "Error",
        description: "Failed to create test order",
        variant: "destructive",
      });
    } finally {
      setCreatingTestOrder(false);
    }
  };

  const ordersByStatus = {
    pending: orders.filter(order => order.status === 'pending'),
    assigned: orders.filter(order => order.status === 'assigned'),
    picked_up: orders.filter(order => order.status === 'picked_up'),
    delivered: orders.filter(order => order.status === 'delivered'),
    cancelled: orders.filter(order => order.status === 'cancelled')
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{ordersByStatus.pending.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assigned</p>
                <p className="text-2xl font-bold text-blue-600">{ordersByStatus.assigned.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold text-orange-600">{ordersByStatus.picked_up.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{ordersByStatus.delivered.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${(ordersByStatus.delivered.reduce((sum, order) => sum + order.payout_cents, 0) / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              All Orders ({orders.length})
            </CardTitle>
            
            <Dialog open={showTestOrderDialog} onOpenChange={setShowTestOrderDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Create Test Order
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    Create Test Order
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This will create a test order with random pickup/dropoff locations and automatically assign it to available feeders for testing purposes.
                  </p>
                  
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Test Order Features:</h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• Random pickup location from active restaurants</li>
                      <li>• Random dropoff location within delivery range</li>
                      <li>• Random payout between $5-25</li>
                      <li>• Automatic assignment to available feeders</li>
                      <li>• Full order lifecycle testing (accept → pickup → deliver)</li>
                    </ul>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={createTestOrder} 
                      disabled={creatingTestOrder}
                      className="flex-1"
                    >
                      {creatingTestOrder ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Test Order
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowTestOrderDialog(false)}
                      disabled={creatingTestOrder}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No orders found
                </p>
              ) : (
                orders.map((order, index) => (
                  <div key={order.id}>
                    <Card className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-mono text-muted-foreground">
                            #{order.id.slice(-8)}
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            ${(order.payout_cents / 100).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(order.distance_km * 0.621371).toFixed(1)} mi
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm">{order.pickup_name}</p>
                              <p className="text-xs text-muted-foreground">{formatAddress(order.pickup_address)}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm">{order.dropoff_name}</p>
                              <p className="text-xs text-muted-foreground">{formatAddress(order.dropoff_address)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {order.status === 'pending' && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-3">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            <Select onValueChange={(feederId) => assignOrder(order.id, feederId)}>
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Assign to feeder..." />
                              </SelectTrigger>
                              <SelectContent>
                                {feeders.map((feeder) => (
                                  <SelectItem key={feeder.user_id} value={feeder.user_id}>
                                    {feeder.first_name} {feeder.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {assigningOrders.has(order.id) && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                Assigning...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Created: {formatTime(order.created_at)}
                          </div>
                          {order.updated_at !== order.created_at && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Updated: {formatTime(order.updated_at)}
                            </div>
                          )}
                        </div>
                        {order.assigned_feeder_id && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Feeder: {feeders.find(c => c.user_id === order.assigned_feeder_id)?.first_name || order.assigned_feeder_id.slice(-8)}
                          </div>
                        )}
                      </div>
                    </Card>
                    {index < orders.length - 1 && <Separator className="my-4" />}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderManagement;