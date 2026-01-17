import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { OnboardingData } from "../RestaurantOnboardingWizard";
import { useState } from "react";

interface StoreHoursStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

const daysOfWeek = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const StoreHoursStep = ({ data, updateData, onNext }: StoreHoursStepProps) => {
  const [hours, setHours] = useState<Record<number, { open: string; close: string; closed: boolean }>>(
    data.storeHours || {
      0: { open: "09:00", close: "22:00", closed: false },
      1: { open: "09:00", close: "22:00", closed: false },
      2: { open: "09:00", close: "22:00", closed: false },
      3: { open: "09:00", close: "22:00", closed: false },
      4: { open: "09:00", close: "22:00", closed: false },
      5: { open: "09:00", close: "22:00", closed: false },
      6: { open: "09:00", close: "22:00", closed: false },
    }
  );

  const handleHourChange = (day: number, field: "open" | "close" | "closed", value: string | boolean) => {
    const newHours = {
      ...hours,
      [day]: {
        ...hours[day],
        [field]: value,
      },
    };
    setHours(newHours);
    updateData({ storeHours: newHours });
  };

  const copyToAllDays = (sourceDay: number) => {
    const sourceHours = hours[sourceDay];
    const newHours = { ...hours };
    daysOfWeek.forEach((day) => {
      newHours[day.value] = { ...sourceHours };
    });
    setHours(newHours);
    updateData({ storeHours: newHours });
  };

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Set your store hours</h2>
        <p className="text-muted-foreground text-base sm:text-lg">
          Let customers know when you're open for orders
        </p>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {daysOfWeek.map((day) => {
          const dayHours = hours[day.value];
          const isClosed = dayHours?.closed;

          return (
            <div
              key={day.value}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 border-2 rounded-xl hover:border-primary/30 transition-colors"
            >
              <div className="w-full sm:w-28">
                <Label className="font-semibold text-sm sm:text-base">{day.label}</Label>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {!isClosed ? (
                  <>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Input
                        type="time"
                        value={dayHours?.open || "09:00"}
                        onChange={(e) => handleHourChange(day.value, "open", e.target.value)}
                        className="w-full sm:w-32 h-10"
                      />
                      <span className="text-muted-foreground text-sm">to</span>
                      <Input
                        type="time"
                        value={dayHours?.close || "22:00"}
                        onChange={(e) => handleHourChange(day.value, "close", e.target.value)}
                        className="w-full sm:w-32 h-10"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToAllDays(day.value)}
                      className="text-xs w-full sm:w-auto touch-manipulation"
                    >
                      Copy to all
                    </Button>
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm">Closed</span>
                )}
              </div>

              <div className="flex items-center gap-2 justify-end sm:justify-start">
                <Label htmlFor={`closed-${day.value}`} className="text-sm">
                  Closed
                </Label>
                <Switch
                  id={`closed-${day.value}`}
                  checked={isClosed}
                  onCheckedChange={(checked) => handleHourChange(day.value, "closed", checked)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end mt-6 sm:mt-8">
        <Button 
          onClick={onNext} 
          className="w-full sm:w-auto min-w-32 h-11 sm:h-10 touch-manipulation"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default StoreHoursStep;
