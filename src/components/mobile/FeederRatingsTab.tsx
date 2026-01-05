import React, { useState, useEffect } from 'react';
import { IconMenu2, IconStar, IconTrendingUp, IconThumbUp, IconClock, IconPackage } from '@tabler/icons-react';
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
  Grid,
  Badge,
  Progress,
  Title,
} from '@mantine/core';

type FeederRatingsTabProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

const FeederRatingsTab: React.FC<FeederRatingsTabProps> = ({
  onOpenMenu,
  onOpenNotifications
}) => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [overallRating, setOverallRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [stats, setStats] = useState({
    onTime: 0,
    accuracy: 0,
    quality: 0,
    satisfaction: 0
  });
  const [ratingBreakdown, setRatingBreakdown] = useState<Array<{ stars: number; count: number; percentage: number }>>([]);
  const [recentReviews, setRecentReviews] = useState<Array<{
    rating: number;
    customer: string;
    time: string;
    comment: string;
    tags: string[];
  }>>([]);
  const [cityPercentile, setCityPercentile] = useState<number | null>(null);

  useEffect(() => {
    fetchRatingsData();
  }, [selectedFilter]);

  const fetchRatingsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('driver_profiles')
        .select('rating, total_deliveries')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setOverallRating(Number(profile.rating) || 0);
        setTotalRatings(profile.total_deliveries || 0);
      }

      const { data: feedback } = await supabase
          .from('order_feedback')
          .select('rating, comment, created_at, customer_id')
          .eq('driver_id', user.id)
          .eq('feedback_type', 'customer_to_driver')
          .not('rating', 'is', null)
          .order('created_at', { ascending: false });

        if (feedback && feedback.length > 0) {
          const avgRating = feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length;
          setStats({
            onTime: Math.round(avgRating * 20),
            accuracy: Math.round(avgRating * 20),
            quality: Math.round(avgRating * 20),
            satisfaction: Math.round(avgRating * 20)
          });
        }

      const { data: allFeedback } = await supabase
        .from('order_feedback')
        .select('rating')
        .eq('driver_id', user.id)
        .eq('feedback_type', 'customer_to_driver')
        .not('rating', 'is', null);

      if (allFeedback && allFeedback.length > 0) {
        const breakdown = [5, 4, 3, 2, 1].map(stars => {
          const count = allFeedback.filter(f => f.rating === stars).length;
          const percentage = (count / allFeedback.length) * 100;
          return { stars, count, percentage: Math.round(percentage * 10) / 10 };
        });
        setRatingBreakdown(breakdown);
        setTotalRatings(allFeedback.length);
      } else {
        setRatingBreakdown([
          { stars: 5, count: 0, percentage: 0 },
          { stars: 4, count: 0, percentage: 0 },
          { stars: 3, count: 0, percentage: 0 },
          { stars: 2, count: 0, percentage: 0 },
          { stars: 1, count: 0, percentage: 0 }
        ]);
      }

      let reviewsQuery = supabase
        .from('order_feedback')
        .select('rating, comment, created_at, customer_id, order_id, customer:users!order_feedback_customer_id_fkey(email, full_name)')
        .eq('driver_id', user.id)
        .eq('feedback_type', 'customer_to_driver')
        .not('rating', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (selectedFilter === '5stars') {
        reviewsQuery = reviewsQuery.eq('rating', 5);
      } else if (selectedFilter === '4stars') {
        reviewsQuery = reviewsQuery.eq('rating', 4);
      } else if (selectedFilter === 'recent') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        reviewsQuery = reviewsQuery.gte('created_at', weekAgo.toISOString());
      }

      const { data: reviews } = await reviewsQuery;

      if (reviews) {
        const formattedReviews = reviews.map(review => {
          const customer = review.customer as any;
          const customerName = customer?.full_name || customer?.email?.split('@')[0] || 'Customer';
          const nameParts = customerName.split(' ');
          const displayName = nameParts.length > 1 
            ? `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0)}.`
            : customerName;

          const timeAgo = getTimeAgo(new Date(review.created_at));
          
          const tags: string[] = [];
          if (review.comment) {
            const commentLower = review.comment.toLowerCase();
            if (commentLower.includes('fast') || commentLower.includes('quick')) tags.push('Fast');
            if (commentLower.includes('friendly') || commentLower.includes('nice')) tags.push('Friendly');
            if (commentLower.includes('professional')) tags.push('Professional');
            if (commentLower.includes('careful') || commentLower.includes('care')) tags.push('Careful');
            if (commentLower.includes('on time') || commentLower.includes('timely')) tags.push('On Time');
          }
          if (tags.length === 0 && review.rating === 5) {
            tags.push('Great Service');
          }

          return {
            rating: review.rating || 5,
            customer: displayName,
            time: timeAgo,
            comment: review.comment || 'No comment provided',
            tags: tags.length > 0 ? tags : ['Satisfied']
          };
        });
        setRecentReviews(formattedReviews);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
      notifications.show({
        title: 'Failed to load ratings',
        message: '',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getStatIconColor = (color: string) => {
    const colors: Record<string, { bg: string; icon: string }> = {
      blue: { bg: 'blue.1', icon: 'blue.6' },
      green: { bg: 'green.1', icon: 'green.6' },
      yellow: { bg: 'yellow.1', icon: 'yellow.6' },
      purple: { bg: 'violet.1', icon: 'violet.6' }
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <Box h="100vh" w="100%" style={{ background: 'linear-gradient(to bottom, var(--mantine-color-red-6), var(--mantine-color-orange-6), var(--mantine-color-orange-5))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" color="white" />
      </Box>
    );
  }

  return (
    <Box h="100vh" w="100%" style={{ background: 'linear-gradient(to bottom, var(--mantine-color-red-6), var(--mantine-color-orange-6), var(--mantine-color-orange-5))', overflowY: 'auto', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <Group px="xl" pb="md" justify="space-between" align="center" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
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
          color="white"
        >
          <IconMenu2 size={24} />
        </ActionIcon>
        <Title order={1} c="orange.3" fw={700} style={{ letterSpacing: '0.05em' }}>RATINGS</Title>
        <ActionIcon
          onClick={() => {
            window.location.href = '/mobile?tab=messages';
          }}
          variant="subtle"
          color="white"
        >
          <img src="/app-chat.png" alt="Messages" style={{ width: '28px', height: '28px' }} />
        </ActionIcon>
      </Group>

      {/* Hero Rating Section */}
      <Box px="xl" mb="xl">
        <Paper
          p="xl"
          radius="xl"
          style={{
            background: 'linear-gradient(to bottom right, var(--mantine-color-yellow-4), var(--mantine-color-orange-4), var(--mantine-color-red-5))',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1 }}>
            <Text size="4xl" style={{ position: 'absolute', top: 16, left: 32 }}>⭐</Text>
            <Text size="3xl" style={{ position: 'absolute', bottom: 32, right: 16 }}>⭐</Text>
            <Text size="2xl" style={{ position: 'absolute', top: '50%', right: 48 }}>⭐</Text>
          </Box>
          
          <Stack gap="md" align="center" style={{ position: 'relative' }}>
            <Text c="white" size="sm" fw={600} opacity={0.9}>Your Feeder Score</Text>
            <Title order={1} c="white" fw={900} size="5rem">{overallRating.toFixed(1)}</Title>
            <Group gap="xs" justify="center">
              {[1, 2, 3, 4, 5].map((star) => (
                <IconStar
                  key={star}
                  size={24}
                  style={{
                    color: star <= Math.round(overallRating) ? 'var(--mantine-color-yellow-2)' : 'rgba(255, 255, 255, 0.3)',
                    fill: star <= Math.round(overallRating) ? 'currentColor' : 'none',
                  }}
                />
              ))}
            </Group>
            <Text c="white" fw={600}>Based on {totalRatings} {totalRatings === 1 ? 'feed' : 'feeds'}</Text>
            {cityPercentile && (
              <Paper p="sm" radius="xl" bg="rgba(255, 255, 255, 0.2)" style={{ backdropFilter: 'blur(4px)' }}>
                <Group gap="xs">
                  <IconTrendingUp size={16} color="white" />
                  <Text c="white" size="sm" fw={700}>Top {cityPercentile}% in your city</Text>
                </Group>
              </Paper>
            )}
          </Stack>
        </Paper>
      </Box>

      {/* Performance Stats */}
      <Box px="xl" mb="xl">
        <Title order={3} c="white" fw={700} mb="md" style={{ letterSpacing: '0.05em' }}>PERFORMANCE PULSE</Title>
        <Grid gutter="md">
          {[
            { icon: IconClock, label: 'On Time', value: stats.onTime, color: 'blue' },
            { icon: IconPackage, label: 'Accuracy', value: stats.accuracy, color: 'green' },
            { icon: IconStar, label: 'Quality', value: stats.quality, color: 'yellow' },
            { icon: IconThumbUp, label: 'Satisfaction', value: stats.satisfaction, color: 'purple' }
          ].map((stat, idx) => {
            const iconColors = getStatIconColor(stat.color);
            const Icon = stat.icon;
            return (
              <Grid.Col span={6} key={idx}>
                <Paper p="md" radius="xl" bg="orange.0" shadow="md">
                  <Group gap="xs" mb="xs">
                    <ThemeIcon size="lg" radius="md" color={iconColors.bg} variant="light">
                      <Icon size={20} color={`var(--mantine-color-${iconColors.icon})`} />
                    </ThemeIcon>
                    <Text c="dark.7" size="sm" fw={600}>{stat.label}</Text>
                  </Group>
                  <Text size="2.5rem" fw={900} c="dark">{stat.value}%</Text>
                </Paper>
              </Grid.Col>
            );
          })}
        </Grid>
      </Box>

      {/* Rating Breakdown */}
      <Box px="xl" mb="xl">
        <Title order={3} c="white" fw={700} mb="md" style={{ letterSpacing: '0.05em' }}>RATING BREAKDOWN</Title>
        <Paper p="lg" radius="xl" bg="orange.0" shadow="md">
          {ratingBreakdown.length > 0 ? (
            <Stack gap="md">
              {ratingBreakdown.map((item) => (
                <Group key={item.stars} gap="md" align="center">
                  <Group gap="xs" w={64}>
                    <Text c="dark" fw={700}>{item.stars}</Text>
                    <IconStar size={16} color="var(--mantine-color-yellow-5)" fill="currentColor" />
                  </Group>
                  <Box style={{ flex: 1 }}>
                    <Progress
                      value={item.percentage}
                      color="orange"
                      size="sm"
                      radius="xl"
                      styles={{
                        root: {
                          backgroundColor: 'var(--mantine-color-gray-2)',
                        },
                        section: {
                          background: 'linear-gradient(to right, var(--mantine-color-yellow-4), var(--mantine-color-orange-5))',
                        },
                      }}
                    />
                  </Box>
                  <Text c="dark.7" size="sm" fw={600} w={48} ta="right">{item.count}</Text>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed" ta="center" py="md">No ratings yet</Text>
          )}
        </Paper>
      </Box>

      {/* Filter Buttons */}
      <Box px="xl" mb="md">
        <Group gap="xs" style={{ overflowX: 'auto', paddingBottom: '8px' }}>
          {['All', '5 Stars', '4 Stars', 'Recent'].map((filter) => {
            const filterKey = filter.toLowerCase().replace(' ', '');
            const isSelected = selectedFilter === filterKey;
            return (
              <Button
                key={filter}
                onClick={() => setSelectedFilter(filterKey)}
                variant={isSelected ? 'filled' : 'light'}
                color={isSelected ? 'white' : 'transparent'}
                c={isSelected ? 'red.7' : 'white'}
                size="sm"
                radius="xl"
                fw={700}
                style={{ whiteSpace: 'nowrap' }}
              >
                {filter}
              </Button>
            );
          })}
        </Group>
      </Box>

      {/* Recent Reviews */}
      <Box px="xl" pb="xl">
        <Title order={3} c="white" fw={700} mb="md" style={{ letterSpacing: '0.05em' }}>RECENT REVIEWS</Title>
        {recentReviews.length > 0 ? (
          <Stack gap="md">
            {recentReviews.map((review, idx) => (
              <Paper key={idx} p="md" radius="xl" bg="orange.0" shadow="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <Box
                      w={40}
                      h={40}
                      style={{
                        borderRadius: '50%',
                        background: 'linear-gradient(to bottom right, var(--mantine-color-orange-4), var(--mantine-color-red-5))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                      }}
                    >
                      {review.customer.charAt(0)}
                    </Box>
                    <Box>
                      <Text c="dark" fw={700} size="sm">{review.customer}</Text>
                      <Text c="dimmed" size="xs">{review.time}</Text>
                    </Box>
                  </Group>
                  <Group gap="xs">
                    {[...Array(review.rating)].map((_, i) => (
                      <IconStar key={i} size={16} color="var(--mantine-color-yellow-5)" fill="currentColor" />
                    ))}
                  </Group>
                </Group>
                <Text c="dark.7" size="sm" mb="sm">{review.comment}</Text>
                {review.tags.length > 0 && (
                  <Group gap="xs">
                    {review.tags.map((tag, i) => (
                      <Badge key={i} color="orange" variant="light" size="sm" radius="xl">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                )}
              </Paper>
            ))}
          </Stack>
        ) : (
          <Paper p="xl" radius="xl" bg="orange.0" shadow="md">
            <Stack gap="xs" align="center">
              <Text c="dimmed">No reviews yet</Text>
              <Text size="sm" c="dimmed">Your customer reviews will appear here</Text>
            </Stack>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default FeederRatingsTab;
