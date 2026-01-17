import React, { useState, useEffect } from 'react';
import { Card, Stack, Title, Text, Group, Badge, Table, Button, Alert } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import { IconAlertTriangle, IconFileText, IconUser } from '@tabler/icons-react';

interface WorkflowSummary {
  executive_id: string;
  executive_name: string;
  current_step: string;
  status: string;
}

export const EASDashboard: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeWorkflows: 0,
    epmIssued: 0,
    ecapIssued: 0,
    bnncIssued: 0,
    terminations: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch workflows with executive info
      const { data: workflowData, error: workflowError } = await supabase
        .from('eas_workflow')
        .select(`
          *,
          executive:exec_users!eas_workflow_executive_id_fkey(
            id,
            title,
            department
          )
        `)
        .order('updated_at', { ascending: false });

      if (workflowError) throw workflowError;

      // Fetch instance counts
      const [epmCount, ecapCount, bnncCount, termCount] = await Promise.all([
        supabase.from('eas_instances').select('id', { count: 'exact', head: true }).eq('document_type', 'epm'),
        supabase.from('eas_instances').select('id', { count: 'exact', head: true }).eq('document_type', 'ecap'),
        supabase.from('eas_instances').select('id', { count: 'exact', head: true }).eq('document_type', 'bnnc'),
        supabase.from('eas_instances').select('id', { count: 'exact', head: true }).eq('document_type', 'etfcn'),
      ]);

      const workflowsList: WorkflowSummary[] = (workflowData || []).map((w: any) => ({
        executive_id: w.executive_id,
        executive_name: w.executive?.title || 'Unknown Executive',
        current_step: w.current_step,
        status: w.current_step === 'resolved' ? 'Resolved' : 'Active',
      }));

      setWorkflows(workflowsList);
      setStats({
        activeWorkflows: workflowsList.filter(w => w.status === 'Active').length,
        epmIssued: epmCount.count || 0,
        ecapIssued: ecapCount.count || 0,
        bnncIssued: bnncCount.count || 0,
        terminations: termCount.count || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStepColor = (step: string) => {
    switch (step) {
      case 'epm_issued':
        return 'orange';
      case 'ecap_issued':
        return 'red';
      case 'bnnc_issued':
        return 'dark';
      case 'termination_for_cause':
        return 'grape';
      default:
        return 'gray';
    }
  };

  const getStepLabel = (step: string) => {
    switch (step) {
      case 'epm_issued':
        return 'EPM Issued';
      case 'ecap_issued':
        return 'ECAP Issued';
      case 'bnnc_issued':
        return 'BNNC Issued';
      case 'termination_for_cause':
        return 'Termination';
      case 'resolved':
        return 'Resolved';
      default:
        return step;
    }
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <Stack gap="md">
      <Title order={2}>Executive Accountability Dashboard</Title>

      <Group grow>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Active Workflows</Text>
            <Text size="xl" fw={700}>{stats.activeWorkflows}</Text>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">EPM Issued</Text>
            <Text size="xl" fw={700} c="orange">{stats.epmIssued}</Text>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">ECAP Issued</Text>
            <Text size="xl" fw={700} c="red">{stats.ecapIssued}</Text>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">BNNC Issued</Text>
            <Text size="xl" fw={700} c="dark">{stats.bnncIssued}</Text>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Terminations</Text>
            <Text size="xl" fw={700} c="grape">{stats.terminations}</Text>
          </Stack>
        </Card>
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Title order={3}>Active Workflows</Title>
          {workflows.length === 0 ? (
            <Alert icon={<IconFileText size={16} />} title="No Active Workflows">
              There are currently no active executive accountability workflows.
            </Alert>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Executive</Table.Th>
                  <Table.Th>Current Step</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {workflows.map((workflow) => (
                  <Table.Tr key={workflow.executive_id}>
                    <Table.Td>
                      <Group gap="xs">
                        <IconUser size={16} />
                        <Text>{workflow.executive_name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStepColor(workflow.current_step)}>
                        {getStepLabel(workflow.current_step)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={workflow.status === 'Active' ? 'red' : 'green'}>
                        {workflow.status}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Card>
    </Stack>
  );
};

