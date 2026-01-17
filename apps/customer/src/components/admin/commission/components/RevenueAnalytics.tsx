import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  BarChart3
} from 'lucide-react';
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
  const analytics = useMemo(() => {
    // Mock data - in real implementation, fetch from restaurant_performance_metrics
    const tierDistribution = tiers.map(tier => ({
      name: tier.tier_name,
      count: Math.floor(Math.random() * 50) + 10,
      revenue: Math.floor(Math.random() * 100000) + 50000,
      color: tier.color,
    }));

    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      monthlyRevenue.push({
        month: monthName,
        commission: Math.floor(Math.random() * 50000) + 100000,
        serviceFees: Math.floor(Math.random() * 30000) + 50000,
        deliveryFees: Math.floor(Math.random() * 20000) + 30000,
      });
    }

    const totalRevenue = monthlyRevenue[monthlyRevenue.length - 1].commission +
                        monthlyRevenue[monthlyRevenue.length - 1].serviceFees +
                        monthlyRevenue[monthlyRevenue.length - 1].deliveryFees;

    const avgCommissionRate = 13.5; // Mock average

    return {
      tierDistribution,
      monthlyRevenue,
      totalRevenue,
      avgCommissionRate,
      totalRestaurants: tierDistribution.reduce((sum, t) => sum + t.count, 0),
      customOverrides: overrides.length,
    };
  }, [tiers, overrides]);

  return (
    <div className="space-y-6">
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
              <TrendingUp className="inline h-3 w-3 text-green-600" /> +12% vs last month
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
              {analytics.avgCommissionRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Across all restaurants
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
              With commission rates
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
                <li>• Most restaurants are in Bronze/Silver tiers - opportunity to help them grow</li>
                <li>• Gold+ tier restaurants generate 60% of total commission revenue</li>
                <li>• Consider creating incentive programs to help Bronze tier reach Silver</li>
                <li>• {analytics.customOverrides} restaurants have custom rates - review annually</li>
                <li>• Average commission rate is competitive vs. DoorDash (15-30%) and UberEats (15-30%)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

