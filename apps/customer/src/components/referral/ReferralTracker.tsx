import React from 'react';
import { Box, Text, Stack, Group, Button, Divider } from '@mantine/core';
import { IconRefresh, IconCheck, IconCircle } from '@tabler/icons-react';
import type { TrackedReferral } from '@/hooks/useReferralTracker';

interface Props {
  referrals: TrackedReferral[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

function StepRow({
  label,
  detail,
  done,
  active,
}: {
  label: string;
  detail: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <Group align="flex-start" gap="sm" wrap="nowrap">
      <Box
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          flexShrink: 0,
          marginTop: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done ? '#16a34a' : active ? '#f97316' : '#e5e7eb',
          color: done || active ? '#fff' : '#9ca3af',
        }}
      >
        {done ? <IconCheck size={13} stroke={3} /> : <IconCircle size={10} />}
      </Box>
      <Stack gap={2} style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: done || active ? 700 : 500,
            color: done ? '#166534' : active ? '#111827' : '#6b7280',
          }}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>{detail}</Text>
      </Stack>
    </Group>
  );
}

function ReferralCard({ item }: { item: TrackedReferral }) {
  const doneCount = item.steps.filter((s) => s.done).length;
  const date = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Box
      style={{
        borderRadius: 14,
        border: '1px solid #e5e7eb',
        backgroundColor: '#ffffff',
        padding: 14,
      }}
    >
      <Group justify="space-between" align="flex-start" mb={10}>
        <Stack gap={2}>
          <Text style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
            {item.referredLabel}
          </Text>
          <Text style={{ fontSize: 11, color: '#6b7280' }}>
            Joined {date} · Code {item.referralCode}
          </Text>
        </Stack>
        <Box
          style={{
            borderRadius: 999,
            padding: '4px 10px',
            backgroundColor: item.steps.every((s) => s.done) ? '#dcfce7' : '#fff7ed',
            border: `1px solid ${item.steps.every((s) => s.done) ? '#86efac' : '#fed7aa'}`,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: item.steps.every((s) => s.done) ? '#166534' : '#c2410c',
            }}
          >
            {doneCount}/{item.steps.length} steps
          </Text>
        </Box>
      </Group>

      <Stack gap={10}>
        {item.steps.map((step) => (
          <StepRow
            key={step.key}
            label={step.label}
            detail={step.detail}
            done={step.done}
            active={step.active}
          />
        ))}
      </Stack>

      {item.countsToward365 && (
        <>
          <Divider my={12} />
          <Text style={{ fontSize: 11, fontWeight: 600, color: '#ea580c' }}>
            Counts toward your 365-day free delivery prize
          </Text>
        </>
      )}
    </Box>
  );
}

/**
 * Per-referral progress: signup → merchant order → qualifying complete → credit.
 */
export const ReferralTracker: React.FC<Props> = ({
  referrals,
  loading,
  error,
  onRefresh,
}) => {
  return (
    <Box
      id="referral-tracker"
      style={{
        borderRadius: 16,
        border: '1px solid #e5e7eb',
        backgroundColor: '#fafafa',
        padding: 16,
      }}
    >
      <Group justify="space-between" align="center" mb="sm">
        <Stack gap={2}>
          <Text style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>
            Track your referrals
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            Follow each invite from signup to credit
          </Text>
        </Stack>
        {onRefresh && (
          <Button
            variant="subtle"
            size="xs"
            onClick={onRefresh}
            leftSection={<IconRefresh size={14} />}
            style={{ color: '#ea580c' }}
          >
            Refresh
          </Button>
        )}
      </Group>

      {loading ? (
        <Text style={{ fontSize: 13, color: '#6b7280' }}>Loading referrals…</Text>
      ) : error ? (
        <Text style={{ fontSize: 13, color: '#b91c1c' }}>{error}</Text>
      ) : referrals.length === 0 ? (
        <Box
          style={{
            borderRadius: 12,
            border: '1px dashed #d1d5db',
            padding: 14,
            backgroundColor: '#fff',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            No referrals yet
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
            When a friend signs up with your invite code, they appear here. You’ll see each step
            complete: signup → merchant order → qualifying delivery → your credit.
          </Text>
        </Box>
      ) : (
        <Stack gap="sm">
          {referrals.map((r) => (
            <ReferralCard key={r.id} item={r} />
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default ReferralTracker;
