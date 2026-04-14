// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Stack, Title, Text, Card, TextInput, Select, Button, Group, Alert,
} from '@mantine/core';
import { IconBuildingBank, IconCheck, IconArrowLeft, IconLock } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface DirectDepositFormProps {
  intakeId: string | null;
  appointmentId: string;
  executiveId: string;
  onComplete: () => void;
  onBack: () => void;
}

const DirectDepositForm: React.FC<DirectDepositFormProps> = ({
  intakeId, appointmentId, executiveId, onComplete, onBack,
}) => {
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState<string | null>(null);
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [existingRoutingLast4, setExistingRoutingLast4] = useState('');
  const [existingAccountLast4, setExistingAccountLast4] = useState('');

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
      setBankName(data.bank_name || '');
      setAccountType(data.account_type);
      setExistingRoutingLast4(data.routing_number_last4 || '');
      setExistingAccountLast4(data.account_number_last4 || '');
    }
  };

  const handleSave = async () => {
    if (!bankName || !accountType || !routingNumber || !accountNumber) {
      notifications.show({ title: 'Validation', message: 'Please complete all required fields.', color: 'red' });
      return;
    }
    if (routingNumber.length !== 9 || !/^\d{9}$/.test(routingNumber)) {
      notifications.show({ title: 'Validation', message: 'Routing number must be exactly 9 digits.', color: 'red' });
      return;
    }
    if (accountNumber !== confirmAccountNumber) {
      notifications.show({ title: 'Validation', message: 'Account numbers do not match.', color: 'red' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Only store last 4 digits
      const payload = {
        bank_name: bankName,
        account_type: accountType,
        routing_number_last4: routingNumber.slice(-4),
        account_number_last4: accountNumber.slice(-4),
        direct_deposit_complete: true,
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
        field_changed: 'direct_deposit',
        actor_user_id: user.id,
      });

      notifications.show({ title: 'Saved', message: 'Direct deposit information saved securely', color: 'green' });
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
      <Title order={3}><IconBuildingBank size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />Direct Deposit Setup</Title>
      <Text c="dimmed">Enter your banking details for payroll disbursement. Only the last 4 digits of account numbers are stored.</Text>

      {existingAccountLast4 && (
        <Alert icon={<IconLock size={16} />} color="green" variant="light">
          Previously saved: Account ending in ••••{existingAccountLast4}, Routing ending in ••••{existingRoutingLast4}
        </Alert>
      )}

      <Card padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <TextInput
            label="Bank Name"
            placeholder="e.g., Chase, Bank of America"
            value={bankName}
            onChange={(e) => setBankName(e.currentTarget.value)}
            required
          />

          <Select
            label="Account Type"
            placeholder="Select type"
            data={[
              { value: 'checking', label: 'Checking' },
              { value: 'savings', label: 'Savings' },
            ]}
            value={accountType}
            onChange={setAccountType}
            required
          />

          <TextInput
            label="Routing Number"
            placeholder="9-digit routing number"
            maxLength={9}
            value={routingNumber}
            onChange={(e) => setRoutingNumber(e.currentTarget.value.replace(/\D/g, '').slice(0, 9))}
            required
          />

          <TextInput
            label="Account Number"
            placeholder="Enter account number"
            type="password"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.currentTarget.value.replace(/\D/g, ''))}
            required
          />

          <TextInput
            label="Confirm Account Number"
            placeholder="Re-enter account number"
            type="password"
            value={confirmAccountNumber}
            onChange={(e) => setConfirmAccountNumber(e.currentTarget.value.replace(/\D/g, ''))}
            required
          />
        </Stack>
      </Card>

      <Alert icon={<IconLock size={16} />} color="blue" variant="light">
        <Text size="sm">Only the last 4 digits of your routing and account numbers are stored. Full numbers are never retained in our systems.</Text>
      </Alert>

      <Group justify="flex-end">
        <Button onClick={handleSave} loading={saving} leftSection={<IconCheck size={16} />} color="green" size="md">
          Save Direct Deposit
        </Button>
      </Group>
    </Stack>
  );
};

export default DirectDepositForm;