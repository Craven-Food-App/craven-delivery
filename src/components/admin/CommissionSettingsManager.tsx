import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save, DollarSign } from 'lucide-react';

export const CommissionSettingsManager: React.FC = () => {
  const [restaurantCommission, setRestaurantCommission] = useState<number>(10);
  const [serviceFeePct, setServiceFeePct] = useState<number>(10);
  const [deliveryFeeBase, setDeliveryFeeBase] = useState<number>(200); // cents
  const [deliveryFeePerMile, setDeliveryFeePerMile] = useState<number>(50); // cents
  const [peakMultiplier, setPeakMultiplier] = useState<number>(1.5);
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const fetchCurrentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('commission_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!error && data) {
        setRestaurantCommission(Number(data.restaurant_commission_percent));
        setServiceFeePct(Number(data.customer_service_fee_percent));
        setDeliveryFeeBase(data.delivery_fee_base_cents);
        setDeliveryFeePerMile(data.delivery_fee_per_mile_cents);
        setPeakMultiplier(Number(data.peak_hour_multiplier));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    fetchCurrentSettings();
  }, []);

  const saveSettings = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();

      // Deactivate current settings
      await supabase
        .from('commission_settings')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new settings
      const { error } = await supabase
        .from('commission_settings')
        .insert({
          restaurant_commission_percent: restaurantCommission,
          customer_service_fee_percent: serviceFeePct,
          delivery_fee_base_cents: deliveryFeeBase,
          delivery_fee_per_mile_cents: deliveryFeePerMile,
          peak_hour_multiplier: peakMultiplier,
          is_active: true,
          updated_by: userData?.user?.id || null,
        });

      if (error) throw error;

      toast({
        title: 'Settings Updated',
        description: 'Commission and fee settings have been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Commission & Fee Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-2 block">Restaurant Commission (%)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[restaurantCommission]}
                onValueChange={(v) => setRestaurantCommission(v[0])}
                min={5}
                max={25}
                step={0.5}
                className="flex-1"
              />
              <Input
                type="number"
                min={5}
                max={25}
                step={0.5}
                value={restaurantCommission}
                onChange={(e) => setRestaurantCommission(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Customer Service Fee (%)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[serviceFeePct]}
                onValueChange={(v) => setServiceFeePct(v[0])}
                min={5}
                max={20}
                step={0.5}
                className="flex-1"
              />
              <Input
                type="number"
                min={5}
                max={20}
                step={0.5}
                value={serviceFeePct}
                onChange={(e) => setServiceFeePct(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Base Delivery Fee ($)</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={0}
                step={25}
                value={deliveryFeeBase / 100}
                onChange={(e) => setDeliveryFeeBase(Number(e.target.value) * 100)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">Base fee charged to customer</span>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Per-Mile Fee ($)</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={0}
                step={0.05}
                value={deliveryFeePerMile / 100}
                onChange={(e) => setDeliveryFeePerMile(Number(e.target.value) * 100)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">Additional fee per mile</span>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Peak Hour Multiplier</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[peakMultiplier]}
                onValueChange={(v) => setPeakMultiplier(v[0])}
                min={1.3}
                max={1.6}
                step={0.1}
                className="flex-1"
              />
              <Input
                type="number"
                min={1.3}
                max={1.6}
                step={0.1}
                value={peakMultiplier}
                onChange={(e) => setPeakMultiplier(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">x</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Applied during peak hours (11 AM - 1 PM, 5 PM - 8 PM). Range: 1.3x-1.6x
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Calculation Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h4 className="font-medium">Example: $25.00 order, 3 miles delivery</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Customer Pays:</strong>
                <div>Subtotal: $25.00</div>
                <div>Service Fee ({serviceFeePct}%): ${(25 * (serviceFeePct / 100)).toFixed(2)}</div>
                <div>Delivery Fee: ${((deliveryFeeBase + (3 * deliveryFeePerMile)) / 100).toFixed(2)}</div>
                <div className="font-bold">Total: ${(25 + (25 * (serviceFeePct / 100)) + ((deliveryFeeBase + (3 * deliveryFeePerMile)) / 100)).toFixed(2)}</div>
              </div>
              <div>
                <strong>Revenue Split:</strong>
                <div>Restaurant Gets: ${(25 - (25 * (restaurantCommission / 100))).toFixed(2)}</div>
                <div>Crave'N Commission: ${(25 * (restaurantCommission / 100)).toFixed(2)}</div>
                <div>Crave'N Service Fee: ${(25 * (serviceFeePct / 100)).toFixed(2)}</div>
                <div>Crave'N Delivery Revenue: ${((deliveryFeeBase + (3 * deliveryFeePerMile)) / 100).toFixed(2)}</div>
                <div className="font-bold text-green-600">
                  Total Crave'N Revenue: ${((25 * (restaurantCommission / 100)) + (25 * (serviceFeePct / 100)) + ((deliveryFeeBase + (3 * deliveryFeePerMile)) / 100)).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionSettingsManager;