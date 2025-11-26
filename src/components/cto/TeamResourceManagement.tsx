import React, { useState, useEffect } from 'react';
import {
  Grid,
  Group,
  Stack,
  Card,
  Text,
  Title,
  Badge,
  Table,
  Tabs,
  Box,
  Paper,
  Progress,
  Avatar,
  Button,
  Alert,
  Loader,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconUsers,
  IconTrendingUp,
  IconCode,
  IconClock,
  IconCheck,
  IconAlertTriangle,
  IconAlertCircle,
  IconRefresh,
  IconMail,
  IconCircleCheck,
  IconX,
  IconChartBar,
  IconArrowsExchange,
  IconUserCheck,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { FuturisticChart } from '@/components/cfo/FuturisticChart';
import { MantineTable } from '@/components/cfo/MantineTable';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  sprintVelocity: number;
  codeReviews: number;
  pullRequests: number;
  availability: number;
}

interface SprintMetrics {
  sprint: string;
  velocity: number;
  completed: number;
  planned: number;
}

interface PerformanceAlert {
  id: string;
  developer_id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  metrics: any;
  user_profiles?: { email: string; full_name: string };
}

interface WorkforcePrediction {
  id: string;
  predicted_burn_rate: number;
  predicted_completion_date: string;
  staffing_gap_detected: boolean;
  recommended_hiring_count: number;
  recommended_roles: string[];
  confidence_score: number;
  reasoning: string;
  current_velocity?: number;
  velocity_gap?: number;
  days_remaining?: number;
}

interface RedistributionSuggestion {
  id: string;
  overloaded_developer_id: string;
  suggested_reassign_to: string;
  ticket_id: string;
  reason: string;
  priority: string;
  status: string;
  overloaded_dev?: { email: string; full_name: string };
  reassign_dev?: { email: string; full_name: string };
  ticket?: { ticket_number: string; title: string };
}

export const TeamResourceManagement: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sprintMetrics, setSprintMetrics] = useState<SprintMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('alerts');
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [prediction, setPrediction] = useState<WorkforcePrediction | null>(null);
  const [suggestions, setSuggestions] = useState<RedistributionSuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchTeamData();
    fetchAlerts();
    fetchPrediction();
    fetchSuggestions();
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      // Try to fetch from cto_developers, but handle gracefully if table doesn't exist
      // Note: Removed the join to user_profiles as it causes relationship errors
      const { data: developers, error: developersError } = await supabase
        .from('cto_developers')
        .select('*');

      if (developersError) {
        // Check if table doesn't exist or permission denied
        if (developersError.code === 'PGRST116' || 
            developersError.message?.includes('does not exist') || 
            developersError.message?.includes('permission denied') ||
            developersError.message?.includes('relationship')) {
          console.warn('cto_developers table not found or not accessible, using empty team members');
          setTeamMembers([]);
        } else {
          console.error('Error fetching developers:', developersError);
          throw developersError;
        }
      } else {
        // Fetch user profiles separately if needed
        const userIds = (developers || []).map((dev: any) => dev.user_id).filter(Boolean);
        let userProfilesMap: Record<string, any> = {};
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, email, full_name')
            .in('user_id', userIds);
          
          if (profiles) {
            profiles.forEach((profile: any) => {
              userProfilesMap[profile.user_id] = profile;
            });
          }
        }

        const members: TeamMember[] = (developers || []).map((dev: any) => {
          const profile = userProfilesMap[dev.user_id];
          return {
            id: dev.user_id || dev.id,
            name: profile?.full_name || dev.full_name || dev.email || dev.user_id || 'Unknown',
            role: dev.role || 'Developer',
            sprintVelocity: 0, // Will be calculated
            codeReviews: 0,
            pullRequests: 0,
            availability: dev.availability_status === 'available' ? 100 : dev.availability_status === 'busy' ? 50 : 0,
          };
        });
        setTeamMembers(members);
      }

      // Fetch sprint metrics
      const { data: sprints, error: sprintsError } = await supabase
        .from('cto_sprints')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);

      if (sprintsError) {
        // Handle gracefully if table doesn't exist
        if (sprintsError.code === 'PGRST116' || sprintsError.message?.includes('does not exist')) {
          console.warn('cto_sprints table not found, using empty sprint metrics');
          setSprintMetrics([]);
        } else {
          console.error('Error fetching sprints:', sprintsError);
          // Don't throw, just set empty array
          setSprintMetrics([]);
        }
      } else {
        const metrics: SprintMetrics[] = (sprints || []).map((sprint: any) => ({
          sprint: sprint.sprint_name || `Sprint ${sprint.id}`,
          velocity: sprint.velocity_target || 0,
          completed: 0,
          planned: sprint.velocity_target || 0,
        }));
        setSprintMetrics(metrics);
      }
    } catch (error: any) {
      console.error('Error fetching team data:', error);
      toast.error(`Failed to load team data: ${error.message || 'Unknown error'}`, 'Error');
      // Set empty arrays as fallback
      setTeamMembers([]);
      setSprintMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      // Fetch alerts without the problematic join
      const { data, error } = await supabase
        .from('cto_performance_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || 
            error.message?.includes('does not exist') ||
            error.message?.includes('relationship')) {
          console.warn('cto_performance_alerts table not found, using empty alerts');
          setAlerts([]);
          return;
        }
        throw error;
      }

      // Fetch user profiles separately if we have developer_ids
      const developerIds = (data || []).map((alert: any) => alert.developer_id).filter(Boolean);
      let userProfilesMap: Record<string, any> = {};
      
      if (developerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, email, full_name')
          .in('user_id', developerIds);
        
        if (profiles) {
          profiles.forEach((profile: any) => {
            userProfilesMap[profile.user_id] = profile;
          });
        }
      }

      // Attach profiles to alerts
      const alertsWithProfiles = (data || []).map((alert: any) => ({
        ...alert,
        user_profiles: userProfilesMap[alert.developer_id] || null,
      }));

      setAlerts(alertsWithProfiles as any);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    }
  };

  const fetchPrediction = async () => {
    try {
      const { data, error } = await supabase
        .from('cto_workforce_predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('cto_workforce_predictions table not found, no prediction available');
          setPrediction(null);
          return;
        }
        throw error;
      }
      setPrediction(data as any);
    } catch (error) {
      console.error('Error fetching prediction:', error);
      setPrediction(null);
    }
  };

  const fetchSuggestions = async () => {
    try {
      // Fetch suggestions without complex joins that cause relationship errors
      const { data, error } = await supabase
        .from('cto_redistribution_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || 
            error.message?.includes('does not exist') ||
            error.message?.includes('relationship')) {
          console.warn('cto_redistribution_suggestions table not found, using empty suggestions');
          setSuggestions([]);
          return;
        }
        throw error;
      }

      // Fetch related data separately if needed
      const developerIds = [
        ...(data || []).map((s: any) => s.overloaded_developer_id).filter(Boolean),
        ...(data || []).map((s: any) => s.suggested_reassign_to).filter(Boolean),
      ];
      let userProfilesMap: Record<string, any> = {};
      
      if (developerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, email, full_name')
          .in('user_id', developerIds);
        
        if (profiles) {
          profiles.forEach((profile: any) => {
            userProfilesMap[profile.user_id] = profile;
          });
        }
      }

      // Attach profiles to suggestions
      const suggestionsWithProfiles = (data || []).map((suggestion: any) => ({
        ...suggestion,
        overloaded_dev: {
          user_profiles: userProfilesMap[suggestion.overloaded_developer_id] || null,
        },
        reassign_dev: {
          user_profiles: userProfilesMap[suggestion.suggested_reassign_to] || null,
        },
        ticket: null, // Will need separate fetch if ticket table exists
      }));

      // @ts-ignore - Type mismatch with database schema
      setSuggestions(suggestionsWithProfiles as any);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  const runUnderperformanceDetection = async () => {
    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cto-detect-underperformance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parse fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        toast.error(errorMessage, 'Error');
        return;
      }

      const result = await response.json();
      if (result.success) {
        toast.success(`Detected ${result.alerts_created || 0} performance alerts`, 'Analysis Complete');
        fetchAlerts();
      } else {
        toast.error(result.error || 'Failed to detect underperformance', 'Error');
      }
    } catch (error: any) {
      console.error('Error running underperformance detection:', error);
      toast.error(error.message || 'Failed to run analysis. Please try again.', 'Error');
    } finally {
      setAnalyzing(false);
    }
  };

  const runWorkforcePlanning = async () => {
    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cto-workforce-planning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        toast.error(errorMessage, 'Error');
        return;
      }

      const result = await response.json();
      if (result.success) {
        toast.success('Workforce planning analysis complete', 'Analysis Complete');
        setPrediction(result.prediction);
        fetchPrediction();
      } else {
        toast.error(result.error || 'Failed to run analysis', 'Error');
      }
    } catch (error: any) {
      console.error('Error running workforce planning:', error);
      toast.error(error.message || 'Failed to run analysis. Please try again.', 'Error');
    } finally {
      setAnalyzing(false);
    }
  };

  const runTaskRedistribution = async () => {
    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cto-redistribute-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        toast.error(errorMessage, 'Error');
        return;
      }

      const result = await response.json();
      if (result.success) {
        toast.success(`Created ${result.suggestions_created || 0} redistribution suggestions`, 'Analysis Complete');
        fetchSuggestions();
      } else {
        toast.error(result.error || 'Failed to run analysis', 'Error');
      }
    } catch (error: any) {
      console.error('Error running task redistribution:', error);
      toast.error(error.message || 'Failed to run analysis. Please try again.', 'Error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApproveSuggestion = async (suggestionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cto-redistribute-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ suggestion_id: suggestionId, action: 'approve' }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Task reassigned successfully', 'Success');
        fetchSuggestions();
        fetchTeamData();
      } else {
        toast.error(result.error || 'Failed to approve suggestion', 'Error');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve suggestion', 'Error');
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cto-redistribute-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ suggestion_id: suggestionId, action: 'reject' }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Suggestion rejected', 'Success');
        fetchSuggestions();
      } else {
        toast.error(result.error || 'Failed to reject suggestion', 'Error');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject suggestion', 'Error');
    }
  };

  const totalVelocity = teamMembers.reduce((sum, m) => sum + m.sprintVelocity, 0);
  const avgVelocity = teamMembers.length > 0 ? totalVelocity / teamMembers.length : 0;
  const totalCodeReviews = teamMembers.reduce((sum, m) => sum + m.codeReviews, 0);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      default: return 'blue';
    }
  };

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <Box>
          <Title order={2}>Team & Resource Management</Title>
          <Text c="dimmed" size="sm">
            Actionable management engine: Auto-detect issues, plan workforce, redistribute tasks
          </Text>
        </Box>
        <Badge size="lg" color="blue" variant="light" leftSection={<IconUsers size={16} />}>
          Management Engine
        </Badge>
      </Group>

      {/* Key Team Metrics */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Team Size</Text>
              <IconUsers size={20} color="#3b82f6" />
            </Group>
            <Text size="xl" fw={700} c="blue">
              {teamMembers.length}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Active developers
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Active Alerts</Text>
              <IconAlertTriangle size={20} color="#f59e0b" />
            </Group>
            <Text size="xl" fw={700} c="orange">
              {alerts.length}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Performance issues detected
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Redistribution Suggestions</Text>
              <IconArrowsExchange size={20} color="#8b5cf6" />
            </Group>
            <Text size="xl" fw={700} c="violet">
              {suggestions.length}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Pending task rebalancing
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Staffing Gap</Text>
              <IconUserCheck size={20} color={prediction?.staffing_gap_detected ? '#ef4444' : '#10b981'} />
            </Group>
            <Text size="xl" fw={700} c={prediction?.staffing_gap_detected ? 'red' : 'green'}>
              {prediction?.recommended_hiring_count || 0}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Recommended hires
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Action Buttons */}
      <Group>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={runUnderperformanceDetection}
          loading={analyzing}
          color="orange"
        >
          Detect Underperformance
        </Button>
        <Button
          leftSection={<IconChartBar size={16} />}
          onClick={runWorkforcePlanning}
          loading={analyzing}
          color="blue"
        >
          Run Workforce Planning
        </Button>
        <Button
          leftSection={<IconArrowsExchange size={16} />}
          onClick={runTaskRedistribution}
          loading={analyzing}
          color="violet"
        >
          Analyze Task Redistribution
        </Button>
      </Group>

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'alerts')}>
        <Tabs.List>
          <Tabs.Tab value="alerts" leftSection={<IconAlertTriangle size={16} />}>
            Performance Alerts ({alerts.length})
          </Tabs.Tab>
          <Tabs.Tab value="workforce" leftSection={<IconChartBar size={16} />}>
            Workforce Planning
          </Tabs.Tab>
          <Tabs.Tab value="redistribution" leftSection={<IconArrowsExchange size={16} />}>
            Task Redistribution ({suggestions.length})
          </Tabs.Tab>
          <Tabs.Tab value="team" leftSection={<IconUsers size={16} />}>
            Team Members
          </Tabs.Tab>
          <Tabs.Tab value="velocity" leftSection={<IconTrendingUp size={16} />}>
            Sprint Velocity
          </Tabs.Tab>
        </Tabs.List>

        {/* Performance Alerts Tab */}
        <Tabs.Panel value="alerts" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Performance Alerts</Title>
              <Badge color="orange" variant="light">{alerts.length} Active</Badge>
            </Group>
            {alerts.length === 0 ? (
              <Alert icon={<IconCircleCheck size={16} />} color="green" title="All Clear">
                No performance alerts. All developers are meeting their targets.
              </Alert>
            ) : (
              <Stack gap="md">
                {alerts.map((alert) => {
                  const profile = Array.isArray(alert.user_profiles) ? alert.user_profiles[0] : alert.user_profiles;
                  return (
                    <Alert
                      key={alert.id}
                      icon={<IconAlertTriangle size={16} />}
                      color={getSeverityColor(alert.severity)}
                      title={alert.title}
                    >
                      <Text size="sm" mb="xs">{alert.description}</Text>
                      <Group gap="xs" mt="xs">
                        <Badge size="sm" variant="light">{alert.alert_type.replace('_', ' ')}</Badge>
                        <Badge size="sm" variant="light" color={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        {profile && (
                          <Badge size="sm" variant="light">{profile.full_name}</Badge>
                        )}
                      </Group>
                    </Alert>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Tabs.Panel>

        {/* Workforce Planning Tab */}
        <Tabs.Panel value="workforce" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Workforce Planning Predictions</Title>
              {prediction && (
                <Badge color={prediction.staffing_gap_detected ? 'red' : 'green'} variant="light">
                  {prediction.confidence_score}% Confidence
                </Badge>
              )}
            </Group>
            {!prediction ? (
              <Alert icon={<IconAlertCircle size={16} />} color="blue" title="No Prediction Available">
                Click "Run Workforce Planning" to generate predictions based on current sprint data.
              </Alert>
            ) : (
              <Stack gap="md">
                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder>
                      <Text size="sm" c="dimmed" mb="xs">Predicted Burn Rate</Text>
                      <Text size="xl" fw={700}>{prediction.predicted_burn_rate?.toFixed(2) || 'N/A'} points/day</Text>
                    </Paper>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper p="md" withBorder>
                      <Text size="sm" c="dimmed" mb="xs">Predicted Completion</Text>
                      <Text size="xl" fw={700}>
                        {prediction.predicted_completion_date 
                          ? new Date(prediction.predicted_completion_date).toLocaleDateString()
                          : 'N/A'}
                      </Text>
                    </Paper>
                  </Grid.Col>
                  {prediction.staffing_gap_detected && (
                    <Grid.Col span={12}>
                      <Alert icon={<IconAlertTriangle size={16} />} color="red" title="Staffing Gap Detected">
                        <Text size="sm" mb="xs">
                          Recommended hiring: <strong>{prediction.recommended_hiring_count} developer(s)</strong>
                        </Text>
                        {prediction.recommended_roles && prediction.recommended_roles.length > 0 && (
                          <Text size="sm">
                            Recommended roles: {prediction.recommended_roles.join(', ')}
                          </Text>
                        )}
                      </Alert>
                    </Grid.Col>
                  )}
                </Grid>
                <Paper p="md" withBorder>
                  <Text size="sm" fw={600} mb="xs">Analysis Reasoning</Text>
                  <Text size="sm" c="dimmed">{prediction.reasoning}</Text>
                </Paper>
              </Stack>
            )}
          </Card>
        </Tabs.Panel>

        {/* Task Redistribution Tab */}
        <Tabs.Panel value="redistribution" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Task Redistribution Suggestions</Title>
              <Badge color="violet" variant="light">{suggestions.length} Pending</Badge>
            </Group>
            {suggestions.length === 0 ? (
              <Alert icon={<IconCircleCheck size={16} />} color="green" title="Workload Balanced">
                No redistribution suggestions. Team workload is balanced.
              </Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>From Developer</Table.Th>
                    <Table.Th>To Developer</Table.Th>
                    <Table.Th>Ticket</Table.Th>
                    <Table.Th>Reason</Table.Th>
                    <Table.Th>Priority</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {suggestions.map((suggestion) => {
                    // @ts-ignore - Database relation types
                    const overloadedProfile = (suggestion.overloaded_dev || {}) as any;
                    // @ts-ignore - Database relation types
                    const reassignProfile = (suggestion.reassign_dev || {}) as any;
                    const ticket = Array.isArray(suggestion.ticket) ? suggestion.ticket[0] : suggestion.ticket;
                    return (
                      <Table.Tr key={suggestion.id}>
                        <Table.Td>
                          <Text fw={600}>{overloadedProfile?.full_name || 'Unknown'}</Text>
                          <Text size="xs" c="dimmed">{overloadedProfile?.email}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600}>{reassignProfile?.full_name || 'Unknown'}</Text>
                          <Text size="xs" c="dimmed">{reassignProfile?.email}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{ticket?.ticket_number || 'N/A'}</Text>
                          <Text size="xs" c="dimmed">{ticket?.title || ''}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{suggestion.reason}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={suggestion.priority === 'high' ? 'red' : 'yellow'} variant="light">
                            {suggestion.priority}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Tooltip label="Approve and Reassign">
                              <ActionIcon
                                color="green"
                                variant="light"
                                onClick={() => handleApproveSuggestion(suggestion.id)}
                              >
                                <IconCircleCheck size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Reject Suggestion">
                              <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() => handleRejectSuggestion(suggestion.id)}
                              >
                                <IconX size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        {/* Team Members Tab */}
        <Tabs.Panel value="team" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Developer Performance
            </Title>
            <MantineTable
              data={teamMembers}
              loading={loading}
              rowKey="id"
              columns={[
                {
                  title: 'Developer',
                  dataIndex: 'name',
                  render: (name: string, record: TeamMember) => (
                    <Group gap="xs">
                      <Avatar size="sm" radius="xl" color="blue">
                        {name.split(' ').map(n => n[0]).join('')}
                      </Avatar>
                      <Box>
                        <Text fw={600}>{name}</Text>
                        <Text size="xs" c="dimmed">{record.role}</Text>
                      </Box>
                    </Group>
                  ),
                },
                {
                  title: 'Sprint Velocity',
                  dataIndex: 'sprintVelocity',
                  render: (v: number) => (
                    <Group gap="xs">
                      <Text fw={600}>{v}</Text>
                      <Text size="xs" c="dimmed">points</Text>
                    </Group>
                  ),
                },
                {
                  title: 'Code Reviews',
                  dataIndex: 'codeReviews',
                },
                {
                  title: 'Pull Requests',
                  dataIndex: 'pullRequests',
                },
                {
                  title: 'Availability',
                  dataIndex: 'availability',
                  render: (v: number) => (
                    <Group gap="xs">
                      <Text fw={600}>{v}%</Text>
                      <Progress value={v} size="sm" style={{ width: 80 }} />
                    </Group>
                  ),
                },
              ]}
            />
          </Card>
        </Tabs.Panel>

        {/* Sprint Velocity Tab */}
        <Tabs.Panel value="velocity" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Sprint Velocity Trends
            </Title>
            <FuturisticChart
              data={sprintMetrics}
              type="bar"
              title=""
              height={400}
              colors={['#3b82f6', '#10b981', '#f59e0b']}
              dataKeys={{ revenue: 'velocity', profit: 'completed', expenses: 'planned' }}
            />
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

