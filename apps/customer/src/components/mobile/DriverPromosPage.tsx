// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Flame,
  DollarSign,
  TrendingUp,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  Zap,
  Gift,
  Target,
  Menu,
  Bell
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

 type DriverPromosPageProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

export function DriverPromosPage({ onOpenMenu, onOpenNotifications }: DriverPromosPageProps) {
  const [loading, setLoading] = useState(true);
  const [activePromos, setActivePromos] = useState<any[]>([]);
  const [myPromos, setMyPromos] = useState<any[]>([]);
  const [completedPromos, setCompletedPromos] = useState<any[]>([]);
  const [surgeZones, setSurgeZones] = useState<any[]>([]);
  const [referralData, setReferralData] = useState<any>(null);

  useEffect(() => {
    fetchPromosData();
  }, []);

  const fetchPromosData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active promotions
      const { data: promos, error: promosError } = await supabase
        .from('driver_promotions')
        .select('*')
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString())
        .lte('starts_at', new Date().toISOString())
        .order('priority', { ascending: true });

      if (promosError) {
        console.error('DriverPromosPage: error fetching active promos', promosError);
      } else {
        setActivePromos(promos || []);
      }

      // Fetch driver's enrolled promotions
      const { data: enrolled, error: enrolledError } = await supabase
        .from('driver_promotion_participation')
        .select(`
          *,
          promotion:driver_promotions(*)
        `)
        .eq('driver_id', user.id)
        .eq('is_completed', false);

      if (enrolledError) {
        console.error('DriverPromosPage: error fetching enrolled promos', enrolledError);
      } else {
        setMyPromos(enrolled || []);
      }

      // Fetch completed promotions (this month)
      const { data: completed, error: completedError } = await supabase
        .from('driver_promotion_participation')
        .select(`
          *,
          promotion:driver_promotions(*)
        `)
        .eq('driver_id', user.id)
        .eq('is_completed', true)
        .gte('completed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      if (completedError) {
        console.error('DriverPromosPage: error fetching completed promos', completedError);
      } else {
        setCompletedPromos(completed || []);
      }

      // Fetch active surge zones
      const { data: zones, error: zonesError } = await supabase
        .from('driver_surge_zones')
        .select('*')
        .eq('is_active', true)
        .gte('active_until', new Date().toISOString());

      if (zonesError) {
        console.error('DriverPromosPage: error fetching surge zones', zonesError);
      } else {
        setSurgeZones(zones || []);
      }

      // Fetch referral data
      const { data: referrals, error: referralsError } = await supabase
        .from('driver_referrals')
        .select('*')
        .eq('referrer_driver_id', user.id);
      if (referralsError) {
        console.error('DriverPromosPage: error fetching referrals', referralsError);
      } else {
        const totalEarned = referrals
          ?.filter(r => r.referrer_paid)
          .reduce((sum, r) => sum + (r.referrer_reward_cents || 0), 0) || 0;

        setReferralData({
          code: referrals?.[0]?.referral_code || `REFER_${user.id.slice(0, 8).toUpperCase()}`,
          activeReferrals: referrals?.filter(r => r.status === 'qualified').length || 0,
          totalEarned: totalEarned / 100,
        });
      }

    } catch (error) {
      console.error('Error fetching promos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollPromo = async (promoId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const promo = activePromos.find(p => p.id === promoId);
      
      const { error } = await supabase
        .from('driver_promotion_participation')
        .insert({
          driver_id: user.id,
          promotion_id: promoId,
          requirement_value: promo.requirement_value,
        });

      if (error) throw error;

      toast.success(`Enrolled in ${promo.title}!`);
      fetchPromosData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to enroll');
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const diff = end - now;

    if (diff < 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const getUrgencyColor = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const hoursLeft = (end - now) / (1000 * 60 * 60);

    if (hoursLeft < 6) return 'from-red-500 to-orange-500';
    if (hoursLeft < 24) return 'from-orange-500 to-yellow-500';
    return 'from-blue-500 to-purple-500';
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'delivery_count': return <Target className="h-6 w-6" />;
      case 'time_based': return <Clock className="h-6 w-6" />;
      case 'peak_hours': return <Zap className="h-6 w-6" />;
      case 'geographic': return <MapPin className="h-6 w-6" />;
      case 'streak_based': return <Flame className="h-6 w-6" />;
      default: return <Gift className="h-6 w-6" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Gift className="h-12 w-12 animate-pulse text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => {
                if (onOpenMenu) {
                  onOpenMenu();
                } else {
                  toast.info('Menu coming soon.');
                }
              }}
              className="w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (onOpenNotifications) {
                  onOpenNotifications();
                } else {
                  toast.info('Notifications coming soon.');
                }
              }}
              className="w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition"
            >
              <Bell className="h-5 w-5 text-gray-700" />
            </button>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 text-right mb-2">
            Promos
          </h1>
          <p className="text-sm text-slate-600 text-right">Boost your earnings with special offers</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* My Active Challenges */}
        {myPromos.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">🔥 My Active Challenges</h2>
            {myPromos.map((enrollment) => {
              const promo = enrollment.promotion;
              const progress = (enrollment.current_progress / enrollment.requirement_value) * 100;
              const isAlmostDone = progress >= 80;

              return (
                <Card 
                  key={enrollment.id}
                  className={`border-2 ${isAlmostDone ? 'animate-pulse' : ''}`}
                  style={{ 
                    borderColor: isAlmostDone ? '#10b981' : '#8b5cf6',
                    background: `linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(59, 130, 246, 0.05))`
                  }}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white text-2xl">
                          {promo.icon || '🎯'}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{promo.title}</h3>
                          <p className="text-sm text-gray-600">{promo.short_description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {enrollment.current_progress} / {enrollment.requirement_value}
                        </span>
                        <span className="text-purple-600 font-bold">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Reward & Time */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-1 text-green-600 font-bold">
                        <DollarSign className="h-4 w-4" />
                        ${(promo.reward_amount_cents / 100).toFixed(2)}
                      </div>
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                        <Clock className="h-3 w-3 mr-1" />
                        {getTimeRemaining(promo.ends_at)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Surge Zones */}
        {surgeZones.length > 0 && (
          <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-600" />
                🔥 Surge Zones Active
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {surgeZones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-600" />
                    <span className="font-medium">{zone.zone_name}</span>
                  </div>
                  <Badge className={`
                    ${zone.current_multiplier >= 2.0 ? 'bg-red-600' :
                      zone.current_multiplier >= 1.5 ? 'bg-orange-500' :
                      'bg-yellow-500'} text-white
                  `}>
                    {zone.current_multiplier}x
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Available Challenges */}
        {activePromos.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">🎯 Available Challenges</h2>
            {activePromos.map((promo) => {
              const isEnrolled = myPromos.some(m => m.promotion_id === promo.id);
              const spotsLeft = promo.max_participants ? promo.max_participants - promo.current_participants : null;
              const isFull = spotsLeft !== null && spotsLeft <= 0;

              return (
                <Card 
                  key={promo.id}
                  className={`border-2 ${promo.is_featured ? 'border-purple-300' : 'border-gray-200'}`}
                >
                  <CardContent className="pt-4">
                    {promo.is_featured && (
                      <Badge className="mb-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                        ⭐ Featured
                      </Badge>
                    )}

                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${getUrgencyColor(promo.ends_at)} rounded-xl flex items-center justify-center text-white`}>
                        {getChallengeIcon(promo.challenge_type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{promo.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{promo.description}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Reward:</span>
                        <span className="text-lg font-bold text-green-600">
                          ${(promo.reward_amount_cents / 100).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Time left:</span>
                        <Badge variant="outline" className="text-orange-600">
                          <Clock className="h-3 w-3 mr-1" />
                          {getTimeRemaining(promo.ends_at)}
                        </Badge>
                      </div>

                      {spotsLeft !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Spots left:</span>
                          <Badge variant={spotsLeft < 20 ? 'destructive' : 'outline'}>
                            {spotsLeft} spots
                          </Badge>
                        </div>
                      )}
                    </div>

                    {!isEnrolled && !isFull && (
                      <Button 
                        onClick={() => handleEnrollPromo(promo.id)}
                        className="w-full mt-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Accept Challenge
                      </Button>
                    )}

                    {isEnrolled && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-center text-sm text-blue-700 font-medium">
                        ✓ Enrolled - Check "My Active Challenges" above
                      </div>
                    )}

                    {isFull && !isEnrolled && (
                      <div className="mt-3 p-2 bg-red-50 rounded text-center text-sm text-red-700 font-medium">
                        ❌ Challenge Full
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Referral Program */}
        {referralData && (
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                👥 Refer a Driver
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  You earn <span className="font-bold text-green-600">$500</span> per qualified driver
                </p>
                <p className="text-sm text-gray-700">
                  They earn <span className="font-bold text-green-600">$300</span> sign-on bonus
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border-2 border-green-300">
                <p className="text-xs text-gray-600 mb-1">Your Referral Code:</p>
                <p className="text-2xl font-bold text-center text-green-700">
                  {referralData.code}
                </p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Active referrals:</span>
                <span className="font-bold">{referralData.activeReferrals}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total earned:</span>
                <span className="font-bold text-green-600">${referralData.totalEarned.toFixed(2)}</span>
              </div>

              <Button className="w-full bg-green-600 hover:bg-green-700">
                <Users className="h-4 w-4 mr-2" />
                Share Referral Code
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Completed This Month */}
        {completedPromos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                ✅ Completed This Month
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedPromos.map((enrollment) => {
                const promo = enrollment.promotion;
                return (
                  <div key={enrollment.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">{promo.title}</span>
                    </div>
                    <span className="font-bold text-green-600">
                      +${(enrollment.reward_amount_cents / 100).toFixed(2)}
                    </span>
                  </div>
                );
              })}
              <div className="pt-2 border-t flex items-center justify-between">
                <span className="font-medium">Total earned:</span>
                <span className="text-xl font-bold text-green-600">
                  ${(completedPromos.reduce((sum, e) => sum + (e.reward_amount_cents || 0), 0) / 100).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {activePromos.length === 0 && myPromos.length === 0 && (
          <div className="text-center py-12">
            <Gift className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Promos</h3>
            <p className="text-sm text-gray-600">
              Check back soon for new earning opportunities!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

