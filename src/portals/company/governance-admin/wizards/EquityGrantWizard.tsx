import React, { useState, useEffect } from 'react';
import {
  TextInput,
  Select,
  NumberInput,
  Group,
  Stack,
  Alert,
  Grid,
  Badge,
  Divider,
  Paper,
  Text,
  Loader,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconCoins, IconUser, IconCalendar, IconChartBar, IconCheck } from '@tabler/icons-react';
import { WizardLayout, WizardStep } from './shared/WizardLayout';
import { useWizard } from './shared/useWizard';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

interface EquityGrantFormData {
  recipient_user_id: string;
  recipient_email: string;
  shares_amount: number;
  share_class: string;
  vesting_type: 'immediate' | 'graded' | 'cliff';
  vesting_period_months: number;
  cliff_months: number;
  start_date: Date | null;
  resolution_id: string;
}

const EquityGrantWizard: React.FC = () => {
  const [formData, setFormData] = useState<EquityGrantFormData>({
    recipient_user_id: '',
    recipient_email: '',
    shares_amount: 0,
    share_class: 'Common',
    vesting_type: 'graded',
    vesting_period_months: 48,
    cliff_months: 12,
    start_date: null,
    resolution_id: '',
  });

  const [users, setUsers] = useState<Array<{ id: string; email: string; full_name: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [resolutions, setResolutions] = useState<Array<{ id: string; resolution_number: string; title: string }>>([]);

  useEffect(() => {
    loadUsers();
    loadResolutions();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email')
        .limit(100);

      if (error) throw error;

      const userList = (data || []).map(profile => ({
        id: profile.user_id,
        email: profile.email || '',
        full_name: profile.full_name || '',
      }));

      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadResolutions = async () => {
    try {
      const { data, error } = await supabase
        .from('governance_board_resolutions')
        .select('id, resolution_number, title')
        .eq('type', 'EQUITY_GRANT')
        .in('status', ['DRAFT', 'PENDING_VOTE', 'ADOPTED'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setResolutions(data || []);
    } catch (error) {
      console.error('Error loading resolutions:', error);
    }
  };

  const searchUser = async (email: string) => {
    if (!email || email.length < 3) {
      setFormData({ ...formData, recipient_user_id: '', recipient_email: email });
      return;
    }
    
    setSearching(true);
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email')
        .ilike('email', `%${email}%`)
        .limit(5);

      if (profileError) {
        console.warn('Error searching user_profiles:', profileError);
      }

      if (profiles && profiles.length > 0) {
        const exactMatch = profiles.find(p => p.email?.toLowerCase() === email.toLowerCase());
        const foundProfile = exactMatch || profiles[0];
        
        setFormData({
          ...formData,
          recipient_user_id: foundProfile.user_id,
          recipient_email: foundProfile.email || email,
        });
      } else {
        setFormData({
          ...formData,
          recipient_user_id: '',
          recipient_email: email,
        });
      }
    } catch (error) {
      console.error('Error searching user:', error);
      setFormData({
        ...formData,
        recipient_user_id: '',
        recipient_email: email,
      });
    } finally {
      setSearching(false);
    }
  };

  const validateRecipient = (): boolean => {
    if (!formData.recipient_email.trim() || !formData.recipient_email.includes('@')) {
      notifications.show({
        title: 'Validation Error',
        message: 'Valid recipient email is required',
        color: 'red',
      });
      return false;
    }
    return true;
  };

  const validateGrantDetails = (): boolean => {
    if (!formData.shares_amount || formData.shares_amount <= 0) {
      notifications.show({
        title: 'Validation Error',
        message: 'Share amount must be greater than 0',
        color: 'red',
      });
      return false;
    }
    if (!formData.start_date) {
      notifications.show({
        title: 'Validation Error',
        message: 'Grant start date is required',
        color: 'red',
      });
      return false;
    }
    return true;
  };

  const handleComplete = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('governance-grant-equity', {
        body: {
          recipient_user_id: formData.recipient_user_id || null,
          recipient_email: formData.recipient_email,
          shares_amount: formData.shares_amount,
          share_class: formData.share_class,
          vesting_type: formData.vesting_type,
          vesting_period_months: formData.vesting_period_months,
          cliff_months: formData.cliff_months,
          start_date: formData.start_date
            ? dayjs(formData.start_date).toISOString().split('T')[0]
            : dayjs().toISOString().split('T')[0],
          resolution_id: formData.resolution_id || null,
        },
      });

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: `Equity grant of ${formData.shares_amount.toLocaleString()} shares created successfully!`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Dispatch event to refresh equity grants list
      window.dispatchEvent(new CustomEvent('equityGrantCreated'));

      // Reset form
      setFormData({
        recipient_user_id: '',
        recipient_email: '',
        shares_amount: 0,
        share_class: 'Common',
        vesting_type: 'graded',
        vesting_period_months: 48,
        cliff_months: 12,
        start_date: null,
        resolution_id: '',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create equity grant',
        color: 'red',
      });
      throw error;
    }
  };

  const steps: WizardStep[] = [
    {
      label: 'Recipient',
      description: 'Select grant recipient',
      icon: <IconUser size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Enter the email address of the person receiving the equity grant. The system will search for their user account.
          </Alert>
          <TextInput
            label="Recipient Email"
            placeholder="recipient@cravenusa.com"
            required
            value={formData.recipient_email}
            onChange={(e) => {
              const email = e.target.value;
              setFormData({ ...formData, recipient_email: email });
              searchUser(email);
            }}
            rightSection={searching ? <Loader size="xs" /> : null}
            size="md"
          />
          {formData.recipient_user_id && (
            <Alert color="green" variant="light" icon={<IconCheck size={16} />}>
              User account found in system
            </Alert>
          )}
        </Stack>
      ),
      validate: validateRecipient,
    },
    {
      label: 'Grant Details',
      description: 'Shares and share class',
      icon: <IconCoins size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Enter the number of shares and share class for this grant.
          </Alert>
          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <NumberInput
                label="Number of Shares"
                placeholder="e.g., 5000000"
                required
                value={formData.shares_amount}
                onChange={(value) => setFormData({ ...formData, shares_amount: Number(value) || 0 })}
                min={1}
                thousandSeparator=","
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label="Share Class"
                required
                data={[
                  { value: 'Common', label: 'Common Stock' },
                  { value: 'Preferred', label: 'Preferred Stock' },
                  { value: 'Options', label: 'Stock Options' },
                  { value: 'RSU', label: 'Restricted Stock Units' },
                ]}
                value={formData.share_class}
                onChange={(value) => setFormData({ ...formData, share_class: value || 'Common' })}
                size="md"
              />
            </Grid.Col>
          </Grid>
        </Stack>
      ),
      validate: validateGrantDetails,
    },
    {
      label: 'Vesting Schedule',
      description: 'Vesting type and period',
      icon: <IconChartBar size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Configure the vesting schedule for this equity grant.
          </Alert>
          <Select
            label="Vesting Type"
            required
            data={[
              { value: 'immediate', label: 'Immediate (100% vested)' },
              { value: 'graded', label: 'Graded Vesting' },
              { value: 'cliff', label: 'Cliff Vesting' },
            ]}
            value={formData.vesting_type}
            onChange={(value) => setFormData({ ...formData, vesting_type: (value as any) || 'graded' })}
            size="md"
          />
          {formData.vesting_type !== 'immediate' && (
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <NumberInput
                  label="Vesting Period (Months)"
                  placeholder="e.g., 48"
                  value={formData.vesting_period_months}
                  onChange={(value) => setFormData({ ...formData, vesting_period_months: Number(value) || 48 })}
                  min={1}
                  size="md"
                />
              </Grid.Col>
              {formData.vesting_type === 'cliff' && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <NumberInput
                    label="Cliff Period (Months)"
                    placeholder="e.g., 12"
                    value={formData.cliff_months}
                    onChange={(value) => setFormData({ ...formData, cliff_months: Number(value) || 12 })}
                    min={0}
                    size="md"
                  />
                </Grid.Col>
              )}
            </Grid>
          )}
        </Stack>
      ),
      validate: () => true,
    },
    {
      label: 'Dates & Resolution',
      description: 'Start date and optional resolution link',
      icon: <IconCalendar size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Set the grant start date and optionally link to a board resolution.
          </Alert>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Grant Start Date"
                placeholder="Select start date"
                required
                value={formData.start_date}
                onChange={(value) => setFormData({ ...formData, start_date: value })}
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Link to Resolution (Optional)"
                placeholder="Select resolution"
                data={resolutions.map((res) => ({
                  value: res.id,
                  label: `${res.resolution_number}: ${res.title}`,
                }))}
                value={formData.resolution_id}
                onChange={(value) => setFormData({ ...formData, resolution_id: value || '' })}
                searchable
                clearable
                size="md"
              />
            </Grid.Col>
          </Grid>
        </Stack>
      ),
      validate: validateGrantDetails,
    },
    {
      label: 'Review & Submit',
      description: 'Review all information before submitting',
      icon: <IconCheck size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="green" variant="light" icon={<IconCheck size={16} />}>
            Please review all information carefully before submitting. Once submitted, the equity grant will be created and added to the cap table.
          </Alert>
          <Paper p="md" withBorder>
            <Stack gap="md">
              <div>
                <Text size="sm" fw={600} c="dimmed" mb={4}>Recipient</Text>
                <Text size="sm">{formData.recipient_email}</Text>
              </div>
              <Divider />
              <div>
                <Text size="sm" fw={600} c="dimmed" mb={4}>Grant Details</Text>
                <Group>
                  <Text size="sm">
                    <strong>Shares:</strong> {formData.shares_amount.toLocaleString()}
                  </Text>
                  <Text size="sm">
                    <strong>Class:</strong> {formData.share_class}
                  </Text>
                </Group>
              </div>
              <Divider />
              <div>
                <Text size="sm" fw={600} c="dimmed" mb={4}>Vesting Schedule</Text>
                <Text size="sm">
                  <strong>Type:</strong> {formData.vesting_type.charAt(0).toUpperCase() + formData.vesting_type.slice(1)}
                </Text>
                {formData.vesting_type !== 'immediate' && (
                  <>
                    <Text size="sm">
                      <strong>Period:</strong> {formData.vesting_period_months} months
                    </Text>
                    {formData.vesting_type === 'cliff' && (
                      <Text size="sm">
                        <strong>Cliff:</strong> {formData.cliff_months} months
                      </Text>
                    )}
                  </>
                )}
              </div>
              <Divider />
              <div>
                <Text size="sm" fw={600} c="dimmed" mb={4}>Dates</Text>
                <Text size="sm">
                  <strong>Start Date:</strong> {formData.start_date ? dayjs(formData.start_date).format('MMMM D, YYYY') : 'Not set'}
                </Text>
              </div>
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
      title="Create Equity Grant"
      subtitle="Step-by-step process to grant equity to an individual"
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

export default EquityGrantWizard;















































