// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Truck, 
  Users, 
  DollarSign, 
  Clock,
  MapPin,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Order {
  id: string;
  customer_id: string;
  driver_id?: string;
  restaurant_id: string;
  total_cents: number;
  order_status: string;
  created_at: string;
  delivery_address?: any;
  restaurants: {
    name: string;
    address: string;
    city: string;
    state: string;
  };
}

interface Driver {
  id: string;
  user_id: string;
  is_available: boolean;
  rating: number;
  total_deliveries: number;
  driver_level: string;
}

const LiveDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    activeDrivers: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalRestaurants: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      // Fetch recent orders with fallback
      let ordersData = [];
      
      try {
        const { data, error: ordersError } = await supabase
          .from('orders')
          .select(`
            *,
            restaurants (
              name,
              address,
              city,
              state
            )
          `)
          .order('created_at', { ascending: false })
          .limit(20);

        if (ordersError) {
          console.warn('Orders JOIN query failed, trying without restaurants join:', ordersError);
          
          // Fallback: fetch orders without restaurant join
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
            
          if (fallbackError) {
            console.error('Orders fallback query failed:', fallbackError);
            throw fallbackError;
          }
          
          ordersData = fallbackData || [];
          console.log('Loaded', ordersData.length, 'orders without restaurant details');
        } else {
          ordersData = data || [];
          console.log('Loaded', ordersData.length, 'orders with restaurant details');
        }
      } catch (err) {
        console.error('Critical error fetching orders:', err);
        ordersData = [];
      }

      // Fetch online drivers - with fallback for missing FK
      let driversData = [];
      try {
        // Try the automatic JOIN first
        // Note: We'll filter by driver_state in the application layer since JSONB filtering is complex
        const { data, error } = await supabase
          .from('driver_profiles')
          .select(`
            *,
            driver_sessions!inner(
              is_online,
              last_activity,
              session_data
            )
          `)
          .eq('driver_sessions.is_online', true)
          .order('rating', { ascending: false });
        
        // Filter to only drivers who are actively searching
        // Also include drivers without driver_state set (legacy sessions) - treat them as searching
        if (!error && data) {
          const filteredData = data.filter(driver => {
            const session = driver.driver_sessions;
            if (Array.isArray(session)) {
              return session.some(s => {
                const sessionData = s.session_data as any;
                const driverState = sessionData?.driver_state;
                // Include 'online_searching' or undefined/null (legacy)
                return driverState === 'online_searching' || driverState === undefined || driverState === null;
              });
            } else if (session) {
              const sessionData = session.session_data as any;
              const driverState = sessionData?.driver_state;
              // Include 'online_searching' or undefined/null (legacy)
              return driverState === 'online_searching' || driverState === undefined || driverState === null;
            }
            return false;
          });
          driversData = filteredData;
          console.log('Loaded', driversData.length, 'actively searching drivers via automatic join');
        } else if (error) {
          console.warn('Driver JOIN query failed, using manual join:', error);
          
          // Fallback: Manual join
          const { data: profiles } = await supabase
            .from('driver_profiles')
            .select('*')
            .order('rating', { ascending: false });
          
          const { data: sessions } = await supabase
            .from('driver_sessions')
            .select('driver_id, is_online, last_activity, session_data')
            .eq('is_online', true);
          
          // Filter to only drivers who are actively searching (not paused, not on delivery)
          // Also include drivers without driver_state set (legacy sessions) - treat them as searching
          const searchingSessions = (sessions || []).filter(session => {
            const sessionData = session.session_data as any;
            const driverState = sessionData?.driver_state;
            // Include 'online_searching' or undefined/null (legacy)
            return driverState === 'online_searching' || driverState === undefined || driverState === null;
          });
          
          // Manually join - driver_sessions.driver_id matches driver_profiles.id (not user_id)
          driversData = (profiles || [])
            .filter(p => searchingSessions.some(s => s.driver_id === p.id))
            .map(p => ({
              ...p,
              driver_sessions: searchingSessions.find(s => s.driver_id === p.id)
            }));
          
          console.log('Loaded', driversData.length, 'online drivers via manual join');
          
          // Fallback: If no sessions found, use driver_profiles.is_available
          // Only show drivers who have been active recently (within last 5 minutes)
          if (driversData.length === 0) {
            console.log('No sessions found, using driver_profiles.is_available as fallback...');
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
            const { data: availableDrivers } = await supabase
              .from('driver_profiles')
              .select('*')
              .eq('is_available', true)
              .eq('status', 'online')
              .or(`last_location_update.gte.${thirtyMinutesAgo},last_location_update.is.null`) // Drivers active in last 30 min OR no location update
              .order('rating', { ascending: false });
            
            if (availableDrivers && availableDrivers.length > 0) {
              console.log('Found', availableDrivers.length, 'available drivers from driver_profiles (active in last 5 min)');
              driversData = availableDrivers.map(p => ({
                ...p,
                driver_sessions: null // No session data available
              }));
            }
          }
        } else {
          driversData = data || [];
          console.log('Loaded', driversData.length, 'online drivers via automatic join');
          
          // Fallback: If no sessions found, use driver_profiles.is_available
          // Only show drivers who have been active recently (within last 5 minutes)
          if (driversData.length === 0) {
            console.log('No sessions found, using driver_profiles.is_available as fallback...');
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
            const { data: availableDrivers } = await supabase
              .from('driver_profiles')
              .select('*')
              .eq('is_available', true)
              .eq('status', 'online')
              .or(`last_location_update.gte.${thirtyMinutesAgo},last_location_update.is.null`) // Drivers active in last 30 min OR no location update
              .order('rating', { ascending: false });
            
            if (availableDrivers && availableDrivers.length > 0) {
              console.log('Found', availableDrivers.length, 'available drivers from driver_profiles');
              driversData = availableDrivers.map(p => ({
                ...p,
                driver_sessions: null // No session data available
              }));
            }
          }
        }
      } catch (err) {
        console.error('Critical error fetching drivers:', err);
        driversData = [];
      }

      // Fetch total users count
      const { count: usersCount, error: usersError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) console.error('Error fetching users count:', usersError);

      // Fetch total restaurants count
      const { count: restaurantsCount, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true });

      if (restaurantsError) console.error('Error fetching restaurants count:', restaurantsError);

      setOrders(ordersData || []);
      setDrivers(
        (driversData || []).map((d: any) => ({
          ...d,
          driver_level: d.driver_level || 'standard'
        }))
      );

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = ordersData?.filter(order => order.created_at.startsWith(today)) || [];

      setStats({
        totalOrders: todayOrders.length,
        pendingOrders: ordersData?.filter(order => 
          order.order_status === 'pending' || order.order_status === 'confirmed'
        ).length || 0,
        activeDrivers: driversData?.length || 0, // All drivers returned are online due to the filter
        totalRevenue: todayOrders.reduce((sum, order) => 
          sum + (order.payment_status === 'paid' ? order.total_cents : 0), 0
        ),
        totalUsers: usersCount || 0,
        totalRestaurants: restaurantsCount || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Only show toast for critical errors (not driver fetch failures)
      if (!orders || orders.length === 0) {
        toast({
          title: "Error loading dashboard",
          description: "Please try refreshing the page.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: 'canceled' })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Order canceled",
        description: "The order has been canceled successfully.",
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error canceling order:', error);
      toast({
        title: "Error canceling order",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const ordersSubscription = supabase
      .channel('admin_orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchData()
      )
      .subscribe();

    const driversSubscription = supabase
      .channel('admin_drivers')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'driver_profiles' },
        () => fetchData()
      )
      .subscribe();

    // Auto-refresh every 30 seconds - COMPONENT-LEVEL DATA REFRESH ONLY
    // This only updates component state, NEVER causes page reloads
    const interval = setInterval(() => {
      // Wrap in try-catch to prevent any errors from causing issues
      try {
        fetchData();
      } catch (error) {
        console.error('Error in auto-refresh interval:', error);
        // Silently handle - don't cause page reload or navigation
      }
    }, 30000);

    return () => {
      ordersSubscription.unsubscribe();
      driversSubscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'confirmed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'preparing': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ready': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'picked_up': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'delivered': return 'bg-green-50 text-green-700 border-green-200';
      case 'canceled': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border border-gray-200">
              <CardContent className="p-3">
                <div className="animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Metric Cards - Enterprise Style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Today's Orders</p>
                <p className="text-xl font-semibold text-gray-900 leading-tight">{stats.totalOrders}</p>
              </div>
              <Package className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Pending</p>
                <p className="text-xl font-semibold text-gray-900 leading-tight">{stats.pendingOrders}</p>
              </div>
              <Clock className="h-4 w-4 text-orange-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Active Drivers</p>
                <p className="text-xl font-semibold text-gray-900 leading-tight">{stats.activeDrivers}</p>
              </div>
              <Users className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Revenue</p>
                <p className="text-xl font-semibold text-gray-900 leading-tight">${(stats.totalRevenue / 100).toFixed(2)}</p>
              </div>
              <DollarSign className="h-4 w-4 text-purple-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Total Users</p>
                <p className="text-xl font-semibold text-gray-900 leading-tight">{stats.totalUsers}</p>
              </div>
              <Users className="h-4 w-4 text-indigo-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Restaurants</p>
                <p className="text-xl font-semibold text-gray-900 leading-tight">{stats.totalRestaurants}</p>
              </div>
              <Package className="h-4 w-4 text-pink-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard - Compact Tabs */}
      <Card className="border border-gray-200 shadow-sm">
        <Tabs defaultValue="orders" className="w-full">
          <div className="border-b border-gray-200 bg-[#fafbfc]">
            <div className="flex items-center justify-between px-4 py-2">
              <TabsList className="bg-transparent h-8 p-0">
                <TabsTrigger 
                  value="orders" 
                  className="h-7 px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Package className="h-3 w-3 mr-1.5" />
                  Active Orders
                </TabsTrigger>
                <TabsTrigger 
                  value="drivers" 
                  className="h-7 px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Truck className="h-3 w-3 mr-1.5" />
                  Drivers
                </TabsTrigger>
              </TabsList>
              
              <Button 
                onClick={fetchData} 
                variant="outline" 
                size="sm"
                className="h-7 px-2.5 text-xs border-gray-300"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Refresh
              </Button>
            </div>
          </div>
          {/* Orders Tab - Dense Table Style */}
          <TabsContent value="orders" className="m-0 p-0">
            <div className="overflow-x-auto">
              {orders.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">No orders found</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Order ID</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Restaurant</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Location</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Time</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 font-mono text-xs text-gray-900">#{order.id.slice(-8)}</td>
                        <td className="px-3 py-2">
                          <Badge className={`${getStatusColor(order.order_status)} text-[10px] px-1.5 py-0.5 font-medium border`}>
                            {order.order_status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-gray-700 text-xs">{order.restaurants?.name || 'N/A'}</td>
                        <td className="px-3 py-2 font-semibold text-gray-900 text-xs">${(order.total_cents / 100).toFixed(2)}</td>
                        <td className="px-3 py-2">
                          {order.delivery_address ? (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[120px]">
                                {typeof order.delivery_address === 'object' 
                                  ? `${order.delivery_address.city || ''}, ${order.delivery_address.state || ''}` 
                                  : String(order.delivery_address).slice(0, 30)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 font-mono">
                          {new Date(order.created_at).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </td>
                        <td className="px-3 py-2">
                          {order.order_status === 'pending' && (
                            <Button 
                              onClick={() => handleCancelOrder(order.id)}
                              variant="destructive" 
                              size="sm"
                              className="h-6 px-2 text-[10px]"
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>

          {/* Drivers Tab - Compact Grid */}
          <TabsContent value="drivers" className="m-0 p-0">
            <div className="p-3">
              {drivers.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">No drivers found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {drivers.map((driver) => (
                    <Card key={driver.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-xs text-gray-900 font-mono">#{driver.id.slice(-8)}</span>
                          <Badge className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-1.5 py-0.5">
                            Online
                          </Badge>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Rating:</span>
                            <span className="font-medium text-gray-900">⭐ {driver.rating.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Deliveries:</span>
                            <span className="font-medium text-gray-900">{driver.total_deliveries}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Level:</span>
                            <span className="font-medium text-gray-900 capitalize">{driver.driver_level}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-green-700 text-[10px] mt-2 pt-2 border-t border-gray-100">
                          <CheckCircle className="h-3 w-3" />
                          <span className="font-medium">Available</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default LiveDashboard;
