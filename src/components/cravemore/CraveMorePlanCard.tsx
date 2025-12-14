import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { CraveMorePlan } from '@/hooks/useCraveMoreOffer';
import { CraveMoreText } from '@/components/ui/cravemore-text';

interface CraveMorePlanCardProps {
  plan: CraveMorePlan;
  isSelected?: boolean;
  onSelect: (planKey: string) => void;
  loading?: boolean;
}

export const CraveMorePlanCard: React.FC<CraveMorePlanCardProps> = ({
  plan,
  isSelected = false,
  onSelect,
  loading = false,
}) => {
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getPriceDisplay = () => {
    if (plan.billingPeriod === 'one_time') {
      return formatPrice(plan.priceCents);
    } else if (plan.billingPeriod === 'year') {
      return `${formatPrice(plan.priceCents)}/year`;
    } else {
      return `${formatPrice(plan.priceCents)}/month`;
    }
  };

  const getPeriodText = () => {
    if (plan.billingPeriod === 'one_time') {
      return 'one-time';
    } else if (plan.billingPeriod === 'year') {
      return 'per year';
    } else {
      return 'per month';
    }
  };

  return (
    <Card
      className={`relative flex flex-col transition-all cursor-pointer ${
        isSelected ? 'border-orange-500 border-2 shadow-lg' : 'border-gray-200 hover:border-gray-300'
      } ${plan.isMostPopular ? 'border-orange-500' : ''}`}
      onClick={() => !loading && onSelect(plan.planKey)}
    >
      {/* Badge area - consistent height */}
      <div className="h-6 mb-2 flex items-center justify-center">
        {plan.badgeText && (
          <Badge
            variant="default"
            className={`${
              plan.planKey === 'lifetime'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-500 text-white'
            } text-xs px-3 py-0.5`}
          >
            {plan.badgeText}
          </Badge>
        )}
      </div>

      <CardContent className="p-4 flex flex-col flex-grow">
        {/* Plan name and price */}
        <div className="text-center mb-4 flex-shrink-0">
          <h3 className="text-lg font-bold mb-1 text-foreground">{plan.displayName}</h3>
          <div className="text-2xl font-bold text-orange-500 mb-0.5">{getPriceDisplay()}</div>
          <p className="text-xs text-muted-foreground">{getPeriodText()}</p>

          {/* Savings/breakeven info */}
          {plan.annualSavings && plan.annualSavings > 0 && (
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mt-1">
              Save {formatPrice(plan.annualSavings)} per year
            </p>
          )}
          {plan.monthlyEquivalent && (
            <p className="text-xs text-muted-foreground mt-0.5">
              ${(plan.monthlyEquivalent / 100).toFixed(2)}/mo equivalent
            </p>
          )}
          {plan.breakevenMonths && (
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mt-1">
              Break even in ~{plan.breakevenMonths} months
            </p>
          )}
          {plan.planKey === 'lifetime' && plan.lifetimeRemaining !== null && (
            <p className="text-xs text-muted-foreground mt-1">
              {plan.lifetimeRemaining} remaining
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-1.5 mb-4 flex-grow">
          <li className="flex items-start gap-1.5">
            <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-foreground">All benefits</span>
          </li>
          {plan.planKey === 'monthly' && (
            <>
              <li className="flex items-start gap-1.5">
                <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-foreground">Cancel anytime</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-foreground">Instant activation</span>
              </li>
            </>
          )}
          {plan.planKey === 'annual' && (
            <>
              <li className="flex items-start gap-1.5">
                <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-foreground">2 months free</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-foreground">Best value</span>
              </li>
            </>
          )}
          {plan.planKey === 'lifetime' && (
            <>
              <li className="flex items-start gap-1.5">
                <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-foreground">Never pay again</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-foreground">Exclusive founding member status</span>
              </li>
            </>
          )}
        </ul>

        {/* CTA Button */}
        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 text-sm mt-auto"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(plan.planKey);
          }}
          disabled={loading || (plan.planKey === 'lifetime' && !plan.lifetimeAvailable)}
        >
          {plan.planKey === 'lifetime' && !plan.lifetimeAvailable
            ? 'Sold Out'
            : 'Get Started'}
        </Button>
      </CardContent>
    </Card>
  );
};

