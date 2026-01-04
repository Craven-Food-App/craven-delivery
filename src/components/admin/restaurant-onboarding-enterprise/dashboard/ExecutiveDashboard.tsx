import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Rocket,
  AlertCircle,
  DollarSign,
  Users,
  Target,
  Calendar,
  Zap,
  BarChart3,
  Activity,
} from 'lucide-react';
import type { RestaurantOnboardingData } from '../../restaurant-onboarding/types';
import {
  getOnboardingStage,
  getReadinessScore,
  calculateStats,
  getDaysInStage,
} from '../../restaurant-onboarding/utils/helpers';
import { parseISO, differenceInDays, format, subDays, startOfWeek, endOfWeek } from 'date-fns';

interface ExecutiveDashboardProps {
  restaurants: RestaurantOnboardingData[];
}

const COLORS = {
  new: '#3b82f6',
  pending: '#f59e0b',
  inProgress: '#8b5cf6',
  ready: '#10b981',
  live: '#06b6d4',
  rejected: '#ef4444',
};

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#06b6d4', '#ef4444'];

export function ExecutiveDashboard({ restaurants }: ExecutiveDashboardProps) {
  const stats = useMemo(() => calculateStats(restaurants), [restaurants]);

  // Conversion Funnel Data
  const conversionFunnel = useMemo(() => {
    const stages = restaurants.map(getOnboardingStage);
    const stageCounts = {
      new_application: 0,
      documents_pending: 0,
      under_review: 0,
      menu_setup: 0,
      banking_setup: 0,
      ready_to_launch: 0,
      live: 0,
      rejected: 0,
    };

    stages.forEach(stage => {
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });

    const total = restaurants.length;
    return [
      { stage: 'Applications', count: total, percentage: 100, value: total },
      { stage: 'Documents', count: stageCounts.documents_pending + stageCounts.under_review + stageCounts.menu_setup + stageCounts.banking_setup + stageCounts.ready_to_launch + stageCounts.live, percentage: total > 0 ? Math.round(((stageCounts.documents_pending + stageCounts.under_review + stageCounts.menu_setup + stageCounts.banking_setup + stageCounts.ready_to_launch + stageCounts.live) / total) * 100) : 0, value: stageCounts.documents_pending + stageCounts.under_review + stageCounts.menu_setup + stageCounts.banking_setup + stageCounts.ready_to_launch + stageCounts.live },
      { stage: 'Review', count: stageCounts.under_review + stageCounts.menu_setup + stageCounts.banking_setup + stageCounts.ready_to_launch + stageCounts.live, percentage: total > 0 ? Math.round(((stageCounts.under_review + stageCounts.menu_setup + stageCounts.banking_setup + stageCounts.ready_to_launch + stageCounts.live) / total) * 100) : 0, value: stageCounts.under_review + stageCounts.menu_setup + stageCounts.banking_setup + stageCounts.ready_to_launch + stageCounts.live },
      { stage: 'Ready', count: stageCounts.ready_to_launch + stageCounts.live, percentage: total > 0 ? Math.round(((stageCounts.ready_to_launch + stageCounts.live) / total) * 100) : 0, value: stageCounts.ready_to_launch + stageCounts.live },
      { stage: 'Live', count: stageCounts.live, percentage: total > 0 ? Math.round((stageCounts.live / total) * 100) : 0, value: stageCounts.live },
    ];
  }, [restaurants]);

  // Time to Launch Trends (last 12 weeks)
  const timeToLaunchTrends = useMemo(() => {
    const now = new Date();
    const weeks: Array<{ week: string; avgDays: number; count: number }> = [];
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(now, i * 7));
      const weekEnd = endOfWeek(weekStart);
      const weekLabel = format(weekStart, 'MMM d');
      
      const liveInWeek = restaurants.filter(r => {
        const stage = getOnboardingStage(r);
        if (stage !== 'live' || !r.business_verified_at) return false;
        const verifiedAt = parseISO(r.business_verified_at);
        return verifiedAt >= weekStart && verifiedAt <= weekEnd;
      });

      const avgDays = liveInWeek.length > 0
        ? liveInWeek.reduce((sum, r) => {
            const days = differenceInDays(
              parseISO(r.business_verified_at!),
              parseISO(r.created_at)
            );
            return sum + days;
          }, 0) / liveInWeek.length
        : 0;

      weeks.push({
        week: weekLabel,
        avgDays: Math.round(avgDays * 10) / 10,
        count: liveInWeek.length,
      });
    }

    return weeks;
  }, [restaurants]);

  // Weekly Trends (Applications, Approvals, Launches)
  const weeklyTrends = useMemo(() => {
    const now = new Date();
    const weeks: Array<{ week: string; applications: number; approvals: number; launches: number }> = [];
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(now, i * 7));
      const weekEnd = endOfWeek(weekStart);
      const weekLabel = format(weekStart, 'MMM d');
      
      const applications = restaurants.filter(r => {
        const created = parseISO(r.created_at);
        return created >= weekStart && created <= weekEnd;
      }).length;

      const approvals = restaurants.filter(r => {
        if (!r.business_verified_at) return false;
        const verified = parseISO(r.business_verified_at);
        return verified >= weekStart && verified <= weekEnd;
      }).length;

      const launches = restaurants.filter(r => {
        const stage = getOnboardingStage(r);
        if (stage !== 'live') return false;
        if (!r.business_verified_at) return false;
        const verified = parseISO(r.business_verified_at);
        return verified >= weekStart && verified <= weekEnd;
      }).length;

      weeks.push({
        week: weekLabel,
        applications,
        approvals,
        launches,
      });
    }

    return weeks;
  }, [restaurants]);

  // Stage Distribution for Pie Chart
  const stageDistribution = useMemo(() => {
    const stages = restaurants.map(getOnboardingStage);
    const distribution: Record<string, number> = {};
    
    stages.forEach(stage => {
      distribution[stage] = (distribution[stage] || 0) + 1;
    });

    return Object.entries(distribution).map(([name, value]) => ({
      name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value,
    }));
  }, [restaurants]);

  // Priority Breakdown
  const priorityBreakdown = useMemo(() => {
    const high = restaurants.filter(r => {
      const days = getDaysInStage(r);
      const stage = getOnboardingStage(r);
      return (stage === 'under_review' && days > 2) ||
             (stage === 'ready_to_launch' && days > 1);
    }).length;

    const medium = restaurants.filter(r => {
      const days = getDaysInStage(r);
      return days > 5 && days <= 10;
    }).length;

    const low = restaurants.length - high - medium;

    return [
      { priority: 'High', count: high, color: '#ef4444' },
      { priority: 'Medium', count: medium, color: '#f59e0b' },
      { priority: 'Low', count: low, color: '#10b981' },
    ];
  }, [restaurants]);

  // Calculate conversion rate change (vs previous period)
  const conversionRateChange = useMemo(() => {
    // This would ideally compare to historical data
    // For now, return a placeholder
    return { value: 0, isPositive: true };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
            Executive Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time KPIs and performance metrics for restaurant onboarding
          </p>
        </div>
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Last 30 Days
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {conversionRateChange.isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span>{stats.live} of {stats.total} restaurants live</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time to Launch</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTimeToLaunch}d</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {stats.avgTimeToLaunch < 7 ? (
                <>
                  <Zap className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">Fast turnaround</span>
                </>
              ) : stats.avgTimeToLaunch < 14 ? (
                <>
                  <Activity className="h-3 w-3 text-yellow-600 mr-1" />
                  <span>On track</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 text-red-600 mr-1" />
                  <span className="text-red-600">Needs attention</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReview}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {stats.pendingReview > 5 ? (
                <>
                  <AlertCircle className="h-3 w-3 text-red-600 mr-1" />
                  <span className="text-red-600">High volume - action needed</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 text-green-600 mr-1" />
                  <span>Normal volume</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Launch</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.readyToLaunch}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {stats.readyToLaunch > 0 ? (
                <>
                  <AlertCircle className="h-3 w-3 text-orange-600 mr-1" />
                  <span className="text-orange-600">Action required</span>
                </>
              ) : (
                <span>All clear</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionFunnel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'percentage') return `${value}%`;
                    return value;
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" name="Count" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {conversionFunnel.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.count}</span>
                    <Badge variant="outline">{item.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stageDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time to Launch Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Average Time to Launch (Last 12 Weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeToLaunchTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `${value} days`}
                  labelFormatter={(label) => `Week: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="avgDays"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  name="Avg Days"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Activity Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke="#3b82f6"
                  name="Applications"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="approvals"
                  stroke="#10b981"
                  name="Approvals"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="launches"
                  stroke="#f59e0b"
                  name="Launches"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Priority Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {priorityBreakdown.map((item) => (
              <div
                key={item.priority}
                className="p-4 rounded-lg border"
                style={{ borderColor: item.color, backgroundColor: `${item.color}10` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{item.priority} Priority</span>
                  <Badge style={{ backgroundColor: item.color, color: 'white' }}>
                    {item.count}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(item.count / restaurants.length) * 100}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



























