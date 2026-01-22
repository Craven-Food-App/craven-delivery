// Auto-trigger feedback prompt modal
// Triggered after account creation and first checkout

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  ActionIcon,
  Textarea,
} from '@mantine/core';
import {
  IconThumbUp,
  IconThumbDown,
  IconX,
} from '@tabler/icons-react';
import { useTesterFeedback } from '@/hooks/useTesterFeedback';
import { supabase } from '@/integrations/supabase/client';

interface TesterFeedbackPromptProps {
  promptKey: string;
  opened: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export const TesterFeedbackPrompt: React.FC<TesterFeedbackPromptProps> = ({
  promptKey,
  opened,
  onClose,
  title = 'Quick Feedback',
  description = 'How was your experience?',
}) => {
  const { submitFeedback } = useTesterFeedback();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check if already submitted
  useEffect(() => {
    if (opened) {
      const checkSubmitted = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data } = await supabase
            .from('tester_feedback_events')
            .select('id')
            .eq('user_id', user.id)
            .eq('prompt_key', promptKey)
            .maybeSingle();

          if (data) {
            // Already submitted, close
            onClose();
          }
        } catch (error) {
          // Ignore
        }
      };
      checkSubmitted();
    }
  }, [opened, promptKey, onClose]);

  const handleSubmit = async () => {
    if (!rating) return;

    setSubmitting(true);
    const success = await submitFeedback(promptKey, rating, comment || undefined);
    setSubmitting(false);

    if (success) {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleSkip}
      title={title}
      size="sm"
      closeOnClickOutside={false}
      closeOnEscape={true}
    >
      <Stack gap="md">
        <Text size="sm">{description}</Text>
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
          <Button variant="subtle" onClick={handleSkip}>
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            loading={submitting}
          >
            Submit
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

