import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Gift } from 'lucide-react';
import { toast } from 'sonner';

const PROMO_KEY = 'new_customer_365_cravemore_referral_promotion';

type PromoRow = {
  id: string;
  promotion_key: string;
  display_name: string;
  customer_facing_title: string;
  is_active: boolean;
  new_customer_only: boolean;
  account_created_after: string;
  account_created_before: string;
  campaign_starts_at: string;
  campaign_ends_at: string;
  referral_completion_deadline: string;
  required_qualifying_referrals: number;
  reward_duration_days: number;
  terms_version: string;
  stacking_policy: string;
};

type Stats = {
  enrolled: number;
  in_progress: number;
  reward_active: number;
  reward_pending: number;
  disqualified: number;
  expired: number;
};

/**
 * Admin controls for the layered new-customer 365 CraveMore referral promotion.
 * Extends existing referral settings — does not replace them.
 */
export function NewCustomer365PromoAdmin() {
  const [promo, setPromo] = useState<PromoRow | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referral_campaign_promotions')
        .select('*')
        .eq('promotion_key', PROMO_KEY)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setPromo(data as PromoRow | null);

      if (data?.id) {
        const { data: parts } = await supabase
          .from('referral_promotion_participations')
          .select('eligibility_status')
          .eq('promotion_id', data.id);

        const s: Stats = {
          enrolled: parts?.length || 0,
          in_progress: 0,
          reward_active: 0,
          reward_pending: 0,
          disqualified: 0,
          expired: 0,
        };
        (parts || []).forEach((p: { eligibility_status: string }) => {
          if (p.eligibility_status === 'in_progress' || p.eligibility_status === 'eligible') {
            s.in_progress += 1;
          } else if (p.eligibility_status === 'reward_active') s.reward_active += 1;
          else if (p.eligibility_status === 'reward_pending') s.reward_pending += 1;
          else if (p.eligibility_status === 'disqualified') s.disqualified += 1;
          else if (p.eligibility_status === 'expired') s.expired += 1;
        });
        setStats(s);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to load 365 promo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!promo) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('referral_campaign_promotions')
        .update({
          is_active: promo.is_active,
          customer_facing_title: promo.customer_facing_title,
          account_created_after: promo.account_created_after,
          account_created_before: promo.account_created_before,
          campaign_starts_at: promo.campaign_starts_at,
          campaign_ends_at: promo.campaign_ends_at,
          referral_completion_deadline: promo.referral_completion_deadline,
          required_qualifying_referrals: promo.required_qualifying_referrals,
          reward_duration_days: promo.reward_duration_days,
          terms_version: promo.terms_version,
          updated_at: new Date().toISOString(),
        })
        .eq('id', promo.id);
      if (error) throw error;
      toast.success('365 CraveMore promo saved');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Loading 365 promo…</p>;
  }

  if (!promo) {
    return (
      <Card className="mt-3">
        <CardContent className="p-3 text-sm text-muted-foreground">
          Promotion config not found. Apply migration{' '}
          <code>20260723010000_new_customer_365_cravemore_referral_promo.sql</code>.
        </CardContent>
      </Card>
    );
  }

  const toLocalInput = (iso: string) => {
    try {
      return new Date(iso).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  return (
    <Card className="mt-3">
      <CardHeader className="p-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gift className="w-4 h-4" />
          New Customer 365 CraveMore Promotion
        </CardTitle>
        <CardDescription className="text-xs mt-0.5">
          Layered on the existing referral program. Progress uses existing referral records.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Active</Label>
            <p className="text-[11px] text-muted-foreground">{promo.promotion_key}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={promo.is_active ? 'default' : 'secondary'} className="text-xs">
              {promo.is_active ? 'Active' : 'Off'}
            </Badge>
            <Switch
              checked={promo.is_active}
              onCheckedChange={(v) => setPromo({ ...promo, is_active: v })}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Customer-facing title</Label>
          <Input
            className="h-8 text-sm"
            value={promo.customer_facing_title}
            onChange={(e) => setPromo({ ...promo, customer_facing_title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Required qualifying referrals</Label>
            <Input
              className="h-8 text-sm"
              type="number"
              min={1}
              value={promo.required_qualifying_referrals}
              onChange={(e) =>
                setPromo({
                  ...promo,
                  required_qualifying_referrals: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Reward duration (days)</Label>
            <Input
              className="h-8 text-sm"
              type="number"
              min={1}
              value={promo.reward_duration_days}
              onChange={(e) =>
                setPromo({
                  ...promo,
                  reward_duration_days: Math.max(1, Number(e.target.value) || 365),
                })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Account created after</Label>
            <Input
              className="h-8 text-sm"
              type="datetime-local"
              value={toLocalInput(promo.account_created_after)}
              onChange={(e) =>
                setPromo({
                  ...promo,
                  account_created_after: new Date(e.target.value).toISOString(),
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Account created before</Label>
            <Input
              className="h-8 text-sm"
              type="datetime-local"
              value={toLocalInput(promo.account_created_before)}
              onChange={(e) =>
                setPromo({
                  ...promo,
                  account_created_before: new Date(e.target.value).toISOString(),
                })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Campaign ends</Label>
            <Input
              className="h-8 text-sm"
              type="datetime-local"
              value={toLocalInput(promo.campaign_ends_at)}
              onChange={(e) =>
                setPromo({
                  ...promo,
                  campaign_ends_at: new Date(e.target.value).toISOString(),
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Referral completion deadline</Label>
            <Input
              className="h-8 text-sm"
              type="datetime-local"
              value={toLocalInput(promo.referral_completion_deadline)}
              onChange={(e) =>
                setPromo({
                  ...promo,
                  referral_completion_deadline: new Date(e.target.value).toISOString(),
                })
              }
            />
          </div>
        </div>

        {stats && (
          <div className="rounded-md border p-2 text-xs grid grid-cols-3 gap-2">
            <div>
              <span className="text-muted-foreground">Enrolled</span>
              <p className="font-semibold">{stats.enrolled}</p>
            </div>
            <div>
              <span className="text-muted-foreground">In progress</span>
              <p className="font-semibold">{stats.in_progress}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Reward active</span>
              <p className="font-semibold">{stats.reward_active}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Pending</span>
              <p className="font-semibold">{stats.reward_pending}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Disqualified</span>
              <p className="font-semibold">{stats.disqualified}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Expired</span>
              <p className="font-semibold">{stats.expired}</p>
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Stacking: {promo.stacking_policy} (promo queues after active paid CraveMore; never
          overwrites Stripe memberships).
        </p>

        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save promotion'}
        </Button>
      </CardContent>
    </Card>
  );
}
