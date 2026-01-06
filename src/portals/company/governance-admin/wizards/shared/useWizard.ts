import { useState, useCallback } from 'react';
import { WizardStep } from './WizardLayout';

export interface UseWizardOptions {
  steps: WizardStep[];
  onComplete?: () => void | Promise<void>;
  autoAdvance?: boolean;
}

export const useWizard = ({ steps, onComplete, autoAdvance = false }: UseWizardOptions) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateStep = useCallback(async (stepIndex: number): Promise<boolean> => {
    const step = steps[stepIndex];
    if (!step.validate) return true;
    
    try {
      const result = await step.validate();
      return result === true;
    } catch (err: any) {
      setError(err.message || 'Validation failed');
      return false;
    }
  }, [steps]);

  const handleNext = useCallback(async () => {
    setError(null);
    
    // Validate current step
    const isValid = await validateStep(activeStep);
    if (!isValid) {
      return;
    }

    // Mark current step as completed
    if (!completedSteps.includes(activeStep)) {
      setCompletedSteps([...completedSteps, activeStep]);
    }

    // Move to next step
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      // Last step - complete
      if (onComplete) {
        setLoading(true);
        try {
          await onComplete();
        } catch (err: any) {
          setError(err.message || 'Failed to complete');
        } finally {
          setLoading(false);
        }
      }
    }
  }, [activeStep, completedSteps, steps, validateStep, onComplete]);

  const handleBack = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      setError(null);
    }
  }, [activeStep]);

  const handleStepChange = useCallback((step: number) => {
    // Only allow going to completed steps or current step
    if (completedSteps.includes(step) || step <= activeStep) {
      setActiveStep(step);
      setError(null);
    }
  }, [activeStep, completedSteps]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < steps.length) {
      setActiveStep(step);
      setError(null);
    }
  }, [steps.length]);

  const reset = useCallback(() => {
    setActiveStep(0);
    setCompletedSteps([]);
    setError(null);
    setLoading(false);
  }, []);

  return {
    activeStep,
    completedSteps,
    loading,
    error,
    setError,
    handleNext,
    handleBack,
    handleStepChange,
    goToStep,
    reset,
    isFirstStep: activeStep === 0,
    isLastStep: activeStep === steps.length - 1,
    progress: ((activeStep + 1) / steps.length) * 100,
  };
};














