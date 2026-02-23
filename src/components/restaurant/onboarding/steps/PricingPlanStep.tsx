/**
 * Pricing Plan Step — Restaurant Onboarding
 *
 * Displays the flat 15% commission model.
 * No tier selection — every merchant gets the same rate.
 */

import { Button } from "@/components/ui/button";
import { Check, Lock } from "lucide-react";
import { OnboardingData } from "../RestaurantOnboardingWizard";

interface PricingPlanStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

const PricingPlanStep = ({
  data,
  updateData,
  onNext,
  onBack,
}: PricingPlanStepProps) => {
  // Ensure commissionTier is always set to 'flat' (no choice)
  if (data.commissionTier !== "flat") {
    updateData({ commissionTier: "flat" });
  }

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">
          Pricing
        </h2>
        <p className="text-muted-foreground text-base sm:text-lg">
          Crave'n uses a single flat commission for every merchant. No tiers, no
          upsells.
        </p>
      </div>

      {/* Commission card */}
      <div className="border-2 rounded-xl p-5 sm:p-8 mb-4 space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-bold">Crave'n Base Commission</h3>
        </div>

        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <p className="font-semibold">Delivery Orders</p>
            <p className="text-sm text-muted-foreground">
              Flat rate — same for every merchant
            </p>
          </div>
          <span className="text-3xl sm:text-4xl font-bold">15%</span>
        </div>

        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <p className="font-semibold">Pickup Orders</p>
            <p className="text-sm text-muted-foreground">
              Software + Payment Processing only
            </p>
          </div>
          <span className="text-3xl sm:text-4xl font-bold text-green-700">
            0%
          </span>
        </div>

        <ul className="space-y-2 pt-2">
          {[
            "No hidden fees or tiered pricing",
            "Reach expands automatically based on your performance",
            "Commission-free online ordering from your own website",
            "Pickup is always free — you only pay payment processing",
          ].map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

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
