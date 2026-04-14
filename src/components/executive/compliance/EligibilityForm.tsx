// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Stack, Title, Text, Card, Select, Button, Group, Alert,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconId, IconCheck, IconArrowLeft } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

const CITIZENSHIP_OPTIONS = [
  { value: 'us_citizen', label: 'U.S. Citizen' },
  { value: 'permanent_resident', label: 'Lawful Permanent Resident (Green Card)' },
  { value: 'work_visa', label: 'Work Visa Holder (H-1B, L-1, etc.)' },
  { value: 'other', label: 'Other Work Authorization' },
];

const DOCUMENT_TYPES = [
  { value: 'us_passport', label: 'U.S. Passport' },
  { value: 'passport_card', label: 'U.S. Passport Card' },
  { value: 'permanent_resident_card', label: 'Permanent Resident Card (Green Card)' },
  { value: 'drivers_license_sscard', label: "Driver's License + Social Security Card" },
  { value: 'state_id_sscard', label: 'State ID + Social Security Card' },
  { value: 'employment_auth_doc', label: 'Employment Authorization Document (EAD)' },
  { value: 'foreign_passport_i94', label: 'Foreign Passport with I-94' },
];

interface EligibilityFormProps {
  intakeId: string | null;
  appointmentId: string;
  executiveId: string;
  onComplete: () => void;
  onBack: () => void;
}

const EligibilityForm: React.FC<EligibilityFormProps> = ({
  intakeId, appointmentId, executiveId, onComplete, onBack,
}) => {
  const [citizenshipStatus, setCitizenshipStatus] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [workAuthExpiry, setWorkAuthExpiry] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (intakeId) loadExisting();
  }, [intakeId]);

  const loadExisting = async () => {
    if (!intakeId) return;
    const { data } = await supabase
      .from('executive_compliance_intake')
      .select('*')
      .eq('id', intakeId)
      .maybeSingle();
    if (data) {
      setCitizenshipStatus(data.citizenship_status);
      setDocumentType(data.eligibility_document_type);
      if (data.work_authorization_expiry) setWorkAuthExpiry(new Date(data.work_authorization_expiry));
    }
  };

  const needsExpiry = citizenshipStatus === 'work_visa' || citizenshipStatus === 'other';

  const handleSave = async () => {
    if (!citizenshipStatus || !documentType) {
      notifications.show({ title: 'Validation', message: 'Please complete all required fields.', color: 'red' });
      return;
    }
    if (needsExpiry && !workAuthExpiry) {
      notifications.show({ title: 'Validation', message: 'Work authorization expiry date is required.', color: 'red' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        citizenship_status: citizenshipStatus,
        eligibility_document_type: documentType,
        work_authorization_expiry: needsExpiry && workAuthExpiry ? workAuthExpiry.toISOString().split('T')[0] : null,
        eligibility_complete: true,
        compliance_status: 'in_progress',
      };

      if (intakeId) {
        const { error } = await supabase.from('executive_compliance_intake').update(payload).eq('id', intakeId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('executive_compliance_intake').insert({
          ...payload,
          executive_id: executiveId,
          appointment_id: appointmentId,
          user_id: user.id,
        });
        if (error) throw error;
      }

      await supabase.from('executive_compliance_audit_log').insert({
        intake_id: intakeId,
        action: 'updated',
        field_changed: 'eligibility_information',
        actor_user_id: user.id,
      });

      notifications.show({ title: 'Saved', message: 'Eligibility information saved', color: 'green' });
      onComplete();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="lg">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>Back</Button>
      </Group>
      <Title order={3}><IconId size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />Work Eligibility</Title>
      <Text c="dimmed">Verify your employment eligibility status. This is equivalent to Section 1 of the I-9 form.</Text>

      <Card padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Select
            label="Citizenship / Immigration Status"
            placeholder="Select status"
            data={CITIZENSHIP_OPTIONS}
            value={citizenshipStatus}
            onChange={setCitizenshipStatus}
            required
          />

          <Select
            label="Identity Document Type"
            description="Select the document(s) you will use to verify identity and work authorization"
            placeholder="Select document type"
            data={DOCUMENT_TYPES}
            value={documentType}
            onChange={setDocumentType}
            required
          />

          {needsExpiry && (
            <DateInput
              label="Work Authorization Expiry Date"
              placeholder="Select date"
              value={workAuthExpiry}
              onChange={setWorkAuthExpiry}
              minDate={new Date()}
              required
            />
          )}
        </Stack>
      </Card>

      <Alert color="blue" variant="light">
        <Text size="sm">This information is used for employment eligibility verification purposes only and is stored securely.</Text>
      </Alert>

      <Group justify="flex-end">
        <Button onClick={handleSave} loading={saving} leftSection={<IconCheck size={16} />} color="green" size="md">
          Save Eligibility Information
        </Button>
      </Group>
    </Stack>
  );
};

export default EligibilityForm;