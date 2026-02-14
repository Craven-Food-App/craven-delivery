// @ts-nocheck
import React, { useState } from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  TextInput,
  Button,
  Group,
  Badge,
  List,
  Loader,
  Center,
  NumberFormatter,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IconCopy, IconCheck, IconGift } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function FeederReferralsScreen() {
  const [copied, setCopied] = useState(false);

  const { data: { user } } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: referrals, isLoading } = useQuery({
    queryKey: ['feeder-referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('driver_referrals')
        .select('*')
        .eq('referrer_driver_id', user.id)
        .order('referred_at', { ascending: false });

      if (error && error.code !== 'PGRST205') {
        console.error('Error fetching referrals:', error);
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  const referralCode = user?.id?.slice(0, 8).toUpperCase() || 'N/A';
  const referralLink = `${window.location.origin}/driver-onboarding/apply?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    notifications.show({
      title: 'Copied!',
      message: 'Referral link copied to clipboard',
      color: 'green',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const completedReferrals = referrals?.filter((r: any) => r.status === 'completed') || [];
  const totalEarned = completedReferrals.reduce(
    (sum: number, r: any) => sum + (r.referral_bonus_cents || 0),
    0
  );

  if (isLoading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg" p="lg">
      <Title order={2}>Referral Center</Title>

      {/* Referral Code Card */}
      <Card withBorder padding="lg" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" c="white" opacity={0.9}>
                Your Referral Code
              </Text>
              <Text size="2xl" fw={700} c="white" mt="xs">
                {referralCode}
              </Text>
            </div>
            <IconGift size={48} color="white" opacity={0.8} />
          </Group>

          <TextInput
            value={referralLink}
            readOnly
            rightSection={
              <Button
                variant="subtle"
                onClick={handleCopy}
                leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            }
            styles={{
              input: {
                backgroundColor: 'white',
              },
            }}
          />
        </Stack>
      </Card>

      {/* Earnings Summary */}
      <Card withBorder padding="lg">
        <Group justify="space-between">
          <div>
            <Text size="sm" c="dimmed">
              Total Earned from Referrals
            </Text>
            <Text size="xl" fw={700}>
              <NumberFormatter
                value={totalEarned / 100}
                prefix="$"
                decimalScale={2}
              />
            </Text>
          </div>
          <Badge size="lg" color="green">
            {completedReferrals.length} Completed
          </Badge>
        </Group>
      </Card>

      {/* Referral Milestones */}
      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Referral Milestones
        </Title>
        <List>
          <List.Item
            icon={
              <Badge
                color={completedReferrals.length >= 1 ? 'green' : 'gray'}
                leftSection={completedReferrals.length >= 1 ? <IconCheck size={12} /> : undefined}
              >
                1
              </Badge>
            }
          >
            <Group justify="space-between">
              <div>
                <Text fw={600}>First Referral</Text>
                <Text size="sm" c="dimmed">
                  Refer your first driver
                </Text>
              </div>
              <Badge color="blue">$50 Bonus</Badge>
            </Group>
          </List.Item>

          <List.Item
            icon={
              <Badge
                color={completedReferrals.length >= 5 ? 'green' : 'gray'}
                leftSection={completedReferrals.length >= 5 ? <IconCheck size={12} /> : undefined}
              >
                5
              </Badge>
            }
          >
            <Group justify="space-between">
              <div>
                <Text fw={600}>5 Referrals</Text>
                <Text size="sm" c="dimmed">
                  Refer 5 drivers
                </Text>
              </div>
              <Badge color="blue">$200 Bonus</Badge>
            </Group>
          </List.Item>

          <List.Item
            icon={
              <Badge
                color={completedReferrals.length >= 10 ? 'green' : 'gray'}
                leftSection={completedReferrals.length >= 10 ? <IconCheck size={12} /> : undefined}
              >
                10
              </Badge>
            }
          >
            <Group justify="space-between">
              <div>
                <Text fw={600}>10 Referrals</Text>
                <Text size="sm" c="dimmed">
                  Refer 10 drivers
                </Text>
              </div>
              <Badge color="blue">$500 Bonus</Badge>
            </Group>
          </List.Item>
        </List>
      </Card>

      {/* Referral List */}
      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Your Referrals
        </Title>
        {referrals && referrals.length > 0 ? (
          <List>
            {referrals.map((referral: any) => (
              <List.Item
                key={referral.id}
                icon={
                  <Badge
                    color={referral.status === 'completed' ? 'green' : 'yellow'}
                    leftSection={referral.status === 'completed' ? <IconCheck size={12} /> : undefined}
                  >
                    {referral.status}
                  </Badge>
                }
                style={{ marginBottom: '1rem' }}
              >
                <Group justify="space-between">
                  <div>
                    <Text fw={600}>
                      {referral.referred_driver_name || 'Unknown Driver'}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Referred on {new Date(referral.referred_at).toLocaleDateString()}
                    </Text>
                  </div>
                  {referral.referral_bonus_cents > 0 && (
                    <Badge color="green">
                      <NumberFormatter
                        value={(referral.referral_bonus_cents || 0) / 100}
                        prefix="$"
                        decimalScale={2}
                      />
                    </Badge>
                  )}
                </Group>
              </List.Item>
            ))}
          </List>
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            No referrals yet. Share your code to start earning!
          </Text>
        )}
      </Card>
    </Stack>
  );
}



