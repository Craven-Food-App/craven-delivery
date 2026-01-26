import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RewardIssuanceModal } from '@/components/RewardIssuanceModal';

/**
 * Hook to automatically issue tester credits when a user creates an account
 * with an enrolled email address. Shows modal when credits are issued (Phase B reveal).
 */
export const useTesterCreditIssuance = () => {
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [hasShownModal, setHasShownModal] = useState(false);

  useEffect(() => {
    const checkAndIssueCredits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return;

        // Check if credits have already been issued for this user
        const { data: existingGrants } = await supabase
          .from('tester_credit_grants')
          .select('id, credit_cents')
          .eq('user_id', user.id);

        // Check if we've already shown the modal (stored in sessionStorage)
        const modalShown = sessionStorage.getItem(`tester_reward_modal_shown_${user.id}`);
        
        // If credits exist and modal hasn't been shown, show it
        if (existingGrants && existingGrants.length > 0 && !modalShown) {
          const totalAmount = existingGrants.reduce((sum, grant) => sum + (grant.credit_cents || 0), 0);
          setRewardAmount(totalAmount);
          setShowRewardModal(true);
          sessionStorage.setItem(`tester_reward_modal_shown_${user.id}`, 'true');
          return;
        }

        // If credits already exist, skip issuance (credits are now issued by the evaluation function)
        if (existingGrants && existingGrants.length > 0) {
          return;
        }

        // Note: Credits are now issued automatically by the tester-evaluate-and-issue function
        // when the user completes Tier A requirements (3 days active + 2 feedback prompts)
        // This hook only displays the modal when credits are detected
      } catch (error) {
        // Silently handle errors (suppressed to avoid console clutter)
      }
    };

    // Check immediately
    checkAndIssueCredits();

    // Also listen for auth state changes (when user signs up)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Small delay to ensure user record is fully created
          setTimeout(() => {
            checkAndIssueCredits();
          }, 1000);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <RewardIssuanceModal
      opened={showRewardModal}
      onClose={() => setShowRewardModal(false)}
      rewardAmount={rewardAmount}
    />
  );
};