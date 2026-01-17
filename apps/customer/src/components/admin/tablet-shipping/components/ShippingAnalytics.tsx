import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Package,
  Truck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ShippingAnalyticsProps {
  shipments: any[];
  inventory: any[];
}

export function ShippingAnalytics({ shipments, inventory }: ShippingAnalyticsProps) {
  const analytics = useMemo(() => {
    // Shipments by carrier
    const carrierCounts: any = {};
    shipments.forEach(s => {
      const carrier = s.carrier || 'Unknown';
      carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
    });

    const carrierData = Object.entries(carrierCounts).map(([name, value]) => ({
      name,
      value
    }));

    // Monthly shipments (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      const monthShipments = shipments.filter(s => {
        if (!s.shipped_at) return false;
        const shipDate = new Date(s.shipped_at);
        return shipDate.getMonth() === date.getMonth() && 
               shipDate.getFullYear() === date.getFullYear();
      });

      monthlyData.push({
        month: monthName,
        shipped: monthShipments.length,
        cost: monthShipments.length * 15, // $15 avg per shipment
      });
    }

    // Calculate averages
    const avgDeliveryTime = 4; // Mock: 4 days average
    const totalCost = shipments.length * 15;
    const successRate = shipments.length > 0 
      ? ((shipments.filter(s => s.status === 'delivered').length / shipments.length) * 100).toFixed(1)
      : 0;

    return {
      carrierData,
      monthlyData,
      avgDeliveryTime,
      totalCost,
      successRate,
    };
  }, [shipments]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Shipped</p>
              <Package className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{shipments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Avg Delivery Time</p>
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold">{analytics.avgDeliveryTime}d</p>
            <p className="text-xs text-muted-foreground mt-1">From ship to delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">{analytics.successRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Shipping Cost</p>
              <DollarSign className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold">${analytics.totalCost.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Shipments */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="shipped" fill="#3b82f6" name="Tablets Shipped" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Carrier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Shipments by Carrier</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.carrierData.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                <p className="text-muted-foreground">No shipments yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.carrierData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.carrierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cost" fill="#10b981" name="Shipping Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

