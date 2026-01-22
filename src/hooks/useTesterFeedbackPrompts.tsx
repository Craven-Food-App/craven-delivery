// Hook: useTesterFeedbackPrompts
// Auto-triggers feedback prompts after account creation and first checkout

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TesterFeedbackPrompt } from '@/components/TesterFeedbackPrompt';

export const useTesterFeedbackPrompts = () => {
  const [showPrompt1, setShowPrompt1] = useState(false);
  const [showPrompt2, setShowPrompt2] = useState(false);
  const hasCheckedRef = useRef(false);

  const checkAndShowPrompts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        hasCheckedRef.current = true;
        return;
      }

      // Check enrollment - wait for activation
      const { data: enrollment } = await supabase
        .from('android_tester_enrollments')
        .select('id, status, activated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      // If enrollment exists but not activated yet, wait and retry
      if (enrollment && enrollment.status !== 'activated') {
        // Check if enrollment exists by email (might not be activated yet)
        const { data: emailEnrollment } = await supabase
          .from('android_tester_enrollments')
          .select('id, status')
          .eq('email', user.email)
          .maybeSingle();
        
        if (emailEnrollment && emailEnrollment.status !== 'activated') {
          // Not activated yet, will retry on next check
          return;
        }
      }

      if (!enrollment || enrollment.status !== 'activated') {
        hasCheckedRef.current = true;
        return;
      }

      // Check if prompts already submitted
      const { data: feedbackEvents } = await supabase
        .from('tester_feedback_events')
        .select('prompt_key')
        .eq('user_id', user.id);

      const submittedKeys = new Set(feedbackEvents?.map(f => f.prompt_key) || []);

      // Prompt 1: After account creation (if not submitted)
      // Show on first app open after activation, not just within 5 minutes
      if (!submittedKeys.has('account_creation')) {
        // Check if we've already shown this prompt attempt
        const prompt1Shown = sessionStorage.getItem(`tester_prompt1_shown_${user.id}`);
        
        if (!prompt1Shown) {
          // Show welcome prompt on first app open after activation
          // Use a longer delay to ensure UI is ready
          setTimeout(() => {
            setShowPrompt1(true);
            sessionStorage.setItem(`tester_prompt1_shown_${user.id}`, 'true');
          }, 2000);
        }
      }

      // Prompt 2: After first checkout (check in sessionStorage)
      if (!submittedKeys.has('first_checkout')) {
        const checkoutShown = sessionStorage.getItem('tester_feedback_checkout_shown');
        const hasCheckedOut = sessionStorage.getItem('tester_first_checkout_completed');

        if (hasCheckedOut && !checkoutShown) {
          setTimeout(() => {
            setShowPrompt2(true);
            sessionStorage.setItem('tester_feedback_checkout_shown', 'true');
          }, 2000);
        }
      }

      hasCheckedRef.current = true;
    } catch (error) {
      // Silently handle
      console.warn('Feedback prompt check error:', error);
      hasCheckedRef.current = true;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    // Initial check
    checkAndShowPrompts();

    // Listen for auth state changes (when user signs in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user && isMounted) {
          // Wait a bit for activation to complete
          setTimeout(() => {
            if (isMounted) {
              checkAndShowPrompts();
            }
          }, 2000);
        }
      }
    );

    // Re-check periodically in case activation completes later
    // Only check for first 30 seconds (6 attempts) to avoid infinite polling
    let attempts = 0;
    intervalId = setInterval(() => {
      if (!hasCheckedRef.current && attempts < 6 && isMounted) {
        checkAndShowPrompts();
        attempts++;
      } else if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }, 5000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  return (
    <>
      <TesterFeedbackPrompt
        promptKey="account_creation"
        opened={showPrompt1}
        onClose={() => setShowPrompt1(false)}
        title="Welcome! Quick Question"
        description="How was your sign-up experience?"
      />
      <TesterFeedbackPrompt
        promptKey="first_checkout"
        opened={showPrompt2}
        onClose={() => setShowPrompt2(false)}
        title="Thanks for Your Order!"
        description="How was your checkout experience?"
      />
    </>
  );
};