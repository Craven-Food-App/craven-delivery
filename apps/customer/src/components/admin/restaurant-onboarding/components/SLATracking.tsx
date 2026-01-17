import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Zap,
  Target
} from 'lucide-react';
import type { RestaurantOnboardingData } from '../types';
import { getOnboardingStage, getDaysInStage } from '../utils/helpers';

interface SLATrackingProps {
  restaurants: RestaurantOnboardingData[];
}

interface SLAMetrics {
  total: number;
  onTrack: number;
  atRisk: number;
  overdue: number;
  averageDays: number;
}

interface OverdueRestaurant {
  restaurant: RestaurantOnboardingData;
  daysInStage: number;
  daysOverdue: number;
  stage: string;
  slaTarget: number;
}

// SLA targets in days for each stage
const SLA_TARGETS = {
  documents_pending: 2, // 2 days to submit documents
  verification_pending: 1, // 1 day for admin to verify
  setup_in_progress: 5, // 5 days to complete menu & banking
  ready_to_launch: 1, // 1 day for final review
  live: 0, // Already live
};

export function SLATracking({ restaurants }: SLATrackingProps) {
  const { metrics, overdueRestaurants, atRiskRestaurants } = useMemo(() => {
    const now = new Date();
    const overdue: OverdueRestaurant[] = [];
    const atRisk: OverdueRestaurant[] = [];
    let totalDays = 0;
    let restaurantCount = 0;

    restaurants.forEach((restaurant) => {
      // Skip live restaurants
      if (restaurant.go_live_ready) return;

      const stage = getOnboardingStage(restaurant);
      const daysInStage = getDaysInStage(restaurant);
      const slaTarget = SLA_TARGETS[stage] || 3;
      const daysOverdue = daysInStage - slaTarget;

      totalDays += daysInStage;
      restaurantCount++;

      if (daysOverdue > 0) {
        overdue.push({
          restaurant,
          daysInStage,
          daysOverdue,
          stage,
          slaTarget,
        });
      } else if (daysInStage >= slaTarget * 0.8) {
        // At risk if within 80% of SLA
        atRisk.push({
          restaurant,
          daysInStage,
          daysOverdue: 0,
          stage,
          slaTarget,
        });
      }
    });

    // Sort by days overdue (most overdue first)
    overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
    atRisk.sort((a, b) => b.daysInStage - a.daysInStage);

    const metrics: SLAMetrics = {
      total: restaurantCount,
      onTrack: restaurantCount - overdue.length - atRisk.length,
      atRisk: atRisk.length,
      overdue: overdue.length,
      averageDays: restaurantCount > 0 ? Math.round(totalDays / restaurantCount) : 0,
    };

    return { metrics, overdueRestaurants: overdue, atRiskRestaurants: atRisk };
  }, [restaurants]);

  const getStageName = (stage: string): string => {
    const names: Record<string, string> = {
      documents_pending: 'Documents Pending',
      verification_pending: 'Verification',
      setup_in_progress: 'Setup',
      ready_to_launch: 'Ready to Launch',
      live: 'Live',
    };
    return names[stage] || stage;
  };

  const slaPercentage = metrics.total > 0 
    ? Math.round((metrics.onTrack / metrics.total) * 100) 
    : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold mb-2">SLA Tracking & Alerts</h3>
        <p className="text-muted-foreground">
          Monitor onboarding timelines and identify bottlenecks
        </p>
      </div>

      {/* SLA Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Active</p>
              <Target className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{metrics.total}</p>
            <Progress value={100} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">On Track</p>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">{metrics.onTrack}</p>
            <Progress 
              value={metrics.total > 0 ? (metrics.onTrack / metrics.total) * 100 : 0} 
              className="h-2 mt-2 bg-green-100" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">At Risk</p>
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-yellow-600">{metrics.atRisk}</p>
            <Progress 
              value={metrics.total > 0 ? (metrics.atRisk / metrics.total) * 100 : 0} 
              className="h-2 mt-2 bg-yellow-100" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Overdue</p>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600">{metrics.overdue}</p>
            <Progress 
              value={metrics.total > 0 ? (metrics.overdue / metrics.total) * 100 : 0} 
              className="h-2 mt-2 bg-red-100" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Avg Time</p>
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{metrics.averageDays}d</p>
            <p className="text-xs text-muted-foreground mt-2">Per stage average</p>
          </CardContent>
        </Card>
      </div>

      {/* SLA Performance Banner */}
      <Card className={`border-2 ${
        slaPercentage >= 90 ? 'bg-green-50 border-green-300' :
        slaPercentage >= 70 ? 'bg-yellow-50 border-yellow-300' :
        'bg-red-50 border-red-300'
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {slaPercentage >= 90 ? (
                <TrendingUp className="h-8 w-8 text-green-600" />
              ) : slaPercentage >= 70 ? (
                <Zap className="h-8 w-8 text-yellow-600" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-600" />
              )}
              <div>
                <p className="text-2xl font-bold">
                  {slaPercentage}% SLA Compliance
                </p>
                <p className="text-sm text-muted-foreground">
                  {metrics.onTrack} of {metrics.total} restaurants on track
                </p>
              </div>
            </div>
            <Badge 
              variant={slaPercentage >= 90 ? 'default' : 'destructive'}
              className="text-lg px-4 py-2"
            >
              {slaPercentage >= 90 ? '✓ Excellent' : 
               slaPercentage >= 70 ? '⚠ Fair' : 
               '✗ Needs Attention'}
            </Badge>
          </div>
          <Progress value={slaPercentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Overdue Restaurants */}
      {overdueRestaurants.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Overdue Restaurants ({overdueRestaurants.length})
            </CardTitle>
            <CardDescription>
              These restaurants have exceeded their SLA targets and need immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {overdueRestaurants.map(({ restaurant, daysInStage, daysOverdue, stage, slaTarget }) => (
                  <div
                    key={restaurant.id}
                    className="p-4 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{restaurant.restaurant.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {restaurant.restaurant.city}, {restaurant.restaurant.state}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {daysOverdue}d OVERDUE
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div className="p-2 bg-white rounded border">
                        <p className="text-xs text-muted-foreground">Current Stage</p>
                        <p className="text-sm font-medium">{getStageName(stage)}</p>
                      </div>
                      <div className="p-2 bg-white rounded border">
                        <p className="text-xs text-muted-foreground">Days in Stage</p>
                        <p className="text-sm font-bold text-red-600">{daysInStage} days</p>
                      </div>
                      <div className="p-2 bg-white rounded border">
                        <p className="text-xs text-muted-foreground">SLA Target</p>
                        <p className="text-sm font-medium">{slaTarget} days</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Progress 
                        value={Math.min((daysInStage / slaTarget) * 100, 100)} 
                        className="h-2 bg-red-100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* At Risk Restaurants */}
      {atRiskRestaurants.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              At Risk Restaurants ({atRiskRestaurants.length})
            </CardTitle>
            <CardDescription>
              These restaurants are approaching their SLA deadlines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {atRiskRestaurants.map(({ restaurant, daysInStage, stage, slaTarget }) => (
                  <div
                    key={restaurant.id}
                    className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{restaurant.restaurant.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {getStageName(stage)} • {daysInStage}/{slaTarget} days
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                        {Math.round((daysInStage / slaTarget) * 100)}% used
                      </Badge>
                    </div>
                    <Progress 
                      value={(daysInStage / slaTarget) * 100} 
                      className="h-2 bg-yellow-100"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* All Clear Message */}
      {overdueRestaurants.length === 0 && atRiskRestaurants.length === 0 && metrics.total > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
              <h3 className="text-2xl font-bold text-green-900 mb-2">
                All Restaurants On Track! 🎉
              </h3>
              <p className="text-green-700">
                Great job! All {metrics.total} active restaurants are meeting their SLA targets.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

