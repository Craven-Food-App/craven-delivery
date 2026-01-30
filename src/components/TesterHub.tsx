// @ts-nocheck
// Tester Hub - Main UI for tester enrollment progress

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Stack,
  Group,
  Text,
  Title,
  Button,
  Progress,
  Badge,
  Modal,
  Rating,
  Textarea,
  ActionIcon,
  Alert,
  Divider,
} from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconClock,
  IconMessageCircle,
  IconUsers,
  IconTruck,
  IconBuildingStore,
  IconGift,
  IconThumbUp,
  IconThumbDown,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useTesterFeedback } from '@/hooks/useTesterFeedback';
import { useToast } from '@/hooks/use-toast';

const TesterHub: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { submitFeedback } = useTesterFeedback();
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadProgress();
    // Refresh every 30 seconds
    const interval = setInterval(loadProgress, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_tester_progress', {
        p_user_id: user.id,
      });

      if (error) throw error;
      setProgress(data);

      // Check driver onboarding completion if referral exists and not completed
      if (data?.tiers?.tier_c?.referral_stats?.driver_completed === false) {
        // Check if driver onboarding is completed
        const { data: completion, error: completionError } = await supabase.functions.invoke(
          'check-driver-onboarding-completion',
          { body: { user_id: user.id } }
        );

        if (!completionError && completion?.completed) {
          // Reload progress to show updated status
          const { data: updatedProgress, error: updatedError } = await supabase.rpc('get_tester_progress', {
            p_user_id: user.id,
          });

          if (!updatedError && updatedProgress) {
            setProgress(updatedProgress);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('tester-evaluate-and-issue', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      if (data?.issued_tiers?.length > 0) {
        toast({
          title: 'Reward Issued!',
          description: `You've earned $${(data.total_issued_cents / 100).toFixed(2)} in rewards!`,
        });
      }

      await loadProgress();
    } catch (error: any) {
      console.error('Evaluation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to evaluate progress',
        variant: 'destructive',
      });
    }
  };

  const openFeedbackModal = (promptKey: string) => {
    setCurrentPrompt(promptKey);
    setRating(null);
    setComment('');
    setFeedbackModalOpen(true);
  };

  const handleFeedbackSubmit = async () => {
    if (!currentPrompt) return;

    const success = await submitFeedback(currentPrompt, rating || undefined, comment || undefined);
    if (success) {
      setFeedbackModalOpen(false);
      await loadProgress();
      await handleEvaluate();
    }
  };

  if (loading || !progress) {
    return (
      <Card p="md" radius="md" withBorder>
        <Text c="dimmed">Loading...</Text>
      </Card>
    );
  }

  if (progress.error === 'not_enrolled') {
    return (
      <Card p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Title order={4}>Not Enrolled</Title>
          <Text size="sm" c="dimmed">
            You're not enrolled in the Android Early Access program.
          </Text>
          <Button
            size="sm"
            onClick={() => navigate('/android-tester-enrollment')}
          >
            Enroll Now
          </Button>
        </Stack>
      </Card>
    );
  }

  const { enrollment, progress: prog, tiers } = progress;
  const daysRemaining = prog.days_remaining;
  const deadlinePassed = prog.deadline_passed;

  return (
    <Stack gap="sm">
      {/* Status Card */}
      <Card p="sm" radius="md" withBorder>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text fw={600} size="sm">Status</Text>
            <Badge
              color={
                enrollment.status === 'issued' ? 'green' :
                enrollment.status === 'eligible' ? 'blue' :
                enrollment.status === 'activated' ? 'orange' : 'gray'
              }
              size="sm"
            >
              {enrollment.status.toUpperCase()}
            </Badge>
          </Group>
          {enrollment.deadline_at && (
            <Group gap="xs">
              <IconClock size={14} />
              <Text size="xs" c={deadlinePassed ? 'red' : 'dimmed'}>
                {deadlinePassed
                  ? 'Deadline passed'
                  : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
              </Text>
            </Group>
          )}
        </Stack>
      </Card>

      {/* Tier A Progress */}
      <Card p="sm" radius="md" withBorder>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text fw={600} size="sm">Tier A: Base Reward</Text>
            {tiers.tier_a.issued ? (
              <Badge color="green" size="sm">$25 Issued</Badge>
            ) : tiers.tier_a.eligible ? (
              <Badge color="blue" size="sm">Eligible</Badge>
            ) : null}
          </Group>
          <Progress
            value={(prog.activity_days / 3) * 50 + (prog.feedback_count / 2) * 50}
            size="sm"
            radius="md"
          />
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Active Days</Text>
              <Text size="xs" fw={500}>
                {prog.activity_days} / 3
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Feedback</Text>
              <Text size="xs" fw={500}>
                {prog.feedback_count} / 2
              </Text>
            </Group>
          </Stack>
          {tiers.tier_a.eligible && !tiers.tier_a.issued && (
            <Button size="xs" onClick={handleEvaluate}>
              Claim $25 Reward
            </Button>
          )}
        </Stack>
      </Card>

      {/* Tier B */}
      {tiers.tier_a.issued && (
        <Card p="sm" radius="md" withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600} size="sm">Tier B: Selected Tester</Text>
              {tiers.tier_b.issued ? (
                <Badge color="green" size="sm">$50 Issued</Badge>
              ) : tiers.tier_b.eligible ? (
                <Badge color="blue" size="sm">Eligible</Badge>
              ) : (
                <Badge color="gray" size="sm">
                  {enrollment.is_selected_tester ? 'Pending' : 'Not Selected'}
                </Badge>
              )}
            </Group>
            {tiers.tier_b.eligible && !tiers.tier_b.issued && (
              <Button size="xs" onClick={handleEvaluate}>
                Claim $50 Bonus
              </Button>
            )}
          </Stack>
        </Card>
      )}

      {/* Tier C */}
      {tiers.tier_a.issued && (
        <Card p="sm" radius="md" withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600} size="sm">Tier C: Ecosystem Multiplier</Text>
              {tiers.tier_c.issued ? (
                <Badge color="green" size="sm">$25 Issued</Badge>
              ) : tiers.tier_c.eligible ? (
                <Badge color="blue" size="sm">Eligible</Badge>
              ) : null}
            </Group>
            {tiers.tier_c.referral_stats && (
              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Driver Referral</Text>
                  {tiers.tier_c.referral_stats.driver_completed ? (
                    <Group gap={4}>
                      <IconCheck size={14} color="green" />
                      <Text size="xs" c="green">Completed</Text>
                    </Group>
                  ) : (
                    <Group gap={4}>
                      <Text size="xs" c="dimmed">Not Started</Text>
                    </Group>
                  )}
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Merchant Referral</Text>
                  {tiers.tier_c.referral_stats.merchant_completed ? (
                    <Group gap={4}>
                      <IconCheck size={14} color="green" />
                      <Text size="xs" c="green">Completed</Text>
                    </Group>
                  ) : (
                    <IconX size={14} color="gray" />
                  )}
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Customer Referrals</Text>
                  <Text size="xs" fw={500}>
                    {tiers.tier_c.referral_stats.customer_count} / 2
                  </Text>
                </Group>
              </Stack>
            )}
            {tiers.tier_c.eligible && !tiers.tier_c.issued && (
              <Button size="xs" onClick={handleEvaluate}>
                Claim $25 Bonus
              </Button>
            )}
          </Stack>
        </Card>
      )}

      {/* Action Buttons */}
      <Card p="sm" radius="md" withBorder>
        <Stack gap="xs">
          <Text fw={600} size="sm">Quick Actions</Text>
          <Group grow>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconMessageCircle size={14} />}
              onClick={() => openFeedbackModal('manual_feedback')}
            >
              Give Feedback
            </Button>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconBuildingStore size={14} />}
              onClick={() => navigate('/tester/refer-merchant')}
            >
              Refer Merchant
            </Button>
          </Group>
          <Group grow>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconTruck size={14} />}
              onClick={() => navigate('/tester/driver-interest')}
            >
              Driver Interest
            </Button>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconUsers size={14} />}
              onClick={() => navigate('/tester/invite-friends')}
            >
              Invite Friends
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* Referral Code */}
      {enrollment.referral_code && (
        <Card p="sm" radius="md" withBorder>
          <Stack gap="xs">
            <Text fw={600} size="sm">Your Referral Code</Text>
            <Text size="lg" fw={700} ta="center" c="orange">
              {enrollment.referral_code}
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              Share this code with friends to earn Tier C rewards
            </Text>
          </Stack>
        </Card>
      )}

      {/* Feedback Modal */}
      <Modal
        opened={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        title="Quick Feedback"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">How was your experience?</Text>
          <Group justify="center">
            <ActionIcon
              size="xl"
              variant={rating === 1 ? 'filled' : 'light'}
              color={rating === 1 ? 'red' : 'gray'}
              onClick={() => setRating(1)}
            >
              <IconThumbDown size={24} />
            </ActionIcon>
            <ActionIcon
              size="xl"
              variant={rating === 5 ? 'filled' : 'light'}
              color={rating === 5 ? 'green' : 'gray'}
              onClick={() => setRating(5)}
            >
              <IconThumbUp size={24} />
            </ActionIcon>
          </Group>
          <Textarea
            placeholder="Optional comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setFeedbackModalOpen(false)}>
              Skip
            </Button>
            <Button onClick={handleFeedbackSubmit} disabled={!rating}>
              Submit
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default TesterHub;

