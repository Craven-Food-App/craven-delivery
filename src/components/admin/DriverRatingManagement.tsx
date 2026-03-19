import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Star,
  TrendingUp,
  AlertTriangle,
  Users,
  Search,
  Award,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  getRatingColor,
  getRatingTier,
  formatRating,
  getTrendIcon,
  getTrendColor,
  evaluateFeederTier,
  FEEDER_TIERS,
  TIER_BADGE_STYLES,
  type FeederTierName,
} from '@/utils/ratingHelpers';
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
} from 'recharts';
import { toast } from 'sonner';

interface DriverWithProfile {
  id: string;
  user_id: string | null;
  rating: number | null;
  total_deliveries: number | null;
  rolling_rating: number | null;
  rolling_deliveries: number | null;
  rolling_completion_rate: number | null;
  rolling_on_time_rate: number | null;
  rolling_cancel_rate: number | null;
  completion_rate: number | null;
  on_time_rate: number | null;
  acceptance_rate: number | null;
  rating_tier: string | null;
  fraud_flag: boolean | null;
  admin_approved_ultimate: boolean | null;
  status: string | null;
  region_id: number | null;
  // joined
  profile_name: string;
  profile_email: string;
  region_name: string;
  // computed
  computed_tier: FeederTierName;
}

export function DriverRatingManagement() {
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      // Fetch driver_profiles with joined user_profiles and regions
      const { data, error } = await (supabase as any)
        .from('driver_profiles')
        .select(`
          id, user_id, rating, total_deliveries,
          rolling_rating, rolling_deliveries, rolling_completion_rate,
          rolling_on_time_rate, rolling_cancel_rate,
          completion_rate, on_time_rate, acceptance_rate,
          rating_tier, fraud_flag, admin_approved_ultimate, status, region_id,
          user_profiles!driver_profiles_user_id_fkey(full_name, email),
          regions!driver_profiles_region_id_fkey(name)
        `)
        .order('rating', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const transformed: DriverWithProfile[] = (data || []).map((d: any) => {
        const rollingRating = d.rolling_rating ?? d.rating ?? 0;
        const rollingDeliveries = d.rolling_deliveries ?? d.total_deliveries ?? 0;
        const completionRate = d.rolling_completion_rate ?? d.completion_rate ?? 0;
        const onTimeRate = d.rolling_on_time_rate ?? d.on_time_rate ?? 0;
        const cancelRate = d.rolling_cancel_rate ?? 0;

        const computedTier = evaluateFeederTier({
          totalDeliveries: rollingDeliveries,
          averageRating: rollingRating,
          completionRate,
          onTimeRate,
          cancellationRate: cancelRate,
          hasFraudFlag: d.fraud_flag ?? false,
          hasAdminApproval: d.admin_approved_ultimate ?? false,
        });

        return {
          ...d,
          profile_name: d.user_profiles?.full_name || 'Unknown Driver',
          profile_email: d.user_profiles?.email || '',
          region_name: d.regions?.name || 'Unassigned',
          computed_tier: computedTier,
        };
      });

      setDrivers(transformed);
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to load driver data');
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const totalDrivers = drivers.length;
  const avgRating = totalDrivers > 0
    ? drivers.reduce((sum, d) => sum + (d.rolling_rating ?? d.rating ?? 0), 0) / totalDrivers
    : 0;

  const tierCounts: Record<FeederTierName, number> = {
    Ultimate: 0, Diamond: 0, Platinum: 0, Gold: 0, Feeder: 0,
  };
  drivers.forEach(d => { tierCounts[d.computed_tier]++; });

  const needsAttention = drivers.filter(d => (d.rolling_rating ?? d.rating ?? 5) < 4.5).length;

  const tierDistribution = FEEDER_TIERS.map(t => ({
    name: `${t.icon} ${t.name}`,
    value: tierCounts[t.name],
    color: t.name === 'Feeder' ? '#9CA3AF' :
           t.name === 'Gold' ? '#D4AF37' :
           t.name === 'Platinum' ? '#94A3B8' :
           t.name === 'Diamond' ? '#1E3A5F' :
           '#E8622A',
  })).reverse();

  const ratingDistribution = [
    { range: '4.9-5.0', count: drivers.filter(d => (d.rolling_rating ?? d.rating ?? 0) >= 4.9).length },
    { range: '4.7-4.89', count: drivers.filter(d => { const r = d.rolling_rating ?? d.rating ?? 0; return r >= 4.7 && r < 4.9; }).length },
    { range: '4.5-4.69', count: drivers.filter(d => { const r = d.rolling_rating ?? d.rating ?? 0; return r >= 4.5 && r < 4.7; }).length },
    { range: '<4.5', count: drivers.filter(d => (d.rolling_rating ?? d.rating ?? 0) < 4.5).length },
  ];

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = !searchQuery ||
      driver.profile_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.profile_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = filterTier === 'all' || driver.computed_tier === filterTier;
    return matchesSearch && matchesTier;
  });

  const getTierBadgeStyle = (tier: FeederTierName) => {
    const style = TIER_BADGE_STYLES[tier.toUpperCase() as keyof typeof TIER_BADGE_STYLES];
    if (!style) return {};
    return {
      background: style.bg,
      color: style.text,
      border: `1px solid ${style.border}`,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Driver Rating Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Monitor Feeder performance using rolling 60-day metrics &amp; tier system
          </p>
        </div>
        <Button onClick={fetchDrivers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Platform Avg Rating</p>
                <p className="text-3xl font-bold" style={{ color: getRatingColor(avgRating) }}>
                  {formatRating(avgRating)}
                </p>
              </div>
              <Star className="h-8 w-8" style={{ color: getRatingColor(avgRating) }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gold+ Drivers</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {tierCounts.Gold + tierCounts.Platinum + tierCounts.Diamond + tierCounts.Ultimate}
                </p>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">4.7+ rating, 50+ deliveries</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Drivers</p>
                <p className="text-3xl font-bold">{totalDrivers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
                <p className="text-3xl font-bold text-orange-600">{needsAttention}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Below 4.5 rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tier Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {totalDrivers === 0 ? (
              <p className="text-center text-muted-foreground py-12">No driver data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tierDistribution.filter(t => t.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {tierDistribution.filter(t => t.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ratingDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#E8622A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="all">All Tiers</option>
          <option value="Ultimate">👑 Ultimate</option>
          <option value="Diamond">💎 Diamond</option>
          <option value="Platinum">⚪ Platinum</option>
          <option value="Gold">🥇 Gold</option>
          <option value="Feeder">🍽️ Feeder</option>
        </select>
      </div>

      {/* Driver Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Drivers ({filteredDrivers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Driver</th>
                    <th className="text-left py-3 px-4 font-medium">Rating</th>
                    <th className="text-left py-3 px-4 font-medium">Tier</th>
                    <th className="text-left py-3 px-4 font-medium">Deliveries</th>
                    <th className="text-left py-3 px-4 font-medium">Completion</th>
                    <th className="text-left py-3 px-4 font-medium">On-Time</th>
                    <th className="text-left py-3 px-4 font-medium">Cancel %</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        {searchQuery || filterTier !== 'all' ? 'No drivers match filters' : 'No driver profiles found'}
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((driver) => {
                      const rating = driver.rolling_rating ?? driver.rating ?? 0;
                      const deliveries = driver.rolling_deliveries ?? driver.total_deliveries ?? 0;
                      const completionRate = driver.rolling_completion_rate ?? driver.completion_rate ?? 0;
                      const onTimeRate = driver.rolling_on_time_rate ?? driver.on_time_rate ?? 0;
                      const cancelRate = driver.rolling_cancel_rate ?? 0;
                      const ratingColor = getRatingColor(rating);
                      const tierInfo = FEEDER_TIERS.find(t => t.name === driver.computed_tier)!;

                      return (
                        <tr key={driver.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{driver.profile_name}</p>
                              <p className="text-xs text-muted-foreground">{driver.profile_email}</p>
                              <p className="text-xs text-muted-foreground">{driver.region_name}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-current" style={{ color: ratingColor }} />
                              <span className="font-bold" style={{ color: ratingColor }}>
                                {formatRating(rating)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                              style={getTierBadgeStyle(driver.computed_tier)}
                            >
                              {tierInfo.icon} {tierInfo.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">{deliveries}</td>
                          <td className="py-3 px-4">
                            <span className={completionRate >= 95 ? 'text-green-600' : completionRate >= 90 ? 'text-yellow-600' : 'text-red-600'}>
                              {completionRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={onTimeRate >= 93 ? 'text-green-600' : onTimeRate >= 90 ? 'text-yellow-600' : 'text-red-600'}>
                              {onTimeRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={cancelRate <= 5 ? 'text-green-600' : cancelRate <= 10 ? 'text-yellow-600' : 'text-red-600'}>
                              {cancelRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {rating >= 4.8 ? (
                              <Badge className="bg-green-600 hover:bg-green-700">Excellent</Badge>
                            ) : rating >= 4.5 ? (
                              <Badge className="bg-blue-600 hover:bg-blue-700">Good</Badge>
                            ) : rating >= 4.0 ? (
                              <Badge className="bg-yellow-600 hover:bg-yellow-700">Average</Badge>
                            ) : (
                              <Badge className="bg-red-600 hover:bg-red-700">At Risk</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
