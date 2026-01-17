import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { OnboardingData } from "../RestaurantOnboardingWizard";

interface PricingPlanStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

const PricingPlanStep = ({ data, updateData, onNext, onBack }: PricingPlanStepProps) => {
  const plans = [
    {
      value: "basic",
      name: "Basic",
      commission: "15%",
      features: [
        "Standard marketplace listing",
        "Basic customer support",
        "Weekly payouts",
        "Standard analytics"
      ]
    },
    {
      value: "plus",
      name: "Plus",
      commission: "12%",
      features: [
        "Priority marketplace placement",
        "Enhanced customer support",
        "Daily payouts",
        "Advanced analytics",
        "Marketing tools"
      ],
      badge: "Popular"
    },
    {
      value: "premier",
      name: "Premier",
      commission: "10%",
      features: [
        "Featured marketplace placement",
        "Dedicated account manager",
        "Instant payouts",
        "Full analytics suite",
        "Premium marketing tools",
        "Custom promotions"
      ]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Choose your pricing plan</h2>
        <p className="text-muted-foreground text-base sm:text-lg">
          Select the commission tier that works best for your business
        </p>
      </div>

      <RadioGroup
        value={data.commissionTier || "plus"}
        onValueChange={(value) => updateData({ commissionTier: value })}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
      >
        {plans.map((plan) => {
          const isSelected = (data.commissionTier || "plus") === plan.value;

          return (
            <Label
              key={plan.value}
              htmlFor={`plan-${plan.value}`}
              className="relative flex flex-col p-4 sm:p-6 border-2 rounded-xl cursor-pointer transition-all hover:border-primary/50 touch-manipulation"
              style={{
                borderColor: isSelected ? "hsl(var(--primary))" : "hsl(var(--border))",
                backgroundColor: isSelected ? "hsl(var(--accent))" : "transparent",
              }}
            >
              <RadioGroupItem 
                value={plan.value} 
                id={`plan-${plan.value}`} 
                className="sr-only"
              />
              
              {plan.badge && (
                <span className="absolute top-3 sm:top-4 right-3 sm:right-4 px-2 sm:px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {plan.badge}
                </span>
              )}

              <div className="mb-4">
                <h3 className="text-xl sm:text-2xl font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold text-primary">{plan.commission}</span>
                  <span className="text-sm sm:text-base text-muted-foreground">commission</span>
                </div>
              </div>

              <ul className="space-y-2 sm:space-y-3 flex-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </Label>
          );
        })}
      </RadioGroup>

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
        {onBack && (
          <Button 
            onClick={onBack} 
            variant="outline" 
            className="w-full sm:w-auto h-11 sm:h-10 touch-manipulation"
          >
            Back
          </Button>
        )}
        <Button
          onClick={onNext}
          className="w-full sm:w-auto ml-auto min-w-32 h-11 sm:h-10 touch-manipulation"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default PricingPlanStep;
