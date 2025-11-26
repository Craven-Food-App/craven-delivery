import React, { useState } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Grid, Tabs, Timeline, Alert, Progress } from '@mantine/core';
import { IconScale, IconFileCheck, IconCalendar, IconAlertTriangle, IconCheck, IconDownload } from '@tabler/icons-react';

export const EnhancedAuditManagement: React.FC = () => {
  const auditRequests = [
    { id: 1, title: 'Bank Reconciliations Q4', assignedTo: 'Treasury', dueDate: '2024-02-15', status: 'pending' },
    { id: 2, title: 'Revenue Recognition Schedule', assignedTo: 'Controller', dueDate: '2024-02-10', status: 'completed' },
    { id: 3, title: 'Expense Report Summary', assignedTo: 'AP Team', dueDate: '2024-02-12', status: 'in_progress' },
  ];

  const completedRequests = auditRequests.filter(r => r.status === 'completed').length;
  const totalRequests = auditRequests.length;
  const auditProgress = (completedRequests / totalRequests) * 100;

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
              <div><Text size="sm" c="dimmed">Audit Status</Text><Title order={3}>In Progress</Title></div>
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
              <div><Text size="sm" c="dimmed">Days Until Review</Text><Title order={3}>15</Title></div>
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
            <Timeline active={2} bulletSize={24} lineWidth={2}>
              <Timeline.Item bullet={<IconCheck size={12} />} title="Audit Planning & Kickoff"><Text size="sm" c="dimmed">December 2023</Text><Badge color="green" mt="xs">Complete</Badge></Timeline.Item>
              <Timeline.Item bullet={<IconCheck size={12} />} title="Interim Testing"><Text size="sm" c="dimmed">January 2024</Text><Badge color="green" mt="xs">Complete</Badge></Timeline.Item>
              <Timeline.Item bullet={<IconFileCheck size={12} />} title="Year-End Fieldwork"><Text size="sm" c="dimmed">February 2024</Text><Badge color="yellow" mt="xs">In Progress</Badge></Timeline.Item>
              <Timeline.Item bullet={<IconAlertTriangle size={12} />} title="Draft Report Review"><Text size="sm" c="dimmed">March 2024</Text><Badge color="gray" mt="xs">Upcoming</Badge></Timeline.Item>
              <Timeline.Item bullet={<IconScale size={12} />} title="Final Report & Presentation"><Text size="sm" c="dimmed">March 2024</Text><Badge color="gray" mt="xs">Upcoming</Badge></Timeline.Item>
            </Timeline>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="requests" pt="md">
          <Stack gap="sm">
            {auditRequests.map(req => (
              <Card key={req.id} withBorder p="md">
                <Group justify="space-between">
                  <div>
                    <Group gap="sm"><Text fw={500}>{req.title}</Text><Badge color={req.status === 'completed' ? 'green' : req.status === 'in_progress' ? 'yellow' : 'gray'}>{req.status.replace('_', ' ')}</Badge></Group>
                    <Text size="sm" c="dimmed">Assigned to: {req.assignedTo} • Due: {req.dueDate}</Text>
                  </div>
                  {req.status === 'completed' ? <Badge color="green" size="lg">✓</Badge> : <Button size="sm" variant="light">Upload Response</Button>}
                </Group>
              </Card>
            ))}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="findings" pt="md">
          <Alert color="blue" icon={<IconFileCheck />}><Text fw={500}>No Significant Findings</Text><Text size="sm">Audit in progress. Findings will be reported as identified.</Text></Alert>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
