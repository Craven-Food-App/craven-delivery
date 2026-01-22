// Driver Interest Referral - Driver Intro Screen
// Explains role + requirements, then opens browser with signed context

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Stack,
  Button,
  Title,
  Text,
  Group,
  ActionIcon,
  Alert,
  List,
  Divider,
} from '@mantine/core';
import { IconArrowLeft, IconTruck, IconExternalLink, IconCheck } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TesterDriverInterest: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [referralId, setReferralId] = useState<string | null>(null);

  useEffect(() => {
    checkExistingReferral();
  }, []);

  const checkExistingReferral = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('tester_referrals')
        .select('id, status')
        .eq('referrer_user_id', user.id)
        .eq('referral_type', 'driver')
        .maybeSingle();

      if (data) {
        setReferralId(data.id);
      }
    } catch (error) {
      // Ignore
    }
  };

  const handleStartOnboarding = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        navigate('/account');
        return;
      }

      // Get session token for signed context
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Error',
          description: 'Please sign in to continue',
          variant: 'destructive',
        });
        return;
      }

      // Create or update referral record
      if (referralId) {
        const { error } = await supabase
          .from('tester_referrals')
          .update({ 
            status: 'started', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', referralId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('tester_referrals')
          .insert({
            referrer_user_id: user.id,
            referral_type: 'driver',
            status: 'started',
          })
          .select()
          .single();

        if (error) throw error;
        setReferralId(data.id);
      }

      // Build onboarding URL with signed context params
      const onboardingUrl = new URL('https://feeder.cravenusa.com/driver-onboarding/apply');
      onboardingUrl.searchParams.set('user_id', user.id);
      onboardingUrl.searchParams.set('email', user.email);
      onboardingUrl.searchParams.set('source', 'customer_app');
      onboardingUrl.searchParams.set('token', session.access_token);

      // Open in external browser (user must tap CTA)
      window.open(onboardingUrl.toString(), '_blank');

      toast({
        title: 'Onboarding Started',
        description: 'Complete driver onboarding in your browser to earn your reward!',
      });
    } catch (error: any) {
      console.error('Referral error:', error);
      toast({
        title: 'Error',
        description: 'Failed to start onboarding. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="md" p="md">
      <Group>
        <ActionIcon variant="subtle" onClick={() => navigate('/tester-hub')}>
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Title order={4}>Become a Driver</Title>
      </Group>

      <Card p="md" radius="md" withBorder>
        <Stack gap="md">
          <Group>
            <IconTruck size={32} color="orange" />
            <div>
              <Title order={5}>Earn While You Deliver</Title>
              <Text size="sm" c="dimmed">
                Join Crave'n as a driver and earn extra income
              </Text>
            </div>
          </Group>

          <Divider />

          <div>
            <Text fw={600} size="sm" mb="xs">What You'll Do:</Text>
            <List size="sm" spacing="xs">
              <List.Item>Deliver food orders to customers</List.Item>
              <List.Item>Set your own schedule</List.Item>
              <List.Item>Earn competitive pay per delivery</List.Item>
              <List.Item>Keep 100% of tips</List.Item>
            </List>
          </div>

          <div>
            <Text fw={600} size="sm" mb="xs">Requirements:</Text>
            <List size="sm" spacing="xs">
              <List.Item>Valid driver's license</List.Item>
              <List.Item>Reliable vehicle (car, bike, or scooter)</List.Item>
              <List.Item>Background check clearance</List.Item>
              <List.Item>18+ years old</List.Item>
            </List>
          </div>

          <Alert color="blue" icon={<IconCheck size={16} />}>
            <Text size="sm">
              <strong>Important:</strong> Onboarding continues in your browser. 
              You'll be redirected to complete the application process. 
              Once you finish onboarding, you'll earn an additional $25 reward!
            </Text>
          </Alert>

          <Button
            onClick={handleStartOnboarding}
            loading={loading}
            fullWidth
            size="lg"
            leftSection={<IconExternalLink size={18} />}
          >
            Start Driver Onboarding
          </Button>

          <Text size="xs" c="dimmed" ta="center">
            You'll complete the application in your browser
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
};

export default TesterDriverInterest;
