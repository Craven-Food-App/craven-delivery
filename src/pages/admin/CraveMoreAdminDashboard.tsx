import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BarChart, Users, DollarSign, TrendingUp, Calendar, Crown, Calculator } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import LTVCACCalculator from '@/components/admin/LTVCACCalculator';

interface MembershipStats {
  totalSubscribers: number;
  byPlan: {
    monthly: number;
    annual: number;
    lifetime: number;
  };
  activeMemberships: number;
  canceledMemberships: number;
  totalRevenue: number;
  monthlyRevenue: number;
  waivedFees: number;
}

export const CraveMoreAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<MembershipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('user_memberships')
        .select('plan_key, status, started_at');

      if (membershipsError) throw membershipsError;

      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from('cravemore_plans')
        .select('*')
        .order('is_most_popular', { ascending: false });

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Fetch promos
      const { data: promosData, error: promosError } = await supabase
        .from('cravemore_promos')
        .select('*')
        .order('starts_at', { ascending: false });

      if (promosError) throw promosError;
      setPromos(promosData || []);

      // Calculate stats
      const totalSubscribers = memberships?.length || 0;
      const byPlan = {
        monthly: memberships?.filter((m) => m.plan_key === 'monthly').length || 0,
        annual: memberships?.filter((m) => m.plan_key === 'annual').length || 0,
        lifetime: memberships?.filter((m) => m.plan_key === 'lifetime').length || 0,
      };
      const activeMemberships = memberships?.filter((m) => m.status === 'active').length || 0;
      const canceledMemberships = memberships?.filter((m) => m.status === 'canceled').length || 0;

      // Calculate revenue (simplified - would need actual payment data)
      const monthlyRevenue = byPlan.monthly * 949 + byPlan.annual * (8900 / 12);
      const totalRevenue = monthlyRevenue * 12 + byPlan.lifetime * 29900;

      // Waived fees (would need to query orders with cravemore_delivery_fee_waived)
      const waivedFees = 0; // Placeholder

      setStats({
        totalSubscribers,
        byPlan,
        activeMemberships,
        canceledMemberships,
        totalRevenue,
        monthlyRevenue,
        waivedFees,
      });
    } catch (error) {
      console.error('Error fetching CraveMore stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4">Loading dashboard...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">CraveMore Admin Dashboard</h1>
        <p className="text-muted-foreground">Monitor membership metrics and performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Subscribers</p>
                <p className="text-2xl font-bold">{stats?.totalSubscribers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Memberships</p>
                <p className="text-2xl font-bold">{stats?.activeMemberships || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">
                  {stats ? formatCurrency(stats.monthlyRevenue) : '$0.00'}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Waived Fees</p>
                <p className="text-2xl font-bold">
                  {stats ? formatCurrency(stats.waivedFees) : '$0.00'}
                </p>
              </div>
              <BarChart className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="promos">Promos</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="ltv-calculator">LTV Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Subscribers by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Monthly</span>
                    <span className="font-semibold">{stats?.byPlan.monthly || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Annual</span>
                    <span className="font-semibold">{stats?.byPlan.annual || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lifetime</span>
                    <span className="font-semibold">{stats?.byPlan.lifetime || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats && stats.totalSubscribers > 0
                    ? `${Math.round((stats.byPlan.annual / stats.totalSubscribers) * 100)}%`
                    : '0%'}
                </p>
                <p className="text-sm text-muted-foreground">Annual plan conversion</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lifetime Status</CardTitle>
              </CardHeader>
              <CardContent>
                {plans.find((p) => p.plan_key === 'lifetime') && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sold</span>
                      <span className="font-semibold">
                        {plans.find((p) => p.plan_key === 'lifetime')?.lifetime_cap_used || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining</span>
                      <span className="font-semibold">
                        {Math.max(
                          0,
                          (plans.find((p) => p.plan_key === 'lifetime')?.lifetime_cap_total || 0) -
                            (plans.find((p) => p.plan_key === 'lifetime')?.lifetime_cap_used || 0)
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Plans</CardTitle>
              <CardDescription>Manage CraveMore plan pricing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{plan.display_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          ${(plan.price_cents / 100).toFixed(2)}
                          {plan.promo_price_cents && (
                            <span className="ml-2 text-orange-600">
                              (Promo: ${(plan.promo_price_cents / 100).toFixed(2)})
                            </span>
                          )}
                        </p>
                        {plan.badge_text && (
                          <Badge className="mt-2">{plan.badge_text}</Badge>
                        )}
                      </div>
                      <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Promotions</CardTitle>
              <CardDescription>Manage promotional pricing windows</CardDescription>
            </CardHeader>
            <CardContent>
              {promos.length === 0 ? (
                <p className="text-muted-foreground">No active promotions</p>
              ) : (
                <div className="space-y-4">
                  {promos.map((promo) => (
                    <div key={promo.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{promo.promo_key}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(promo.starts_at).toLocaleDateString()} -{' '}
                            {new Date(promo.ends_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                          {promo.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Memberships</CardTitle>
              <CardDescription>View and manage member subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Member list view would go here. This would show all active, canceled, and expired
                memberships with filtering and search capabilities.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ltv-calculator">
          <LTVCACCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CraveMoreAdminDashboard;

