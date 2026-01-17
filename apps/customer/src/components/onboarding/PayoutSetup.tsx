import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, TextInput, Radio, Stack, Text, Group, Box } from '@mantine/core';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, DollarSign } from 'lucide-react';

export const PayoutSetup: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'direct_deposit' | 'cashapp'>('cashapp');
  const [payoutData, setPayoutData] = useState({
    cashTag: '',
    bankAccountType: 'checking' as 'checking' | 'savings',
    routingNumber: '',
    accountNumber: ''
  });

  useEffect(() => {
    loadPayoutInfo();
  }, []);

  const loadPayoutInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: application } = await supabase
        .from('craver_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (application) {
        setPayoutMethod((application.payout_method as 'cashapp' | 'direct_deposit') || 'cashapp');
        setPayoutData({
          cashTag: application.cash_tag || '',
          bankAccountType: (application.bank_account_type as 'checking' | 'savings') || 'checking',
          routingNumber: application.routing_number || '',
          accountNumber: application.account_number_encrypted || ''
        });
      }
    } catch (error) {
      console.error('Error loading payout info:', error);
    }
  };

  const handleSave = async () => {
    // Validate inputs
    if (payoutMethod === 'cashapp' && !payoutData.cashTag) {
      toast({
        title: "Missing Information",
        description: "Please enter your Cash App tag.",
        variant: "destructive",
      });
      return;
    }

    if (payoutMethod === 'direct_deposit' && (!payoutData.routingNumber || !payoutData.accountNumber)) {
      toast({
        title: "Missing Information",
        description: "Please enter your routing and account numbers.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: application } = await supabase
        .from('craver_applications')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!application) return;

      // Update application
      const { error: updateError } = await supabase
        .from('craver_applications')
        .update({
          payout_method: payoutMethod,
          cash_tag: payoutData.cashTag,
          bank_account_type: payoutData.bankAccountType,
          routing_number: payoutData.routingNumber,
          account_number_encrypted: payoutData.accountNumber,
          account_number_last_four: payoutData.accountNumber.slice(-4)
        })
        .eq('id', application.id);

      if (updateError) throw updateError;

      // Complete the task
      const { data: task } = await supabase
        .from('onboarding_tasks')
        .select('id')
        .eq('driver_id', application.id)
        .eq('task_key', 'setup_cashapp_payouts')
        .single();

      if (task) {
        await supabase.functions.invoke('complete-onboarding-task', {
          body: {
            task_id: task.id,
            driver_id: application.id,
          },
        });
      }

      toast({
        title: "Payout Method Saved! 💰",
        description: "Your payout information has been updated.",
      });

      navigate('/enhanced-onboarding');
    } catch (error) {
      console.error('Error saving payout info:', error);
      toast({
        title: "Error",
        description: "Failed to save payout information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)', padding: 24 }}>
      <Box style={{ maxWidth: 672, margin: '0 auto' }}>
        <Button
          variant="subtle"
          onClick={() => navigate('/enhanced-onboarding')}
          mb="md"
          leftSection={<ArrowLeft size={16} />}
        >
          Back to Onboarding
        </Button>

        <Card>
          <Stack gap="lg" p="lg">
            <div>
              <Group gap="xs" mb="xs">
                <DollarSign size={20} style={{ color: '#22c55e' }} />
                <Text fw={600} size="lg">Set Up Payout Method</Text>
              </Group>
              <Text size="sm" c="dimmed">
                Choose how you'd like to receive your earnings
              </Text>
            </div>
            <Radio.Group
              value={payoutMethod}
              onChange={(value) => setPayoutMethod(value as 'direct_deposit' | 'cashapp')}
            >
              <Stack gap="md">
                <Card withBorder p="md" style={{ cursor: 'pointer' }} onClick={() => setPayoutMethod('cashapp')}>
                  <Group>
                    <Radio value="cashapp" />
                    <div style={{ flex: 1 }}>
                      <Text fw={500}>Cash App</Text>
                      <Text size="sm" c="dimmed">Fast and easy payouts</Text>
                    </div>
                  </Group>
                </Card>
                <Card withBorder p="md" style={{ cursor: 'pointer' }} onClick={() => setPayoutMethod('direct_deposit')}>
                  <Group>
                    <Radio value="direct_deposit" />
                    <div style={{ flex: 1 }}>
                      <Text fw={500}>Direct Deposit</Text>
                      <Text size="sm" c="dimmed">Direct to your bank account</Text>
                    </div>
                  </Group>
                </Card>
              </Stack>
            </Radio.Group>

            {payoutMethod === 'cashapp' && (
              <TextInput
                label="Cash App Tag"
                placeholder="$yourcashtag"
                value={payoutData.cashTag}
                onChange={(e) => setPayoutData({ ...payoutData, cashTag: e.target.value })}
                description="Enter your Cash App tag (e.g., $johndoe)"
              />
            )}

            {payoutMethod === 'direct_deposit' && (
              <Stack gap="md">
                <div>
                  <Text size="sm" fw={500} mb="xs">Account Type</Text>
                  <Radio.Group
                    value={payoutData.bankAccountType}
                    onChange={(value) => setPayoutData({ ...payoutData, bankAccountType: value as 'checking' | 'savings' })}
                  >
                    <Group gap="lg">
                      <Radio value="checking" label="Checking" />
                      <Radio value="savings" label="Savings" />
                    </Group>
                  </Radio.Group>
                </div>

                <TextInput
                  label="Routing Number"
                  placeholder="9 digits"
                  value={payoutData.routingNumber}
                  onChange={(e) => setPayoutData({ ...payoutData, routingNumber: e.target.value })}
                  maxLength={9}
                />

                <TextInput
                  label="Account Number"
                  placeholder="Your account number"
                  value={payoutData.accountNumber}
                  onChange={(e) => setPayoutData({ ...payoutData, accountNumber: e.target.value })}
                />
              </Stack>
            )}

            <Button
              onClick={handleSave}
              disabled={loading}
              fullWidth
              color="#ff7a00"
            >
              {loading ? 'Saving...' : 'Save & Complete Task'}
            </Button>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
};
