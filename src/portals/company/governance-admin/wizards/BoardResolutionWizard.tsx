import React, { useState, useEffect } from 'react';
import {
  TextInput,
  Select,
  Textarea,
  Group,
  Stack,
  Alert,
  Grid,
  Badge,
  Divider,
  Paper,
  Checkbox,
  Text,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconFileText, IconLink, IconCalendar, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { WizardLayout, WizardStep } from './shared/WizardLayout';
import { useWizard } from './shared/useWizard';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

interface ResolutionFormData {
  title: string;
  description: string;
  type: string;
  meeting_date: Date | null;
  effective_date: Date | null;
  appointment_id: string;
  equity_grant_details: any;
}

const BoardResolutionWizard: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ResolutionFormData>({
    title: '',
    description: '',
    type: '',
    meeting_date: null,
    effective_date: null,
    appointment_id: '',
    equity_grant_details: null,
  });

  const [appointments, setAppointments] = useState<Array<{ id: string; proposed_officer_name: string; proposed_title: string }>>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  useEffect(() => {
    if (formData.type === 'EXECUTIVE_APPOINTMENT') {
      loadAppointments();
    }
  }, [formData.type]);

  const loadAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const { data, error } = await supabase
        .from('executive_appointments')
        .select('id, proposed_officer_name, proposed_title')
        .in('status', ['draft', 'authorized_to_offer', 'pending_comp_approval'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const validateBasicInfo = (): boolean => {
    if (!formData.title.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Resolution title is required',
        color: 'red',
      });
      return false;
    }
    if (!formData.type) {
      notifications.show({
        title: 'Validation Error',
        message: 'Resolution type is required',
        color: 'red',
      });
      return false;
    }
    if (!formData.description.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Resolution description is required',
        color: 'red',
      });
      return false;
    }
    return true;
  };

  const validateDetails = (): boolean => {
    if (!formData.effective_date) {
      notifications.show({
        title: 'Validation Error',
        message: 'Effective date is required',
        color: 'red',
      });
      return false;
    }
    if (formData.type === 'EXECUTIVE_APPOINTMENT' && !formData.appointment_id) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select an appointment for executive appointment resolutions',
        color: 'red',
      });
      return false;
    }
    return true;
  };

  const handleComplete = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('governance-create-resolution', {
        body: {
          title: formData.title,
          description: formData.description,
          type: formData.type,
          meeting_date: formData.meeting_date
            ? dayjs(formData.meeting_date).toISOString().split('T')[0]
            : null,
          effective_date: dayjs(formData.effective_date).toISOString().split('T')[0],
          appointment_id: formData.appointment_id || null,
          equity_grant_details: formData.equity_grant_details,
        },
      });

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Board resolution created successfully!',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      navigate('/company/governance-admin?tab=resolutions');
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create resolution',
        color: 'red',
      });
      throw error;
    }
  };

  const resolutionTypes = [
    { value: 'EXECUTIVE_APPOINTMENT', label: 'Executive Appointment' },
    { value: 'EQUITY_GRANT', label: 'Equity Grant' },
    { value: 'POLICY', label: 'Policy Change' },
    { value: 'REMOVAL', label: 'Officer Removal' },
    { value: 'OTHER', label: 'Other' },
  ];

  const steps: WizardStep[] = [
    {
      label: 'Resolution Type',
      description: 'Select the type of resolution',
      icon: <IconFileText size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Select the type of board resolution you want to create.
          </Alert>
          <Select
            label="Resolution Type"
            placeholder="Select resolution type"
            required
            data={resolutionTypes}
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value || '' })}
            size="md"
          />
          {formData.type && (
            <Alert color="green" variant="light" icon={<IconCheck size={16} />}>
              <Text size="sm">
                {formData.type === 'EXECUTIVE_APPOINTMENT' && 'This resolution will appoint a new executive officer.'}
                {formData.type === 'EQUITY_GRANT' && 'This resolution will grant equity to an individual.'}
                {formData.type === 'POLICY' && 'This resolution will change or establish a corporate policy.'}
                {formData.type === 'REMOVAL' && 'This resolution will remove an officer from their position.'}
                {formData.type === 'OTHER' && 'This is a general board resolution.'}
              </Text>
            </Alert>
          )}
        </Stack>
      ),
      validate: validateBasicInfo,
    },
    {
      label: 'Resolution Details',
      description: 'Title and description',
      icon: <IconFileText size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Enter the title and detailed description of the resolution.
          </Alert>
          <TextInput
            label="Resolution Title"
            placeholder="e.g., Appointment of John Doe as Chief Financial Officer"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            size="md"
          />
          <Textarea
            label="Resolution Description"
            placeholder="Provide a detailed description of what this resolution accomplishes..."
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={8}
            size="md"
          />
        </Stack>
      ),
      validate: validateBasicInfo,
    },
    {
      label: 'Link Appointment',
      description: 'Link to executive appointment (if applicable)',
      icon: <IconLink size={18} />,
      optional: true,
      component: (
        <Stack gap="md">
          {formData.type === 'EXECUTIVE_APPOINTMENT' ? (
            <>
              <Alert color="blue" variant="light">
                Select the executive appointment this resolution relates to.
              </Alert>
              <Select
                label="Executive Appointment"
                placeholder={loadingAppointments ? 'Loading appointments...' : 'Select appointment'}
                data={appointments.map((apt) => ({
                  value: apt.id,
                  label: `${apt.proposed_officer_name} - ${apt.proposed_title}`,
                }))}
                value={formData.appointment_id}
                onChange={(value) => setFormData({ ...formData, appointment_id: value || '' })}
                searchable
                size="md"
                disabled={loadingAppointments}
              />
            </>
          ) : (
            <Alert color="gray" variant="light">
              This resolution type does not require linking to an appointment.
            </Alert>
          )}
        </Stack>
      ),
      validate: () => {
        if (formData.type === 'EXECUTIVE_APPOINTMENT' && !formData.appointment_id) {
          return false;
        }
        return true;
      },
    },
    {
      label: 'Dates',
      description: 'Meeting and effective dates',
      icon: <IconCalendar size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Set the board meeting date and the effective date for this resolution.
          </Alert>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DatePickerInput
                label="Board Meeting Date (Optional)"
                placeholder="Select meeting date"
                value={formData.meeting_date}
                onChange={(value) => setFormData({ ...formData, meeting_date: value })}
                size="md"
              />
            </Grid.Col>
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
          </Grid>
        </Stack>
      ),
      validate: validateDetails,
    },
    {
      label: 'Review & Submit',
      description: 'Review all information before submitting',
      icon: <IconCheck size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="green" variant="light" icon={<IconCheck size={16} />}>
            Please review all information carefully before submitting. Once submitted, the resolution will be created and sent to the board for voting.
          </Alert>
          <Paper p="md" withBorder>
            <Stack gap="md">
              <div>
                <Text size="sm" fw={600} c="dimmed" mb={4}>Resolution Type</Text>
                <Badge size="lg" variant="light">{formData.type}</Badge>
              </div>
              <Divider />
              <div>
                <Text size="sm" fw={600} c="dimmed" mb={4}>Title</Text>
                <Text size="sm">{formData.title}</Text>
              </div>
              <Divider />
              <div>
                <Text size="sm" fw={600} c="dimmed" mb={4}>Description</Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{formData.description}</Text>
              </div>
              <Divider />
              <div>
                <Text size="sm" fw={600} c="dimmed" mb={4}>Dates</Text>
                <Text size="sm">
                  <strong>Effective Date:</strong> {formData.effective_date ? dayjs(formData.effective_date).format('MMMM D, YYYY') : 'Not set'}
                </Text>
                {formData.meeting_date && (
                  <Text size="sm">
                    <strong>Meeting Date:</strong> {dayjs(formData.meeting_date).format('MMMM D, YYYY')}
                  </Text>
                )}
              </div>
              {formData.appointment_id && (
                <>
                  <Divider />
                  <div>
                    <Text size="sm" fw={600} c="dimmed" mb={4}>Linked Appointment</Text>
                    <Text size="sm">
                      {appointments.find((apt) => apt.id === formData.appointment_id)?.proposed_officer_name || 'Unknown'}
                    </Text>
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
      title="Create Board Resolution"
      subtitle="Step-by-step process to create a new board resolution"
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

export default BoardResolutionWizard;

