import React from 'react';
import { Box, Text, Title, Stack, Progress, Group } from '@mantine/core';
import type { NewCustomer365PromoState } from '@/hooks/useNewCustomer365ReferralPromo';
import { NEW_CUSTOMER_365_PROMO } from '@/lib/newCustomer365PromoConfig';

interface Props {
  promo: NewCustomer365PromoState | null;
  loading?: boolean;
  /** Existing permanent referral code — same code used to earn the 365 prize */
  referralCode?: string;
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

function statusCopy(promo: NewCustomer365PromoState, required: number): string {
  const count = promo.qualifying_count ?? 0;
  switch (promo.display_state) {
    case 'eligible':
      return 'You’re in. Share your invite code and start earning qualifying referrals.';
    case 'in_progress':
      return `Prize progress: ${count} of ${required} qualifying referrals complete.`;
    case 'completed':
      return 'You hit the referral requirement — your prize is being finalized.';
    case 'reward_pending':
      return 'Referrals complete. Your 365 days of CraveMore are being activated.';
    case 'reward_active':
      return `Prize active: free eligible delivery through ${formatDate(promo.reward_ends_at)}.`;
    case 'expired':
      return promo.reward_ends_at
        ? `Your 365-day prize ended on ${formatDate(promo.reward_ends_at)}.`
        : 'This prize window has ended.';
    case 'disqualified':
      return 'This promotional prize is no longer available for this account.';
    default:
      return '';
  }
}

/**
 * Dedicated Refer & Earn section for the 365-day free delivery prize.
 * Uses the customer’s existing referral code/link — no second referral system.
 */
export const NewCustomer365PromoCard: React.FC<Props> = ({
  promo,
  loading,
  referralCode,
}) => {
  const title = promo?.title || NEW_CUSTOMER_365_PROMO.title;
  const required = promo?.required_count ?? NEW_CUSTOMER_365_PROMO.defaultRequiredCount;
  const eligible = !!promo?.eligible;
  const count = eligible ? Math.min(promo?.qualifying_count ?? 0, required) : 0;
  const remaining = eligible
    ? promo?.remaining_count ?? Math.max(required - count, 0)
    : required;
  const progress = eligible && required > 0 ? Math.min(100, Math.round((count / required) * 100)) : 0;
  const showLiveProgress =
    eligible &&
    ['eligible', 'in_progress', 'completed', 'reward_pending', 'reward_active'].includes(
      promo?.display_state || ''
    );

  return (
    <Box
      style={{
        borderRadius: 16,
        border: '2px solid #f97316',
        background: 'linear-gradient(165deg, #fff7ed 0%, #ffffff 55%)',
        padding: 16,
        boxShadow: '0 8px 24px rgba(249, 115, 22, 0.12)',
      }}
    >
      <Stack gap="md">
        <Stack gap={6}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: '#c2410c',
            }}
          >
            Limited prize · Free delivery for a year
          </Text>
          <Title order={3} style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1.25 }}>
            {title}
          </Title>
          <Text style={{ fontSize: 14, fontWeight: 700, color: '#ea580c' }}>
            {NEW_CUSTOMER_365_PROMO.prizeLabel}
          </Text>
          <Text style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.55 }}>
            {NEW_CUSTOMER_365_PROMO.prizeDetail}
          </Text>
        </Stack>

        {/* Dedicated earning code = their existing referral code */}
        <Box
          style={{
            borderRadius: 12,
            backgroundColor: '#111827',
            padding: '12px 14px',
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: '#fdba74',
              marginBottom: 6,
            }}
          >
            Your prize invite code
          </Text>
          <Text
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: 1.5,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            {loading ? '…' : referralCode || '—'}
          </Text>
          <Text style={{ fontSize: 12, color: '#d1d5db', marginTop: 8, lineHeight: 1.45 }}>
            Friends must use this code or your invite link. Qualifying referrals on this code count
            toward your {required}-referral prize.
          </Text>
        </Box>

        <Stack gap={8}>
          <Text style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
            {NEW_CUSTOMER_365_PROMO.howToTitle}
          </Text>
          {NEW_CUSTOMER_365_PROMO.steps.map((step, i) => (
            <Group key={step} align="flex-start" gap="sm" wrap="nowrap">
              <Box
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  backgroundColor: '#f97316',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {i + 1}
              </Box>
              <Text style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                {i === 2
                  ? `When that order completes, it counts as 1 of ${required} qualifying referrals toward your prize.`
                  : i === 3
                    ? `Reach ${required} qualifying referrals to unlock 365 days of CraveMore free delivery.`
                    : step}
              </Text>
            </Group>
          ))}
        </Stack>

        {loading ? (
          <Text style={{ fontSize: 13, color: '#6b7280' }}>Loading your prize progress…</Text>
        ) : showLiveProgress ? (
          <Stack gap={8}>
            <Text style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
              {statusCopy(promo!, required)}
            </Text>
            {promo!.display_state !== 'reward_active' && (
              <>
                <Progress
                  value={progress}
                  size="lg"
                  radius="xl"
                  color="orange"
                  styles={{ root: { backgroundColor: '#ffedd5' } }}
                />
                <Text style={{ fontSize: 13, fontWeight: 600, color: '#9a3412' }}>
                  {count} / {required} qualifying referrals
                  {remaining > 0 ? ` · ${remaining} to go` : ' · prize unlocked'}
                </Text>
              </>
            )}
            {promo!.qualification_deadline && promo!.display_state !== 'reward_active' && (
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                Finish by {formatDate(promo!.qualification_deadline)}
              </Text>
            )}
          </Stack>
        ) : (
          <Box
            style={{
              borderRadius: 10,
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              padding: '10px 12px',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: 700, color: '#9a3412', marginBottom: 4 }}>
              {promo?.error ? 'Prize tracker' : 'Prize enrollment'}
            </Text>
            <Text style={{ fontSize: 12, color: '#78716c', lineHeight: 1.5 }}>
              {promo?.error
                ? NEW_CUSTOMER_365_PROMO.unavailableNote
                : NEW_CUSTOMER_365_PROMO.ineligibleNote}
            </Text>
            <Text style={{ fontSize: 12, color: '#78716c', marginTop: 8, lineHeight: 1.5 }}>
              Goal: {required} qualifying referrals → 365 days of $0 eligible delivery fees.
            </Text>
          </Box>
        )}

        <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
          {NEW_CUSTOMER_365_PROMO.existingRewardsNote}
        </Text>

        <Text
          component="a"
          href="/legal/referral"
          style={{ fontSize: 12, color: '#ea580c', fontWeight: 600, textDecoration: 'underline' }}
        >
          Referral Program Terms (v{promo?.terms_version || '1'})
        </Text>
      </Stack>
    </Box>
  );
};

export default NewCustomer365PromoCard;
