// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CraveMoreStatusChip } from '@/components/cravemore/CraveMoreStatusChip';
import { analytics } from '@/utils/cravemoreAnalytics';
import { CraveMorePaywall } from '@/components/cravemore/CraveMorePaywall';
import { CraveMoreText } from '@/components/ui/cravemore-text';
import { Calendar, CreditCard, X, CheckCircle } from 'lucide-react';

interface Membership {
  id: string;
  plan_key: string;
  status: string;
  started_at: string;
  renews_at: string | null;
  canceled_at: string | null;
  founding_member: boolean;
}

export const CraveMoreAccount: React.FC = () => {
  const navigate = useNavigate();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    fetchMembership();
  }, []);

  const fetchMembership = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setMembership(data ?? null);
    } catch (error) {
      console.error('Error fetching membership:', error);
      toast.error('Failed to load membership');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!membership || !confirm('Are you sure you want to cancel your membership?')) {
      return;
    }

    setCanceling(true);
    try {
      // Track cancellation
      analytics.canceled(membership.plan_key);

      if (membership.provider_subscription_id) {
        // Cancel Stripe subscription
        const { error } = await supabase.functions.invoke('cancel-cravemore-subscription', {
          body: { subscriptionId: membership.provider_subscription_id },
        });

        if (error) throw error;
      } else {
        // Lifetime or direct cancellation
        const { error } = await supabase
          .from('user_memberships')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('id', membership.id);

        if (error) throw error;
      }

      toast.success('Membership canceled successfully');
      fetchMembership();
    } catch (error) {
      console.error('Error canceling membership:', error);
      toast.error('Failed to cancel membership');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-4">Loading membership...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasActiveMembership = membership && (membership.status === 'active' || membership.status === 'trialing');

  if (!hasActiveMembership) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold">My <CraveMoreText /> Membership</h1>
          <Card>
            <CardHeader>
              <CardTitle>Membership Details</CardTitle>
              <CardDescription>Your CraveMore membership status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">You don&apos;t have an active membership yet.</p>
              <p className="text-sm text-muted-foreground">
                Just subscribed? It may take a few seconds for your membership to activate.
              </p>
              <Button onClick={() => { setLoading(true); fetchMembership(); }}>
                Check again
              </Button>
            </CardContent>
          </Card>
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Join <CraveMoreText /></h2>
            <CraveMorePaywall source="account" />
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlanDisplayName = (planKey: string) => {
    const names: { [key: string]: string } = {
      monthly: 'Monthly',
      annual: 'Annual',
      lifetime: 'Lifetime',
    };
    return names[planKey] || planKey;
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">My <CraveMoreText /> Membership</h1>
          <CraveMoreStatusChip
            foundingMember={membership.founding_member}
            planKey={membership.plan_key}
            size="md"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Membership Details</CardTitle>
            <CardDescription>Your active <CraveMoreText /> membership information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status */}
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold">Status: Active</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                Active
              </Badge>
            </div>

            {/* Plan */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Plan</p>
              <p className="text-lg font-semibold">{getPlanDisplayName(membership.plan_key)}</p>
            </div>

            {/* Started */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Member Since</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <p className="font-medium">{formatDate(membership.started_at)}</p>
              </div>
            </div>

            {/* Renews/Expires */}
            {membership.renews_at && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {membership.plan_key === 'lifetime' ? 'Never Expires' : 'Renews On'}
                </p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium">{formatDate(membership.renews_at)}</p>
                </div>
              </div>
            )}

            {/* Benefits */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">Your Benefits</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">$0 delivery fee on eligible orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">Priority customer support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">Early access to new restaurants</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">Member-only discounts</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {membership.plan_key !== 'lifetime' && (
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={canceling}
                  className="w-full sm:w-auto"
                >
                  <X className="w-4 h-4 mr-2" />
                  {canceling ? 'Canceling...' : 'Cancel Membership'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Your membership will remain active until {formatDate(membership.renews_at)}.
                </p>
              </div>
            )}

            {membership.plan_key === 'lifetime' && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-orange-600">
                  <CheckCircle className="w-5 h-5" />
                  <p className="font-semibold">Lifetime membership - never expires!</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CraveMoreAccount;

