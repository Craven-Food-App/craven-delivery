import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  number: number;
}

interface OnboardingSidebarProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  storeName?: string;
  onStepClick: (stepNumber: number) => void;
}

const OnboardingSidebar = ({
  steps,
  currentStep,
  completedSteps,
  storeName,
  onStepClick,
}: OnboardingSidebarProps) => {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-muted/30 border-r overflow-y-auto">
      <div className="p-6">
        {storeName && (
          <div className="mb-8">
            <p className="text-sm text-muted-foreground mb-1">Store name</p>
            <p className="font-semibold text-lg">{storeName}</p>
          </div>
        )}
        
        <nav className="space-y-1">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.number);
            const isCurrent = currentStep === step.number;
            const isLocked = step.number > currentStep && !isCompleted;
            const isAccessible = step.number <= currentStep || isCompleted;

            return (
              <button
                key={step.id}
                onClick={() => isAccessible && onStepClick(step.number)}
                disabled={isLocked}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                  isCurrent && "bg-primary text-primary-foreground font-medium",
                  !isCurrent && isAccessible && "hover:bg-muted",
                  isLocked && "opacity-50 cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium",
                    isCurrent && "bg-primary-foreground text-primary",
                    !isCurrent && isCompleted && "bg-primary text-primary-foreground",
                    !isCurrent && !isCompleted && "bg-muted-foreground/20 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : isLocked ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    step.number
                  )}
                </div>
                <span className="text-sm">{step.title}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default OnboardingSidebar;
