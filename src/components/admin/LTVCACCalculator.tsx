import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, TrendingUp, DollarSign, Clock } from 'lucide-react';

interface LTVInputs {
  avgOrdersPerMonth: number;
  avgDeliveryFeeCents: number;
  avgContributionMarginPerOrderCents: number;
  monthlyChurnRate: number;
  annualChurnRate: number;
  supportCostPerSubscriberCents: number;
  paymentProcessingFeePercent: number;
  cacEstimateCents: number;
}

export const LTVCACCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<LTVInputs>({
    avgOrdersPerMonth: 4,
    avgDeliveryFeeCents: 300,
    avgContributionMarginPerOrderCents: 500,
    monthlyChurnRate: 5,
    annualChurnRate: 50,
    supportCostPerSubscriberCents: 50,
    paymentProcessingFeePercent: 2.9,
    cacEstimateCents: 5000,
  });

  const handleInputChange = (field: keyof LTVInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const calculateLTV = () => {
    const {
      avgOrdersPerMonth,
      avgDeliveryFeeCents,
      avgContributionMarginPerOrderCents,
      monthlyChurnRate,
      annualChurnRate,
      supportCostPerSubscriberCents,
      paymentProcessingFeePercent,
    } = inputs;

    // Monthly revenue per subscriber
    const monthlyRevenueCents =
      avgOrdersPerMonth * (avgDeliveryFeeCents + avgContributionMarginPerOrderCents);

    // Processing fees
    const monthlyProcessingFeesCents = monthlyRevenueCents * (paymentProcessingFeePercent / 100);

    // Net monthly revenue
    const netMonthlyRevenueCents =
      monthlyRevenueCents - monthlyProcessingFeesCents - supportCostPerSubscriberCents;

    // Calculate average customer lifetime (months)
    const avgLifetimeMonths = monthlyChurnRate > 0 ? 1 / (monthlyChurnRate / 100) : 12;

    // Monthly LTV
    const monthlyLTVCents = netMonthlyRevenueCents * avgLifetimeMonths;

    // Annual LTV (using annual churn)
    const avgLifetimeYears = annualChurnRate > 0 ? 1 / (annualChurnRate / 100) : 1;
    const annualLTVCents = netMonthlyRevenueCents * 12 * avgLifetimeYears;

    return {
      monthlyLTVCents,
      annualLTVCents,
      avgLifetimeMonths,
      avgLifetimeYears,
      monthlyRevenueCents,
      netMonthlyRevenueCents,
    };
  };

  const calculatePayback = () => {
    const { monthlyLTVCents } = calculateLTV();
    const monthlyRevenueCents = calculateLTV().monthlyRevenueCents;
    return monthlyRevenueCents > 0 ? inputs.cacEstimateCents / monthlyRevenueCents : 0;
  };

  const calculateBreakeven = (lifetimePriceCents: number) => {
    const monthlyPriceCents = 949; // Standard monthly price
    return monthlyPriceCents > 0 ? lifetimePriceCents / monthlyPriceCents : 0;
  };

  const calculateSensitivity = (churnAdjustment: number) => {
    const adjustedInputs = {
      ...inputs,
      monthlyChurnRate: Math.max(0, Math.min(100, inputs.monthlyChurnRate + churnAdjustment)),
      annualChurnRate: Math.max(0, Math.min(100, inputs.annualChurnRate + churnAdjustment * 12)),
    };

    const originalInputs = inputs;
    setInputs(adjustedInputs);
    const result = calculateLTV();
    setInputs(originalInputs);
    return result;
  };

  const results = calculateLTV();
  const paybackMonths = calculatePayback();
  const lifetimeBreakeven = calculateBreakeven(29900); // $299 lifetime

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">LTV vs CAC Calculator</h1>
        <p className="text-muted-foreground">
          Investor-ready model for CraveMore membership economics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Input Parameters
            </CardTitle>
            <CardDescription>Configure the model inputs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="avgOrdersPerMonth">Avg Orders per Month per Subscriber</Label>
              <Input
                id="avgOrdersPerMonth"
                type="number"
                value={inputs.avgOrdersPerMonth}
                onChange={(e) => handleInputChange('avgOrdersPerMonth', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
              />
            </div>

            <div>
              <Label htmlFor="avgDeliveryFeeCents">Avg Delivery Fee (cents)</Label>
              <Input
                id="avgDeliveryFeeCents"
                type="number"
                value={inputs.avgDeliveryFeeCents}
                onChange={(e) => handleInputChange('avgDeliveryFeeCents', parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="avgContributionMarginPerOrderCents">
                Avg Contribution Margin per Order (cents)
              </Label>
              <Input
                id="avgContributionMarginPerOrderCents"
                type="number"
                value={inputs.avgContributionMarginPerOrderCents}
                onChange={(e) =>
                  handleInputChange('avgContributionMarginPerOrderCents', parseFloat(e.target.value) || 0)
                }
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="monthlyChurnRate">Monthly Churn Rate (%)</Label>
              <Input
                id="monthlyChurnRate"
                type="number"
                value={inputs.monthlyChurnRate}
                onChange={(e) => handleInputChange('monthlyChurnRate', parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="0.1"
              />
            </div>

            <div>
              <Label htmlFor="annualChurnRate">Annual Churn Rate (%)</Label>
              <Input
                id="annualChurnRate"
                type="number"
                value={inputs.annualChurnRate}
                onChange={(e) => handleInputChange('annualChurnRate', parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="0.1"
              />
            </div>

            <div>
              <Label htmlFor="supportCostPerSubscriberCents">Support Cost per Subscriber (cents)</Label>
              <Input
                id="supportCostPerSubscriberCents"
                type="number"
                value={inputs.supportCostPerSubscriberCents}
                onChange={(e) =>
                  handleInputChange('supportCostPerSubscriberCents', parseFloat(e.target.value) || 0)
                }
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="paymentProcessingFeePercent">Payment Processing Fee (%)</Label>
              <Input
                id="paymentProcessingFeePercent"
                type="number"
                value={inputs.paymentProcessingFeePercent}
                onChange={(e) =>
                  handleInputChange('paymentProcessingFeePercent', parseFloat(e.target.value) || 0)
                }
                min="0"
                max="10"
                step="0.1"
              />
            </div>

            <div>
              <Label htmlFor="cacEstimateCents">CAC Estimate (cents)</Label>
              <Input
                id="cacEstimateCents"
                type="number"
                value={inputs.cacEstimateCents}
                onChange={(e) => handleInputChange('cacEstimateCents', parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Model Outputs
            </CardTitle>
            <CardDescription>Calculated metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Monthly LTV</p>
                <p className="text-2xl font-bold">{formatCurrency(results.monthlyLTVCents)}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Annual LTV</p>
                <p className="text-2xl font-bold">{formatCurrency(results.annualLTVCents)}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Average Customer Lifetime</p>
                <p className="text-xl font-semibold">
                  {results.avgLifetimeMonths.toFixed(1)} months ({results.avgLifetimeYears.toFixed(1)} years)
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Payback Period</p>
                <p className="text-xl font-semibold">{paybackMonths.toFixed(1)} months</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Lifetime Breakeven</p>
                <p className="text-xl font-semibold">{lifetimeBreakeven.toFixed(1)} months</p>
                <p className="text-xs text-muted-foreground">
                  (At $299 lifetime price vs $9.49/month)
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">LTV:CAC Ratio</p>
                <p className="text-xl font-semibold">
                  {(results.monthlyLTVCents / inputs.cacEstimateCents).toFixed(2)}:1
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sensitivity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sensitivity Analysis</CardTitle>
          <CardDescription>Churn rate impact on LTV (±20%)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Churn Adjustment</TableHead>
                <TableHead>Monthly LTV</TableHead>
                <TableHead>Annual LTV</TableHead>
                <TableHead>LTV:CAC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[-20, -10, 0, 10, 20].map((adjustment) => {
                const sensitivity = calculateSensitivity(adjustment);
                const churnRate = inputs.monthlyChurnRate + adjustment;
                return (
                  <TableRow key={adjustment}>
                    <TableCell>
                      {adjustment > 0 ? '+' : ''}
                      {adjustment}% ({churnRate.toFixed(1)}%)
                    </TableCell>
                    <TableCell>{formatCurrency(sensitivity.monthlyLTVCents)}</TableCell>
                    <TableCell>{formatCurrency(sensitivity.annualLTVCents)}</TableCell>
                    <TableCell>
                      {(sensitivity.monthlyLTVCents / inputs.cacEstimateCents).toFixed(2)}:1
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LTVCACCalculator;

