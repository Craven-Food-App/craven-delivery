import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Store,
  Clock,
  CheckCircle,
  Rocket,
  TrendingUp,
  AlertCircle,
  Users,
  Calendar
} from 'lucide-react';
import type { OnboardingStats } from '../types';

interface StatsOverviewProps {
  stats: OnboardingStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const statCards = [
    {
      title: 'Total Restaurants',
      value: stats.total,
      icon: Store,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: `+${stats.thisWeek} this week`,
    },
    {
      title: 'Pending Review',
      value: stats.pendingReview,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      trend: stats.pendingReview > 5 ? '⚠️ High volume' : '✓ Normal',
      urgent: stats.pendingReview > 5,
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: `${Math.round((stats.inProgress / stats.total) * 100)}% of total`,
    },
    {
      title: 'Ready to Launch',
      value: stats.readyToLaunch,
      icon: Rocket,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: stats.readyToLaunch > 0 ? '🎉 Action needed!' : 'None waiting',
      highlight: stats.readyToLaunch > 0,
    },
    {
      title: 'Live Restaurants',
      value: stats.live,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: `${stats.conversionRate}% conversion`,
    },
    {
      title: 'Avg. Time to Launch',
      value: `${stats.avgTimeToLaunch}d`,
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      trend: stats.avgTimeToLaunch < 7 ? '⚡ Fast!' : stats.avgTimeToLaunch < 14 ? '✓ Good' : '⚠️ Slow',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statCards.map((stat, index) => (
        <Card 
          key={index}
          className={`hover:shadow-md transition-all duration-200 ${
            stat.highlight ? 'ring-2 ring-green-500 animate-pulse' : ''
          } ${stat.urgent ? 'ring-2 ring-yellow-500' : ''}`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.trend}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


