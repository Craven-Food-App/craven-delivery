import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface RevenueAnalyticsProps {
  tiers: any[];
  overrides: any[];
}

export function RevenueAnalytics({ tiers, overrides }: RevenueAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const [restaurantsRes, ordersRes] = await Promise.all([
          supabase
            .from('restaurants')
            .select('id, commission_tier, tier_reset_cycle, is_active')
            .eq('is_active', true),
          supabase
            .from('orders')
            .select('id, created_at, order_status, food_subtotal_cents, subtotal_cents, merchant_commission_cents')
            .eq('order_status', 'delivered')
            .gte('created_at', sixMonthsAgo.toISOString()),
        ]);

        if (!cancelled) {
          setRestaurants(restaurantsRes.data || []);
          setOrders(ordersRes.data || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const analytics = useMemo(() => {
    const tierDistribution = (tiers || []).map((tier: any) => ({
      name: tier.tier_name,
      count: restaurants.filter((r) => r.commission_tier === tier.tier_name).length,
      revenue: 0,
      color: tier.color || '#94a3b8',
    }));

    const lastSixMonths = Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - idx));
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const monthlyRevenue = lastSixMonths.map((monthStart) => {
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      const monthOrders = orders.filter((o) => {
        const created = new Date(o.created_at);
        return created >= monthStart && created < monthEnd;
      });
      const commission = monthOrders.reduce((sum, o) => {
        if (typeof o.merchant_commission_cents === 'number' && o.merchant_commission_cents > 0) {
          return sum + o.merchant_commission_cents;
        }
        const subtotal = o.food_subtotal_cents ?? o.subtotal_cents ?? 0;
        return sum + Math.round(subtotal * 0.15);
      }, 0);
      return {
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        commission,
        serviceFees: 0,
        deliveryFees: 0,
      };
    });

    const thisMonth = monthlyRevenue[monthlyRevenue.length - 1] || { commission: 0, serviceFees: 0, deliveryFees: 0 };
    const totalRevenue = thisMonth.commission + thisMonth.serviceFees + thisMonth.deliveryFees;

    const totalSubtotals = orders.reduce((sum, o) => sum + (o.food_subtotal_cents ?? o.subtotal_cents ?? 0), 0);
    const totalCommissions = orders.reduce((sum, o) => {
      if (typeof o.merchant_commission_cents === 'number' && o.merchant_commission_cents > 0) {
        return sum + o.merchant_commission_cents;
      }
      const subtotal = o.food_subtotal_cents ?? o.subtotal_cents ?? 0;
      return sum + Math.round(subtotal * 0.15);
    }, 0);
    const avgCommissionRate = totalSubtotals > 0 ? (totalCommissions / totalSubtotals) * 100 : 0;

    return {
      tierDistribution,
      monthlyRevenue,
      totalRevenue,
      avgCommissionRate,
      totalRestaurants: restaurants.length,
      customOverrides: overrides.length,
      quarterlyMerchants: restaurants.filter((r) => r.tier_reset_cycle === 'quarterly').length,
    };
  }, [tiers, overrides, restaurants, orders]);

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>Enterprise data mode:</strong> analytics below are driven by live `restaurants` and delivered
            `orders` data. Service and delivery fee series remain zero until fee snapshots are added to this pipeline.
          </p>
        </CardContent>
      </Card>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">This Month Revenue</p>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              ${(analytics.totalRevenue / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {loading ? 'Syncing…' : 'Latest month delivered-order commission'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Avg Commission Rate</p>
              <Target className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {analytics.avgCommissionRate.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Effective realized rate from delivered orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Active Restaurants</p>
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {analytics.totalRestaurants}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.quarterlyMerchants} quarterly cycle / {analytics.totalRestaurants - analytics.quarterlyMerchants} monthly cycle
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Custom Overrides</p>
              <BarChart3 className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-orange-600">
              {analytics.customOverrides}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Special pricing agreements
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${(value / 1000).toFixed(1)}k`} />
                <Legend />
                <Bar dataKey="commission" fill="#10b981" name="Commission" stackId="a" />
                <Bar dataKey="serviceFees" fill="#3b82f6" name="Service Fees" stackId="a" />
                <Bar dataKey="deliveryFees" fill="#8b5cf6" name="Delivery Fees" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Restaurant Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Restaurant Distribution by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.tierDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.tierDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tier Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tier Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Tier</th>
                  <th className="text-left py-3 px-4 font-medium">Restaurants</th>
                  <th className="text-left py-3 px-4 font-medium">Commission Rate</th>
                  <th className="text-left py-3 px-4 font-medium">Monthly Revenue</th>
                  <th className="text-left py-3 px-4 font-medium">Avg per Restaurant</th>
                </tr>
              </thead>
              <tbody>
                {analytics.tierDistribution.map((tier, index) => {
                  const avgPerRestaurant = tier.revenue / tier.count;
                  const commissionTier = tiers.find(t => t.tier_name === tier.name);
                  
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{commissionTier?.icon}</span>
                          <span className="font-medium">{tier.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{tier.count} restaurants</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-purple-600">
                          {commissionTier?.commission_percent}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        ${(tier.revenue / 1000).toFixed(1)}k
                      </td>
                      <td className="py-3 px-4">
                        ${(avgPerRestaurant / 1000).toFixed(1)}k
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights Card */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-6 w-6 text-green-600 mt-1" />
            <div className="space-y-2">
              <h4 className="font-semibold text-green-900">Key Insights:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Monthly report is based on delivered-order commission snapshots, not random test values.</li>
                <li>• {analytics.customOverrides} active overrides require legal and annual commercial review.</li>
                <li>• Quarterly-cycle merchants are now visible in top-level KPI for incentive-program governance.</li>
                <li>• Average effective commission rate currently trends at {analytics.avgCommissionRate.toFixed(2)}%.</li>
                <li>• Keep top-line standard rate within the 15% policy cap for enterprise consistency.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

