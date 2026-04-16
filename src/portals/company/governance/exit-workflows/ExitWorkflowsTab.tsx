import React, { useState, useEffect } from 'react';
import {
  Stack,
  Title,
  Text,
  Card,
  Table,
  Badge,
  Group,
  Button,
  Loader,
  Alert,
  Tabs,
  Modal,
  Timeline,
} from '@mantine/core';
import { IconUserMinus, IconCheck, IconX, IconClock, IconEye, IconInfoCircle } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

interface ExitWorkflow {
  id: string;
  employee_id: string;
  workflow_type: string;
  termination_type?: string;
  status: string;
  effective_date: string;
  notice_date?: string;
  last_day?: string;
  termination_reason?: string;
  equity_vesting_status?: string;
  equity_notes?: string;
  board_resolution_id?: string;
  completed_at?: string;
  created_at: string;
  // Joined data
  employee?: {
    id: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    email?: string;
    position?: string;
  };
  executive?: {
    id: string;
    title?: string;
    user_id?: string;
  };
  board_resolution?: {
    id: string;
    resolution_number?: string;
    status?: string;
  };
}

interface ExitWorkflowStep {
  id: string;
  step_name: string;
  step_number: number;
  status: string;
  completed_at?: string;
  notes?: string;
}

const ExitWorkflowsTab: React.FC = () => {
  const [workflows, setWorkflows] = useState<ExitWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ExitWorkflow | null>(null);
  const [steps, setSteps] = useState<ExitWorkflowStep[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      
      // Load exit workflows with employee and executive data
      const { data, error } = await supabase
        .from('exit_workflows')
        .select(`
          *,
          employee:employees(
            id,
            first_name,
            last_name,
            email,
            position
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading exit workflows:', error);
        return;
      }

      // For each workflow, try to find executive data if employee is linked to exec_user
      const workflowsWithExecutives = await Promise.all(
        (data || []).map(async (wf: any) => {
          let executive = null;
          
          if (wf.employee?.id) {
            // Try to find exec_user linked to this employee
            const { data: execData } = await supabase
              .from('exec_users')
              .select('id, title, user_id')
              .eq('user_id', wf.employee.user_id || '')
              .single();
            
            if (execData) {
              executive = execData;
            }
          }

          return {
            ...wf,
            executive,
          };
        })
      );

      // Merge multiple workflows for the same person (e.g. Justin Sweet) into a single entry
      const mergedByEmployee = Object.values(
        workflowsWithExecutives.reduce((acc: Record<string, ExitWorkflow>, wf: any) => {
          const key = wf.employee?.id || wf.employee_id;
          if (!key) {
            // Fallback key so unlinked rows still appear
            acc[wf.id] = wf;
            return acc;
          }

          const existing = acc[key];
          if (!existing) {
            acc[key] = wf;
          } else {
            // Keep the most recent effective / created date as the canonical row
            const existingDate = dayjs(existing.effective_date || existing.created_at);
            const candidateDate = dayjs(wf.effective_date || wf.created_at);
            if (candidateDate.isAfter(existingDate)) {
              acc[key] = wf;
            }
          }
          return acc;
        }, {})
      ) as ExitWorkflow[];

      setWorkflows(mergedByEmployee);
    } catch (err) {
      console.error('Error loading exit workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowSteps = async (workflowId: string) => {
    try {
      const { data, error } = await supabase
        .from('exit_workflow_steps')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('step_number', { ascending: true });

      if (error) {
        console.error('Error loading workflow steps:', error);
        return;
      }

      setSteps(data || []);
    } catch (err) {
      console.error('Error loading workflow steps:', err);
    }
  };

  const handleViewDetails = async (workflow: ExitWorkflow) => {
    setSelectedWorkflow(workflow);
    setDetailModalOpen(true);
    await loadWorkflowSteps(workflow.id);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      initiated: { color: 'gray', label: 'Initiated' },
      board_approval_pending: { color: 'orange', label: 'Board Approval Pending' },
      board_approved: { color: 'blue', label: 'Board Approved' },
      board_rejected: { color: 'red', label: 'Board Rejected' },
      notice_sent: { color: 'yellow', label: 'Notice Sent' },
      access_revoked: { color: 'purple', label: 'Access Revoked' },
      assets_returned: { color: 'cyan', label: 'Assets Returned' },
      final_settlement: { color: 'indigo', label: 'Final Settlement' },
      completed: { color: 'green', label: 'Completed' },
      cancelled: { color: 'red', label: 'Cancelled' },
    };

    const config = statusConfig[status] || { color: 'gray', label: status };
    return <Badge color={config.color}>{config.label}</Badge>;
  };

  const getWorkflowTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      employee_termination: 'Employee Termination',
      executive_removal: 'Executive Removal',
      resignation: 'Resignation',
      retirement: 'Retirement',
    };
    return labels[type] || type;
  };

  const activeWorkflows = workflows.filter(w => 
    !['completed', 'cancelled'].includes(w.status)
  );
  const completedWorkflows = workflows.filter(w => 
    ['completed', 'cancelled'].includes(w.status)
  );

  if (loading) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Loader size="lg" />
        <Text c="dimmed">Loading exit workflows...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>Exit Workflows</Title>
          <Text c="dimmed">Manage executive departures with proper equity treatment</Text>
        </div>
      </Group>

      {/* Stats Cards */}
      <Group gap="md">
        <Card padding="lg" withBorder style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Active Separations</Text>
            <Text size="2xl" fw={700} c="orange">
              {activeWorkflows.length}
            </Text>
          </Stack>
        </Card>
        <Card padding="lg" withBorder style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Completed</Text>
            <Text size="2xl" fw={700} c="green">
              {completedWorkflows.length}
            </Text>
          </Stack>
        </Card>
        <Card padding="lg" withBorder style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Total Workflows</Text>
            <Text size="2xl" fw={700}>
              {workflows.length}
            </Text>
          </Stack>
        </Card>
      </Group>

      {/* Workflows Table */}
      <Tabs defaultValue="active">
        <Tabs.List>
          <Tabs.Tab value="active">Active ({activeWorkflows.length})</Tabs.Tab>
          <Tabs.Tab value="completed">Completed ({completedWorkflows.length})</Tabs.Tab>
          <Tabs.Tab value="all">All ({workflows.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="active" pt="xl">
          {activeWorkflows.length === 0 ? (
            <Alert icon={<IconInfoCircle size={16} />} title="No Active Separations" color="gray">
              There are no active exit workflows.
            </Alert>
          ) : (
            <Card padding="md" radius="md" withBorder>
              <Table highlightOnHover verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Person</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Effective Date</Table.Th>
                    <Table.Th>Equity Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {activeWorkflows.map((workflow) => {
                    const personName = workflow.employee?.full_name || 
                                      `${workflow.employee?.first_name || ''} ${workflow.employee?.last_name || ''}`.trim() ||
                                      workflow.executive?.title ||
                                      'Unknown';
                    const personTitle = workflow.employee?.position || workflow.executive?.title || '';

                    return (
                      <Table.Tr key={workflow.id}>
                        <Table.Td>
                          <Text fw={500}>{personName}</Text>
                          {personTitle && (
                            <Text size="sm" c="dimmed">{personTitle}</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{getWorkflowTypeLabel(workflow.workflow_type)}</Text>
                          {workflow.termination_type && (
                            <Text size="xs" c="dimmed">({workflow.termination_type})</Text>
                          )}
                        </Table.Td>
                        <Table.Td>{getStatusBadge(workflow.status)}</Table.Td>
                        <Table.Td>
                          {dayjs(workflow.effective_date).format('MMM D, YYYY')}
                        </Table.Td>
                        <Table.Td>
                          {workflow.equity_vesting_status ? (
                            <Badge variant="light" color="purple">
                              {workflow.equity_vesting_status}
                            </Badge>
                          ) : (
                            <Text size="sm" c="dimmed">N/A</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Button
                            variant="light"
                            size="xs"
                            leftSection={<IconEye size={14} />}
                            onClick={() => handleViewDetails(workflow)}
                          >
                            View Details
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Card>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="completed" pt="xl">
          {completedWorkflows.length === 0 ? (
            <Alert icon={<IconInfoCircle size={16} />} title="No Completed Workflows" color="gray">
              There are no completed exit workflows.
            </Alert>
          ) : (
            <Card padding="md" radius="md" withBorder>
              <Table highlightOnHover verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Person</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Effective Date</Table.Th>
                    <Table.Th>Completed Date</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {completedWorkflows.map((workflow) => {
                    const personName = workflow.employee?.full_name || 
                                      `${workflow.employee?.first_name || ''} ${workflow.employee?.last_name || ''}`.trim() ||
                                      workflow.executive?.title ||
                                      'Unknown';
                    const personTitle = workflow.employee?.position || workflow.executive?.title || '';

                    return (
                      <Table.Tr key={workflow.id}>
                        <Table.Td>
                          <Text fw={500}>{personName}</Text>
                          {personTitle && (
                            <Text size="sm" c="dimmed">{personTitle}</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{getWorkflowTypeLabel(workflow.workflow_type)}</Text>
                        </Table.Td>
                        <Table.Td>{getStatusBadge(workflow.status)}</Table.Td>
                        <Table.Td>
                          {dayjs(workflow.effective_date).format('MMM D, YYYY')}
                        </Table.Td>
                        <Table.Td>
                          {workflow.completed_at ? (
                            dayjs(workflow.completed_at).format('MMM D, YYYY')
                          ) : (
                            <Text size="sm" c="dimmed">N/A</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Button
                            variant="light"
                            size="xs"
                            leftSection={<IconEye size={14} />}
                            onClick={() => handleViewDetails(workflow)}
                          >
                            View Details
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Card>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="all" pt="xl">
          {workflows.length === 0 ? (
            <Alert icon={<IconInfoCircle size={16} />} title="No Exit Workflows" color="gray">
              There are no exit workflows in the system.
            </Alert>
          ) : (
            <Card padding="md" radius="md" withBorder>
              <Table highlightOnHover verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Person</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Effective Date</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {workflows.map((workflow) => {
                    const personName = workflow.employee?.full_name || 
                                      `${workflow.employee?.first_name || ''} ${workflow.employee?.last_name || ''}`.trim() ||
                                      workflow.executive?.title ||
                                      'Unknown';
                    const personTitle = workflow.employee?.position || workflow.executive?.title || '';

                    return (
                      <Table.Tr key={workflow.id}>
                        <Table.Td>
                          <Text fw={500}>{personName}</Text>
                          {personTitle && (
                            <Text size="sm" c="dimmed">{personTitle}</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{getWorkflowTypeLabel(workflow.workflow_type)}</Text>
                        </Table.Td>
                        <Table.Td>{getStatusBadge(workflow.status)}</Table.Td>
                        <Table.Td>
                          {dayjs(workflow.effective_date).format('MMM D, YYYY')}
                        </Table.Td>
                        <Table.Td>
                          <Button
                            variant="light"
                            size="xs"
                            leftSection={<IconEye size={14} />}
                            onClick={() => handleViewDetails(workflow)}
                          >
                            View Details
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Card>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Detail Modal */}
      <Modal
        opened={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedWorkflow(null);
          setSteps([]);
        }}
        title="Exit Workflow Details"
        size="lg"
      >
        {selectedWorkflow && (
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed">Person</Text>
              <Text fw={500}>
                {selectedWorkflow.employee?.full_name || 
                 `${selectedWorkflow.employee?.first_name || ''} ${selectedWorkflow.employee?.last_name || ''}`.trim() ||
                 selectedWorkflow.executive?.title ||
                 'Unknown'}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">Workflow Type</Text>
              <Text>{getWorkflowTypeLabel(selectedWorkflow.workflow_type)}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">Status</Text>
              {getStatusBadge(selectedWorkflow.status)}
            </div>
            <div>
              <Text size="sm" c="dimmed">Effective Date</Text>
              <Text>{dayjs(selectedWorkflow.effective_date).format('MMMM D, YYYY')}</Text>
            </div>
            {selectedWorkflow.termination_reason && (
              <div>
                <Text size="sm" c="dimmed">Termination Reason</Text>
                <Text>{selectedWorkflow.termination_reason}</Text>
              </div>
            )}
            {selectedWorkflow.equity_vesting_status && (
              <div>
                <Text size="sm" c="dimmed">Equity Vesting Status</Text>
                <Badge variant="light" color="purple">
                  {selectedWorkflow.equity_vesting_status}
                </Badge>
              </div>
            )}
            {selectedWorkflow.equity_notes && (
              <div>
                <Text size="sm" c="dimmed">Equity Notes</Text>
                <Text>{selectedWorkflow.equity_notes}</Text>
              </div>
            )}
            
            {steps.length > 0 && (
              <div>
                <Text size="sm" c="dimmed" mb="sm">Workflow Steps</Text>
                <Timeline active={steps.length} bulletSize={24} lineWidth={2}>
                  {steps.map((step) => (
                    <Timeline.Item
                      key={step.id}
                      bullet={
                        step.status === 'completed' ? <IconCheck size={12} /> :
                        step.status === 'failed' ? <IconX size={12} /> :
                        <IconClock size={12} />
                      }
                      title={step.step_name}
                    >
                      <Text size="xs" c="dimmed">
                        Status: {step.status}
                        {step.completed_at && ` - Completed: ${dayjs(step.completed_at).format('MMM D, YYYY')}`}
                      </Text>
                      {step.notes && (
                        <Text size="xs" c="dimmed" mt={4}>{step.notes}</Text>
                      )}
                    </Timeline.Item>
                  ))}
                </Timeline>
              </div>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default ExitWorkflowsTab;
