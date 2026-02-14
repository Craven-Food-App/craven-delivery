// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Alert,
  Loader,
  Switch,
  Grid,
  Paper,
  Box,
  Divider,
  Badge,
  Tooltip,
  Stepper,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconCoins, IconCheck, IconAlertCircle, IconInfoCircle, IconUser, IconCalendar, IconChartBar } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

const EquityGrantForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    recipient_user_id: '',
    recipient_email: '',
    shares_amount: 0,
    share_class: 'Common',
    vesting_type: 'immediate' as 'immediate' | 'graded' | 'cliff',
    vesting_period_months: 48,
    cliff_months: 12,
    start_date: null as Date | null,
    resolution_id: '',
  });

  const [users, setUsers] = useState<Array<{ id: string; email: string; full_name: string }>>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadUsers();
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
        console.log('User found:', foundProfile.user_id, foundProfile.email);
      } else {
        const { data: execUsers, error: execError } = await supabase
          .from('exec_users')
          .select('user_id')
          .not('user_id', 'is', null);

        if (!execError && execUsers && execUsers.length > 0) {
          const execUserIds = execUsers.map(eu => eu.user_id).filter(Boolean);
          
          const { data: execProfiles, error: execProfileError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, email')
            .in('user_id', execUserIds)
            .ilike('email', `%${email}%`)
            .limit(5);

          if (!execProfileError && execProfiles && execProfiles.length > 0) {
            const exactMatch = execProfiles.find(p => p.email?.toLowerCase() === email.toLowerCase());
            const foundProfile = exactMatch || execProfiles[0];
            
            setFormData({
              ...formData,
              recipient_user_id: foundProfile.user_id,
              recipient_email: foundProfile.email || email,
            });
            console.log('User found via exec_users:', foundProfile.user_id, foundProfile.email);
            return;
          }
        }
        
        console.log('User not found in database, backend will search by email on submit');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.recipient_email || formData.recipient_email.length < 3) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a valid recipient email address',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    if (!formData.shares_amount || formData.shares_amount <= 0) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a valid shares amount',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        throw new Error('Not authenticated. Please log in and try again.');
      }

      const supabaseUrl = 'https://xaxbucnjlrfkccsfiddq.supabase.co';
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhheGJ1Y25qbHJma2Njc2ZpZGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyODMyODAsImV4cCI6MjA3Mjg1OTI4MH0.3ETuLETgSEj6W8gYi7WAoUFDPNo4IwTjuSnVtt1BCFE';

      const response = await fetch(`${supabaseUrl}/functions/v1/governance-grant-equity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          recipient_user_id: formData.recipient_user_id || null,
          recipient_email: formData.recipient_email || null,
          shares_amount: formData.shares_amount,
          share_class: formData.share_class,
          vesting_type: formData.vesting_type,
          vesting_period_months: formData.vesting_type !== 'immediate' ? formData.vesting_period_months : 0,
          cliff_months: formData.vesting_type === 'cliff' ? formData.cliff_months : 0,
          start_date: (() => {
            if (!formData.start_date) {
              return new Date().toISOString().split('T')[0];
            }
            if (formData.start_date instanceof Date) {
              return formData.start_date.toISOString().split('T')[0];
            }
            try {
              const date = new Date(formData.start_date);
              if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
              }
            } catch (e) {
              console.warn('Invalid date format:', formData.start_date);
            }
            return new Date().toISOString().split('T')[0];
          })(),
          resolution_id: formData.resolution_id || null,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ Grant creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: data?.error,
          details: data?.details,
          message: data?.message,
          fullResponse: data,
        });
        const errorMessage = data?.error || data?.details || data?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const recipientName = data?.recipient?.full_name || data?.recipient?.email || data?.recipient_email || formData.recipient_email || 'User';
      const successMessage = data?.message || `Equity grant created: ${formData.shares_amount.toLocaleString()} shares granted to ${recipientName}`;
      
      notifications.show({
        title: 'Success',
        message: successMessage,
        color: 'green',
        icon: <IconCheck size={16} />,
        autoClose: 7000,
      });

      console.log('Equity grant created:', {
        recipient: data?.recipient || { user_id: data?.recipient_user_id, email: data?.recipient_email || formData.recipient_email },
        shares_granted: data?.shares_granted || formData.shares_amount,
        vesting_schedule: data?.vesting_schedule,
        ledger_entry: data?.ledger_entry,
        cap_table_updated: data?.cap_table_updated,
      });

      window.dispatchEvent(new CustomEvent('equityGrantCreated'));

      setFormData({
        recipient_user_id: '',
        recipient_email: '',
        shares_amount: 0,
        share_class: 'Common',
        vesting_type: 'immediate',
        vesting_period_months: 48,
        cliff_months: 12,
        start_date: null,
        resolution_id: '',
      });
      setActiveStep(0);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create equity grant',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep2 = formData.recipient_email && formData.recipient_email.length >= 3;
  const canProceedToStep3 = canProceedToStep2 && formData.shares_amount > 0;
  const canSubmit = canProceedToStep3;

  return (
    <Stack gap="xl">
      {/* Enterprise Header */}
      <Paper
        p="xl"
        radius="md"
        style={{
          background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
          color: 'white',
        }}
      >
        <Group gap={16} align="flex-start">
          <Box
            style={{
              backgroundColor: 'rgba(255, 106, 0, 0.2)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconCoins size={32} color="#ff6a00" stroke={2.5} />
          </Box>
          <div>
            <Title order={2} c="white" mb={4} style={{ letterSpacing: '0.5px' }}>
              Create Equity Grant
            </Title>
            <Text c="gray.3" size="sm" style={{ letterSpacing: '0.3px' }}>
              Grant equity to executives and key personnel with comprehensive vesting schedules
            </Text>
          </div>
        </Group>
      </Paper>

      <Card padding="xl" radius="md" withBorder>
        <form onSubmit={handleSubmit}>
          <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm" mb="xl">
            <Stepper.Step label="Recipient" icon={<IconUser size={18} />} description="Select grant recipient">
              <Stack gap="md" mt="xl">
                <TextInput
                  label="Recipient Email"
                  placeholder="Enter recipient email to search"
                  description="Search for existing users or enter a new email address"
                  value={formData.recipient_email}
                  onChange={(e) => {
                    setFormData({ ...formData, recipient_email: e.target.value });
                    searchUser(e.target.value);
                  }}
                  required
                  size="md"
                  leftSection={<IconUser size={16} />}
                  rightSection={searching ? <Loader size="xs" /> : null}
                />

                {formData.recipient_user_id ? (
                  <Alert icon={<IconCheck size={16} />} color="green" title="User Found">
                    Equity will be granted to this user: <strong>{formData.recipient_email}</strong>
                  </Alert>
                ) : formData.recipient_email && formData.recipient_email.length >= 3 && !searching ? (
                  <Alert icon={<IconAlertCircle size={16} />} color="yellow" title="User Not Found in Database">
                    The system will attempt to find the user by email when creating the grant. If the user doesn't exist, the grant will fail.
                  </Alert>
                ) : null}

                <Group justify="flex-end" mt="md">
                  <Button
                    onClick={() => setActiveStep(1)}
                    disabled={!canProceedToStep2}
                    rightSection={<IconCheck size={16} />}
                  >
                    Continue
                  </Button>
                </Group>
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Grant Details" icon={<IconCoins size={18} />} description="Configure grant terms">
              <Stack gap="md" mt="xl">
                <Grid>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <NumberInput
                      label="Shares Amount"
                      placeholder="Enter number of shares"
                      description="Total number of shares to grant"
                      value={formData.shares_amount}
                      onChange={(value) => setFormData({ ...formData, shares_amount: Number(value) || 0 })}
                      required
                      min={0}
                      thousandSeparator=","
                      size="md"
                      leftSection={<IconChartBar size={16} />}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select
                      label="Share Class"
                      description="Type of shares being granted"
                      data={[
                        { value: 'Common', label: 'Common Stock' },
                        { value: 'Preferred', label: 'Preferred Stock' },
                      ]}
                      value={formData.share_class}
                      onChange={(value) => setFormData({ ...formData, share_class: value || 'Common' })}
                      size="md"
                    />
                  </Grid.Col>
                </Grid>

                <Select
                  label="Vesting Type"
                  description="How shares will vest over time"
                  data={[
                    { value: 'graded', label: 'Graded (Monthly vesting over period)' },
                    { value: 'cliff', label: 'Cliff (All at once after cliff period)' },
                    { value: 'immediate', label: 'Immediate (No vesting period)' },
                  ]}
                  value={formData.vesting_type}
                  onChange={(value) => setFormData({ ...formData, vesting_type: (value || 'graded') as 'graded' | 'cliff' | 'immediate' })}
                  required
                  size="md"
                />

                {formData.vesting_type !== 'immediate' && (
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label="Vesting Period (Months)"
                        description="Total months over which shares will vest"
                        value={formData.vesting_period_months}
                        onChange={(value) => setFormData({ ...formData, vesting_period_months: Number(value) || 48 })}
                        required
                        min={1}
                        size="md"
                      />
                    </Grid.Col>
                    {formData.vesting_type === 'cliff' && (
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <NumberInput
                          label="Cliff Period (Months)"
                          description="Months before any shares vest"
                          value={formData.cliff_months}
                          onChange={(value) => setFormData({ ...formData, cliff_months: Number(value) || 12 })}
                          required
                          min={0}
                          size="md"
                        />
                      </Grid.Col>
                    )}
                  </Grid>
                )}

                <Group justify="space-between" mt="md">
                  <Button variant="subtle" onClick={() => setActiveStep(0)}>
                    Back
                  </Button>
                  <Button
                    onClick={() => setActiveStep(2)}
                    disabled={!canProceedToStep3}
                    rightSection={<IconCheck size={16} />}
                  >
                    Continue
                  </Button>
                </Group>
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Additional Info" icon={<IconCalendar size={18} />} description="Finalize grant details">
              <Stack gap="md" mt="xl">
                <DateInput
                  label="Grant Start Date"
                  placeholder="Select start date"
                  description="Date when the grant becomes effective"
                  value={formData.start_date}
                  onChange={(value) => setFormData({ ...formData, start_date: value as any })}
                  size="md"
                  leftSection={<IconCalendar size={16} />}
                />

                <TextInput
                  label="Resolution ID (Optional)"
                  placeholder="Link to board resolution"
                  description="Optional reference to the board resolution authorizing this grant"
                  value={formData.resolution_id}
                  onChange={(e) => setFormData({ ...formData, resolution_id: e.target.value })}
                  size="md"
                />

                <Divider my="md" />

                <Paper p="md" withBorder style={{ backgroundColor: '#f9fafb' }}>
                  <Text size="sm" fw={600} mb="xs">Grant Summary</Text>
                  <Stack gap={4}>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Recipient:</Text>
                      <Text size="sm" fw={500}>{formData.recipient_email || 'Not specified'}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Shares:</Text>
                      <Badge color="blue" size="lg">{formData.shares_amount.toLocaleString()}</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Share Class:</Text>
                      <Badge color="orange" size="lg">{formData.share_class}</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Vesting:</Text>
                      <Badge color="green" size="lg">
                        {formData.vesting_type === 'immediate' ? 'Immediate' : 
                         formData.vesting_type === 'cliff' ? `Cliff (${formData.cliff_months} months)` :
                         `Graded (${formData.vesting_period_months} months)`}
                      </Badge>
                    </Group>
                  </Stack>
                </Paper>

                <Group justify="space-between" mt="md">
                  <Button variant="subtle" onClick={() => setActiveStep(1)}>
                    Back
                  </Button>
                  <Button
                    type="submit"
                    leftSection={<IconCheck size={16} />}
                    loading={loading}
                    disabled={!canSubmit}
                    size="md"
                  >
                    Create Equity Grant
                  </Button>
                </Group>
              </Stack>
            </Stepper.Step>
          </Stepper>
        </form>
      </Card>
    </Stack>
  );
};

export default EquityGrantForm;
