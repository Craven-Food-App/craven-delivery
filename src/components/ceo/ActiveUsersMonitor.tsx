import React, { useState, useEffect } from 'react';
import {
  Card,
  Title,
  Text,
  Table,
  Badge,
  Group,
  Stack,
  Tabs,
  ScrollArea,
  Avatar,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import { IconCircle, IconRefresh, IconClock, IconUser } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface ActiveUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  portal_type: string;
  current_location: string;
  last_activity_at: string;
  is_active: boolean;
  role?: string;
  title?: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  activity_type: string;
  portal_type: string;
  location: string;
  created_at: string;
}

const ActiveUsersMonitor: React.FC = () => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    // Initial fetch
    fetchActiveUsers();
    fetchActivityLog();
    
    // REAL-TIME SUBSCRIPTIONS - Zero delay updates
    // Subscribe to user_sessions changes (INSERT, UPDATE, DELETE)
    const sessionsChannel = supabase
      .channel('active-users-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_sessions',
        },
        async (payload) => {
          // Zero-delay update - refresh immediately when any change occurs
          await fetchActiveUsers();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to user_sessions realtime');
        }
      });

    // Subscribe to user_activity_log changes - Zero delay
    const activityChannel = supabase
      .channel('activity-log-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'user_activity_log',
        },
        async (payload) => {
          // Zero-delay update - refresh immediately when any activity occurs
          await fetchActivityLog();
          // Also refresh active users in case session changed
          await fetchActiveUsers();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to user_activity_log realtime');
        }
      });

    // Cleanup subscriptions on unmount
    return () => {
      sessionsChannel.unsubscribe();
      activityChannel.unsubscribe();
    };
  }, []);

  const fetchActiveUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('id, user_id, portal_type, current_location, last_activity_at, is_active')
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false });

      if (error) {
        // If table doesn't exist yet (404), just return empty array
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          setActiveUsers([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        setActiveUsers([]);
        setLoading(false);
        return;
      }

      // Fetch user_profiles and exec_users separately
      const userIds = data.map((s: any) => s.user_id);
      
      const [profilesRes, execUsersRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds),
        supabase
          .from('exec_users')
          .select('user_id, role, title')
          .in('user_id', userIds)
      ]);

      const profilesMap = new Map(
        (profilesRes.data || []).map((p: any) => [p.user_id, p])
      );
      
      const execUsersMap = new Map(
        (execUsersRes.data || []).map((eu: any) => [eu.user_id, eu])
      );

      const users: ActiveUser[] = data.map((session: any) => {
        const profile = profilesMap.get(session.user_id);
        const execUser = execUsersMap.get(session.user_id);
        
        // Prioritize: full_name -> title -> email username -> user_id
        const fullName = profile?.full_name || 
                         execUser?.title || 
                         (profile?.email ? profile.email.split('@')[0] : null) ||
                         `User ${session.user_id.substring(0, 8)}`;
        
        const email = profile?.email || '';
        
        return {
          id: session.id,
          user_id: session.user_id,
          full_name: fullName,
          email: email,
          portal_type: session.portal_type,
          current_location: session.current_location || '',
          last_activity_at: session.last_activity_at,
          is_active: session.is_active,
          role: execUser?.role,
          title: execUser?.title,
        };
      });

      setActiveUsers(users);
    } catch (error: any) {
      console.error('Error fetching active users:', error);
      // Don't show error notification if table doesn't exist yet
      if (error.code !== 'PGRST116' && !error.message?.includes('does not exist')) {
        notifications.show({
          title: 'Error',
          message: 'Failed to load active users',
          color: 'red',
        });
      }
      setActiveUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLog = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('id, user_id, activity_type, portal_type, location, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        // If table doesn't exist yet (404), just return empty array
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          setActivityLog([]);
          return;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        setActivityLog([]);
        return;
      }

      // Fetch user_profiles and exec_users separately
      const userIds = [...new Set(data.map((log: any) => log.user_id))];
      
      const [profilesRes, execUsersRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds),
        supabase
          .from('exec_users')
          .select('user_id, title, role')
          .in('user_id', userIds)
      ]);

      const profilesMap = new Map(
        (profilesRes.data || []).map((p: any) => [p.user_id, p])
      );
      
      const execUsersMap = new Map(
        (execUsersRes.data || []).map((eu: any) => [eu.user_id, eu])
      );

      const logs: ActivityLog[] = data.map((log: any) => {
        const profile = profilesMap.get(log.user_id);
        const execUser = execUsersMap.get(log.user_id);
        
        // Prioritize: full_name -> title -> email username -> user_id
        const fullName = profile?.full_name || 
                         execUser?.title || 
                         (profile?.email ? profile.email.split('@')[0] : null) ||
                         `User ${log.user_id.substring(0, 8)}`;
        
        const email = profile?.email || '';
        
        return {
          id: log.id,
          user_id: log.user_id,
          full_name: fullName,
          email: email,
          activity_type: log.activity_type,
          portal_type: log.portal_type || '',
          location: log.location || '',
          created_at: log.created_at,
        };
      });

      setActivityLog(logs);
    } catch (error: any) {
      console.error('Error fetching activity log:', error);
      // Don't show error if table doesn't exist yet
      if (error.code !== 'PGRST116' && !error.message?.includes('does not exist')) {
        setActivityLog([]);
      }
    }
  };

  const getPortalBadgeColor = (portal: string) => {
    const colors: Record<string, string> = {
      ceo: 'violet',
      cfo: 'blue',
      cto: 'green',
      coo: 'orange',
      company: 'cyan',
      admin: 'red',
      board: 'grape',
      hub: 'gray',
    };
    return colors[portal.toLowerCase()] || 'gray';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return '🟢';
      case 'logout': return '🔴';
      case 'portal_enter': return '➡️';
      case 'portal_exit': return '⬅️';
      case 'section_change': return '🔄';
      default: return '📝';
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>Active Users & Activity Monitor</Title>
        <ActionIcon variant="light" onClick={() => { fetchActiveUsers(); fetchActivityLog(); }}>
          <IconRefresh size={18} />
        </ActionIcon>
      </Group>

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'active')}>
        <Tabs.List>
          <Tabs.Tab value="active" leftSection={<IconUser size={16} />}>
            Active Users ({activeUsers.length})
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconClock size={16} />}>
            Activity History
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="active" pt="md">
          <Card padding="lg" radius="md" withBorder>
            {activeUsers.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                No active users
              </Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>User</Table.Th>
                    <Table.Th>Role/Title</Table.Th>
                    <Table.Th>Portal</Table.Th>
                    <Table.Th>Location</Table.Th>
                    <Table.Th>Last Activity</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {activeUsers.map((user) => (
                    <Table.Tr key={user.id}>
                      <Table.Td>
                        <Tooltip label="Active">
                          <IconCircle size={12} fill="#22c55e" color="#22c55e" />
                        </Tooltip>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Avatar size="sm" radius="xl">
                            {user.full_name.charAt(0)}
                          </Avatar>
                          <div>
                            <Text fw={500} size="sm">{user.full_name}</Text>
                            <Text size="xs" c="dimmed">{user.email}</Text>
                          </div>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{user.title || user.role || 'Employee'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getPortalBadgeColor(user.portal_type)} variant="light">
                          {user.portal_type.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed" style={{ maxWidth: 200 }} truncate>
                          {user.current_location || 'Unknown'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {formatTimeAgo(user.last_activity_at)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="history" pt="md">
          <Card padding="lg" radius="md" withBorder>
            <ScrollArea h={500}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Time</Table.Th>
                    <Table.Th>User</Table.Th>
                    <Table.Th>Activity</Table.Th>
                    <Table.Th>Portal</Table.Th>
                    <Table.Th>Location</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {activityLog.map((log) => (
                    <Table.Tr key={log.id}>
                      <Table.Td>
                        <Text size="xs">{new Date(log.created_at).toLocaleString()}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{log.full_name}</Text>
                        <Text size="xs" c="dimmed">{log.email}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Text size="sm">{getActivityIcon(log.activity_type)}</Text>
                          <Badge size="sm" variant="light">
                            {log.activity_type}
                          </Badge>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {log.portal_type && (
                          <Badge color={getPortalBadgeColor(log.portal_type)} variant="light" size="sm">
                            {log.portal_type.toUpperCase()}
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed" style={{ maxWidth: 200 }} truncate>
                          {log.location || '-'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default ActiveUsersMonitor;

