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

        // If credits already exist, skip issuance
        if (existingGrants && existingGrants.length > 0) {
          return;
        }

        // Issue credits if user is enrolled
        const { data, error } = await supabase.rpc('issue_tester_credits', {
          p_user_id: user.id,
          p_enrollment_email: user.email,
        });

        if (error) {
          // Silently handle errors (user might not be enrolled, which is fine)
          if (!error.message.includes('enrollment_not_found')) {
            console.warn('Tester credit issuance error:', error);
          }
        } else if (data?.success) {
          // Credits were just issued - show modal (Phase B reveal)
          const totalAmount = data.issued_credits_total_cents || 0;
          setRewardAmount(totalAmount);
          setShowRewardModal(true);
          sessionStorage.setItem(`tester_reward_modal_shown_${user.id}`, 'true');
        }
      } catch (error) {
        // Silently handle errors
        console.warn('Error checking tester credit issuance:', error);
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