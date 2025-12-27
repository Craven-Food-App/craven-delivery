import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Upload, Plug, Utensils } from "lucide-react";
import { OnboardingData } from "../RestaurantOnboardingWizard";

interface MenuSetupMethodStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

const MenuSetupMethodStep = ({ data, updateData, onNext }: MenuSetupMethodStepProps) => {
  const menuMethods = [
    {
      value: "manual",
      icon: Utensils,
      title: "Build menu manually",
      description: "Add your menu items one by one with our easy builder tool",
      time: "15-30 minutes",
    },
    {
      value: "upload",
      icon: Upload,
      title: "Upload menu PDF",
      description: "Upload your existing menu and we'll help you digitize it",
      time: "5 minutes + review",
    },
    {
      value: "pos",
      icon: Plug,
      title: "Import from POS",
      description: "Automatically sync your menu from your POS system",
      time: "Instant sync",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">How would you like to set up your menu?</h2>
        <p className="text-muted-foreground text-base sm:text-lg">
          Choose the method that works best for you
        </p>
      </div>

      <RadioGroup
        value={data.menuSetupMethod || ""}
        onValueChange={(value) => updateData({ menuSetupMethod: value })}
        className="space-y-3 sm:space-y-4"
      >
        {menuMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = data.menuSetupMethod === method.value;

          return (
            <Label
              key={method.value}
              htmlFor={`menu-${method.value}`}
              className="relative flex items-start gap-3 sm:gap-4 p-4 sm:p-6 border-2 rounded-xl cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/50 touch-manipulation"
              style={{
                borderColor: isSelected ? "hsl(var(--primary))" : "hsl(var(--border))",
                backgroundColor: isSelected ? "hsl(var(--accent))" : "transparent",
              }}
            >
              <RadioGroupItem value={method.value} id={`menu-${method.value}`} className="mt-1" />
              
              <div className="flex-1 flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold mb-1">{method.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">{method.description}</p>
                  <p className="text-xs sm:text-sm font-medium text-primary">⏱️ {method.time}</p>
                </div>
              </div>
            </Label>
          );
        })}
      </RadioGroup>

      <div className="flex justify-between mt-6 sm:mt-8">
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            className="w-full sm:w-auto min-w-32 h-11 sm:h-10 touch-manipulation"
          >
            Back
          </Button>
        )}
        <Button
          onClick={onNext}
          disabled={!data.menuSetupMethod}
          className={`w-full sm:w-auto min-w-32 h-11 sm:h-10 touch-manipulation ${onBack ? 'ml-auto' : ''}`}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default MenuSetupMethodStep;
