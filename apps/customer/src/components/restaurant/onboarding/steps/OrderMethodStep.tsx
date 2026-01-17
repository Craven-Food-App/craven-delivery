import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Tablet, Plug, Mail, Badge } from "lucide-react";
import { OnboardingData } from "../RestaurantOnboardingWizard";

interface OrderMethodStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

const OrderMethodStep = ({ data, updateData, onNext }: OrderMethodStepProps) => {
  const orderMethods = [
    {
      value: "tablet",
      icon: Tablet,
      title: "Crave'N Tablet",
      description: "Receive orders on a dedicated tablet with our easy-to-use interface",
      pricing: "Free tablet included",
      badge: "Most popular",
    },
    {
      value: "pos",
      icon: Plug,
      title: "Point of Sale (POS) Integration",
      description: "Connect directly to your existing POS system",
      pricing: "Setup fee may apply",
    },
    {
      value: "email",
      icon: Mail,
      title: "Email + Phone Confirmation",
      description: "Receive orders via email and confirm by phone",
      pricing: "No additional equipment needed",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Choose how you want to receive Crave'N orders</h2>
        <p className="text-muted-foreground text-base sm:text-lg">
          Select the method that works best for your restaurant operations
        </p>
      </div>

      <RadioGroup
        value={data.orderMethod || ""}
        onValueChange={(value) => updateData({ orderMethod: value })}
        className="space-y-3 sm:space-y-4"
      >
        {orderMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = data.orderMethod === method.value;

          return (
            <Label
              key={method.value}
              htmlFor={method.value}
              className="relative flex items-start gap-3 sm:gap-4 p-4 sm:p-6 border-2 rounded-xl cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/50 touch-manipulation"
              style={{
                borderColor: isSelected ? "hsl(var(--primary))" : "hsl(var(--border))",
                backgroundColor: isSelected ? "hsl(var(--accent))" : "transparent",
              }}
            >
              <RadioGroupItem value={method.value} id={method.value} className="mt-1" />
              
              <div className="flex-1 flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base sm:text-lg font-semibold">{method.title}</h3>
                    {method.badge && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium whitespace-nowrap">
                        <Badge className="h-3 w-3" />
                        {method.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">{method.description}</p>
                  <p className="text-xs sm:text-sm font-medium text-primary">{method.pricing}</p>
                </div>
              </div>
            </Label>
          );
        })}
      </RadioGroup>

      <div className="flex justify-end mt-6 sm:mt-8">
        <Button
          onClick={onNext}
          disabled={!data.orderMethod}
          className="w-full sm:w-auto min-w-32 h-11 sm:h-10 touch-manipulation"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default OrderMethodStep;
