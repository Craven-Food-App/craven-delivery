import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Gift, Star, TrendingUp, Award, Zap, 
  Calendar, ShoppingBag, Heart, Crown 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LoyaltyDashboardProps {
  userId?: string;
}

export const LoyaltyDashboard = ({ userId }: LoyaltyDashboardProps) => {
  const navigate = useNavigate();

  // Mock data - replace with real data from Supabase
  const userPoints = 850;
  const userTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' = 'Gold';
  const pointsToNextTier = 150;
  const totalOrders = 24;
  const lifetimeSpent = 487.50;

  const tiers = [
    { name: 'Bronze', minPoints: 0, color: 'bg-orange-600', benefits: ['5% off', 'Birthday reward'] },
    { name: 'Silver', minPoints: 500, color: 'bg-gray-400', benefits: ['10% off', 'Free delivery monthly', 'Early access'] },
    { name: 'Gold', minPoints: 1000, color: 'bg-yellow-500', benefits: ['15% off', 'Free delivery always', 'Priority support'] },
    { name: 'Platinum', minPoints: 2500, color: 'bg-purple-600', benefits: ['20% off', 'Concierge service', 'Exclusive events'] },
  ];

  const rewards = [
    { id: 1, name: '$5 Off Order', points: 500, icon: Gift },
    { id: 2, name: 'Free Delivery', points: 200, icon: Zap },
    { id: 3, name: '$10 Off Order', points: 1000, icon: Gift },
    { id: 4, name: 'Free Appetizer', points: 300, icon: ShoppingBag },
  ];

  const recentActivity = [
    { date: '2025-01-15', description: 'Ordered from Italian Bistro', points: 50 },
    { date: '2025-01-12', description: 'Redeemed Free Delivery', points: -200 },
    { date: '2025-01-10', description: 'Ordered from Sushi Palace', points: 75 },
  ];

  const progressPercentage = (userPoints / (pointsToNextTier + userPoints)) * 100;

  return (
    <div className="space-y-3">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold mb-1">Crave'n Rewards</h2>
              <p className="text-sm opacity-90">Earn points with every order!</p>
            </div>
            <Crown className="h-12 w-12 opacity-50" />
          </div>
          
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div>
              <p className="text-xs opacity-75">Your Points</p>
              <p className="text-xl font-bold">{userPoints}</p>
            </div>
            <div>
              <p className="text-xs opacity-75">Tier</p>
              <p className="text-xl font-bold">{userTier}</p>
            </div>
            <div>
              <p className="text-xs opacity-75">Orders</p>
              <p className="text-xl font-bold">{totalOrders}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress to Next Tier */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {userTier === 'Platinum' as string ? 'Maximum Tier Reached!' : 'Progress to Next Tier'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {(userTier as string) === 'Platinum' ? (
            <div className="text-center py-3">
              <Crown className="h-10 w-10 mx-auto mb-1.5 text-purple-600" />
              <p className="text-sm font-semibold">You've reached the highest tier!</p>
              <p className="text-xs text-muted-foreground">Enjoy all premium benefits</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Current: {userPoints} points</span>
                <span>Next: {userPoints + pointsToNextTier} points</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {pointsToNextTier} more points to reach next tier!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Benefits */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" />
            Membership Tiers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="space-y-2">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`p-3 rounded-lg border-2 ${
                  tier.name === userTier ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${tier.color}`} />
                    <h4 className="text-sm font-semibold">{tier.name}</h4>
                  </div>
                  <Badge variant={tier.name === userTier ? 'default' : 'outline'} className="text-xs">
                    {tier.minPoints}+ points
                  </Badge>
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {tier.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <Award className="h-3 w-3" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Rewards */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Redeem Rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {rewards.map((reward) => {
              const Icon = reward.icon;
              const canRedeem = userPoints >= reward.points;
              
              return (
                <Card key={reward.id} className={!canRedeem ? 'opacity-50' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="h-6 w-6 text-primary" />
                      <Badge variant={canRedeem ? 'default' : 'outline'} className="text-xs">
                        {reward.points} pts
                      </Badge>
                    </div>
                    <h4 className="text-sm font-semibold mb-1.5">{reward.name}</h4>
                    <Button 
                      size="sm" 
                      className="w-full h-8 text-xs" 
                      disabled={!canRedeem}
                      variant={canRedeem ? 'default' : 'outline'}
                    >
                      {canRedeem ? 'Redeem' : 'Not Enough Points'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="space-y-2">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div>
                  <p className="font-medium text-xs">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.date}</p>
                </div>
                <Badge variant={activity.points > 0 ? 'default' : 'outline'} className="text-xs">
                  {activity.points > 0 ? '+' : ''}{activity.points} pts
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <ShoppingBag className="h-6 w-6 mx-auto mb-1.5 text-primary" />
            <p className="text-xl font-bold">{totalOrders}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Heart className="h-6 w-6 mx-auto mb-1.5 text-primary" />
            <p className="text-xl font-bold">${lifetimeSpent.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Lifetime Spent</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
