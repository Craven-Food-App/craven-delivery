import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calculator,
  DollarSign,
  Users,
  ArrowRight
} from 'lucide-react';

interface ImpactSimulatorProps {
  currentSettings: any;
  onRefresh: () => void;
}

export function ImpactSimulator({ currentSettings }: ImpactSimulatorProps) {
  const currentCommission = currentSettings?.restaurant_commission_percent || 15;
  const currentServiceFee = currentSettings?.customer_service_fee_percent || 10;
  const currentDeliveryBase = (currentSettings?.delivery_fee_base_cents || 299) / 100;

  const [proposedCommission, setProposedCommission] = useState(currentCommission);
  const [proposedServiceFee, setProposedServiceFee] = useState(currentServiceFee);
  const [proposedDeliveryBase, setProposedDeliveryBase] = useState(currentDeliveryBase);

  // Mock current metrics
  const monthlyOrders = 10000;
  const avgOrderValue = 28.50;
  const avgDeliveryDistance = 3.2;
  const currentMonthlyRevenue = 125430;

  // Calculate impact
  const commissionChange = proposedCommission - currentCommission;
  const serviceFeeChange = proposedServiceFee - currentServiceFee;
  const deliveryFeeChange = proposedDeliveryBase - currentDeliveryBase;

  const commissionImpact = (monthlyOrders * avgOrderValue * commissionChange) / 100;
  const serviceFeeImpact = (monthlyOrders * avgOrderValue * serviceFeeChange) / 100;
  const deliveryFeeImpact = monthlyOrders * deliveryFeeChange;

  const totalImpact = commissionImpact + serviceFeeImpact + deliveryFeeImpact;
  const impactPercent = (totalImpact / currentMonthlyRevenue) * 100;

  // Estimate order volume change (lower rates = more orders)
  const priceChangePercent = (commissionChange + serviceFeeChange) / 2;
  const estimatedOrderChange = -priceChangePercent * 150; // Elastic demand
  const newMonthlyOrders = monthlyOrders + estimatedOrderChange;

  const getImpactColor = (impact: number) => {
    if (impact > 0) return 'text-green-600';
    if (impact < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getImpactIcon = (impact: number) => {
    if (impact > 0) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (impact < 0) return <TrendingDown className="h-5 w-5 text-red-600" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-bold">Revenue Impact Simulator</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            See what happens to your revenue before making changes. Adjust rates below to simulate impact.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Proposed Changes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Restaurant Commission (%)</Label>
                <Badge variant={commissionChange === 0 ? 'outline' : commissionChange > 0 ? 'default' : 'destructive'}>
                  {commissionChange > 0 ? '+' : ''}{commissionChange.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[proposedCommission]}
                  onValueChange={(v) => setProposedCommission(v[0])}
                  min={5}
                  max={25}
                  step={0.5}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.5"
                  value={proposedCommission}
                  onChange={(e) => setProposedCommission(Number(e.target.value))}
                  className="w-20"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Current: {currentCommission}%
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Service Fee (%)</Label>
                <Badge variant={serviceFeeChange === 0 ? 'outline' : serviceFeeChange > 0 ? 'default' : 'destructive'}>
                  {serviceFeeChange > 0 ? '+' : ''}{serviceFeeChange.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[proposedServiceFee]}
                  onValueChange={(v) => setProposedServiceFee(v[0])}
                  min={5}
                  max={20}
                  step={0.5}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.5"
                  value={proposedServiceFee}
                  onChange={(e) => setProposedServiceFee(Number(e.target.value))}
                  className="w-20"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Current: {currentServiceFee}%
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Base Delivery Fee ($)</Label>
                <Badge variant={deliveryFeeChange === 0 ? 'outline' : deliveryFeeChange > 0 ? 'default' : 'destructive'}>
                  {deliveryFeeChange > 0 ? '+' : ''}${deliveryFeeChange.toFixed(2)}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  step="0.25"
                  value={proposedDeliveryBase}
                  onChange={(e) => setProposedDeliveryBase(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  Current: ${currentDeliveryBase.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setProposedCommission(currentCommission);
                  setProposedServiceFee(currentServiceFee);
                  setProposedDeliveryBase(currentDeliveryBase);
                }}
                className="w-full"
              >
                Reset to Current
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Impact Results */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Projected Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total Impact */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
              <p className="text-sm text-muted-foreground mb-1">Total Monthly Revenue Change</p>
              <div className="flex items-center gap-2">
                {getImpactIcon(totalImpact)}
                <p className={`text-3xl font-bold ${getImpactColor(totalImpact)}`}>
                  {totalImpact >= 0 ? '+' : ''}${(totalImpact / 1000).toFixed(1)}k
                </p>
                <Badge variant={impactPercent >= 0 ? 'default' : 'destructive'}>
                  {impactPercent >= 0 ? '+' : ''}{impactPercent.toFixed(1)}%
                </Badge>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium">Impact Breakdown:</h4>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm">Commission Revenue:</span>
                <span className={`font-semibold ${getImpactColor(commissionImpact)}`}>
                  {commissionImpact >= 0 ? '+' : ''}${(commissionImpact / 1000).toFixed(1)}k
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm">Service Fee Revenue:</span>
                <span className={`font-semibold ${getImpactColor(serviceFeeImpact)}`}>
                  {serviceFeeImpact >= 0 ? '+' : ''}${(serviceFeeImpact / 1000).toFixed(1)}k
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm">Delivery Fee Revenue:</span>
                <span className={`font-semibold ${getImpactColor(deliveryFeeImpact)}`}>
                  {deliveryFeeImpact >= 0 ? '+' : ''}${(deliveryFeeImpact / 1000).toFixed(1)}k
                </span>
              </div>
            </div>

            {/* Order Volume Impact */}
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Estimated Order Volume Change:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-600">
                  {estimatedOrderChange >= 0 ? '+' : ''}{Math.round(estimatedOrderChange)}
                </span>
                <span className="text-sm text-muted-foreground">orders/month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                New total: {Math.round(newMonthlyOrders).toLocaleString()} orders
              </p>
            </div>

            {/* Warning/Recommendation */}
            {Math.abs(impactPercent) > 10 && (
              <div className="p-3 bg-orange-50 rounded border border-orange-200 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-orange-900 mb-1">Large Impact Detected</p>
                  <p className="text-orange-800">
                    This change will affect revenue by more than 10%. Consider gradual rollout or A/B testing.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Before & After Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Metric</th>
                  <th className="text-center py-3 px-4 font-medium">Current</th>
                  <th className="text-center py-3 px-4 font-medium">
                    <ArrowRight className="inline h-4 w-4" />
                  </th>
                  <th className="text-center py-3 px-4 font-medium">Proposed</th>
                  <th className="text-right py-3 px-4 font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4">Restaurant Commission</td>
                  <td className="py-3 px-4 text-center">{currentCommission}%</td>
                  <td className="py-3 px-4 text-center">→</td>
                  <td className="py-3 px-4 text-center font-semibold">{proposedCommission}%</td>
                  <td className={`py-3 px-4 text-right font-semibold ${getImpactColor(commissionChange)}`}>
                    {commissionChange > 0 ? '+' : ''}{commissionChange.toFixed(1)}%
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Service Fee</td>
                  <td className="py-3 px-4 text-center">{currentServiceFee}%</td>
                  <td className="py-3 px-4 text-center">→</td>
                  <td className="py-3 px-4 text-center font-semibold">{proposedServiceFee}%</td>
                  <td className={`py-3 px-4 text-right font-semibold ${getImpactColor(serviceFeeChange)}`}>
                    {serviceFeeChange > 0 ? '+' : ''}{serviceFeeChange.toFixed(1)}%
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Base Delivery Fee</td>
                  <td className="py-3 px-4 text-center">${currentDeliveryBase.toFixed(2)}</td>
                  <td className="py-3 px-4 text-center">→</td>
                  <td className="py-3 px-4 text-center font-semibold">${proposedDeliveryBase.toFixed(2)}</td>
                  <td className={`py-3 px-4 text-right font-semibold ${getImpactColor(deliveryFeeChange)}`}>
                    ${deliveryFeeChange >= 0 ? '+' : ''}{deliveryFeeChange.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-purple-50 font-semibold">
                  <td className="py-3 px-4">Monthly Revenue</td>
                  <td className="py-3 px-4 text-center">${(currentMonthlyRevenue / 1000).toFixed(0)}k</td>
                  <td className="py-3 px-4 text-center">→</td>
                  <td className="py-3 px-4 text-center">
                    ${((currentMonthlyRevenue + totalImpact) / 1000).toFixed(0)}k
                  </td>
                  <td className={`py-3 px-4 text-right ${getImpactColor(totalImpact)}`}>
                    {totalImpact >= 0 ? '+' : ''}${(totalImpact / 1000).toFixed(1)}k
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline">
          <DollarSign className="h-4 w-4 mr-2" />
          Export Report
        </Button>
        <Button disabled={totalImpact === 0}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Apply These Changes
        </Button>
      </div>
    </div>
  );
}

