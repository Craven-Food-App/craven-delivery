import React, { useState, useEffect } from 'react';
import {
  TextInput,
  Select,
  Textarea,
  NumberInput,
  Checkbox,
  Group,
  Stack,
  Alert,
  Grid,
  Badge,
  Divider,
  Paper,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconUser, IconCalendar, IconCurrencyDollar, IconCoins, IconFileText, IconCheck } from '@tabler/icons-react';
import { WizardLayout, WizardStep } from './shared/WizardLayout';
import { useWizard } from './shared/useWizard';
import { useAutoAdvance } from './shared/useAutoAdvance';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

interface AppointmentFormData {
  proposed_officer_name: string;
  proposed_officer_email: string;
  proposed_officer_phone: string;
  proposed_title: string;
  appointment_type: string;
  board_meeting_date: Date | null;
  effective_date: Date | null;
  term_length_months: number | null;
  authority_granted: string;
  reporting_to: string;
  department: string;
  compensation_structure: {
    base_salary: number;
    annual_bonus_percentage: number;
    performance_bonus: string;
    benefits: string;
  };
  equity_included: boolean;
  equity_details: {
    percentage: number;
    share_count: number;
    vesting_schedule: string;
    exercise_price: string;
  };
  notes: string;
  formation_mode: boolean;
}

const ExecutiveAppointmentWizard: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<AppointmentFormData>({
    proposed_officer_name: '',
    proposed_officer_email: '',
    proposed_officer_phone: '',
    proposed_title: '',
    appointment_type: 'NEW',
    board_meeting_date: null,
    effective_date: null,
    term_length_months: null,
    authority_granted: '',
    reporting_to: '',
    department: '',
    compensation_structure: {
      base_salary: 0,
      annual_bonus_percentage: 0,
      performance_bonus: '',
      benefits: '',
    },
    equity_included: false,
    equity_details: {
      percentage: 0,
      share_count: 0,
      vesting_schedule: '',
      exercise_price: '',
    },
    notes: '',
    formation_mode: false,
  });

  const [hasArticles, setHasArticles] = useState(true);

  useEffect(() => {
    const checkArticles = async () => {
      try {
        const { data } = await supabase
          .from('company_settings')
          .select('setting_value')
          .eq('setting_key', 'has_articles_of_incorporation')
          .single();
        
        const hasArticlesOnFile = data?.setting_value === 'true';
        setHasArticles(hasArticlesOnFile);
        
        if (!hasArticlesOnFile) {
          setFormData(prev => ({ ...prev, formation_mode: true }));
        }
      } catch (error) {
        console.warn('Could not check Articles status:', error);
        setHasArticles(true);
      }
    };
    
    checkArticles();
  }, []);

  const validateBasicInfo = (): boolean => {
    if (!formData.proposed_officer_name.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Officer name is required',
        color: 'red',
      });
      return false;
    }
    if (!formData.proposed_officer_email.trim() || !formData.proposed_officer_email.includes('@')) {
      notifications.show({
        title: 'Validation Error',
        message: 'Valid email address is required',
        color: 'red',
      });
      return false;
    }
    if (!formData.proposed_title.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Officer title is required',
        color: 'red',
      });
      return false;
    }
    return true;
  };

  const validateAppointmentDetails = (): boolean => {
    if (!formData.effective_date) {
      notifications.show({
        title: 'Validation Error',
        message: 'Effective date is required',
        color: 'red',
      });
      return false;
    }
    return true;
  };

  const handleComplete = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('governance-create-appointment', {
        body: {
          proposed_officer_name: formData.proposed_officer_name,
          proposed_officer_email: formData.proposed_officer_email,
          proposed_officer_phone: formData.proposed_officer_phone || null,
          proposed_title: formData.proposed_title,
          appointment_type: formData.appointment_type,
          board_meeting_date: formData.board_meeting_date
            ? dayjs(formData.board_meeting_date).toISOString().split('T')[0]
            : null,
          effective_date: dayjs(formData.effective_date).toISOString().split('T')[0],
          term_length_months: formData.term_length_months || null,
          authority_granted: formData.authority_granted || null,
          reporting_to: formData.reporting_to || null,
          department: formData.department || null,
          compensation_structure: JSON.stringify(formData.compensation_structure),
          equity_included: formData.equity_included,
          equity_details: formData.equity_included ? JSON.stringify(formData.equity_details) : null,
          notes: formData.notes || null,
          formation_mode: formData.formation_mode,
        },
      });

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Executive appointment created successfully!',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      navigate('/company/governance-admin?tab=appointments');
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create appointment',
        color: 'red',
      });
      throw error;
    }
  };

  const steps: WizardStep[] = [
    {
      label: 'Basic Information',
      description: 'Officer name, email, and title',
      icon: <IconUser size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Enter the basic information for the executive appointment.
          </Alert>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Officer Full Name"
                placeholder="John Doe"
                required
                value={formData.proposed_officer_name}
                onChange={(e) => setFormData({ ...formData, proposed_officer_name: e.target.value })}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Corporate Email"
                placeholder="john.doe@cravenusa.com"
                type="email"
                required
                value={formData.proposed_officer_email}
                onChange={(e) => setFormData({ ...formData, proposed_officer_email: e.target.value })}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Phone Number"
                placeholder="(555) 123-4567"
                value={formData.proposed_officer_phone}
                onChange={(e) => setFormData({ ...formData, proposed_officer_phone: e.target.value })}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Executive Title"
                placeholder="Select title"
                required
                data={[
                  { value: 'Chief Executive Officer', label: 'CEO - Chief Executive Officer' },
                  { value: 'Chief Financial Officer', label: 'CFO - Chief Financial Officer' },
                  { value: 'Chief Operating Officer', label: 'COO - Chief Operating Officer' },
                  { value: 'Chief Technology Officer', label: 'CTO - Chief Technology Officer' },
                  { value: 'Chief Experience Officer', label: 'CXO - Chief Experience Officer' },
                  { value: 'President', label: 'President' },
                  { value: 'Vice President', label: 'Vice President' },
                ]}
                value={formData.proposed_title}
                onChange={(value) => setFormData({ ...formData, proposed_title: value || '' })}
                searchable
                size="md"
              />
            </Grid.Col>
          </Grid>
        </Stack>
      ),
      validate: validateBasicInfo,
    },
    {
      label: 'Appointment Details',
      description: 'Dates, term, and authority',
      icon: <IconCalendar size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Set the appointment dates, term length, and authority granted.
          </Alert>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DatePickerInput
                label="Effective Date"
                placeholder="Select effective date"
                required
                value={formData.effective_date}
                onChange={(value) => setFormData({ ...formData, effective_date: value })}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DatePickerInput
                label="Board Meeting Date (Optional)"
                placeholder="Select board meeting date"
                value={formData.board_meeting_date}
                onChange={(value) => setFormData({ ...formData, board_meeting_date: value })}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Appointment Type"
                required
                data={[
                  { value: 'NEW', label: 'New Appointment' },
                  { value: 'REAPPOINTMENT', label: 'Re-appointment' },
                  { value: 'PROMOTION', label: 'Promotion' },
                  { value: 'INTERIM', label: 'Interim' },
                ]}
                value={formData.appointment_type}
                onChange={(value) => setFormData({ ...formData, appointment_type: value || 'NEW' })}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Term Length (Months)"
                placeholder="Leave empty for indefinite"
                value={formData.term_length_months || undefined}
                onChange={(value) => setFormData({ ...formData, term_length_months: value ? Number(value) : null })}
                min={0}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Authority Granted"
                placeholder="Describe the powers and responsibilities granted to this officer"
                value={formData.authority_granted}
                onChange={(e) => setFormData({ ...formData, authority_granted: e.target.value })}
                rows={4}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Reporting To"
                placeholder="e.g., Board of Directors"
                value={formData.reporting_to}
                onChange={(e) => setFormData({ ...formData, reporting_to: e.target.value })}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Department/Division"
                placeholder="e.g., Operations"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                size="md"
              />
            </Grid.Col>
          </Grid>
        </Stack>
      ),
      validate: validateAppointmentDetails,
    },
    {
      label: 'Compensation',
      description: 'Salary, bonuses, and benefits',
      icon: <IconCurrencyDollar size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Enter the compensation structure for this appointment.
          </Alert>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Base Salary (Annual)"
                placeholder="Enter annual salary"
                value={formData.compensation_structure.base_salary}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    compensation_structure: {
                      ...formData.compensation_structure,
                      base_salary: Number(value) || 0,
                    },
                  })
                }
                min={0}
                thousandSeparator=","
                prefix="$"
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Annual Bonus Percentage"
                placeholder="e.g., 20"
                value={formData.compensation_structure.annual_bonus_percentage}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    compensation_structure: {
                      ...formData.compensation_structure,
                      annual_bonus_percentage: Number(value) || 0,
                    },
                  })
                }
                min={0}
                max={100}
                suffix="%"
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Performance Bonus Structure"
                placeholder="Describe performance-based bonus structure"
                value={formData.compensation_structure.performance_bonus}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    compensation_structure: {
                      ...formData.compensation_structure,
                      performance_bonus: e.target.value,
                    },
                  })
                }
                rows={3}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Benefits Package"
                placeholder="Describe benefits (health insurance, retirement, etc.)"
                value={formData.compensation_structure.benefits}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    compensation_structure: {
                      ...formData.compensation_structure,
                      benefits: e.target.value,
                    },
                  })
                }
                rows={3}
                size="md"
              />
            </Grid.Col>
          </Grid>
        </Stack>
      ),
      validate: () => true, // Optional
    },
    {
      label: 'Equity Grant',
      description: 'Equity details (optional)',
      icon: <IconCoins size={18} />,
      optional: true,
      component: (
        <Stack gap="md">
          <Checkbox
            label="Include Equity Grant"
            checked={formData.equity_included}
            onChange={(e) => setFormData({ ...formData, equity_included: e.currentTarget.checked })}
            size="md"
          />
          {formData.equity_included && (
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <NumberInput
                  label="Equity Percentage"
                  placeholder="e.g., 5"
                  value={formData.equity_details.percentage}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      equity_details: {
                        ...formData.equity_details,
                        percentage: Number(value) || 0,
                      },
                    })
                  }
                  min={0}
                  max={100}
                  suffix="%"
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <NumberInput
                  label="Share Count"
                  placeholder="e.g., 5000000"
                  value={formData.equity_details.share_count}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      equity_details: {
                        ...formData.equity_details,
                        share_count: Number(value) || 0,
                      },
                    })
                  }
                  min={0}
                  thousandSeparator=","
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput
                  label="Vesting Schedule"
                  placeholder="e.g., 4-year graded vesting with 1-year cliff"
                  value={formData.equity_details.vesting_schedule}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      equity_details: {
                        ...formData.equity_details,
                        vesting_schedule: e.target.value,
                      },
                    })
                  }
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput
                  label="Exercise Price (if applicable)"
                  placeholder="e.g., $0.001 per share"
                  value={formData.equity_details.exercise_price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      equity_details: {
                        ...formData.equity_details,
                        exercise_price: e.target.value,
                      },
                    })
                  }
                  size="md"
                />
              </Grid.Col>
            </Grid>
          )}
        </Stack>
      ),
      validate: () => true,
    },
    {
      label: 'Additional Details',
      description: 'Formation mode and notes',
      icon: <IconFileText size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="yellow" variant="light">
            <Checkbox
              label="Formation Mode (Pre-Incorporation)"
              description="Enable only if Articles of Incorporation have not been filed"
              checked={formData.formation_mode}
              onChange={(e) => setFormData({ ...formData, formation_mode: e.currentTarget.checked })}
              disabled={hasArticles}
              size="md"
            />
            {hasArticles && (
              <Text size="xs" c="dimmed" mt="xs">
                Company has Articles of Incorporation on file. Formation mode is disabled.
              </Text>
            )}
          </Alert>
          <Textarea
            label="Additional Notes"
            placeholder="Any additional information or special considerations"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={6}
            size="md"
          />
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
            Please review all information carefully before submitting. Once submitted, the appointment will be created and sent to the board for approval.
          </Alert>
          <Paper p="md" withBorder>
            <Stack gap="md">
              <div>
                <Text size="sm" fw={600} c="dimmed" mb={4}>Officer Information</Text>
                <Group>
                  <Badge size="lg" variant="light">{formData.proposed_officer_name}</Badge>
                  <Text size="sm">{formData.proposed_officer_email}</Text>
                </Group>
                <Text size="sm" mt={4}>{formData.proposed_title}</Text>
              </div>
              <Divider />
              <div>
                <Text size="sm" fw={600} c="dimmed" mb={4}>Appointment Details</Text>
                <Group>
                  <Text size="sm">
                    <strong>Effective Date:</strong> {formData.effective_date ? dayjs(formData.effective_date).format('MMMM D, YYYY') : 'Not set'}
                  </Text>
                  <Text size="sm">
                    <strong>Type:</strong> {formData.appointment_type}
                  </Text>
                </Group>
                {formData.term_length_months && (
                  <Text size="sm">
                    <strong>Term:</strong> {formData.term_length_months} months
                  </Text>
                )}
              </div>
              <Divider />
              <div>
                <Text size="sm" fw={600} c="dimmed" mb={4}>Compensation</Text>
                <Text size="sm">
                  <strong>Base Salary:</strong> ${formData.compensation_structure.base_salary.toLocaleString()}
                </Text>
                {formData.compensation_structure.annual_bonus_percentage > 0 && (
                  <Text size="sm">
                    <strong>Annual Bonus:</strong> {formData.compensation_structure.annual_bonus_percentage}%
                  </Text>
                )}
              </div>
              {formData.equity_included && (
                <>
                  <Divider />
                  <div>
                    <Text size="sm" fw={600} c="dimmed" mb={4}>Equity Grant</Text>
                    <Text size="sm">
                      <strong>Shares:</strong> {formData.equity_details.share_count.toLocaleString()}
                    </Text>
                    {formData.equity_details.percentage > 0 && (
                      <Text size="sm">
                        <strong>Percentage:</strong> {formData.equity_details.percentage}%
                      </Text>
                    )}
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
      title="Create Executive Appointment"
      subtitle="Step-by-step process to appoint a new corporate officer"
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

export default ExecutiveAppointmentWizard;

