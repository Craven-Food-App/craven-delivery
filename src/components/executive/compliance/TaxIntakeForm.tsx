// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Stack, Title, Text, Card, Select, NumberInput, TextInput,
  Button, Group, Alert, Divider,
} from '@mantine/core';
import { IconReceipt, IconCheck, IconArrowLeft } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
].map(s => ({ value: s, label: s }));

const FILING_STATUSES = [
  { value: 'single', label: 'Single' },
  { value: 'married_jointly', label: 'Married Filing Jointly' },
  { value: 'married_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
];

interface TaxIntakeFormProps {
  intakeId: string | null;
  appointmentId: string;
  executiveId: string;
  onComplete: () => void;
  onBack: () => void;
}

const TaxIntakeForm: React.FC<TaxIntakeFormProps> = ({
  intakeId, appointmentId, executiveId, onComplete, onBack,
}) => {
  const [filingStatus, setFilingStatus] = useState<string | null>(null);
  const [taxState, setTaxState] = useState<string | null>(null);
  const [federalAllowances, setFederalAllowances] = useState<number>(0);
  const [stateAllowances, setStateAllowances] = useState<number>(0);
  const [additionalWithholding, setAdditionalWithholding] = useState<number>(0);
  const [ssnLast4, setSsnLast4] = useState('');
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
      setFilingStatus(data.tax_filing_status);
      setTaxState(data.tax_state);
      setFederalAllowances(data.federal_allowances || 0);
      setStateAllowances(data.state_allowances || 0);
      setAdditionalWithholding(Number(data.additional_withholding) || 0);
      setSsnLast4(data.ssn_last4 || '');
    }
  };

  const handleSave = async () => {
    if (!filingStatus || !taxState || !ssnLast4 || ssnLast4.length !== 4) {
      notifications.show({ title: 'Validation', message: 'Please complete all required fields. SSN must be exactly 4 digits.', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        tax_filing_status: filingStatus,
        tax_state: taxState,
        federal_allowances: federalAllowances,
        state_allowances: stateAllowances,
        additional_withholding: additionalWithholding,
        ssn_last4: ssnLast4,
        tax_complete: true,
        compliance_status: 'in_progress',
        updated_at: new Date().toISOString(),
      };

      if (intakeId) {
        const { error } = await supabase
          .from('executive_compliance_intake')
          .update(payload)
          .eq('id', intakeId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('executive_compliance_intake')
          .insert({
            ...payload,
            executive_id: executiveId,
            appointment_id: appointmentId,
            user_id: user.id,
          });
        if (error) throw error;
      }

      // Audit log
      await supabase.from('executive_compliance_audit_log').insert({
        intake_id: intakeId,
        action: 'updated',
        field_changed: 'tax_information',
        actor_user_id: user.id,
      });

      notifications.show({ title: 'Saved', message: 'Tax information saved successfully', color: 'green' });
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
      <Title order={3}><IconReceipt size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />Identity & Tax Setup</Title>
      <Text c="dimmed">Complete your federal and state tax withholding elections. This information is equivalent to a W-4 form.</Text>

      <Card padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <TextInput
            label="SSN (Last 4 Digits Only)"
            description="Only the last 4 digits are stored for verification. Full SSN is never retained."
            placeholder="1234"
            maxLength={4}
            value={ssnLast4}
            onChange={(e) => setSsnLast4(e.currentTarget.value.replace(/\D/g, '').slice(0, 4))}
            required
          />

          <Divider label="Federal Tax" />

          <Select
            label="Filing Status"
            placeholder="Select filing status"
            data={FILING_STATUSES}
            value={filingStatus}
            onChange={setFilingStatus}
            required
          />

          <NumberInput
            label="Federal Allowances"
            description="Number of allowances claimed on W-4"
            min={0} max={15}
            value={federalAllowances}
            onChange={(v) => setFederalAllowances(Number(v) || 0)}
          />

          <NumberInput
            label="Additional Federal Withholding"
            description="Extra amount to withhold per pay period"
            min={0} decimalScale={2} prefix="$"
            value={additionalWithholding}
            onChange={(v) => setAdditionalWithholding(Number(v) || 0)}
          />

          <Divider label="State Tax" />

          <Select
            label="State of Residence"
            placeholder="Select state"
            data={US_STATES}
            value={taxState}
            onChange={setTaxState}
            searchable
            required
          />

          <NumberInput
            label="State Allowances"
            min={0} max={15}
            value={stateAllowances}
            onChange={(v) => setStateAllowances(Number(v) || 0)}
          />
        </Stack>
      </Card>

      <Alert color="blue" variant="light">
        <Text size="sm">Your data is securely stored. Only the last 4 digits of your SSN are retained. Full details are processed server-side only.</Text>
      </Alert>

      <Group justify="flex-end">
        <Button onClick={handleSave} loading={saving} leftSection={<IconCheck size={16} />} color="green" size="md">
          Save Tax Information
        </Button>
      </Group>
    </Stack>
  );
};

export default TaxIntakeForm;