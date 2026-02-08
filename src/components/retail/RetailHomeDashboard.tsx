import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Package,
  DollarSign,
  Star,
  Clock,
  Users,
  ShoppingBag,
  AlertTriangle,
  BarChart3,
  Boxes,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface RetailHomeDashboardProps {
  restaurantId: string;
  restaurant?: any;
  readiness?: any;
}

export const RetailHomeDashboard = ({
  restaurantId,
  restaurant,
  readiness,
}: RetailHomeDashboardProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    averageTicket: 0,
    totalProducts: 0,
    activeProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [restaurantId]);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch today's orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, created_at, total_cents, order_number, order_status")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });

      // Fetch products
      const { data: products } = await supabase
        .from("menu_items")
        .select("id, name, is_available, order_count, price_cents, image_url")
        .eq("restaurant_id", restaurantId);

      const todaySales =
        orders?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0;
      const todayOrders = orders?.length || 0;
      const averageTicket = todayOrders > 0 ? todaySales / todayOrders : 0;
      const totalProducts = products?.length || 0;
      const activeProducts =
        products?.filter((p) => p.is_available).length || 0;

      // Simulate stock metrics based on order_count
      const lowStock =
        products?.filter(
          (p) =>
            p.is_available && (50 - (p.order_count || 0) > 0) && (50 - (p.order_count || 0) <= 10)
        ).length || 0;
      const outOfStock =
        products?.filter((p) => p.is_available && 50 - (p.order_count || 0) <= 0)
          .length || 0;

      setStats({
        todaySales: todaySales / 100,
        todayOrders,
        averageTicket: averageTicket / 100,
        totalProducts,
        activeProducts,
        lowStockCount: lowStock,
        outOfStockCount: outOfStock,
      });

      // Top products by orders
      const sortedProducts = [...(products || [])]
        .sort((a, b) => (b.order_count || 0) - (a.order_count || 0))
        .slice(0, 5);
      setTopProducts(sortedProducts);

      // 7-day sales chart
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: weekOrders } = await supabase
        .from("orders")
        .select("created_at, total_cents")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", sevenDaysAgo.toISOString());

      const salesByDay: Record<string, number> = {};
      weekOrders?.forEach((order) => {
        const date = new Date(order.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        salesByDay[date] =
          (salesByDay[date] || 0) + (order.total_cents || 0) / 100;
      });

      setSalesData(
        Object.entries(salesByDay).map(([date, sales]) => ({
          date,
          sales: parseFloat(sales.toFixed(2)),
        }))
      );
      setRecentOrders(orders?.slice(0, 5) || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  const COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];

  const hasIncompleteTasks =
    !restaurant?.banking_complete ||
    !restaurant?.stripe_onboarding_complete ||
    (readiness &&
      (readiness.blockers.length > 0 || readiness.missing_items.length > 0));

  return (
    <div className="space-y-6">
      {/* Incomplete Tasks Alert */}
      {hasIncompleteTasks && (
        <Card className="border-orange-200 dark:border-orange-900 bg-orange-500/10">
          <CardHeader>
            <CardTitle className="text-orange-900 dark:text-orange-100">
              Complete Your Store Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!restaurant?.banking_complete && (
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">
                    Banking Information Required
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Add your bank account to receive payouts
                  </p>
                </div>
              </div>
            )}
            {!restaurant?.stripe_onboarding_complete && (
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">
                    Payment Setup Incomplete
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Complete Stripe onboarding to accept payments
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Stats — Retail Focused */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.todaySales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayOrders} order{stats.todayOrders !== 1 ? "s" : ""} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.averageTicket.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProducts}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalProducts} total
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            stats.lowStockCount + stats.outOfStockCount > 0
              ? "border-yellow-200"
              : ""
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${
                stats.lowStockCount + stats.outOfStockCount > 0
                  ? "text-yellow-500"
                  : "text-muted-foreground"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lowStockCount + stats.outOfStockCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.lowStockCount} low, {stats.outOfStockCount} out
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions — Retail */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col py-4"
              onClick={() => {
                const event = new CustomEvent("merchantPortalNav", {
                  detail: "orders",
                });
                window.dispatchEvent(event);
              }}
            >
              <Package className="h-6 w-6 mb-2" />
              <span className="text-sm">View Orders</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col py-4"
              onClick={() => {
                const event = new CustomEvent("merchantPortalNav", {
                  detail: "products",
                });
                window.dispatchEvent(event);
              }}
            >
              <ShoppingBag className="h-6 w-6 mb-2" />
              <span className="text-sm">Manage Products</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col py-4"
              onClick={() => {
                const event = new CustomEvent("merchantPortalNav", {
                  detail: "inventory",
                });
                window.dispatchEvent(event);
              }}
            >
              <Boxes className="h-6 w-6 mb-2" />
              <span className="text-sm">Check Inventory</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col py-4"
              onClick={() => {
                const event = new CustomEvent("merchantPortalNav", {
                  detail: "reports",
                });
                window.dispatchEvent(event);
              }}
            >
              <BarChart3 className="h-6 w-6 mb-2" />
              <span className="text-sm">View Reports</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col py-4"
              onClick={() => {
                const event = new CustomEvent("merchantPortalNav", {
                  detail: "settings",
                });
                window.dispatchEvent(event);
              }}
            >
              <Clock className="h-6 w-6 mb-2" />
              <span className="text-sm">Business Hours</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Bar dataKey="sales" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No sales data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No product data yet
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, idx) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600">
                      {idx + 1}
                    </div>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${(product.price_cents / 100).toFixed(2)} •{" "}
                        {product.order_count || 0} sold
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {product.order_count || 0} sales
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const event = new CustomEvent("merchantPortalNav", {
                  detail: "orders",
                });
                window.dispatchEvent(event);
              }}
            >
              View all →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No recent orders
            </p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Order #{order.order_number || order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${((order.total_cents || 0) / 100).toFixed(2)}
                    </p>
                    <Badge variant="outline" className="text-xs capitalize">
                      {order.order_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RetailHomeDashboard;

