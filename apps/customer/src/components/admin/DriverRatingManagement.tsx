import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Search,
  Award,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getRatingColor, getRatingTier, formatRating, getTrendIcon, getTrendColor } from '@/utils/ratingHelpers';
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

export function DriverRatingManagement() {
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data } = await supabase
        .from('driver_profiles')
        .select(`
          *,
          user:users!driver_profiles_user_id_fkey(
            id,
            email
          )
        `)
        .order('rating', { ascending: false });

      // Transform to match expected structure
      const transformed = (data || []).map(driver => ({
        ...driver,
        overall_rating: Number(driver.rating) || 5.0,
        current_tier: driver.total_deliveries >= 100 && driver.rating >= 4.8 ? 'Elite' :
                     driver.total_deliveries >= 50 && driver.rating >= 4.5 ? 'Pro' :
                     driver.total_deliveries >= 20 && driver.rating >= 4.0 ? 'Rising Star' :
                     'New Driver',
        rating_trend_7d: 0,
        driver: driver.user
      }));

      setDrivers(transformed);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalDrivers = drivers.length;
  const platformAvgRating = drivers.length > 0
    ? drivers.reduce((sum, d) => sum + (d.overall_rating || 0), 0) / drivers.length
    : 0;
  const eliteDrivers = drivers.filter(d => d.overall_rating >= 4.8).length;
  const needsAttention = drivers.filter(d => d.overall_rating < 4.5).length;

  // Tier distribution
  const tierDistribution = [
    { name: 'Elite', value: drivers.filter(d => d.current_tier === 'Elite').length, color: '#E5E4E2' },
    { name: 'Pro', value: drivers.filter(d => d.current_tier === 'Pro').length, color: '#D4AF37' },
    { name: 'Rising Star', value: drivers.filter(d => d.current_tier === 'Rising Star').length, color: '#C0C0C0' },
    { name: 'New Driver', value: drivers.filter(d => d.current_tier === 'New Driver').length, color: '#CD7F32' },
  ];

  // Rating distribution
  const ratingDistribution = [
    { range: '4.8-5.0', count: drivers.filter(d => d.overall_rating >= 4.8).length },
    { range: '4.5-4.79', count: drivers.filter(d => d.overall_rating >= 4.5 && d.overall_rating < 4.8).length },
    { range: '4.0-4.49', count: drivers.filter(d => d.overall_rating >= 4.0 && d.overall_rating < 4.5).length },
    { range: '<4.0', count: drivers.filter(d => d.overall_rating < 4.0).length },
  ];

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.driver?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = filterTier === 'all' || driver.current_tier === filterTier;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Driver Rating Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Monitor and manage Feeder driver performance
          </p>
        </div>
        <Button onClick={fetchDrivers}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Platform Average</p>
                <p className="text-3xl font-bold" style={{ color: getRatingColor(platformAvgRating) }}>
                  {formatRating(platformAvgRating)}
                </p>
              </div>
              <Star className="h-8 w-8" style={{ color: getRatingColor(platformAvgRating) }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Elite Drivers</p>
                <p className="text-3xl font-bold text-purple-600">{eliteDrivers}</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              4.8+ rating
            </p>
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
            <p className="text-xs text-muted-foreground mt-1">
              Below 4.5 rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Driver Tier Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tierDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {tierDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
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
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search drivers by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Tiers</option>
          <option value="Elite">Elite</option>
          <option value="Pro">Pro</option>
          <option value="Rising Star">Rising Star</option>
          <option value="New Driver">New Driver</option>
        </select>
      </div>

      {/* Driver Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Drivers ({filteredDrivers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Driver</th>
                  <th className="text-left py-3 px-4 font-medium">Rating</th>
                  <th className="text-left py-3 px-4 font-medium">Tier</th>
                  <th className="text-left py-3 px-4 font-medium">Deliveries</th>
                  <th className="text-left py-3 px-4 font-medium">Trend</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => {
                  const tier = getRatingTier(driver.overall_rating, driver.total_deliveries);
                  const ratingColor = getRatingColor(driver.overall_rating);
                  
                  return (
                    <tr key={driver.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{driver.driver?.email || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{driver.city || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-current" style={{ color: ratingColor }} />
                          <span className="font-bold" style={{ color: ratingColor }}>
                            {formatRating(driver.overall_rating)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{driver.total_ratings} ratings</p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge style={{ backgroundColor: tier.color, color: 'white' }}>
                          {tier.icon} {tier.name}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{driver.total_deliveries}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span 
                          className="font-semibold"
                          style={{ color: getTrendColor(driver.rating_trend_7d) }}
                        >
                          {getTrendIcon(driver.rating_trend_7d)} {driver.rating_trend_7d > 0 ? '+' : ''}
                          {(driver.rating_trend_7d || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {driver.overall_rating >= 4.8 ? (
                          <Badge className="bg-green-600">Excellent</Badge>
                        ) : driver.overall_rating >= 4.5 ? (
                          <Badge className="bg-blue-600">Good</Badge>
                        ) : driver.overall_rating >= 4.0 ? (
                          <Badge className="bg-yellow-600">Average</Badge>
                        ) : (
                          <Badge className="bg-red-600">At Risk</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

