/**
 * Driver Payout Settings - Compact Enterprise UI
 * Real-time calculation with scenario analysis
 */
import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Save, RotateCcw, AlertTriangle, TrendingUp } from 'lucide-react';
import { 
  calculateScenarios, 
  calculateMetrics, 
  type PayoutSettings, 
  type ScenarioResult 
} from '@/utils/payoutCalculations';
import { payoutSettingsService } from '@/services/payoutSettingsService';

export const DriverPayoutSettingsCompact: React.FC = () => {
  const [settings, setSettings] = useState<PayoutSettings>({
    basePayCents: 250,
    shareBps: 7000,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

  // Computed values
  const scenarios = useMemo(() => calculateScenarios(settings), [settings]);
  const metrics = useMemo(() => calculateMetrics(scenarios), [scenarios]);
  const percentageShare = settings.shareBps / 100;

  // Load existing settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await payoutSettingsService.getSettings();
        setSettings(data);
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast({
          title: 'Failed to load settings',
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setInitialLoading(false);
      }
    };
    loadSettings();
  }, [toast]);

  const handleBasePayChange = (value: string) => {
    const cents = parseInt(value) || 0;
    setSettings({ ...settings, basePayCents: cents });
    setHasChanges(true);
  };

  const handleShareChange = (value: number) => {
    setSettings({ ...settings, shareBps: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await payoutSettingsService.saveSettings(settings);
      setHasChanges(false);
      toast({
        title: 'Settings saved',
        description: `Drivers now earn max($${(settings.basePayCents/100).toFixed(2)}, ${percentageShare}% of delivery fees) + 100% tips.`,
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSettings({ basePayCents: 250, shareBps: 7000 });
    setHasChanges(false);
  };

  if (initialLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading settings...</div>
        </CardContent>
      </Card>
    );
  }

  const totalDeliveryFees = scenarios.reduce((sum, s) => sum + s.deliveryFees, 0);
  const totalDriverPayout = scenarios.reduce((sum, s) => sum + s.driverPayout, 0);
  const totalPlatformShare = scenarios.reduce((sum, s) => sum + s.platformShare, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Driver Payout Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure driver earnings based on delivery fees. Changes apply to new orders only.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || loading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || loading}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column - Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* Base Pay Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Base Pay (Minimum Guarantee)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Amount in Cents</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={0}
                    step={10}
                    value={settings.basePayCents}
                    onChange={(e) => handleBasePayChange(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    = ${(settings.basePayCents / 100).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Minimum amount driver earns per delivery (before tip). Acts as a floor, not additive.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Fee Distribution Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Driver Share of Delivery Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Percentage Share</Label>
                  <span className="text-sm font-medium">{percentageShare}%</span>
                </div>
                <div className="relative">
                  <Slider
                    value={[settings.shareBps]}
                    onValueChange={(v) => handleShareChange(v[0])}
                    min={0}
                    max={10000}
                    step={100}
                    className="w-full"
                  />
                  <div
                    className="absolute top-0 left-0 h-2 bg-blue-500 rounded-full pointer-events-none"
                    style={{ width: `${percentageShare}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <Input
                    type="number"
                    min={0}
                    max={10000}
                    step={100}
                    value={settings.shareBps}
                    onChange={(e) => handleShareChange(Math.max(0, Math.min(10000, Number(e.target.value))))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">basis points</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Formula: Earnings = max(base pay, {percentageShare}% of delivery fees) + 100% of tip
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aggregate Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Driver Payout</span>
                <span className="font-medium">${metrics.avgDriverPayout.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Platform Share</span>
                <span className="font-medium">${metrics.avgPlatformShare.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Driver Margin</span>
                <span className="font-medium">{metrics.driverMargin.toFixed(1)}%</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Revenue</span>
                  <span className="font-bold">${totalDeliveryFees.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium">Total Driver Payout</span>
                  <span className="font-bold text-green-600">${totalDriverPayout.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium">Total Platform Share</span>
                  <span className="font-bold text-blue-600">${totalPlatformShare.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning Card */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-900 mb-1">Important Notes</p>
                  <ul className="text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Drivers get 0% of food subtotal</li>
                    <li>Base pay is a floor, not additive</li>
                    <li>Tips pass through 100% to drivers</li>
                    <li>Changes apply to new orders only</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Scenarios Table */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scenario Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Real-time payout calculations for different delivery scenarios
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Scenario</th>
                      <th className="text-right p-2 font-medium">Distance</th>
                      <th className="text-right p-2 font-medium">Delivery Fees</th>
                      <th className="text-right p-2 font-medium">Tip</th>
                      <th className="text-right p-2 font-medium">Driver Fee Share</th>
                      <th className="text-right p-2 font-medium">Driver Before Tip</th>
                      <th className="text-right p-2 font-medium">Driver Payout</th>
                      <th className="text-right p-2 font-medium">Platform Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((scenario, idx) => {
                      const basePayApplied = scenario.driverBeforeTip === (settings.basePayCents / 100);
                      return (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{scenario.label}</td>
                          <td className="p-2 text-right text-muted-foreground">{scenario.distance}</td>
                          <td className="p-2 text-right">${scenario.deliveryFees.toFixed(2)}</td>
                          <td className="p-2 text-right">${scenario.tip.toFixed(2)}</td>
                          <td className="p-2 text-right text-muted-foreground">
                            ${scenario.driverFeeShare.toFixed(2)}
                          </td>
                          <td className="p-2 text-right">
                            <span className={basePayApplied ? "text-orange-600 font-medium" : ""}>
                              ${scenario.driverBeforeTip.toFixed(2)}
                            </span>
                            {basePayApplied && (
                              <TrendingUp className="h-3 w-3 inline ml-1 text-orange-600" />
                            )}
                          </td>
                          <td className="p-2 text-right font-medium text-green-600">
                            ${scenario.driverPayout.toFixed(2)}
                          </td>
                          <td className="p-2 text-right text-blue-600">
                            ${scenario.platformShare.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-muted/30">
                      <td colSpan={2} className="p-2">Totals</td>
                      <td className="p-2 text-right">${totalDeliveryFees.toFixed(2)}</td>
                      <td className="p-2 text-right">
                        ${scenarios.reduce((sum, s) => sum + s.tip, 0).toFixed(2)}
                      </td>
                      <td className="p-2 text-right">
                        ${scenarios.reduce((sum, s) => sum + s.driverFeeShare, 0).toFixed(2)}
                      </td>
                      <td className="p-2 text-right">
                        ${scenarios.reduce((sum, s) => sum + s.driverBeforeTip, 0).toFixed(2)}
                      </td>
                      <td className="p-2 text-right text-green-600">${totalDriverPayout.toFixed(2)}</td>
                      <td className="p-2 text-right text-blue-600">${totalPlatformShare.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DriverPayoutSettingsCompact;











