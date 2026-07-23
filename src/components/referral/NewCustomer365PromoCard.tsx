import React from 'react';
import { Box, Text, Title, Stack, Progress } from '@mantine/core';
import type { NewCustomer365PromoState } from '@/hooks/useNewCustomer365ReferralPromo';

interface Props {
  promo: NewCustomer365PromoState;
}

function formatDate(iso?: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function statusCopy(promo: NewCustomer365PromoState): string {
  const required = promo.required_count ?? 0;
  const count = promo.qualifying_count ?? 0;
  switch (promo.display_state) {
    case 'eligible':
      return 'You are eligible to earn 365 days of CraveMore.';
    case 'in_progress':
      return `You have completed ${count} of ${required} qualifying referrals.`;
    case 'completed':
      return 'You completed the referral requirement.';
    case 'reward_pending':
      return 'Your referrals are complete and your reward is being processed.';
    case 'reward_active':
      return `Your 365 days of CraveMore are active through ${formatDate(promo.reward_ends_at)}.`;
    case 'expired':
      return promo.reward_ends_at
        ? `Your 365-day promotional membership ended on ${formatDate(promo.reward_ends_at)}.`
        : 'This promotional offer window has ended.';
    case 'disqualified':
      return 'This promotional offer is no longer available for this account.';
    default:
      return '';
  }
}

/**
 * Promotional card layered onto the existing Refer & Earn screen.
 * Hidden entirely when ineligible (caller should not render).
 */
export const NewCustomer365PromoCard: React.FC<Props> = ({ promo }) => {
  if (!promo.eligible) return null;

  const required = promo.required_count ?? 0;
  const count = Math.min(promo.qualifying_count ?? 0, required);
  const remaining = promo.remaining_count ?? Math.max(required - count, 0);
  const progress = required > 0 ? Math.min(100, Math.round((count / required) * 100)) : 0;
  const showProgress = ['eligible', 'in_progress', 'completed', 'reward_pending'].includes(
    promo.display_state
  );

  return (
    <Box
      style={{
        borderRadius: 16,
        border: '1px solid #fed7aa',
        background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)',
        padding: 16,
      }}
    >
      <Stack gap="sm">
        <Stack gap={4}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: '#c2410c',
            }}
          >
            Limited promotion
          </Text>
          <Title order={4} style={{ fontSize: 17, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
            {promo.title || 'Refer Friends. Earn 365 Days of Free Delivery.'}
          </Title>
          <Text style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.55 }}>
            Complete {required} qualifying referrals and receive one full year of CraveMore with $0
            eligible delivery fees.
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
            Existing referral rewards still apply. This is an additional promotional reward.
          </Text>
        </Stack>

        <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{statusCopy(promo)}</Text>

        {showProgress && (
          <Stack gap={6}>
            <Progress
              value={progress}
              size="md"
              radius="xl"
              color="orange"
              styles={{ root: { backgroundColor: '#ffedd5' } }}
            />
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              {count} of {required} qualifying referrals
              {remaining > 0 ? ` · ${remaining} remaining` : ''}
            </Text>
          </Stack>
        )}

        {promo.qualification_deadline && showProgress && (
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            Complete by {formatDate(promo.qualification_deadline)}
          </Text>
        )}

        <Text
          component="a"
          href="/terms"
          style={{ fontSize: 12, color: '#ea580c', fontWeight: 500, textDecoration: 'underline' }}
        >
          Promotion terms (v{promo.terms_version || '1'})
        </Text>
      </Stack>
    </Box>
  );
};

export default NewCustomer365PromoCard;
