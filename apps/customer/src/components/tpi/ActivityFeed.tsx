import React from 'react';
import { Stack, Group, Text, Avatar, Card, Button, Divider } from '@mantine/core';
import { IconClock, IconUser } from '@tabler/icons-react';

export interface Activity {
  id: string;
  timestamp: string;
  type: 'action' | 'event' | 'system';
  actor?: {
    name: string;
    avatar?: string;
  };
  action: string;
  target?: {
    type: string;
    name: string;
    link?: string;
  };
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  realTime?: boolean;
}

export function ActivityFeed({
  activities,
  loading = false,
  onLoadMore,
  hasMore = false,
  realTime = false,
}: ActivityFeedProps) {
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'action':
        return '👤';
      case 'event':
        return '⚡';
      case 'system':
        return '🤖';
      default:
        return '•';
    }
  };

  if (loading && activities.length === 0) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} padding="sm" withBorder>
            <Group gap="sm">
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#f3f4f6' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, width: '60%', backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 4 }} />
                <div style={{ height: 10, width: '40%', backgroundColor: '#f3f4f6', borderRadius: 4 }} />
              </div>
            </Group>
          </Card>
        ))}
      </Stack>
    );
  }

  if (activities.length === 0) {
    return (
      <Card padding="md" withBorder>
        <Text c="dimmed" size="sm" ta="center">
          No recent activity
        </Text>
      </Card>
    );
  }

  return (
    <Stack gap="xs">
      {activities.map((activity, index) => (
        <React.Fragment key={activity.id}>
          <Card padding="sm" withBorder style={{ backgroundColor: index === 0 && realTime ? '#f0fdf4' : 'white' }}>
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <Avatar
                src={activity.actor?.avatar}
                size="sm"
                radius="xl"
              >
                {activity.actor?.name?.charAt(0) || <IconUser size={16} />}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Group gap="xs" align="center" wrap="nowrap">
                  <Text size="xs" c="dimmed">
                    {getActivityIcon(activity.type)}
                  </Text>
                  <Text size="sm" style={{ flex: 1 }}>
                    {activity.actor ? (
                      <Text component="span" fw={500}>{activity.actor.name}</Text>
                    ) : (
                      <Text component="span" c="dimmed">System</Text>
                    )}
                    {' '}
                    {activity.action}
                    {activity.target && (
                      <>
                        {' '}
                        <Text component="span" c="dimmed">on</Text>
                        {' '}
                        {activity.target.link ? (
                          <Text component="a" href={activity.target.link} c="blue" style={{ textDecoration: 'none' }}>
                            {activity.target.name}
                          </Text>
                        ) : (
                          <Text component="span" fw={500}>{activity.target.name}</Text>
                        )}
                      </>
                    )}
                  </Text>
                </Group>
                <Group gap="xs" mt={4}>
                  <IconClock size={12} style={{ color: '#9ca3af' }} />
                  <Text size="xs" c="dimmed">
                    {formatTimestamp(activity.timestamp)}
                  </Text>
                </Group>
              </div>
            </Group>
          </Card>
          {index < activities.length - 1 && <Divider />}
        </React.Fragment>
      ))}

      {hasMore && onLoadMore && (
        <Button
          variant="subtle"
          size="sm"
          onClick={onLoadMore}
          loading={loading}
          fullWidth
          mt="sm"
        >
          Load More
        </Button>
      )}
    </Stack>
  );
}

