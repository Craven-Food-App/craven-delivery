import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, DollarSign, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import CustomerInsightsDashboard from "./customers/CustomerInsightsDashboard";
import RatingsReviewsDashboard from "./customers/RatingsReviewsDashboard";

interface CustomersDashboardProps {
  restaurantId?: string;
}

const CustomersDashboard = ({ restaurantId: restaurantIdProp }: CustomersDashboardProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("this-month");
  const [stats, setStats] = useState({
    totalCustomers: 0,
    repeatRate: 0,
    avgOrderValue: 0,
    avgRating: 0
  });

  useEffect(() => {
    fetchStats();
  }, [restaurantIdProp]);

  const fetchStats = async () => {
    try {
      let restaurantId: string | null = restaurantIdProp ?? null;
      if (!restaurantId) {
        const userResult = await supabase.auth.getUser();
        if (!userResult.data?.user) return;
        const { data } = await supabase
          .from('restaurants')
          .select('id')
          .eq('owner_id', userResult.data.user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        restaurantId = data?.[0]?.id ?? null;
      }
      if (!restaurantId) return;

      const { data: orders } = await supabase
        .from('orders')
        .select('customer_id, total_cents')
        .eq('restaurant_id', restaurantId)
        .eq('order_status', 'delivered');

      const ordersList = orders || [];
      let avgRating = 0;

      if (ordersList.length > 0) {
        const uniqueCustomers = new Set(ordersList.map((o: { customer_id: string }) => o.customer_id)).size;
        const totalRevenue = ordersList.reduce((sum: number, o: { total_cents?: number }) => sum + (o.total_cents || 0), 0);
        const avgOrder = totalRevenue / ordersList.length;

        const customerOrderCounts = ordersList.reduce((acc: Record<string, number>, o: { customer_id: string }) => {
          acc[o.customer_id] = (acc[o.customer_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const repeatCustomers = Object.values(customerOrderCounts).filter((count: number) => count > 1).length;
        const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

        const { data: reviews } = await supabase
          .from('customer_reviews')
          .select('rating')
          .eq('restaurant_id', restaurantId);
        avgRating = reviews && reviews.length > 0
          ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
          : 0;

        setStats({
          totalCustomers: uniqueCustomers,
          repeatRate: Math.round(repeatRate),
          avgOrderValue: avgOrder,
          avgRating
        });
      } else {
        const { data: reviews } = await supabase
          .from('customer_reviews')
          .select('rating')
          .eq('restaurant_id', restaurantId);
        avgRating = reviews && reviews.length > 0
          ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
          : 0;
        setStats({ totalCustomers: 0, repeatRate: 0, avgOrderValue: 0, avgRating });
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
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3 mt-2">
              <TabsList className="h-9 bg-background border shadow-sm">
                <TabsTrigger value="insights" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Customer Insights</TabsTrigger>
                <TabsTrigger value="ratings">Ratings & Reviews</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Period</span>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40 h-9 bg-background border shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-month">This month</SelectItem>
                    <SelectItem value="last-month">Last month</SelectItem>
                    <SelectItem value="last-3-months">Last 3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="insights" className="mt-6">
              <CustomerInsightsDashboard restaurantId={restaurantIdProp} dateRange={dateRange} onDateRangeChange={setDateRange} />
            </TabsContent>

            <TabsContent value="ratings" className="mt-6">
              <RatingsReviewsDashboard restaurantId={restaurantIdProp} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CustomersDashboard;