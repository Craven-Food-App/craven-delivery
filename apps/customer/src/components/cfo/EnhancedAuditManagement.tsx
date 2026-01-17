import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Grid, Tabs, Timeline, Alert, Progress } from '@mantine/core';
import { IconScale, IconFileCheck, IconCalendar, IconAlertTriangle, IconCheck, IconDownload } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface AuditRequest {
  id: string;
  title: string;
  assigned_to: string;
  due_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AuditTimelineItem {
  id: string;
  title: string;
  phase: string;
  date: string;
  status: string;
  created_at: string;
}

export const EnhancedAuditManagement: React.FC = () => {
  const [auditRequests, setAuditRequests] = useState<AuditRequest[]>([]);
  const [timeline, setTimeline] = useState<AuditTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async () => {
    try {
      const [requestsRes, timelineRes] = await Promise.all([
        supabase.from('audit_requests').select('*').order('due_date'),
        supabase.from('audit_timeline').select('*').order('date')
      ]);

      if (requestsRes.data) setAuditRequests(requestsRes.data);
      if (timelineRes.data) setTimeline(timelineRes.data);
    } catch (error) {
      console.error('Error fetching audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedRequests = auditRequests.filter(r => r.status === 'completed').length;
  const totalRequests = auditRequests.length || 1;
  const auditProgress = (completedRequests / totalRequests) * 100;

  const currentPhase = timeline.find(t => t.status === 'in_progress')?.phase || 'In Progress';
  const daysUntilReview = timeline.length > 0 ? Math.ceil((new Date(timeline[timeline.length - 1].date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <Stack gap="lg" p={{ base: 16, md: 24 }}>
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>Audit Management</Title>
          <Text c="dimmed" size="sm">Coordinate financial audits, manage audit requests, ensure audit readiness</Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconDownload size={16} />}>Export Audit Package</Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div><Text size="sm" c="dimmed">Audit Status</Text><Title order={3}>{currentPhase}</Title></div>
              <IconScale size={32} color="blue" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div><Text size="sm" c="dimmed">Requests Complete</Text><Title order={3}>{completedRequests}/{totalRequests}</Title></div>
              <IconCheck size={32} color="green" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div><Text size="sm" c="dimmed">Days Until Review</Text><Title order={3}>{daysUntilReview > 0 ? daysUntilReview : 'TBD'}</Title></div>
              <IconCalendar size={32} color="orange" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <div><Text size="sm" c="dimmed" mb="xs">Completion Progress</Text><Title order={3}>{auditProgress.toFixed(0)}%</Title><Progress value={auditProgress} color="green" mt="xs" /></div>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="timeline">
        <Tabs.List>
          <Tabs.Tab value="timeline" leftSection={<IconCalendar size={16} />}>Audit Timeline</Tabs.Tab>
          <Tabs.Tab value="requests" leftSection={<IconFileCheck size={16} />}>Information Requests</Tabs.Tab>
          <Tabs.Tab value="findings" leftSection={<IconAlertTriangle size={16} />}>Audit Findings</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="timeline" pt="md">
          <Card withBorder p="md">
            {loading ? (
              <Text>Loading timeline...</Text>
            ) : timeline.length === 0 ? (
              <Alert color="blue"><Text>No audit timeline items yet. Create timeline phases to track audit progress.</Text></Alert>
            ) : (
              <Timeline active={timeline.findIndex(t => t.status === 'in_progress')} bulletSize={24} lineWidth={2}>
                {timeline.map(item => (
                  <Timeline.Item 
                    key={item.id} 
                    bullet={item.status === 'complete' ? <IconCheck size={12} /> : item.status === 'in_progress' ? <IconFileCheck size={12} /> : <IconCalendar size={12} />} 
                    title={item.title}
                  >
                    <Text size="sm" c="dimmed">{item.phase}</Text>
                    <Badge color={item.status === 'complete' ? 'green' : item.status === 'in_progress' ? 'yellow' : 'gray'} mt="xs">
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="requests" pt="md">
          <Stack gap="sm">
            {loading ? (
              <Text>Loading requests...</Text>
            ) : auditRequests.length === 0 ? (
              <Alert color="blue"><Text>No audit requests yet. Requests will appear here when auditors submit information requests.</Text></Alert>
            ) : (
              auditRequests.map(req => (
                <Card key={req.id} withBorder p="md">
                  <Group justify="space-between">
                    <div>
                      <Group gap="sm"><Text fw={500}>{req.title}</Text><Badge color={req.status === 'completed' ? 'green' : req.status === 'in_progress' ? 'yellow' : 'gray'}>{req.status.replace('_', ' ')}</Badge></Group>
                      <Text size="sm" c="dimmed">Assigned to: {req.assigned_to} • Due: {new Date(req.due_date).toLocaleDateString()}</Text>
                    </div>
                    {req.status === 'completed' ? <Badge color="green" size="lg">✓</Badge> : <Button size="sm" variant="light">Upload Response</Button>}
                  </Group>
                </Card>
              ))
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="findings" pt="md">
          <Alert color="blue" icon={<IconFileCheck />}><Text fw={500}>No Significant Findings</Text><Text size="sm">Audit in progress. Findings will be reported as identified.</Text></Alert>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
