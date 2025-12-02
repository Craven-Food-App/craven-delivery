import React, { useState, useEffect } from 'react';
import { Card, Stack, Title, Text, Group, Badge, Select, Box } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import { IconArrowDown, IconCheck, IconX } from '@tabler/icons-react';

interface WorkflowData {
  executive_id: string;
  executive_name: string;
  current_step: string;
  epm_issued: boolean;
  ecap_issued: boolean;
  bnnc_issued: boolean;
  termination_issued: boolean;
}

export const EASWorkflowViewer: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [selectedExecutive, setSelectedExecutive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);

      const { data: workflowData, error } = await supabase
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

      if (error) throw error;

      const workflowsList: WorkflowData[] = (workflowData || []).map((w: any) => ({
        executive_id: w.executive_id,
        executive_name: w.executive?.title || 'Unknown Executive',
        current_step: w.current_step,
        epm_issued: !!w.epm_instance_id,
        ecap_issued: !!w.ecap_instance_id,
        bnnc_issued: !!w.bnnc_instance_id,
        termination_issued: !!w.etfcn_instance_id,
      }));

      setWorkflows(workflowsList);
      if (workflowsList.length > 0 && !selectedExecutive) {
        setSelectedExecutive(workflowsList[0].executive_id);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedWorkflow = workflows.find(w => w.executive_id === selectedExecutive);

  const workflowSteps = [
    {
      key: 'epm_issued',
      label: 'EPM Issued',
      color: '#F97316',
      description: 'Executive Performance Memorandum',
    },
    {
      key: 'ecap_issued',
      label: 'ECAP Issued',
      color: '#EA580C',
      description: 'Executive Corrective Action Plan',
    },
    {
      key: 'bnnc_issued',
      label: 'BNNC Issued',
      color: '#B91C1C',
      description: 'Board Notice of Non-Compliance',
    },
    {
      key: 'termination_for_cause',
      label: 'Termination for Cause',
      color: '#7F1D1D',
      description: 'Executive Termination Notice',
    },
  ];

  const isStepCompleted = (stepKey: string) => {
    if (!selectedWorkflow) return false;
    switch (stepKey) {
      case 'epm_issued':
        return selectedWorkflow.epm_issued;
      case 'ecap_issued':
        return selectedWorkflow.ecap_issued;
      case 'bnnc_issued':
        return selectedWorkflow.bnnc_issued;
      case 'termination_for_cause':
        return selectedWorkflow.termination_issued;
      default:
        return false;
    }
  };

  const isStepActive = (stepKey: string) => {
    if (!selectedWorkflow) return false;
    return selectedWorkflow.current_step === stepKey;
  };

  if (loading) {
    return <div>Loading workflow viewer...</div>;
  }

  return (
    <Stack gap="md">
      <Title order={2}>Executive Accountability Workflow</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Select
            label="Select Executive"
            placeholder="Choose an executive"
            data={workflows.map(w => ({
              value: w.executive_id,
              label: w.executive_name,
            }))}
            value={selectedExecutive}
            onChange={(value) => setSelectedExecutive(value)}
          />

          {selectedWorkflow && (
            <Box mt="xl">
              <Stack gap="lg">
                {workflowSteps.map((step, index) => {
                  const completed = isStepCompleted(step.key);
                  const active = isStepActive(step.key);
                  const isLast = index === workflowSteps.length - 1;

                  return (
                    <Box key={step.key}>
                      <Group gap="md" align="flex-start">
                        <Box
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: completed || active ? step.color : '#e5e7eb',
                            color: completed || active ? 'white' : '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            flexShrink: 0,
                          }}
                        >
                          {completed ? (
                            <IconCheck size={24} />
                          ) : active ? (
                            <Text size="sm" fw={700}>!</Text>
                          ) : (
                            <IconX size={24} />
                          )}
                        </Box>

                        <Box style={{ flex: 1 }}>
                          <Group gap="xs" mb="xs">
                            <Text fw={700} size="lg" c={completed || active ? step.color : 'dimmed'}>
                              {step.label}
                            </Text>
                            {active && (
                              <Badge color="red" size="sm">Current</Badge>
                            )}
                            {completed && !active && (
                              <Badge color="green" size="sm">Completed</Badge>
                            )}
                          </Group>
                          <Text size="sm" c="dimmed">{step.description}</Text>
                        </Box>
                      </Group>

                      {!isLast && (
                        <Box
                          style={{
                            width: 2,
                            height: 40,
                            backgroundColor: completed ? step.color : '#e5e7eb',
                            marginLeft: 20,
                            marginTop: 8,
                            marginBottom: 8,
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}

          {!selectedWorkflow && workflows.length === 0 && (
            <Text c="dimmed" ta="center" py="xl">
              No workflows found. Issue an EPM to start a workflow.
            </Text>
          )}
        </Stack>
      </Card>
    </Stack>
  );
};

