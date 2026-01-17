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
  const [percentage, setPercentage] = useState<number>(70);
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const fetchCurrent = async () => {
    const { data, error } = await supabase
      .from('driver_payout_settings')
      .select('percentage')
      .eq('is_active', true)
      .maybeSingle();
    if (!error && data?.percentage != null) setPercentage(Number(data.percentage));
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
        percentage,
        is_active: true,
        updated_by: userData?.user?.id || null,
      });
      if (error) throw error;
      toast({ title: 'Payout updated', description: `Drivers now earn ${percentage}% of subtotal + 100% tips.` });
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
          <Label className="mb-2 block">Driver percentage of order subtotal</Label>
          <div className="flex items-center gap-4">
            <Slider value={[percentage]} onValueChange={(v) => setPercentage(v[0])} min={50} max={95} step={1} className="flex-1" />
            <Input type="number" min={0} max={100} value={percentage} onChange={(e) => setPercentage(Math.max(0, Math.min(100, Number(e.target.value))))} className="w-20" />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Formula: Earnings = {`{percentage}% of subtotal`} + 100% of tip</p>
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
