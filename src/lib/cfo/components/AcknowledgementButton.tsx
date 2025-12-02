import React, { useState } from 'react';
import { Button, Modal, TextInput, Stack, Text, Group, Alert } from '@mantine/core';
import { IconCheck, IconShieldCheck } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface AcknowledgementButtonProps {
  documentKey: string;
  role: 'cfo' | 'cxo' | 'cto';
  isAcknowledged: boolean;
  onAcknowledge: () => void;
}

export const AcknowledgementButton: React.FC<AcknowledgementButtonProps> = ({
  documentKey,
  role,
  isAcknowledged,
  onAcknowledge,
}) => {
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpen = () => {
    const { data: { user } } = supabase.auth.getUser();
    // Pre-fill with user's name if available
    setName(user?.user_metadata?.full_name || '');
    setOpened(true);
  };

  const handleAcknowledge = async () => {
    if (!name.trim()) {
      notifications.show({
        title: 'Name Required',
        message: 'Please enter your full legal name to acknowledge this document.',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      // Get IP and user agent
      const ipAddress = await fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => data.ip)
        .catch(() => 'unknown');
      
      const userAgent = navigator.userAgent;

      // Insert acknowledgement
      const { error } = await supabase
        .from(`${role}_acknowledgments`)
        .insert({
          user_id: user.id,
          document_key: documentKey,
          signed_at: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
          version: '1.0',
        });

      if (error) throw error;

      notifications.show({
        title: 'Document Acknowledged',
        message: 'Your acknowledgment has been recorded.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setOpened(false);
      onAcknowledge();
    } catch (error: any) {
      console.error('Error acknowledging document:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to acknowledge document.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isAcknowledged) {
    return (
      <Button
        leftSection={<IconCheck size={16} />}
        color="green"
        variant="light"
        disabled
        fullWidth
      >
        Document Acknowledged
      </Button>
    );
  }

  return (
    <>
      <Button
        leftSection={<IconShieldCheck size={16} />}
        onClick={handleOpen}
        fullWidth
        size="lg"
      >
        Acknowledge & Sign Document
      </Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Acknowledge Document"
      >
        <Stack gap="md">
          <Alert color="blue" icon={<IconShieldCheck size={16} />}>
            <Text size="sm">
              By acknowledging this document, you confirm that you have read, understand, and agree to comply with all policies and requirements outlined in this document.
            </Text>
          </Alert>

          <TextInput
            label="Full Legal Name"
            placeholder="Enter your full legal name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Text size="xs" c="dimmed">
            Your acknowledgment will be logged with:
            <br />• Timestamp
            <br />• IP Address
            <br />• User Agent
            <br />• Document Version
          </Text>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleAcknowledge} loading={loading}>
              Confirm Acknowledgment
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

