import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, ShoppingBag, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import SalesDashboard from "./insights/SalesDashboard";
import ProductMixDashboard from "./insights/ProductMixDashboard";
import OperationsQualityDashboard from "./insights/OperationsQualityDashboard";
import MostLovedDashboard from "./insights/MostLovedDashboard";

const InsightsDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("last-7-days");
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0
  });

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const userResult = await supabase.auth.getUser();
      if (!userResult.data?.user) return;

      const restaurantResult = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', userResult.data.user.id)
        .single();

      if (!restaurantResult.data) return;

      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case "last-7-days": startDate.setDate(startDate.getDate() - 7); break;
        case "last-30-days": startDate.setDate(startDate.getDate() - 30); break;
        case "last-90-days": startDate.setDate(startDate.getDate() - 90); break;
      }

      const query: any = supabase.from('orders');
      const ordersResult = await query
        .select('total_cents')
        .eq('restaurant_id', restaurantResult.data.id)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      const orders = ordersResult.data || [];
      
      if (orders.length > 0) {
        const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total_cents || 0), 0);
        const avgOrder = totalRevenue / orders.length;

        setMetrics({
          totalOrders: orders.length,
          totalRevenue,
          avgOrderValue: avgOrder
        });
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({ title: "Error", description: "Failed to load insights", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Insights</h1>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 days</SelectItem>
                <SelectItem value="last-30-days">Last 30 days</SelectItem>
                <SelectItem value="last-90-days">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalOrders}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(metrics.totalRevenue / 100).toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(metrics.avgOrderValue / 100).toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="bg-muted">
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="product-mix">Product Mix</TabsTrigger>
              <TabsTrigger value="operations">Operations Quality</TabsTrigger>
              <TabsTrigger value="most-loved">Most Loved</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="mt-6">
              <SalesDashboard />
            </TabsContent>

            <TabsContent value="product-mix" className="mt-6">
              <ProductMixDashboard />
            </TabsContent>

            <TabsContent value="operations" className="mt-6">
              <OperationsQualityDashboard />
            </TabsContent>

            <TabsContent value="most-loved" className="mt-6">
              <MostLovedDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default InsightsDashboard;