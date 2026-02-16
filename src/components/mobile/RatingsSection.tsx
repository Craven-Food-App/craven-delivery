// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Star, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Award,
  Target,
  ThumbsUp,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

type DriverTier = 'feeder' | 'gold' | 'platinum' | 'diamond' | 'ultimate';

interface RatingStats {
  overallRating: number;
  completionRate: number;
  onTimeRate: number;
  customerRating: number;
  totalDeliveries: number;
  acceptanceRate: number;
  tier: DriverTier;
}

interface TierRequirements {
  minRating: number;
  minCompletionRate: number;
  minAcceptanceRate: number;
  minOnTimeRate: number;
  minDeliveries: number;
}

const tierConfig: Record<DriverTier, { 
  name: string; 
  color: string; 
  bgColor: string;
  icon: string;
  requirements: TierRequirements;
}> = {
  feeder: {
    name: 'Feeder',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: '🍽️',
    requirements: { minRating: 0, minCompletionRate: 0, minAcceptanceRate: 0, minOnTimeRate: 0, minDeliveries: 0 }
  },
  gold: {
    name: 'Gold',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: '🥇',
    requirements: { minRating: 4.70, minCompletionRate: 90, minAcceptanceRate: 60, minOnTimeRate: 90, minDeliveries: 50 }
  },
  platinum: {
    name: 'Platinum',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: '⚪',
    requirements: { minRating: 4.80, minCompletionRate: 95, minAcceptanceRate: 70, minOnTimeRate: 93, minDeliveries: 200 }
  },
  diamond: {
    name: 'Diamond',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: '💎',
    requirements: { minRating: 4.90, minCompletionRate: 97, minAcceptanceRate: 75, minOnTimeRate: 95, minDeliveries: 500 }
  },
  ultimate: {
    name: 'Ultimate',
    color: 'text-orange-600',
    bgColor: 'bg-black',
    icon: '👑',
    requirements: { minRating: 4.95, minCompletionRate: 98, minAcceptanceRate: 80, minOnTimeRate: 97, minDeliveries: 1000 }
  }
};

const getNextTier = (currentTier: DriverTier): DriverTier | null => {
  const tiers: DriverTier[] = ['feeder', 'gold', 'platinum', 'diamond', 'ultimate'];
  const currentIndex = tiers.indexOf(currentTier);
  return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
};

export const RatingsSection: React.FC = () => {
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatingStats();
  }, []);

  const fetchRatingStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get driver profile
      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('rating, total_deliveries')
        .eq('user_id', user.id)
        .single();

      // Get completed orders for calculating rates
      const { data: completedOrders } = await supabase
        .from('orders')
        .select('id, status, created_at')
        .eq('assigned_craver_id', user.id);

      // Get all order assignments for acceptance rate
      const { data: assignments } = await supabase
        .from('order_assignments')
        .select('status')
        .eq('driver_id', user.id);

      if (driverProfile) {
        const totalDeliveries = driverProfile.total_deliveries || 0;
        const rating = driverProfile.rating || 0;
        
        // Calculate completion rate
        const assignedOrders = completedOrders?.length || 0;
        const deliveredOrders = completedOrders?.filter(o => o.status === 'delivered').length || 0;
        const completionRate = assignedOrders > 0 ? (deliveredOrders / assignedOrders) * 100 : 100;

        // Calculate acceptance rate
        const totalAssignments = assignments?.length || 0;
        const acceptedAssignments = assignments?.filter(a => a.status === 'accepted').length || 0;
        const acceptanceRate = totalAssignments > 0 ? (acceptedAssignments / totalAssignments) * 100 : 100;

        // Estimate on-time rate
        const onTimeRate = Math.max(85, Math.min(97, rating * 20));

        // Determine tier based on the spec requirements
        let tier: DriverTier = 'feeder';
        if (rating >= 4.95 && completionRate >= 98 && totalDeliveries >= 1000 && onTimeRate >= 97) {
          tier = 'ultimate';
        } else if (rating >= 4.90 && completionRate >= 97 && totalDeliveries >= 500 && onTimeRate >= 95) {
          tier = 'diamond';
        } else if (rating >= 4.80 && completionRate >= 95 && totalDeliveries >= 200 && onTimeRate >= 93) {
          tier = 'platinum';
        } else if (rating >= 4.70 && completionRate >= 90 && totalDeliveries >= 50 && onTimeRate >= 90) {
          tier = 'gold';
        }

        setStats({
          overallRating: rating,
          completionRate: Math.round(completionRate),
          onTimeRate: Math.round(onTimeRate),
          customerRating: rating,
          totalDeliveries: totalDeliveries,
          acceptanceRate: Math.round(acceptanceRate),
          tier: tier
        });
      } else {
        // Default stats for new drivers — always start as Feeder
        setStats({
          overallRating: 0,
          completionRate: 0,
          onTimeRate: 0,
          customerRating: 0,
          totalDeliveries: 0,
          acceptanceRate: 0,
          tier: 'feeder'
        });
      }
    } catch (error) {
      console.error('Error fetching rating stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-16">
        <div className="text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-20 w-64 bg-muted rounded-lg mx-auto"></div>
            <div className="h-4 w-32 bg-muted rounded mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-16">
        <div className="text-center">
          <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Rating Data</h2>
          <p className="text-muted-foreground">Complete deliveries to see your performance stats!</p>
        </div>
      </div>
    );
  }

  const currentTierConfig = tierConfig[stats.tier];
  const nextTier = getNextTier(stats.tier);
  const nextTierConfig = nextTier ? tierConfig[nextTier] : null;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : i < rating 
            ? 'fill-yellow-200 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getProgressToNextTier = () => {
    if (!nextTierConfig) return 100;
    
    const requirements = nextTierConfig.requirements;
    const current = stats;
    
    const ratingProgress = Math.min((current.overallRating / requirements.minRating) * 100, 100);
    const completionProgress = Math.min((current.completionRate / requirements.minCompletionRate) * 100, 100);
    const onTimeProgress = Math.min((current.onTimeRate / requirements.minOnTimeRate) * 100, 100);
    const deliveryProgress = Math.min((current.totalDeliveries / requirements.minDeliveries) * 100, 100);
    
    return Math.min((ratingProgress + completionProgress + onTimeProgress + deliveryProgress) / 4, 100);
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="bg-background border-b border-border/50 px-4 py-3 sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <h1 className="text-2xl font-bold text-gray-900">Ratings & Performance</h1>
        </div>
        
        {/* Current Tier Badge */}
        <Card className={`${currentTierConfig.bgColor} border-2`}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl mb-2">{currentTierConfig.icon}</div>
              <h1 className={`text-2xl font-bold ${currentTierConfig.color} ${stats.tier === 'ultimate' ? 'text-orange-500' : ''}`}>
                {currentTierConfig.name} Feeder
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.totalDeliveries} deliveries completed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Overall Rating */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              Overall Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {renderStars(stats.overallRating)}
                <span className="text-2xl font-bold ml-2">{stats.overallRating}</span>
              </div>
              <Badge variant="secondary">{stats.totalDeliveries} ratings</Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Customer Rating</span>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{stats.customerRating}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{stats.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
              <div className="text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{stats.onTimeRate}%</p>
                <p className="text-xs text-muted-foreground">On Time</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-center">
              <ThumbsUp className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{stats.acceptanceRate}%</p>
              <p className="text-xs text-muted-foreground">Acceptance Rate</p>
            </div>
          </CardContent>
        </Card>

        {/* Next Tier Progress */}
        {nextTierConfig && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress to {nextTierConfig.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(getProgressToNextTier())}%
                </span>
              </div>
              <Progress value={getProgressToNextTier()} className="h-2" />
              
              <div className="space-y-3 mt-4">
                <h4 className="font-medium text-sm">Requirements for {nextTierConfig.name}:</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span>Rating: {nextTierConfig.requirements.minRating}+</span>
                    <Badge variant={stats.overallRating >= nextTierConfig.requirements.minRating ? "default" : "secondary"}>
                      {stats.overallRating >= nextTierConfig.requirements.minRating ? "✓" : stats.overallRating}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Completion: {nextTierConfig.requirements.minCompletionRate}%+</span>
                    <Badge variant={stats.completionRate >= nextTierConfig.requirements.minCompletionRate ? "default" : "secondary"}>
                      {stats.completionRate >= nextTierConfig.requirements.minCompletionRate ? "✓" : `${stats.completionRate}%`}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>On Time: {nextTierConfig.requirements.minOnTimeRate}%+</span>
                    <Badge variant={stats.onTimeRate >= nextTierConfig.requirements.minOnTimeRate ? "default" : "secondary"}>
                      {stats.onTimeRate >= nextTierConfig.requirements.minOnTimeRate ? "✓" : `${stats.onTimeRate}%`}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Deliveries: {nextTierConfig.requirements.minDeliveries}+</span>
                    <Badge variant={stats.totalDeliveries >= nextTierConfig.requirements.minDeliveries ? "default" : "secondary"}>
                      {stats.totalDeliveries >= nextTierConfig.requirements.minDeliveries ? "✓" : stats.totalDeliveries}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tier Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {currentTierConfig.name} Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {stats.tier === 'feeder' && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Standard orders only</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Basic support access</span>
                  </div>
                </>
              )}
              
              {stats.tier === 'gold' && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Early access to standard orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>+5 dispatch weight</span>
                  </div>
                </>
              )}
              
              {stats.tier === 'platinum' && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Access to premium merchants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Early scheduling unlock</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>+10 dispatch weight</span>
                  </div>
                </>
              )}

              {stats.tier === 'diamond' && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Priority dispatch access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>High-value retail access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Large order eligibility</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>+18 dispatch weight</span>
                  </div>
                </>
              )}
              
              {stats.tier === 'ultimate' && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Top dispatch priority (+30 weight)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Catering & premium retail first access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Dedicated support queue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Beta feature access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Enhanced referral bonus</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Performance trends coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
