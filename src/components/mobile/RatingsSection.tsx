// @ts-nocheck
import React from 'react';
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
import { useFeederTierProfile } from '@/hooks/useFeederTierProfile';
import { TIER_PERKS } from '@/utils/ratingHelpers';

export const RatingsSection: React.FC = () => {
  const { tier, tierConfig, metrics, progress, perks, loading } = useFeederTierProfile();

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
    if (!progress.nextTier) return 100;
    const metCount = progress.requirements.filter(r => r.met).length;
    return Math.round((metCount / progress.requirements.length) * 100);
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="bg-background border-b border-border/50 px-4 py-3 sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <h1 className="text-2xl font-bold text-gray-900">Ratings & Performance</h1>
        </div>
        
        {/* Current Tier Badge */}
        <Card className="border-2" style={{ backgroundColor: tierConfig.color, borderColor: tierConfig.borderColor || tierConfig.color }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold" style={{ color: tierConfig.textColor }}>
                {tierConfig.name}
              </h1>
              <p className="text-sm mt-1" style={{ color: tierConfig.textColor, opacity: 0.8 }}>
                {metrics.rolling_deliveries} deliveries completed
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
                {renderStars(metrics.rolling_rating)}
                <span className="text-2xl font-bold ml-2">{metrics.rolling_rating.toFixed(2)}</span>
              </div>
              <Badge variant="secondary">{metrics.rolling_deliveries} ratings</Badge>
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
                <p className="text-2xl font-bold">{metrics.rolling_completion_rate}%</p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
              <div className="text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{metrics.rolling_on_time_rate}%</p>
                <p className="text-xs text-muted-foreground">On Time</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-center">
              <ThumbsUp className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{metrics.rolling_cancel_rate}%</p>
              <p className="text-xs text-muted-foreground">Cancellation Rate</p>
            </div>
          </CardContent>
        </Card>

        {/* Next Tier Progress */}
        {progress.nextTier && progress.nextTierConfig && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress to {progress.nextTierConfig.name}
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
                <h4 className="font-medium text-sm">Requirements for {progress.nextTierConfig.name}:</h4>
                
                <div className="space-y-2 text-sm">
                  {progress.requirements.map((req) => (
                    <div key={req.label} className="flex justify-between items-center">
                      <span>{req.label}: {req.required}{req.unit}</span>
                      <Badge variant={req.met ? "default" : "secondary"}>
                        {req.met ? "✓" : `${req.current}${req.unit}`}
                      </Badge>
                    </div>
                  ))}
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
              {tierConfig.name} Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {perks.map((perk, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{perk}</span>
                </div>
              ))}
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
