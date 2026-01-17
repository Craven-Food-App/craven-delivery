import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

const OrdersDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all-fulfillment");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!restaurant) return;

      let query = supabase
        .from('orders')
        .select(`
          *,
          restaurants!inner(name),
          driver_profiles(vehicle_type)
        `)
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      preparing: "outline",
      ready: "default",
      completed: "outline",
      cancelled: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter !== "all-status" && order.status !== statusFilter) return false;
    return true;
  });

  const activeOrders = filteredOrders.filter(o => !['completed', 'cancelled'].includes(o.status));
  const completedOrders = filteredOrders.filter(o => ['completed', 'cancelled'].includes(o.status));

  const renderOrderCard = (order: any) => (
    <Card key={order.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-bold text-lg">{order.order_number || order.id.slice(-8)}</span>
              {getStatusBadge(order.status)}
              {order.pickup_code && (
                <Badge variant="outline" className="bg-orange-50 text-orange-900 border-orange-300 font-mono">
                  Code: {order.pickup_code}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              ${((order.total_cents || 0) / 100).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/order/${order.id}`)}>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmptyState = (message: string) => (
    <div className="border rounded-lg bg-card">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-40 h-40 mb-6">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="50" y="140" width="20" height="20" rx="10" fill="#1F2937"/>
            <rect x="130" y="140" width="20" height="20" rx="10" fill="#1F2937"/>
            <path d="M60 60L70 140H130L140 60H60Z" fill="#EF4444"/>
            <path d="M60 60L50 50L60 40L140 40L150 50L140 60H60Z" fill="#1F2937"/>
            <rect x="75" y="75" width="50" height="40" rx="4" fill="#BFDBFE"/>
            <ellipse cx="95" cy="90" rx="8" ry="6" fill="#F97316"/>
            <rect x="100" y="85" width="4" height="20" fill="#10B981"/>
            <path d="M102 85L110 75L115 80" stroke="#3B82F6" strokeWidth="2"/>
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">{message}</h3>
        <p className="text-sm text-muted-foreground">
          Orders will appear here as they come in
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Orders</h1>
              <p className="text-sm text-muted-foreground">
                Track all your orders from every channel in real-time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
                <button 
                  className="p-1 hover:bg-muted rounded"
                  onClick={fetchOrders}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => navigate('/restaurant/request-delivery')}
              >
                Request a delivery
              </Button>
            </div>
          </div>

          <Tabs defaultValue="active" className="w-full">
            <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0">
              <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent">
                Active ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent">
                History ({completedOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6">
              <div className="flex items-center gap-4 mb-6">
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All channels</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                    <SelectItem value="phone">Phone orders</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Order status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-status">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="preparing">Preparing</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                  </SelectContent>
                </Select>

                <button className="ml-auto p-2 hover:bg-muted rounded-lg">
                  <Search className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : activeOrders.length === 0 ? (
                renderEmptyState("No active orders")
              ) : (
                <div className="space-y-3">
                  {activeOrders.map(renderOrderCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <div className="flex items-center gap-4 mb-6">
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All channels</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                    <SelectItem value="phone">Phone orders</SelectItem>
                  </SelectContent>
                </Select>

                <button className="ml-auto p-2 hover:bg-muted rounded-lg">
                  <Search className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : completedOrders.length === 0 ? (
                renderEmptyState("No order history")
              ) : (
                <div className="space-y-3">
                  {completedOrders.map(renderOrderCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default OrdersDashboard;