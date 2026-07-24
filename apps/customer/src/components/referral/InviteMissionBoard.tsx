import React from 'react';
import { Box, Text, Stack, Group, Progress } from '@mantine/core';
import type { ReferralInviteStats } from '@/hooks/useReferralInviteStats';
import { inviteRankFromQualified } from '@/hooks/useReferralInviteStats';

interface Props {
  stats: ReferralInviteStats;
  loading?: boolean;
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <Box
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        padding: '10px 8px',
        textAlign: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: '#111827',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginTop: 4 }}>{label}</Text>
    </Box>
  );
}

/**
 * Funnel + rank board for Refer & Earn. No emoji; progress is the hook.
 */
export const InviteMissionBoard: React.FC<Props> = ({ stats, loading }) => {
  const { rank, nextAt, progressToNext } = inviteRankFromQualified(stats.qualified);

  const stages = [
    { key: 'shares', label: 'Shared', done: stats.shares > 0, count: stats.shares },
    { key: 'opens', label: 'Link opened', done: stats.landingOpens > 0, count: stats.landingOpens },
    { key: 'signups', label: 'Signed up', done: stats.signups > 0, count: stats.signups },
    { key: 'qualified', label: 'Qualified', done: stats.qualified > 0, count: stats.qualified },
  ];

  const activeIdx = stages.findIndex((s) => !s.done);

  return (
    <Box
      style={{
        borderRadius: 16,
        border: '1px solid #e5e7eb',
        background: 'linear-gradient(180deg, #111827 0%, #1f2937 100%)',
        padding: 16,
        color: '#fff',
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.7,
                textTransform: 'uppercase',
                color: '#fdba74',
              }}
            >
              Invite mission
            </Text>
            <Text style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
              {loading ? '…' : rank}
            </Text>
            <Text style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.45 }}>
              {nextAt == null
                ? 'Top of the board. Keep inviting.'
                : `${stats.qualified} qualified · next rank at ${nextAt}`}
            </Text>
          </Stack>
        </Group>

        {nextAt != null && (
          <Progress
            value={loading ? 0 : progressToNext}
            size="sm"
            radius="xl"
            color="orange"
            styles={{ root: { backgroundColor: 'rgba(255,255,255,0.12)' } }}
          />
        )}

        <Group gap={8} grow preventGrowOverflow={false} wrap="nowrap">
          <StatCell label="Shares" value={stats.shares} />
          <StatCell label="Opens" value={stats.landingOpens} />
          <StatCell label="Signups" value={stats.signups} />
          <StatCell label="Qualified" value={stats.qualified} />
        </Group>

        <Stack gap={8}>
          {stages.map((stage, i) => {
            const active = activeIdx === i;
            return (
              <Group key={stage.key} gap="sm" wrap="nowrap">
                <Box
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    flexShrink: 0,
                    backgroundColor: stage.done
                      ? '#22c55e'
                      : active
                        ? '#f97316'
                        : 'rgba(255,255,255,0.25)',
                    boxShadow: active ? '0 0 0 3px rgba(249,115,22,0.35)' : undefined,
                  }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: stage.done || active ? 700 : 500,
                    color: stage.done ? '#86efac' : active ? '#fff' : '#9ca3af',
                    flex: 1,
                  }}
                >
                  {stage.label}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#d1d5db',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {stage.count}
                </Text>
              </Group>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
};

export default InviteMissionBoard;
