import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Users, Car, Store, Download, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface AnalyticsData {
  revenue: {
    total: number;
    change: number;
    daily: { date: string; amount: number }[];
  };
  orders: {
    total: number;
    change: number;
    byStatus: { status: string; count: number }[];
  };
  customers: {
    total: number;
    new: number;
    returning: number;
  };
  drivers: {
    active: number;
    total: number;
    avgRating: number;
  };
  restaurants: {
    active: number;
    total: number;
    topPerformers: { name: string; orders: number; revenue: number }[];
  };
}

export const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7'); // days
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, parseInt(dateRange));

      // Fetch revenue data
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (ordersError) throw ordersError;

      // Calculate revenue
      const totalRevenue = (orders || []).reduce((sum, order) => sum + order.total_cents, 0);
      
      // Get previous period for comparison
      const prevStartDate = subDays(startDate, parseInt(dateRange));
      const { data: prevOrders } = await supabase
        .from('orders')
        .select('total_cents')
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      const prevRevenue = (prevOrders || []).reduce((sum, order) => sum + order.total_cents, 0);
      const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      // Group revenue by day
      const revenueByDay = (orders || []).reduce((acc: any, order) => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        if (!acc[date]) acc[date] = 0;
        acc[date] += order.total_cents;
        return acc;
      }, {});

      const dailyRevenue = Object.entries(revenueByDay).map(([date, amount]) => ({
        date,
        amount: amount as number
      }));

      // Calculate order stats
      const ordersByStatus = (orders || []).reduce((acc: any, order) => {
        const status = order.order_status;
        if (!acc[status]) acc[status] = 0;
        acc[status]++;
        return acc;
      }, {});

      const orderStatusArray = Object.entries(ordersByStatus).map(([status, count]) => ({
        status,
        count: count as number
      }));

      // Fetch customer stats
      const { data: customers } = await supabase
        .from('user_profiles')
        .select('id, user_id, created_at');

      const newCustomers = (customers || []).filter(
        c => new Date(c.created_at) >= startDate
      ).length;

      // Fetch driver stats
      const { data: drivers } = await supabase
        .from('driver_profiles')
        .select('*');

      const activeDrivers = (drivers || []).filter(d => d.is_available).length;
      const avgDriverRating = (drivers || []).reduce((sum, d) => sum + (d.rating || 0), 0) / (drivers?.length || 1);

      // Fetch restaurant stats
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('*');

      const activeRestaurants = (restaurants || []).filter(r => r.is_active).length;

      // Get top performing restaurants
      const restaurantOrders = (orders || []).reduce((acc: any, order) => {
        const restId = order.restaurant_id;
        if (!acc[restId]) {
          acc[restId] = { orders: 0, revenue: 0, name: '' };
        }
        acc[restId].orders++;
        acc[restId].revenue += order.total_cents;
        return acc;
      }, {});

      // Match restaurant names
      const topPerformers = await Promise.all(
        Object.entries(restaurantOrders)
          .sort((a: any, b: any) => b[1].revenue - a[1].revenue)
          .slice(0, 5)
          .map(async ([id, stats]: any) => {
            const { data: restaurant } = await supabase
              .from('restaurants')
              .select('name')
              .eq('id', id)
              .single();

            return {
              name: restaurant?.name || 'Unknown',
              orders: stats.orders,
              revenue: stats.revenue
            };
          })
      );

      setAnalytics({
        revenue: {
          total: totalRevenue,
          change: revenueChange,
          daily: dailyRevenue
        },
        orders: {
          total: orders?.length || 0,
          change: ((orders?.length || 0) - (prevOrders?.length || 0)) / (prevOrders?.length || 1) * 100,
          byStatus: orderStatusArray
        },
        customers: {
          total: customers?.length || 0,
          new: newCustomers,
          returning: (customers?.length || 0) - newCustomers
        },
        drivers: {
          active: activeDrivers,
          total: drivers?.length || 0,
          avgRating: avgDriverRating
        },
        restaurants: {
          active: activeRestaurants,
          total: restaurants?.length || 0,
          topPerformers
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error loading analytics',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      if (!analytics) return;

      const data = {
        dateRange: `Last ${dateRange} days`,
        generatedAt: new Date().toISOString(),
        revenue: {
          total: analytics.revenue.total / 100,
          change: analytics.revenue.change
        },
        orders: analytics.orders,
        customers: analytics.customers,
        drivers: analytics.drivers,
        restaurants: analytics.restaurants
      };

      if (exportType === 'csv') {
        // Create CSV
        const csv = [
          ['Metric', 'Value'],
          ['Total Revenue', `$${(analytics.revenue.total / 100).toFixed(2)}`],
          ['Revenue Change', `${analytics.revenue.change.toFixed(2)}%`],
          ['Total Orders', analytics.orders.total.toString()],
          ['Total Customers', analytics.customers.total.toString()],
          ['New Customers', analytics.customers.new.toString()],
          ['Active Drivers', analytics.drivers.active.toString()],
          ['Active Restaurants', analytics.restaurants.active.toString()]
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
      } else {
        // Create PDF (would use a library like jsPDF in production)
        toast({
          title: 'PDF Export',
          description: 'PDF export feature coming soon'
        });
      }

      toast({
        title: 'Export successful',
        description: `Analytics data exported as ${exportType.toUpperCase()}`
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export analytics data',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <BarChart3 className="h-6 w-6 animate-pulse text-gray-400" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">No analytics data available</div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
          <p className="text-xs text-gray-500 mt-0.5">Platform analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[130px] h-7 text-xs border-gray-300">
              <Calendar className="h-3 w-3 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={exportType} onValueChange={(v) => setExportType(v as 'csv' | 'pdf')}>
            <SelectTrigger className="w-[100px] h-7 text-xs border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} size="sm" className="h-7 px-2.5 text-xs">
            <Download className="h-3 w-3 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Compact Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Revenue</p>
              {analytics.revenue.change > 0 ? (
                <ArrowUp className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDown className="h-3 w-3 text-red-600" />
              )}
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">
              ${(analytics.revenue.total / 100).toFixed(2)}
            </p>
            <p className={`text-[10px] mt-0.5 ${analytics.revenue.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analytics.revenue.change > 0 ? '+' : ''}{analytics.revenue.change.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Orders</p>
              <ShoppingBag className="h-3 w-3 text-blue-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{analytics.orders.total}</p>
            <p className={`text-[10px] mt-0.5 ${analytics.orders.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analytics.orders.change > 0 ? '+' : ''}{analytics.orders.change.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Customers</p>
              <Users className="h-3 w-3 text-purple-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{analytics.customers.total}</p>
            <p className="text-[10px] mt-0.5 text-gray-500">
              {analytics.customers.new} new, {analytics.customers.returning} returning
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Active Drivers</p>
              <Car className="h-3 w-3 text-orange-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 leading-tight">{analytics.drivers.active}</p>
            <p className="text-[10px] mt-0.5 text-gray-500">of {analytics.drivers.total} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics - Compact Tabs */}
      <Card className="border border-gray-200 shadow-sm">
        <Tabs defaultValue="revenue" className="w-full">
          <div className="border-b border-gray-200 bg-[#fafbfc]">
            <div className="px-4 py-2">
              <TabsList className="bg-transparent h-8 p-0">
                <TabsTrigger value="revenue" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Revenue
                </TabsTrigger>
                <TabsTrigger value="orders" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Orders
                </TabsTrigger>
                <TabsTrigger value="customers" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Customers
                </TabsTrigger>
                <TabsTrigger value="restaurants" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Restaurants
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="revenue" className="m-0 p-0">
            <div className="p-3">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.revenue.daily.map((day) => (
                    <tr key={day.date} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-700">{format(new Date(day.date), 'MMM dd, yyyy')}</td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">${(day.amount / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="m-0 p-0">
            <div className="p-3">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.orders.byStatus.map((item) => (
                    <tr key={item.status} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-700 capitalize">{item.status.replace('_', ' ')}</td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="m-0 p-0">
            <div className="p-3">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Card className="border border-gray-200">
                  <CardContent className="p-3">
                    <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Total</p>
                    <p className="text-lg font-semibold text-gray-900">{analytics.customers.total}</p>
                  </CardContent>
                </Card>
                <Card className="border border-gray-200">
                  <CardContent className="p-3">
                    <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">New</p>
                    <p className="text-lg font-semibold text-green-600">{analytics.customers.new}</p>
                  </CardContent>
                </Card>
                <Card className="border border-gray-200">
                  <CardContent className="p-3">
                    <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Returning</p>
                    <p className="text-lg font-semibold text-blue-600">{analytics.customers.returning}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Card className="border border-gray-200">
                  <CardContent className="p-3">
                    <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Active Drivers</p>
                    <p className="text-lg font-semibold text-gray-900">{analytics.drivers.active}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">of {analytics.drivers.total} total</p>
                  </CardContent>
                </Card>
                <Card className="border border-gray-200">
                  <CardContent className="p-3">
                    <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Avg Rating</p>
                    <p className="text-lg font-semibold text-yellow-600">{analytics.drivers.avgRating.toFixed(1)} ⭐</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="restaurants" className="m-0 p-0">
            <div className="p-3">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Card className="border border-gray-200">
                  <CardContent className="p-3">
                    <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Active</p>
                    <p className="text-lg font-semibold text-gray-900">{analytics.restaurants.active}</p>
                  </CardContent>
                </Card>
                <Card className="border border-gray-200">
                  <CardContent className="p-3">
                    <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">Total</p>
                    <p className="text-lg font-semibold text-gray-900">{analytics.restaurants.total}</p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Top Performers</p>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Restaurant</th>
                      <th className="px-3 py-1.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Orders</th>
                      <th className="px-3 py-1.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analytics.restaurants.topPerformers.map((restaurant, index) => (
                      <tr key={restaurant.name} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400">#{index + 1}</span>
                            <span className="text-xs text-gray-900">{restaurant.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-gray-700">{restaurant.orders}</td>
                        <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">${(restaurant.revenue / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
