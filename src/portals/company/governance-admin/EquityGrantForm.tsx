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
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconCoins, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

const EquityGrantForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
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
      // Load users from user_profiles (which has email if available)
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
      // Search in user_profiles first (has email column)
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email')
        .ilike('email', `%${email}%`)
        .limit(5);

      if (profileError) {
        console.warn('Error searching user_profiles:', profileError);
      }

      if (profiles && profiles.length > 0) {
        // Try to find exact match first
        const exactMatch = profiles.find(p => p.email?.toLowerCase() === email.toLowerCase());
        const foundProfile = exactMatch || profiles[0];
        
        setFormData({
          ...formData,
          recipient_user_id: foundProfile.user_id,
          recipient_email: foundProfile.email || email,
        });
        console.log('User found:', foundProfile.user_id, foundProfile.email);
      } else {
        // If not found in profiles, try searching via exec_users
        // Get exec_users and then match with user_profiles
        const { data: execUsers, error: execError } = await supabase
          .from('exec_users')
          .select('user_id')
          .not('user_id', 'is', null);

        if (!execError && execUsers && execUsers.length > 0) {
          // Get user_ids from exec_users
          const execUserIds = execUsers.map(eu => eu.user_id).filter(Boolean);
          
          // Search user_profiles for these user_ids and check if any have matching email
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
        
        // If still not found, clear user_id - backend will search by email
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
      // Use fetch directly to get better error details
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
            // Handle string or other types
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
        const errorMessage = data?.error || data?.details || data?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      // Show detailed success message with recipient info
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

      // Reset form
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

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={2} c="dark" mb="xs">
            <IconCoins size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 12 }} />
            Create Equity Grant
          </Title>
          <Text c="dimmed">
            Grant equity to executives and key personnel. This will create a vesting schedule and update the cap table.
          </Text>
        </div>

        <Card padding="lg" radius="md" withBorder>
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Recipient Email"
                placeholder="Enter recipient email to search"
                value={formData.recipient_email}
                onChange={(e) => {
                  setFormData({ ...formData, recipient_email: e.target.value });
                  searchUser(e.target.value);
                }}
                required
              />

              {formData.recipient_user_id ? (
                <Alert icon={<IconCheck size={16} />} color="green" title="User Found">
                  Equity will be granted to this user.
                </Alert>
              ) : formData.recipient_email && formData.recipient_email.length >= 3 && !searching ? (
                <Alert icon={<IconAlertCircle size={16} />} color="yellow" title="User Not Found in Database">
                  The system will attempt to find the user by email when creating the grant. If the user doesn't exist, the grant will fail.
                </Alert>
              ) : null}

              <NumberInput
                label="Shares Amount"
                placeholder="Enter number of shares"
                value={formData.shares_amount}
                onChange={(value) => setFormData({ ...formData, shares_amount: Number(value) || 0 })}
                required
                min={0}
                thousandSeparator=","
              />

              <Select
                label="Share Class"
                data={[
                  { value: 'Common', label: 'Common Stock' },
                  { value: 'Preferred', label: 'Preferred Stock' },
                ]}
                value={formData.share_class}
                onChange={(value) => setFormData({ ...formData, share_class: value || 'Common' })}
              />

              <Select
                label="Vesting Type"
                data={[
                  { value: 'graded', label: 'Graded (Monthly)' },
                  { value: 'cliff', label: 'Cliff (All at once)' },
                  { value: 'immediate', label: 'Immediate (No vesting)' },
                ]}
                value={formData.vesting_type}
                onChange={(value) => setFormData({ ...formData, vesting_type: (value || 'graded') as 'graded' | 'cliff' | 'immediate' })}
                required
              />

              {formData.vesting_type !== 'immediate' && (
                <>
                  <NumberInput
                    label="Vesting Period (Months)"
                    value={formData.vesting_period_months}
                    onChange={(value) => setFormData({ ...formData, vesting_period_months: Number(value) || 48 })}
                    required
                    min={1}
                  />

                  {formData.vesting_type === 'cliff' && (
                    <NumberInput
                      label="Cliff Period (Months)"
                      value={formData.cliff_months}
                      onChange={(value) => setFormData({ ...formData, cliff_months: Number(value) || 12 })}
                      required
                      min={0}
                    />
                  )}
                </>
              )}

              <DateInput
                label="Grant Start Date"
                placeholder="Select start date"
                value={formData.start_date}
                onChange={(value) => setFormData({ ...formData, start_date: value as any })}
              />

              <TextInput
                label="Resolution ID (Optional)"
                placeholder="Link to board resolution"
                value={formData.resolution_id}
                onChange={(e) => setFormData({ ...formData, resolution_id: e.target.value })}
              />

              <Group justify="flex-end" mt="md">
                <Button
                  type="submit"
                  leftSection={<IconCheck size={16} />}
                  loading={loading}
                  disabled={!formData.recipient_email || formData.recipient_email.length < 3 || !formData.shares_amount || formData.shares_amount <= 0}
                >
                  Create Equity Grant
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>
      </Stack>
    </Container>
  );
};

export default EquityGrantForm;

