// Customer Referral Form
// Share referral code and deep links

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
  TextInput,
  CopyButton,
  Tooltip,
  Badge,
  Alert,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconUsers,
  IconCopy,
  IconCheck,
  IconShare,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TesterInviteFriends: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadReferralCode();
  }, []);

  const loadReferralCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: enrollment } = await supabase
        .from('android_tester_enrollments')
        .select('referral_code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (enrollment?.referral_code) {
        setReferralCode(enrollment.referral_code);
      }
    } catch (error) {
      // Ignore
    }
  };

  const shareLink = referralCode ? `https://craven.app/r/${referralCode}` : '';

  const handleShare = async () => {
    if (!shareLink) {
      toast({
        title: 'Error',
        description: 'Referral code not available yet.',
        variant: 'destructive',
      });
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Crave\'n!',
          text: 'Get $25 off your first order with my referral code!',
          url: shareLink,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareLink);
      toast({
        title: 'Link Copied',
        description: 'Share this link with your friends!',
      });
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: 'Missing Email',
        description: 'Please enter an email address.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create referral record
      await supabase
        .from('tester_referrals')
        .insert({
          referrer_user_id: user.id,
          referral_type: 'customer',
          referred_email: email.trim(),
          status: 'invited',
        });

      toast({
        title: 'Invitation Sent',
        description: 'Your friend will receive an invitation to join!',
      });

      setEmail('');
    } catch (error: any) {
      console.error('Referral error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!referralCode) {
    return (
      <Stack gap="md" p="md">
        <Group>
          <ActionIcon variant="subtle" onClick={() => navigate('/tester-hub')}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={4}>Invite Friends</Title>
        </Group>

        <Card p="md" radius="md" withBorder>
          <Alert color="yellow">
            <Text size="sm">
              Your referral code will be available after you activate your enrollment.
            </Text>
          </Alert>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="md" p="md">
      <Group>
        <ActionIcon variant="subtle" onClick={() => navigate('/tester-hub')}>
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Title order={4}>Invite Friends</Title>
      </Group>

      <Card p="md" radius="md" withBorder>
        <Stack gap="md">
          <div>
            <Text size="sm" fw={600} mb="xs">Your Referral Code</Text>
            <Group>
              <Badge size="lg" variant="light" color="orange">
                {referralCode}
              </Badge>
              <CopyButton value={referralCode}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied!' : 'Copy code'}>
                    <ActionIcon color={copied ? 'green' : 'gray'} onClick={copy}>
                      {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </div>

          <div>
            <Text size="sm" fw={600} mb="xs">Share Link</Text>
            <Group>
              <TextInput
                value={shareLink}
                readOnly
                style={{ flex: 1 }}
                rightSection={
                  <CopyButton value={shareLink}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied!' : 'Copy link'}>
                        <ActionIcon color={copied ? 'green' : 'gray'} onClick={copy}>
                          {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                }
              />
              <Button
                leftSection={<IconShare size={18} />}
                onClick={handleShare}
              >
                Share
              </Button>
            </Group>
          </div>

          <Alert color="blue">
            <Text size="sm">
              Earn Tier C rewards when 2 friends create accounts using your referral code.
            </Text>
          </Alert>

          <form onSubmit={handleEmailSubmit}>
            <Stack gap="sm">
              <Text size="sm" fw={600}>Send Invitation by Email</Text>
              <Group>
                <TextInput
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button type="submit">Send</Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Card>
    </Stack>
  );
};

export default TesterInviteFriends;

