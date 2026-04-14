// @ts-nocheck
import React, { useState, useRef } from 'react';
import {
  Stack, Title, Text, Card, Button, Group, Alert, TextInput, Checkbox,
} from '@mantine/core';
import { IconSignature, IconCheck, IconArrowLeft } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface ComplianceSignatureScreenProps {
  intakeId: string;
  appointmentId: string;
  executiveId: string;
  executiveName: string;
  onComplete: () => void;
  onBack: () => void;
}

const ComplianceSignatureScreen: React.FC<ComplianceSignatureScreenProps> = ({
  intakeId, appointmentId, executiveId, executiveName, onComplete, onBack,
}) => {
  const [typedName, setTypedName] = useState('');
  const [certify, setCertify] = useState(false);
  const [signing, setSigning] = useState(false);

  const handleSign = async () => {
    if (!typedName.trim()) {
      notifications.show({ title: 'Required', message: 'Please type your full legal name.', color: 'red' });
      return;
    }
    if (!certify) {
      notifications.show({ title: 'Required', message: 'Please certify the accuracy of your information.', color: 'red' });
      return;
    }

    setSigning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const signedAt = new Date().toISOString();

      // Generate compliance document records
      const complianceDocs = [
        { document_type: 'w4_summary', document_title: 'W-4 Tax Withholding Summary' },
        { document_type: 'i9_summary', document_title: 'I-9 Employment Eligibility Summary' },
        { document_type: 'direct_deposit_auth', document_title: 'Direct Deposit Authorization' },
        { document_type: 'compliance_acknowledgment', document_title: 'Compliance Certification & Acknowledgment' },
      ];

      for (const doc of complianceDocs) {
        await supabase.from('executive_compliance_documents').insert({
          intake_id: intakeId,
          appointment_id: appointmentId,
          executive_id: executiveId,
          document_type: doc.document_type,
          document_title: doc.document_title,
          status: 'signed',
          signed_at: signedAt,
          signed_by_user: user.id,
          signature_method: 'typed',
          locked_at: signedAt,
        });
      }

      // Update intake status
      await supabase.from('executive_compliance_intake').update({
        compliance_status: 'submitted',
        submitted_at: signedAt,
      }).eq('id', intakeId);

      // Update appointment compliance_status
      await supabase.from('executive_appointments').update({
        compliance_status: 'review_pending',
      }).eq('id', appointmentId);

      // Audit log
      await supabase.from('executive_compliance_audit_log').insert({
        intake_id: intakeId,
        action: 'signed',
        field_changed: 'all_compliance_documents',
        actor_user_id: user.id,
        metadata: { typed_name: typedName, documents_signed: complianceDocs.length },
      });

      notifications.show({ title: 'Signed', message: 'Compliance records signed and submitted for admin review.', color: 'green' });
      onComplete();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSigning(false);
    }
  };

  return (
    <Stack gap="lg">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>Back</Button>
      </Group>
      <Title order={3}><IconSignature size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />Sign Compliance Records</Title>
      <Text c="dimmed">Sign all compliance documents to submit for admin review.</Text>

      <Card padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Text size="sm" fw={500}>The following documents will be signed:</Text>
          <Stack gap="xs">
            {['W-4 Tax Withholding Summary', 'I-9 Employment Eligibility Summary', 'Direct Deposit Authorization', 'Compliance Certification & Acknowledgment'].map((doc) => (
              <Group key={doc} gap="xs">
                <IconCheck size={14} color="var(--mantine-color-green-6)" />
                <Text size="sm">{doc}</Text>
              </Group>
            ))}
          </Stack>
        </Stack>
      </Card>

      <Card padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <TextInput
            label="Type Your Full Legal Name"
            description={`Expected: ${executiveName}`}
            placeholder="Your full legal name"
            value={typedName}
            onChange={(e) => setTypedName(e.currentTarget.value)}
            required
            size="lg"
            styles={{ input: { fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize: '1.5rem' } }}
          />

          <Checkbox
            label="I certify that all information provided is true, complete, and accurate. I understand that false statements may result in disciplinary action, termination, and/or legal consequences."
            checked={certify}
            onChange={(e) => setCertify(e.currentTarget.checked)}
          />
        </Stack>
      </Card>

      <Alert color="orange" variant="light">
        <Text size="sm">Once signed, these records will be locked and submitted for administrative review. You will not be able to modify your submissions after signing.</Text>
      </Alert>

      <Group justify="flex-end">
        <Button
          size="lg"
          color="green"
          leftSection={<IconSignature size={20} />}
          onClick={handleSign}
          loading={signing}
          disabled={!typedName.trim() || !certify}
        >
          Sign & Submit
        </Button>
      </Group>
    </Stack>
  );
};

export default ComplianceSignatureScreen;