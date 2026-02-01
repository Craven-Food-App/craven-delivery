import React, { useState, useEffect } from 'react';
import { IconMenu2, IconFlame, IconMapPin, IconClock, IconTarget, IconTrendingUp, IconUsers, IconBolt, IconAward, IconChevronRight, IconPackage } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import {
  Box,
  Stack,
  Text,
  Button,
  Group,
  ActionIcon,
  Loader,
  ThemeIcon,
  Paper,
  Title,
  Badge,
  Progress,
  SegmentedControl,
} from '@mantine/core';

type FeederPromotionsTabProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

const FeederPromotionsTab: React.FC<FeederPromotionsTabProps> = ({
  onOpenMenu,
  onOpenNotifications
}) => {
  const [activeTab, setActiveTab] = useState('promos');
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);

  useEffect(() => {
    fetchPromotionsData();
  }, [activeTab]);

  const fetchPromotionsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();

      const { data: surgeZones } = await supabase
        .from('driver_surge_zones')
        .select('*')
        .eq('is_active', true)
        .gte('active_until', now)
        .order('surge_multiplier', { ascending: false })
        .limit(10);

      if (surgeZones) {
        const formattedPromos = surgeZones.map((zone: any) => {
          const startDate = new Date(zone.start_time);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(zone.end_time);
          endDate.setHours(23, 59, 59, 999);

          return {
            zone: zone.zone_name || 'Zone',
            date: startDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
            timeframe: `${new Date(zone.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${new Date(zone.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
            description: `Surge ${zone.surge_multiplier}x`,
            bonus: `$${(zone.surge_multiplier - 1).toFixed(2)} multiplier`,
            type: 'peak',
            active: zone.is_active,
            id: zone.id
          };
        });
        setPromotions(formattedPromos);
      }

      const { data: activePromotions } = await supabase
        .from('driver_promotions')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', now)
        .lte('start_date', now)
        .limit(20);

      const { data: participations } = await supabase
        .from('driver_promotion_participation')
        .select('*')
        .eq('driver_id', user.id)
        .eq('completed', false);

      if (activePromotions && participations) {
        const formattedChallenges = activePromotions.map(promo => {
          const participation = participations.find(p => p.promotion_id === promo.id);
          const progress = participation?.progress || 0;
          const total = 100;
          const progressPercentage = total > 0 ? (progress / total) * 100 : 0;

          const typeMap: Record<string, { icon: any; color: string }> = {
            delivery_count: { icon: IconPackage, color: 'orange' },
            time_based: { icon: IconBolt, color: 'yellow' },
            peak_hours: { icon: IconTrendingUp, color: 'red' },
            geographic: { icon: IconMapPin, color: 'blue' },
            rating_based: { icon: IconAward, color: 'purple' },
            streak_based: { icon: IconFlame, color: 'red' },
            referral: { icon: IconUsers, color: 'green' }
          };

          const typeInfo = typeMap[promo.promo_type] || { icon: IconTarget, color: 'orange' };

          const endsAt = new Date(promo.end_date);
          const daysLeft = Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const deadline = daysLeft > 0 
            ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
            : 'Ending soon';

          let reward = '$0';
          if (promo.reward_amount) {
            reward = `$${promo.reward_amount.toFixed(0)}`;
          }

          return {
            id: promo.id,
            title: promo.title,
            type: promo.promo_type?.replace('_', ' ') || 'Challenge',
            description: promo.description || '',
            progress: Math.min(progress, total),
            total,
            reward,
            icon: typeInfo.icon,
            color: typeInfo.color,
            deadline,
            participationId: participation?.id
          };
        });

        setChallenges(formattedChallenges);
      }
    } catch (error) {
      console.error('Error fetching promotions:', error);
      notifications.show({
        title: 'Failed to load promotions',
        message: '',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getChallengeColors = (color: string) => {
    const colors: Record<string, { bg: string; icon: string; badgeBg: string; badgeText: string; progressFrom: string; progressTo: string }> = {
      orange: { 
        bg: 'orange.1', 
        icon: 'orange.6',
        badgeBg: 'orange.1',
        badgeText: 'orange.7',
        progressFrom: 'orange.4',
        progressTo: 'orange.6'
      },
      yellow: { 
        bg: 'yellow.1', 
        icon: 'yellow.6',
        badgeBg: 'yellow.1',
        badgeText: 'yellow.7',
        progressFrom: 'yellow.4',
        progressTo: 'yellow.6'
      },
      red: { 
        bg: 'red.1', 
        icon: 'red.6',
        badgeBg: 'red.1',
        badgeText: 'red.7',
        progressFrom: 'red.4',
        progressTo: 'red.6'
      },
      blue: { 
        bg: 'blue.1', 
        icon: 'blue.6',
        badgeBg: 'blue.1',
        badgeText: 'blue.7',
        progressFrom: 'blue.4',
        progressTo: 'blue.6'
      },
      purple: { 
        bg: 'violet.1', 
        icon: 'violet.6',
        badgeBg: 'violet.1',
        badgeText: 'violet.7',
        progressFrom: 'violet.4',
        progressTo: 'violet.6'
      },
      green: { 
        bg: 'green.1', 
        icon: 'green.6',
        badgeBg: 'green.1',
        badgeText: 'green.7',
        progressFrom: 'green.4',
        progressTo: 'green.6'
      }
    };
    return colors[color] || colors.orange;
  };

  if (loading) {
    return (
      <Box h="100vh" w="100%" style={{ background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" color="orange" />
      </Box>
    );
  }

  return (
    <Box h="100vh" w="100%" style={{ background: 'white', overflowY: 'auto', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <Group px="md" py="xs" justify="space-between" align="center" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white', borderBottom: '1px solid #EEEEEE' }}>
        <ActionIcon
          onClick={() => {
            if (onOpenMenu) {
              onOpenMenu();
            } else {
              notifications.show({
                title: 'Menu coming soon.',
                message: '',
                color: 'blue',
              });
            }
          }}
          variant="subtle"
          color="dark"
        >
          <IconMenu2 size={24} />
        </ActionIcon>
        <Title order={1} c="dark" fw={900} size="md" style={{ letterSpacing: '0.2px' }}>PROMOS</Title>
        <ActionIcon
          onClick={() => {
            window.location.href = '/mobile?tab=messages';
          }}
          variant="subtle"
          color="dark"
        >
          <img src="/app-chat.png" alt="Messages" style={{ width: '28px', height: '28px' }} />
        </ActionIcon>
      </Group>

      {/* Tab Switcher */}
      <Box px="xl" mb="xl">
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          data={[
            { label: 'Active Promos', value: 'promos' },
            { label: 'Challenges', value: 'challenges' },
          ]}
          fullWidth
          radius="xl"
          size="md"
          styles={{
            root: {
              backgroundColor: 'var(--mantine-color-gray-2)',
              padding: '4px',
            },
            indicator: {
              backgroundColor: 'white',
              color: 'var(--mantine-color-red-7)',
            },
            label: {
              color: 'var(--mantine-color-dark-7)',
              fontWeight: 700,
            },
          }}
        />
      </Box>

      {/* Content */}
      <Box px="xl" pb="xl">
        {activeTab === 'promos' && (
          <Stack gap="md">
            <Group gap="xs" mb="md">
              <IconFlame size={20} color="var(--mantine-color-orange-6)" />
              <Title order={3} c="dark" fw={700} style={{ letterSpacing: '0.05em' }}>ACTIVE NOW</Title>
            </Group>
            
            {promotions.length > 0 ? promotions.map((promo, idx) => (
              <Paper
                key={promo.id || idx}
                p="lg"
                radius="xl"
                shadow="xl"
                style={{
                  background: promo.active 
                    ? 'linear-gradient(to bottom right, var(--mantine-color-yellow-0), var(--mantine-color-orange-0))'
                    : 'var(--mantine-color-gray-1)',
                  opacity: promo.active ? 1 : 0.75,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {promo.active && (
                  <Badge
                    pos="absolute"
                    top={12}
                    right={12}
                    color="red"
                    size="sm"
                    radius="xl"
                    leftSection={<Box w={8} h={8} bg="white" style={{ borderRadius: '50%' }} />}
                    styles={{
                      root: {
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      },
                    }}
                  >
                    LIVE
                  </Badge>
                )}

                <Stack gap="md">
                  <Group gap="xs">
                    <IconMapPin size={16} color="var(--mantine-color-orange-6)" />
                    <Text c="dark" fw={700} size="lg">{promo.zone}</Text>
                  </Group>
                  
                  <Group gap="md" c="dark.7">
                    <Group gap="xs">
                      <IconClock size={16} />
                      <Text fw={600}>{promo.date}</Text>
                    </Group>
                    <Group gap="xs">
                      <IconClock size={16} />
                      <Text fw={600}>{promo.timeframe}</Text>
                    </Group>
                  </Group>

                  <Paper
                    p="md"
                    radius="md"
                    style={{
                      background: 'linear-gradient(to right, var(--mantine-color-orange-4), var(--mantine-color-red-5))',
                    }}
                  >
                    <Text c="white" fw={900} size="xl" ta="center">
                      {promo.description}
                    </Text>
                  </Paper>

                  <Paper
                    p="md"
                    radius="md"
                    bg="green.1"
                    style={{
                      border: '2px solid var(--mantine-color-green-5)',
                    }}
                  >
                    <Text c="green.8" fw={900} size="2xl" ta="center">
                      {promo.bonus}
                    </Text>
                  </Paper>
                </Stack>
              </Paper>
            )) : (
              <Paper p="xl" radius="xl" bg="orange.0" shadow="md">
                <Stack gap="xs" align="center">
                  <Text c="dimmed">No active promotions</Text>
                  <Text size="sm" c="dimmed">Check back soon for new opportunities</Text>
                </Stack>
              </Paper>
            )}
          </Stack>
        )}

        {activeTab === 'challenges' && (
          <Stack gap="md">
            <Group gap="xs" mb="md">
              <IconTarget size={20} color="var(--mantine-color-orange-6)" />
              <Title order={3} c="dark" fw={700} style={{ letterSpacing: '0.05em' }}>YOUR CHALLENGES</Title>
            </Group>

            {challenges.length > 0 ? challenges.map((challenge) => {
              const IconComponent = challenge.icon;
              const progressPercentage = challenge.total > 0 ? (challenge.progress / challenge.total) * 100 : 0;
              const colors = getChallengeColors(challenge.color);
              
              return (
                <Paper key={challenge.id} p="lg" radius="xl" bg="orange.0" shadow="xl">
                  <Group justify="space-between" mb="md" align="flex-start">
                    <Group gap="md" style={{ flex: 1 }} align="flex-start">
                      <ThemeIcon size="xl" radius="md" color={colors.bg} variant="light">
                        <IconComponent size={24} color={`var(--mantine-color-${colors.icon})`} />
                      </ThemeIcon>
                      <Stack gap="xs" style={{ flex: 1 }}>
                        <Title order={4} c="dark" fw={700}>{challenge.title}</Title>
                        <Badge color={colors.badgeBg} c={colors.badgeText} size="sm" radius="xl" fw={700}>
                          {challenge.type}
                        </Badge>
                        <Text c="dark.7" size="sm">{challenge.description}</Text>
                      </Stack>
                    </Group>
                    <Stack gap="xs" align="flex-end">
                      <Text c="green.6" fw={900} size="2xl">{challenge.reward}</Text>
                      <Text c="dimmed" size="xs">{challenge.deadline}</Text>
                    </Stack>
                  </Group>

                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text c="dark.7" fw={600} size="sm">Progress</Text>
                      <Text c="dark" fw={700}>{challenge.progress}/{challenge.total}</Text>
                    </Group>
                    <Progress
                      value={Math.min(progressPercentage, 100)}
                      color={challenge.color}
                      size="sm"
                      radius="xl"
                      styles={{
                        root: {
                          backgroundColor: 'var(--mantine-color-gray-2)',
                        },
                        section: {
                          background: `linear-gradient(to right, var(--mantine-color-${colors.progressFrom}), var(--mantine-color-${colors.progressTo}))`,
                        },
                      }}
                    />
                  </Stack>

                  <Button
                    fullWidth
                    mt="md"
                    color="orange"
                    rightSection={<IconChevronRight size={16} />}
                    style={{
                      background: 'linear-gradient(to right, var(--mantine-color-orange-5), var(--mantine-color-red-6))',
                    }}
                    radius="xl"
                    fw={700}
                  >
                    View Details
                  </Button>
                </Paper>
              );
            }) : (
              <Paper p="xl" radius="xl" bg="orange.0" shadow="md">
                <Stack gap="xs" align="center">
                  <Text c="dimmed">No active challenges</Text>
                  <Text size="sm" c="dimmed">New challenges will appear here</Text>
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default FeederPromotionsTab;
