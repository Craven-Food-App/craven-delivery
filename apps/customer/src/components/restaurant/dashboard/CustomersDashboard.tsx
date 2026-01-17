import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import CustomerInsightsDashboard from "./customers/CustomerInsightsDashboard";
import RatingsReviewsDashboard from "./customers/RatingsReviewsDashboard";

const CustomersDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    repeatRate: 0,
    avgOrderValue: 0,
    avgRating: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const userResult = await supabase.auth.getUser();
      if (!userResult.data?.user) return;

      const restaurantResult = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', userResult.data.user.id)
        .single();

      if (!restaurantResult.data) return;

      // Get unique customers  
      const query: any = supabase.from('orders');
      const ordersResult = await query
        .select('customer_id, total_cents')
        .eq('restaurant_id', restaurantResult.data.id)
        .eq('status', 'completed');
      
      const orders = ordersResult.data || [];
      
      if (orders.length > 0) {
        const uniqueCustomers = new Set(orders.map((o: any) => o.customer_id)).size;
        const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total_cents || 0), 0);
        const avgOrder = orders.length > 0 ? totalRevenue / orders.length : 0;

        // Calculate repeat rate
        const customerOrderCounts = orders.reduce((acc: Record<string, number>, o: any) => {
          acc[o.customer_id] = (acc[o.customer_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const repeatCustomers = Object.values(customerOrderCounts).filter((count: number) => count > 1).length;
        const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

        setStats({
          totalCustomers: uniqueCustomers,
          repeatRate: Math.round(repeatRate),
          avgOrderValue: avgOrder,
          avgRating: 4.5
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({ title: "Error", description: "Failed to load customer data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold mb-4">Customers</h1>

          {/* Stats Overview */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Repeat Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.repeatRate}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(stats.avgOrderValue / 100).toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <Tabs defaultValue="insights" className="w-full">
            <TabsList className="bg-muted">
              <TabsTrigger value="insights">Customer Insights</TabsTrigger>
              <TabsTrigger value="ratings">Ratings & Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="insights" className="mt-6">
              <CustomerInsightsDashboard />
            </TabsContent>

            <TabsContent value="ratings" className="mt-6">
              <RatingsReviewsDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CustomersDashboard;