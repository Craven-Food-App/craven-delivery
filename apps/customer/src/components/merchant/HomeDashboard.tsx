import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Package, DollarSign, Star, Clock, Users, ChefHat } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface HomeDashboardProps {
  restaurantId: string;
  restaurant?: any;
  readiness?: any;
}

export const HomeDashboard = ({ restaurantId, restaurant, readiness }: HomeDashboardProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    averageTicket: 0,
    topItem: 'Loading...',
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [restaurantId]);

  const fetchDashboardData = async () => {
    try {
      // Fetch today's orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, total_cents, order_number, order_status')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Calculate stats (convert cents to dollars)
      const todaySales = orders?.reduce((sum, order) => sum + (order.total_cents || 0), 0) || 0;
      const todayOrders = orders?.length || 0;
      const averageTicket = todayOrders > 0 ? todaySales / todayOrders : 0;

      setStats({ 
        todaySales: todaySales / 100, // Convert cents to dollars
        todayOrders, 
        averageTicket: averageTicket / 100, // Convert cents to dollars
        topItem: 'N/A' // Simplified for now
      });

      // Fetch last 7 days sales data for chart
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: weekOrders } = await supabase
        .from('orders')
        .select('created_at, total_cents')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Group by day
      const salesByDay: { [key: string]: number } = {};
      weekOrders?.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        salesByDay[date] = (salesByDay[date] || 0) + ((order.total_cents || 0) / 100); // Convert to dollars
      });

      const chartData = Object.entries(salesByDay).map(([date, sales]) => ({
        date,
        sales: parseFloat(sales.toFixed(2)),
      }));

      setSalesData(chartData);
      setRecentOrders(orders?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  // Check for incomplete tasks
  const hasIncompleteTasks = !restaurant?.banking_complete || 
    !restaurant?.stripe_onboarding_complete || 
    (readiness && (readiness.blockers.length > 0 || readiness.missing_items.length > 0));

  return (
    <div className="space-y-6">
      {/* Incomplete Tasks Alert */}
      {hasIncompleteTasks && (
        <Card className="border-orange-200 dark:border-orange-900 bg-orange-500/10">
          <CardHeader>
            <CardTitle className="text-orange-900 dark:text-orange-100">Complete Your Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!restaurant?.banking_complete && (
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Banking Information Required</p>
                  <p className="text-sm text-muted-foreground">Add your bank account to receive payouts</p>
                  <Button 
                    size="sm" 
                    className="mt-2"
                    onClick={() => navigate('/merchant-portal?tab=settings&section=bank')}
                  >
                    Add Bank Account
                  </Button>
                </div>
              </div>
            )}
            {!restaurant?.stripe_onboarding_complete && (
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Payment Setup Incomplete</p>
                  <p className="text-sm text-muted-foreground">Complete Stripe onboarding to accept payments</p>
                  <Button 
                    size="sm" 
                    className="mt-2"
                    onClick={() => navigate('/merchant-portal?tab=settings&section=bank')}
                  >
                    Complete Setup
                  </Button>
                </div>
              </div>
            )}
            {readiness && readiness.blockers.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Required to Go Live</p>
                  <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                    {readiness.blockers.map((blocker: string, idx: number) => (
                      <li key={idx}>• {blocker}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.todaySales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total revenue today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}</div>
            <p className="text-xs text-muted-foreground">Orders today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Ticket</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.averageTicket.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per order average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Item</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{stats.topItem}</div>
            <p className="text-xs text-muted-foreground">Most ordered today</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" onClick={() => navigate('/merchant-portal?tab=orders')} className="h-auto flex-col py-4">
              <Package className="h-6 w-6 mb-2" />
              <span className="text-sm">View Orders</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/merchant-portal?tab=menu')} className="h-auto flex-col py-4">
              <ChefHat className="h-6 w-6 mb-2" />
              <span className="text-sm">Update Menu</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/merchant-portal?tab=reports')} className="h-auto flex-col py-4">
              <TrendingUp className="h-6 w-6 mb-2" />
              <span className="text-sm">Check Reports</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/merchant-portal?tab=settings')} className="h-auto flex-col py-4">
              <Clock className="h-6 w-6 mb-2" />
              <span className="text-sm">Adjust Hours</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Overview (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent orders</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Order #{order.order_number || order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${((order.total_cents || 0) / 100).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground capitalize">{order.order_status}</p>
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
