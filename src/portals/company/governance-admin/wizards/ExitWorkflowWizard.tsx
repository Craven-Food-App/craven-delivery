import React, { useState, useEffect } from 'react';
import {
  Select,
  Textarea,
  Group,
  Stack,
  Alert,
  Grid,
  Badge,
  Divider,
  Paper,
  Text,
  Checkbox,
  NumberInput,
  Loader,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconUserMinus, IconUsers, IconFileText, IconShield, IconKey, IconBox, IconCurrencyDollar, IconCheck } from '@tabler/icons-react';
import { WizardLayout, WizardStep } from './shared/WizardLayout';
import { useWizard } from './shared/useWizard';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { isCLevelPosition } from '@/utils/roleUtils';
import { getRequiredSteps, createWorkflowSteps, createBoardResolutionForRemoval } from '@/utils/exitWorkflowUtils';
import dayjs from 'dayjs';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  employment_status: string;
}

interface ExitWorkflowFormData {
  employee_id: string;
  termination_type: string;
  effective_date: Date | null;
  termination_reason: string;
  grounds_for_cause: string[];
  access_revoked: boolean;
  assets_returned: boolean;
  final_compensation: number;
  severance_amount: number;
  unused_pto_days: number;
  equity_vesting_status: string;
}

const ExitWorkflowWizard: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [formData, setFormData] = useState<ExitWorkflowFormData>({
    employee_id: '',
    termination_type: '',
    effective_date: null,
    termination_reason: '',
    grounds_for_cause: [],
    access_revoked: false,
    assets_returned: false,
    final_compensation: 0,
    severance_amount: 0,
    unused_pto_days: 0,
    equity_vesting_status: 'standard',
  });

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isExecutive, setIsExecutive] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (formData.employee_id) {
      const employee = employees.find(e => e.id === formData.employee_id);
      setSelectedEmployee(employee || null);
      setIsExecutive(employee ? isCLevelPosition(employee.position) : false);
    }
  }, [formData.employee_id, employees]);

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      // Load executives from exec_users
      const { data: execUsers, error: execError } = await supabase
        .from('exec_users')
        .select('user_id, linked_employee_id, role, title')
        .not('user_id', 'is', null);

      if (execError) throw execError;

      const execUserIds = execUsers?.map(eu => eu.user_id).filter(Boolean) || [];
      const linkedEmployeeIds = execUsers?.map(eu => eu.linked_employee_id).filter(Boolean) || [];

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, user_id, first_name, last_name, email, position, employment_status')
        .or(`id.in.(${linkedEmployeeIds.join(',')}),user_id.in.(${execUserIds.join(',')})`)
        .neq('employment_status', 'terminated')
        .limit(100);

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);
    } catch (error: any) {
      console.error('Error loading employees:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load employees',
        color: 'red',
      });
    } finally {
      setLoadingEmployees(false);
    }
  };

  const validateInitiation = (): boolean => {
    if (!formData.employee_id) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select an employee',
        color: 'red',
      });
      return false;
    }
    if (!formData.termination_type) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select termination type',
        color: 'red',
      });
      return false;
    }
    if (!formData.effective_date) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select effective date',
        color: 'red',
      });
      return false;
    }
    if (!formData.termination_reason.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please provide termination reason',
        color: 'red',
      });
      return false;
    }
    return true;
  };

  const handleComplete = async () => {
    if (!selectedEmployee) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const workflowType = isExecutive ? 'executive_removal' : 'employee_termination';
      const status = isExecutive ? 'board_approval_pending' : 'initiated';

      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('exit_workflows')
        .insert({
          employee_id: formData.employee_id,
          workflow_type: workflowType,
          termination_type: formData.termination_type,
          status: status,
          effective_date: dayjs(formData.effective_date).format('YYYY-MM-DD'),
          termination_reason: formData.termination_reason,
          grounds_for_cause: formData.grounds_for_cause,
          initiated_by: user.id,
          steps_required: getRequiredSteps(workflowType, isExecutive),
          final_compensation: formData.final_compensation || null,
          severance_amount: formData.severance_amount || null,
          unused_pto_days: formData.unused_pto_days || 0,
          equity_vesting_status: formData.equity_vesting_status,
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create workflow steps
      const steps = getRequiredSteps(workflowType, isExecutive);
      await createWorkflowSteps(workflow.id, steps);

      // If executive, create Board resolution
      if (isExecutive) {
        try {
          const resolutionId = await createBoardResolutionForRemoval(
            selectedEmployee,
            formData.termination_type,
            formData.termination_reason,
            dayjs(formData.effective_date).format('YYYY-MM-DD')
          );

          if (resolutionId) {
            await supabase
              .from('exit_workflows')
              .update({ board_resolution_id: resolutionId })
              .eq('id', workflow.id);
          }
        } catch (resError: any) {
          console.error('Error creating board resolution:', resError);
          notifications.show({
            title: 'Warning',
            message: 'Workflow created but board resolution creation failed. Please create manually.',
            color: 'yellow',
          });
        }
      }

      notifications.show({
        title: 'Success',
        message: `Exit workflow created successfully${isExecutive ? '. Board approval required.' : '.'}`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Reset form
      setFormData({
        employee_id: '',
        termination_type: '',
        effective_date: null,
        termination_reason: '',
        grounds_for_cause: [],
        access_revoked: false,
        assets_returned: false,
        final_compensation: 0,
        severance_amount: 0,
        unused_pto_days: 0,
        equity_vesting_status: 'standard',
      });
      setSelectedEmployee(null);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create exit workflow',
        color: 'red',
      });
      throw error;
    }
  };

  const steps: WizardStep[] = [
    {
      label: 'Select Employee',
      description: 'Choose employee for exit process',
      icon: <IconUsers size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Select the employee who will be going through the exit process.
          </Alert>
          {loadingEmployees ? (
            <Loader />
          ) : (
            <Select
              label="Employee"
              placeholder="Select employee"
              required
              data={employees.map((emp) => ({
                value: emp.id,
                label: `${emp.first_name} ${emp.last_name} - ${emp.position}`,
              }))}
              value={formData.employee_id}
              onChange={(value) => setFormData({ ...formData, employee_id: value || '' })}
              searchable
              size="md"
            />
          )}
          {selectedEmployee && (
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" fw={600}>Employee Details</Text>
                <Text size="sm"><strong>Name:</strong> {selectedEmployee.first_name} {selectedEmployee.last_name}</Text>
                <Text size="sm"><strong>Position:</strong> {selectedEmployee.position}</Text>
                <Text size="sm"><strong>Email:</strong> {selectedEmployee.email}</Text>
                {isExecutive && (
                  <Badge color="orange" variant="light" mt="xs">
                    C-Suite Executive - Board Approval Required
                  </Badge>
                )}
              </Stack>
            </Paper>
          )}
        </Stack>
      ),
      validate: validateInitiation,
    },
    {
      label: 'Termination Details',
      description: 'Termination type, date, and reason',
      icon: <IconFileText size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Provide details about the termination.
          </Alert>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Termination Type"
                placeholder="Select type"
                required
                data={[
                  { value: 'for_cause', label: 'For Cause' },
                  { value: 'without_cause', label: 'Without Cause' },
                  { value: 'resignation', label: 'Resignation' },
                  { value: 'retirement', label: 'Retirement' },
                ]}
                value={formData.termination_type}
                onChange={(value) => setFormData({ ...formData, termination_type: value || '' })}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Effective Date"
                placeholder="Select date"
                required
                value={formData.effective_date}
                onChange={(value) => setFormData({ ...formData, effective_date: value })}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Termination Reason"
                placeholder="Provide detailed reason for termination..."
                required
                value={formData.termination_reason}
                onChange={(e) => setFormData({ ...formData, termination_reason: e.target.value })}
                rows={4}
                size="md"
              />
            </Grid.Col>
            {formData.termination_type === 'for_cause' && (
              <Grid.Col span={12}>
                <Alert color="red" variant="light">
                  <Text size="sm" mb="xs" fw={600}>Grounds for Cause (Select all that apply)</Text>
                  <Stack gap="xs">
                    <Checkbox
                      label="Violation of company policy"
                      checked={formData.grounds_for_cause.includes('policy_violation')}
                      onChange={(e) => {
                        const grounds = e.currentTarget.checked
                          ? [...formData.grounds_for_cause, 'policy_violation']
                          : formData.grounds_for_cause.filter(g => g !== 'policy_violation');
                        setFormData({ ...formData, grounds_for_cause: grounds });
                      }}
                    />
                    <Checkbox
                      label="Misconduct"
                      checked={formData.grounds_for_cause.includes('misconduct')}
                      onChange={(e) => {
                        const grounds = e.currentTarget.checked
                          ? [...formData.grounds_for_cause, 'misconduct']
                          : formData.grounds_for_cause.filter(g => g !== 'misconduct');
                        setFormData({ ...formData, grounds_for_cause: grounds });
                      }}
                    />
                    <Checkbox
                      label="Breach of contract"
                      checked={formData.grounds_for_cause.includes('breach_of_contract')}
                      onChange={(e) => {
                        const grounds = e.currentTarget.checked
                          ? [...formData.grounds_for_cause, 'breach_of_contract']
                          : formData.grounds_for_cause.filter(g => g !== 'breach_of_contract');
                        setFormData({ ...formData, grounds_for_cause: grounds });
                      }}
                    />
                  </Stack>
                </Alert>
              </Grid.Col>
            )}
          </Grid>
        </Stack>
      ),
      validate: validateInitiation,
    },
    {
      label: 'Board Approval',
      description: 'Board resolution (executives only)',
      icon: <IconShield size={18} />,
      optional: true,
      component: (
        <Stack gap="md">
          {isExecutive ? (
            <>
              <Alert color="orange" variant="light">
                <Text size="sm" fw={600} mb="xs">Board Approval Required</Text>
                <Text size="sm">
                  Executive removals require Board approval. A board resolution will be automatically created for voting.
                </Text>
              </Alert>
              <Paper p="md" withBorder>
                <Text size="sm">
                  Once you complete this workflow, a board resolution will be created and sent to the Board of Directors for voting.
                  The workflow will remain in "Board Approval Pending" status until the resolution is adopted.
                </Text>
              </Paper>
            </>
          ) : (
            <Alert color="gray" variant="light">
              Board approval is not required for this employee.
            </Alert>
          )}
        </Stack>
      ),
      validate: () => true,
    },
    {
      label: 'Final Settlement',
      description: 'Compensation and equity details',
      icon: <IconCurrencyDollar size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Enter final compensation and equity details (optional - can be completed later).
          </Alert>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Final Compensation"
                placeholder="Enter amount"
                value={formData.final_compensation}
                onChange={(value) => setFormData({ ...formData, final_compensation: Number(value) || 0 })}
                min={0}
                thousandSeparator=","
                prefix="$"
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Severance Amount"
                placeholder="Enter amount"
                value={formData.severance_amount}
                onChange={(value) => setFormData({ ...formData, severance_amount: Number(value) || 0 })}
                min={0}
                thousandSeparator=","
                prefix="$"
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Unused PTO Days"
                placeholder="Enter days"
                value={formData.unused_pto_days}
                onChange={(value) => setFormData({ ...formData, unused_pto_days: Number(value) || 0 })}
                min={0}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Equity Vesting Status"
                data={[
                  { value: 'standard', label: 'Standard Vesting' },
                  { value: 'accelerated', label: 'Accelerated Vesting' },
                  { value: 'forfeited', label: 'Forfeited' },
                ]}
                value={formData.equity_vesting_status}
                onChange={(value) => setFormData({ ...formData, equity_vesting_status: value || 'standard' })}
                size="md"
              />
            </Grid.Col>
          </Grid>
        </Stack>
      ),
      validate: () => true,
    },
    {
      label: 'Review & Submit',
      description: 'Review all information before submitting',
      icon: <IconCheck size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="green" variant="light" icon={<IconCheck size={16} />}>
            Please review all information carefully before submitting. Once submitted, the exit workflow will be created.
          </Alert>
          <Paper p="md" withBorder>
            <Stack gap="md">
              {selectedEmployee && (
                <>
                  <div>
                    <Text size="sm" fw={600} c="dimmed" mb={4}>Employee</Text>
                    <Text size="sm">{selectedEmployee.first_name} {selectedEmployee.last_name}</Text>
                    <Text size="sm" c="dimmed">{selectedEmployee.position}</Text>
                  </div>
                  <Divider />
                </>
              )}
              <div>
                <Text size="sm" fw={600} c="dimmed" mb={4}>Termination Details</Text>
                <Text size="sm"><strong>Type:</strong> {formData.termination_type}</Text>
                <Text size="sm"><strong>Effective Date:</strong> {formData.effective_date ? dayjs(formData.effective_date).format('MMMM D, YYYY') : 'Not set'}</Text>
                <Text size="sm"><strong>Reason:</strong> {formData.termination_reason}</Text>
              </div>
              {isExecutive && (
                <>
                  <Divider />
                  <div>
                    <Text size="sm" fw={600} c="dimmed" mb={4}>Board Approval</Text>
                    <Badge color="orange" variant="light">Board Resolution Required</Badge>
                  </div>
                </>
              )}
            </Stack>
          </Paper>
        </Stack>
      ),
      validate: () => true,
    },
  ];

  const wizard = useWizard({
    steps,
    onComplete: handleComplete,
  });

  return (
    <WizardLayout
      title="Initiate Exit Workflow"
      subtitle="Step-by-step process to initiate an employee exit workflow"
      steps={steps}
      activeStep={wizard.activeStep}
      completedSteps={wizard.completedSteps}
      onStepChange={wizard.handleStepChange}
      onNext={wizard.handleNext}
      onBack={wizard.handleBack}
      onComplete={handleComplete}
      loading={wizard.loading}
      error={wizard.error}
    />
  );
};

export default ExitWorkflowWizard;

