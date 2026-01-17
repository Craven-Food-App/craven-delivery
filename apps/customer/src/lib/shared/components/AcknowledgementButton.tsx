import React, { useState } from 'react';
import { Button, Modal, TextInput, Stack, Text, Group, Alert, Checkbox } from '@mantine/core';
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
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setName(user?.user_metadata?.full_name || '');
    setAgreed(false);
    setOpened(true);
  };

  const handleAcknowledge = async () => {
    if (!name.trim()) {
      notifications.show({
        title: 'Name Required',
        message: 'Please type your full legal name to acknowledge this document.',
        color: 'red',
      });
      return;
    }

    if (!agreed) {
      notifications.show({
        title: 'Agreement Required',
        message: 'Please check the box to confirm you have read and agree to the document.',
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

      // Get IP address
      const ipAddress = await fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => data.ip)
        .catch(() => 'unknown');
      
      const userAgent = navigator.userAgent;

      // Insert acknowledgment using type assertion for dynamic table name
      const tableName = `${role}_acknowledgments` as 'cfo_acknowledgments' | 'cto_acknowledgments' | 'cxo_acknowledgments';
      
      const { error } = await supabase
        .from(tableName)
        .insert({
          user_id: user.id,
          document_key: documentKey,
          typed_full_name: name.trim(),
          agreed_checkbox: true,
          signed_at: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
          version: '1.0',
        });

      if (error) throw error;

      notifications.show({
        title: 'Document Acknowledged',
        message: 'Your electronic signature has been recorded.',
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

  const canSubmit = name.trim().length > 0 && agreed;

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
        title="Electronic Signature & Acknowledgment"
        size="lg"
      >
        <Stack gap="md">
          <Alert color="blue" icon={<IconShieldCheck size={16} />}>
            <Text size="sm" fw={600} mb="xs">Legal Attestation</Text>
            <Text size="sm">
              By checking the box and typing your full legal name below, you hereby certify that:
            </Text>
            <Text size="xs" mt="xs" component="div">
              <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
                <li>You have read and understand this document in its entirety</li>
                <li>You agree to comply with all policies, requirements, and obligations set forth herein</li>
                <li>Your typed name constitutes your legally binding electronic signature</li>
                <li>You consent to the use of electronic records and signatures</li>
              </ol>
            </Text>
            <Text size="xs" c="dimmed" mt="xs" fs="italic">
              This acknowledgment is made pursuant to the U.S. Electronic Signatures in Global and National Commerce Act (E-SIGN) and applicable state law.
            </Text>
          </Alert>

          <Checkbox
            checked={agreed}
            onChange={(e) => setAgreed(e.currentTarget.checked)}
            label={
              <Text size="sm">
                I have read, understand, and agree to comply with all requirements in this document
              </Text>
            }
          />

          <TextInput
            label="Type Your Full Legal Name (Electronic Signature)"
            placeholder="Enter your full legal name exactly as it appears on official documents"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            description="Your typed name will serve as your legally binding electronic signature"
          />

          <Alert color="gray" variant="light">
            <Text size="xs" c="dimmed">
              <strong>Audit Trail:</strong> The following will be recorded with your signature:
            </Text>
            <Text size="xs" c="dimmed" component="div">
              • Timestamp of acknowledgment<br />
              • IP Address<br />
              • Browser/Device Information<br />
              • Document Version
            </Text>
          </Alert>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setOpened(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAcknowledge} 
              loading={loading}
              disabled={!canSubmit}
              leftSection={<IconShieldCheck size={16} />}
            >
              Sign & Acknowledge
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
