/**
 * Driver Payout Settings - Enterprise UI
 * Real-time calculation with scenario analysis
 */
import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  Save,
  RotateCcw,
  AlertTriangle,
  TrendingUp,
  Percent,
  Coins,
  BarChart3,
  Info,
} from 'lucide-react';
import {
  calculateScenarios,
  calculateMetrics,
  type PayoutSettings,
} from '@/utils/payoutCalculations';
import { payoutSettingsService } from '@/services/payoutSettingsService';

export const DriverPayoutSettingsCompact: React.FC = () => {
  const [settings, setSettings] = useState<PayoutSettings>({ basePayCents: 250, shareBps: 7000 });
  const [savedSettings, setSavedSettings] = useState<PayoutSettings>({ basePayCents: 250, shareBps: 7000 });
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

  const scenarios = useMemo(() => calculateScenarios(settings), [settings]);
  const metrics = useMemo(() => calculateMetrics(scenarios), [scenarios]);
  const percentageShare = settings.shareBps / 100;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await payoutSettingsService.getSettings();
        setSettings(data);
        setSavedSettings(data);
      } catch (error) {
        toast({ title: 'Failed to load settings', description: (error as Error).message, variant: 'destructive' });
      } finally {
        setInitialLoading(false);
      }
    };
    loadSettings();
  }, [toast]);

  const updateSettings = (patch: Partial<PayoutSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    setHasChanges(next.basePayCents !== savedSettings.basePayCents || next.shareBps !== savedSettings.shareBps);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await payoutSettingsService.saveSettings(settings);
      setSavedSettings(settings);
      setHasChanges(false);
      toast({
        title: 'Settings saved',
        description: `Drivers now earn max($${(settings.basePayCents / 100).toFixed(2)}, ${percentageShare}% of delivery fees) + 100% tips.`,
      });
    } catch (error) {
      toast({ title: 'Save failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSettings(savedSettings);
    setHasChanges(false);
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading payout settings…</p>
        </div>
      </div>
    );
  }

  const totalDeliveryFees = scenarios.reduce((sum, s) => sum + s.deliveryFees, 0);
  const totalDriverPayout = scenarios.reduce((sum, s) => sum + s.driverPayout, 0);
  const totalPlatformShare = scenarios.reduce((sum, s) => sum + s.platformShare, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Payout Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure driver earnings. Changes apply to new orders only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200 text-xs">
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges || loading} className="shadow-sm">
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || loading} className="shadow-sm">
            <Save className="h-4 w-4 mr-1.5" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Driver Payout', value: `$${metrics.avgDriverPayout.toFixed(2)}`, icon: Coins, color: 'text-green-600' },
          { label: 'Avg Platform Share', value: `$${metrics.avgPlatformShare.toFixed(2)}`, icon: BarChart3, color: 'text-blue-600' },
          { label: 'Driver Margin', value: `${metrics.driverMargin.toFixed(1)}%`, icon: TrendingUp, color: 'text-primary' },
          { label: 'Base Pay Floor', value: `$${(settings.basePayCents / 100).toFixed(2)}`, icon: DollarSign, color: 'text-amber-600' },
        ].map(kpi => (
          <Card key={kpi.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn('p-2.5 rounded-lg bg-muted', kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left - Controls */}
        <div className="xl:col-span-5 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Base Pay (Minimum Guarantee)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Amount in Cents</Label>
                  <Input
                    type="number"
                    min={0}
                    step={10}
                    value={settings.basePayCents}
                    onChange={e => updateSettings({ basePayCents: parseInt(e.target.value) || 0 })}
                    className="mt-1.5"
                  />
                </div>
                <div className="pt-5">
                  <span className="text-2xl font-bold text-foreground tabular-nums">
                    = ${(settings.basePayCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Minimum amount drivers earn per delivery (before tip). Acts as a floor, not additive.</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                Driver Share of Delivery Fees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Percentage</Label>
                <span className="text-2xl font-bold text-foreground tabular-nums">{percentageShare}%</span>
              </div>
              <Slider
                value={[settings.shareBps]}
                onValueChange={v => updateSettings({ shareBps: v[0] })}
                min={0}
                max={10000}
                step={100}
                className="w-full"
              />
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={10000}
                  step={100}
                  value={settings.shareBps}
                  onChange={e => updateSettings({ shareBps: Math.max(0, Math.min(10000, Number(e.target.value))) })}
                  className="w-28"
                />
                <span className="text-xs text-muted-foreground">basis points</span>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Formula: Earnings = max(base pay, {percentageShare}% of delivery fees) + 100% of tip</span>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Revenue (scenarios)</span>
                <span className="font-semibold tabular-nums">${totalDeliveryFees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Driver Payout</span>
                <span className="font-semibold text-green-600 tabular-nums">${totalDriverPayout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Platform Share</span>
                <span className="font-semibold text-blue-600 tabular-nums">${totalPlatformShare.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card className="shadow-sm border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-amber-900">Important Notes</p>
                  <ul className="text-amber-800 space-y-0.5 list-disc list-inside">
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

        {/* Right - Scenario Table */}
        <div className="xl:col-span-7">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Scenario Analysis
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Real-time payout calculations for different delivery scenarios
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Scenario</th>
                      <th className="text-right p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Distance</th>
                      <th className="text-right p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Fees</th>
                      <th className="text-right p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Tip</th>
                      <th className="text-right p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Fee Share</th>
                      <th className="text-right p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Before Tip</th>
                      <th className="text-right p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Payout</th>
                      <th className="text-right p-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Platform</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((s, idx) => {
                      const basePayApplied = s.driverBeforeTip === settings.basePayCents / 100;
                      return (
                        <tr key={idx} className="border-b hover:bg-accent/50 transition-colors">
                          <td className="p-3 font-medium text-foreground">{s.label}</td>
                          <td className="p-3 text-right text-muted-foreground">{s.distance}</td>
                          <td className="p-3 text-right tabular-nums">${s.deliveryFees.toFixed(2)}</td>
                          <td className="p-3 text-right tabular-nums">${s.tip.toFixed(2)}</td>
                          <td className="p-3 text-right tabular-nums text-muted-foreground">${s.driverFeeShare.toFixed(2)}</td>
                          <td className="p-3 text-right tabular-nums">
                            <span className={cn(basePayApplied && 'text-amber-600 font-semibold')}>
                              ${s.driverBeforeTip.toFixed(2)}
                            </span>
                            {basePayApplied && <TrendingUp className="h-3 w-3 inline ml-1 text-amber-600" />}
                          </td>
                          <td className="p-3 text-right font-semibold text-green-600 tabular-nums">${s.driverPayout.toFixed(2)}</td>
                          <td className="p-3 text-right text-blue-600 tabular-nums">${s.platformShare.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-muted/30">
                      <td colSpan={2} className="p-3 text-foreground">Totals</td>
                      <td className="p-3 text-right tabular-nums">${totalDeliveryFees.toFixed(2)}</td>
                      <td className="p-3 text-right tabular-nums">${scenarios.reduce((sum, s) => sum + s.tip, 0).toFixed(2)}</td>
                      <td className="p-3 text-right tabular-nums">${scenarios.reduce((sum, s) => sum + s.driverFeeShare, 0).toFixed(2)}</td>
                      <td className="p-3 text-right tabular-nums">${scenarios.reduce((sum, s) => sum + s.driverBeforeTip, 0).toFixed(2)}</td>
                      <td className="p-3 text-right text-green-600 tabular-nums">${totalDriverPayout.toFixed(2)}</td>
                      <td className="p-3 text-right text-blue-600 tabular-nums">${totalPlatformShare.toFixed(2)}</td>
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
