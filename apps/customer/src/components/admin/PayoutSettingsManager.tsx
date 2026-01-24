import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Save } from 'lucide-react';

export const PayoutSettingsManager: React.FC = () => {
  const [basePayCents, setBasePayCents] = useState<number>(250); // $2.50 default
  const [shareBps, setShareBps] = useState<number>(7000); // 70% default (7000 basis points)
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // Convert basis points to percentage for display
  const sharePercentage = shareBps / 100;

  const fetchCurrent = async () => {
    const { data, error } = await supabase
      .from('driver_payout_settings')
      .select('driver_base_pay_cents, driver_delivery_fee_share_bps')
      .eq('is_active', true)
      .maybeSingle();
    if (!error && data) {
      if (data.driver_base_pay_cents != null) setBasePayCents(Number(data.driver_base_pay_cents));
      if (data.driver_delivery_fee_share_bps != null) setShareBps(Number(data.driver_delivery_fee_share_bps));
    }
  };

  useEffect(() => {
    fetchCurrent();
  }, []);

  const save = async () => {
    try {
      setLoading(true);
      // Deactivate existing active row and insert a new one to keep history
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('driver_payout_settings').update({ is_active: false }).eq('is_active', true);
      const { error } = await supabase.from('driver_payout_settings').insert({
        driver_base_pay_cents: basePayCents,
        driver_delivery_fee_share_bps: shareBps,
        is_active: true,
        updated_by: userData?.user?.id || null,
      });
      if (error) throw error;
      toast({ 
        title: 'Payout updated', 
        description: `Drivers now earn max($${(basePayCents/100).toFixed(2)}, ${sharePercentage}% of delivery fees) + 100% tips.` 
      });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Driver Payout Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="mb-2 block">Base Pay (Minimum Guarantee)</Label>
          <div className="flex items-center gap-4">
            <Input 
              type="number" 
              min={0} 
              step={10}
              value={basePayCents} 
              onChange={(e) => setBasePayCents(Math.max(0, Number(e.target.value)))} 
              className="w-32" 
            />
            <span className="text-sm text-muted-foreground">cents (${(basePayCents/100).toFixed(2)})</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Minimum amount driver earns per delivery (before tip). Acts as a floor, not additive.
          </p>
        </div>
        <div>
          <Label className="mb-2 block">Driver Share of Delivery Fees</Label>
          <div className="flex items-center gap-4">
            <Slider 
              value={[shareBps]} 
              onValueChange={(v) => setShareBps(v[0])} 
              min={0} 
              max={10000} 
              step={100} 
              className="flex-1" 
            />
            <Input 
              type="number" 
              min={0} 
              max={10000} 
              step={100}
              value={shareBps} 
              onChange={(e) => setShareBps(Math.max(0, Math.min(10000, Number(e.target.value))))} 
              className="w-24" 
            />
            <span className="text-sm text-muted-foreground">bps ({sharePercentage}%)</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Formula: Earnings = max(base pay, {sharePercentage}% of delivery fees) + 100% of tip
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Drivers get 0% of food subtotal. Only delivery fees are shared.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={loading} className="gap-2">
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayoutSettingsManager;
