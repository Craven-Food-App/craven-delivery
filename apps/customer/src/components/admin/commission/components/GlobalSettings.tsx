import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Save, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GlobalSettingsProps {
  settings: any;
  onRefresh: () => void;
}

export function GlobalSettings({ settings, onRefresh }: GlobalSettingsProps) {
  const [restaurantCommission, setRestaurantCommission] = useState<number>(
    settings?.restaurant_commission_percent || 15
  );
  const [serviceFeePct, setServiceFeePct] = useState<number>(
    settings?.customer_service_fee_percent || 10
  );
  const [deliveryFeeBase, setDeliveryFeeBase] = useState<number>(
    settings?.delivery_fee_base_cents / 100 || 2.99
  );
  const [deliveryFeePerMile, setDeliveryFeePerMile] = useState<number>(
    settings?.delivery_fee_per_mile_cents / 100 || 0.50
  );
  const [peakMultiplier, setPeakMultiplier] = useState<number>(
    settings?.peak_hour_multiplier || 1.5
  );
  const [stripeCardPct, setStripeCardPct] = useState<number>(
    settings?.stripe_fee_percent ?? 2.9
  );
  const [stripeFixedCents, setStripeFixedCents] = useState<number>(
    settings?.stripe_fee_fixed_cents ?? 30
  );
  const [loading, setLoading] = useState<boolean>(false);

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
          delivery_fee_base_cents: Math.round(deliveryFeeBase * 100),
          delivery_fee_per_mile_cents: Math.round(deliveryFeePerMile * 100),
          peak_hour_multiplier: peakMultiplier,
          stripe_fee_percent: stripeCardPct,
          stripe_fee_fixed_cents: Math.round(stripeFixedCents),
          is_active: true,
          updated_by: userData?.user?.id || null,
        });

      if (error) throw error;

      toast.success('Global settings updated successfully!');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // Calculate example order
  const exampleSubtotal = 25.00;
  const exampleMiles = 3;
  const serviceFee = exampleSubtotal * (serviceFeePct / 100);
  const deliveryFee = exampleSubtotal * 0 + (deliveryFeeBase + (exampleMiles * deliveryFeePerMile)); // keep existing units
  const total = exampleSubtotal + serviceFee + deliveryFee;
  const stripeFee = total * (stripeCardPct / 100) + (stripeFixedCents / 100);
  const restaurantGets = exampleSubtotal * (1 - (restaurantCommission / 100));
  const cravenCommission = exampleSubtotal * (restaurantCommission / 100);
  const cravenGrossRevenue = cravenCommission + serviceFee + deliveryFee;
  const cravenNetRevenue = cravenGrossRevenue - stripeFee;

  return (
    <div className="space-y-6">
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Default Commission & Fee Rates
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            These apply to all restaurants unless overridden by tier or custom rates
          </p>
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
              <span className="text-sm text-muted-foreground w-8">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Platform commission on food subtotal
            </p>
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
              <span className="text-sm text-muted-foreground w-8">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Fee added to customer's order
            </p>
          </div>

          <div>
            <Label className="mb-2 block">Base Delivery Fee ($)</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={0}
                step={0.25}
                value={deliveryFeeBase}
                onChange={(e) => setDeliveryFeeBase(Number(e.target.value))}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                Flat fee per delivery
              </span>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Per-Mile Fee ($)</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={0}
                step={0.05}
                value={deliveryFeePerMile}
                onChange={(e) => setDeliveryFeePerMile(Number(e.target.value))}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                Additional fee per mile
              </span>
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
              <span className="text-sm text-muted-foreground w-8">x</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Applied to delivery fee during peak hours (1.3x-1.6x range)
            </p>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-4 text-sm text-muted-foreground">
              Payment Processing Fees (Moov)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Card Processing Fee (%)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={moovCardPct}
                    onChange={(e) => setMoovCardPct(Number(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Effective all-in Moov card processing percentage.
                </p>
              </div>

              <div>
                <Label className="mb-2 block">ACH Processing Fee (%)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={moovAchPct}
                    onChange={(e) => setMoovAchPct(Number(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Effective Moov ACH processing percentage.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={saveSettings} disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Global Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Preview */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Revenue Calculation Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h4 className="font-medium text-lg">
              Example: ${exampleSubtotal.toFixed(2)} order, {exampleMiles} miles delivery
            </h4>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Customer Pays */}
              <div className="p-4 bg-white rounded-lg border">
                <h5 className="font-semibold mb-3 text-blue-600">Customer Pays:</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">${exampleSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Fee ({serviceFeePct}%):</span>
                    <span className="font-medium">${serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span className="font-medium">${deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-base">
                    <span>Total:</span>
                    <span className="text-blue-600">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Revenue Split */}
              <div className="p-4 bg-white rounded-lg border">
                <h5 className="font-semibold mb-3 text-green-600">Revenue Split:</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Restaurant Gets:</span>
                    <span className="font-medium">${restaurantGets.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Commission:</span>
                    <span className="font-medium">${cravenCommission.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Fee:</span>
                    <span className="font-medium">${serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span className="font-medium">${deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t text-sm">
                    <span>Gross Platform Revenue:</span>
                    <span className="font-medium">${cravenGrossRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Stripe Processing Fee:</span>
                    <span className="font-medium">-${stripeFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-base">
                    <span>Net Platform Revenue:</span>
                    <span className="text-green-600">${cravenNetRevenue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-100 rounded border border-green-300 text-sm">
                <strong>Gross Take Rate:</strong> {((cravenGrossRevenue / total) * 100).toFixed(1)}% of total order value
              </div>
              <div className="p-3 bg-blue-100 rounded border border-blue-300 text-sm">
                <strong>Net Take Rate:</strong> {((cravenNetRevenue / total) * 100).toFixed(1)}% (after Stripe fees)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

