import React, { useState } from 'react';
import {
  Modal,
  Stack,
  Select,
  Textarea,
  Button,
  Group,
  Alert,
  Loader,
} from '@mantine/core';
import { IconCheck, IconX, IconMinus, IconAlertCircle } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface VotingWidgetProps {
  resolutionId: string;
  resolutionTitle: string;
  opened: boolean;
  onClose: () => void;
  onVoteSubmitted?: () => void;
}

export const VotingWidget: React.FC<VotingWidgetProps> = ({
  resolutionId,
  resolutionTitle,
  opened,
  onClose,
  onVoteSubmitted,
}) => {
  const [vote, setVote] = useState<string>('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!vote) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('governance-cast-vote', {
        body: {
          resolution_id: resolutionId,
          vote,
          comment: comment || null,
        },
      });

      console.log('Vote submission response:', { data, error });

      // Check for error first
      if (error) {
        console.error('Supabase function error object:', error);
        console.error('Error type:', typeof error);
        console.error('Error keys:', Object.keys(error || {}));
        
        // Try to extract error message from various possible formats
        let errorMessage = 'Failed to submit vote';
        
        // Check if error is a string
        if (typeof error === 'string') {
          errorMessage = error;
        } 
        // Check if error has a message property
        else if (error?.message) {
          errorMessage = error.message;
        } 
        // Check if error has an error property
        else if (error?.error) {
          errorMessage = typeof error.error === 'string' ? error.error : error.error.message || 'Unknown error';
        } 
        // Check if error has context with message
        else if (error?.context?.message) {
          errorMessage = error.context.message;
        } 
        // Check if data has error (sometimes error is in data when status is non-2xx)
        else if (data?.error) {
          errorMessage = typeof data.error === 'string' ? data.error : data.error.message || 'Unknown error';
        }
        // Check for details in error object
        else if (error?.details) {
          errorMessage = error.details;
        }
        // Last resort: stringify the error
        else {
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = 'Failed to submit vote. Please check the console for details.';
          }
        }
        
        console.error('Extracted error message:', errorMessage);
        throw new Error(errorMessage);
      }

      // Check if response has an error field (even if no error object)
      if (data?.error) {
        const errorMsg = typeof data.error === 'string' ? data.error : data.error.message || 'Vote submission failed';
        throw new Error(errorMsg);
      }

      // Check if response indicates success
      if (data?.success === false) {
        throw new Error(data.error || data.message || 'Vote submission failed');
      }

      // If we got here, the vote was successful
      notifications.show({
        title: 'Success',
        message: 'Your vote has been recorded',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setVote('');
      setComment('');
      onClose();
      if (onVoteSubmitted) onVoteSubmitted();
    } catch (error: any) {
      console.error('Vote submission catch block error:', error);
      console.error('Error type:', typeof error);
      console.error('Error stack:', error?.stack);
      
      // Extract error message from various possible formats
      let errorMessage = 'Failed to submit vote. Please try again.';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = typeof error.error === 'string' ? error.error : error.error.message || 'Unknown error';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.response?.error) {
        errorMessage = error.response.error;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.details) {
        errorMessage = error.details;
      } else {
        // Try to stringify for debugging
        try {
          const errorStr = JSON.stringify(error);
          if (errorStr !== '{}') {
            errorMessage = `Error: ${errorStr}`;
          }
        } catch {
          // If stringification fails, use default message
        }
      }
      
      console.error('Final error message to display:', errorMessage);
      
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getVoteIcon = () => {
    switch (vote) {
      case 'YES':
        return <IconCheck size={16} />;
      case 'NO':
        return <IconX size={16} />;
      case 'ABSTAIN':
        return <IconMinus size={16} />;
      default:
        return null;
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Vote on Resolution`}
      size="md"
    >
      <Stack gap="md">
        <Alert icon={<IconAlertCircle size={16} />} color="blue" title="Resolution">
          {resolutionTitle}
        </Alert>

        <Select
          label="Your Vote"
          placeholder="Select your vote"
          data={[
            { value: 'YES', label: 'Yes - Approve' },
            { value: 'NO', label: 'No - Reject' },
            { value: 'ABSTAIN', label: 'Abstain' },
          ]}
          value={vote}
          onChange={(value) => setVote(value || '')}
          required
        />

        <Textarea
          label="Comment (Optional)"
          placeholder="Add any comments about your vote..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          minRows={3}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!vote}
            leftSection={getVoteIcon()}
          >
            Submit Vote
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

