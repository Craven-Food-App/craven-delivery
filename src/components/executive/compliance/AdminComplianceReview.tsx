// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Stack, Title, Text, Card, Group, Badge, Button, Table,
  Alert, Textarea, Loader, Center,
} from '@mantine/core';
import { IconShieldCheck, IconCheck, IconX } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface AdminComplianceReviewProps {
  appointmentId: string;
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'gray',
  in_progress: 'blue',
  submitted: 'orange',
  review_pending: 'orange',
  approved: 'green',
  payroll_ready: 'green',
};

const AdminComplianceReview: React.FC<AdminComplianceReviewProps> = ({ appointmentId }) => {
  const [intake, setIntake] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    load();
  }, [appointmentId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: intakeData } = await supabase
        .from('executive_compliance_intake')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();
      setIntake(intakeData);
      setAdminNotes(intakeData?.admin_notes || '');

      if (intakeData) {
        const { data: docsData } = await supabase
          .from('executive_compliance_documents')
          .select('*')
          .eq('intake_id', intakeData.id)
          .order('created_at');
        setDocs(docsData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      await supabase.from('executive_compliance_intake').update({
        compliance_status: 'payroll_ready',
        reviewed_at: now,
        reviewed_by: user?.id,
        admin_notes: adminNotes,
      }).eq('id', intake.id);

      await supabase.from('executive_appointments').update({
        compliance_status: 'payroll_ready',
      }).eq('id', appointmentId);

      await supabase.from('executive_compliance_audit_log').insert({
        intake_id: intake.id,
        action: 'approved',
        actor_user_id: user?.id,
        metadata: { admin_notes: adminNotes },
      });

      notifications.show({ title: 'Approved', message: 'Executive marked as payroll ready.', color: 'green' });
      load();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!adminNotes.trim()) {
      notifications.show({ title: 'Required', message: 'Please add notes explaining what needs to be corrected.', color: 'red' });
      return;
    }
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('executive_compliance_intake').update({
        compliance_status: 'in_progress',
        admin_notes: adminNotes,
      }).eq('id', intake.id);

      await supabase.from('executive_appointments').update({
        compliance_status: 'in_progress',
      }).eq('id', appointmentId);

      await supabase.from('executive_compliance_audit_log').insert({
        intake_id: intake.id,
        action: 'rejected',
        actor_user_id: user?.id,
        metadata: { admin_notes: adminNotes },
      });

      notifications.show({ title: 'Returned', message: 'Compliance returned to executive for corrections.', color: 'orange' });
      load();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Center py="xl"><Loader /></Center>;

  if (!intake) {
    return (
      <Alert color="gray" variant="light">
        <Text size="sm">No compliance data submitted yet for this appointment.</Text>
      </Alert>
    );
  }

  const status = intake.compliance_status;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={4}><IconShieldCheck size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Compliance Review</Title>
        <Badge color={STATUS_COLORS[status] || 'gray'} size="lg">{status?.replace(/_/g, ' ').toUpperCase()}</Badge>
      </Group>

      <Card padding="md" radius="md" withBorder>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Section</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Details</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>Tax Setup</Table.Td>
              <Table.Td><Badge color={intake.tax_complete ? 'green' : 'red'} size="sm">{intake.tax_complete ? 'Complete' : 'Pending'}</Badge></Table.Td>
              <Table.Td>{intake.tax_filing_status || '—'} | {intake.tax_state || '—'} | SSN: •••{intake.ssn_last4 || '—'}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Eligibility</Table.Td>
              <Table.Td><Badge color={intake.eligibility_complete ? 'green' : 'red'} size="sm">{intake.eligibility_complete ? 'Complete' : 'Pending'}</Badge></Table.Td>
              <Table.Td>{intake.citizenship_status?.replace(/_/g, ' ') || '—'} | {intake.eligibility_document_type?.replace(/_/g, ' ') || '—'}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Direct Deposit</Table.Td>
              <Table.Td><Badge color={intake.direct_deposit_complete ? 'green' : 'red'} size="sm">{intake.direct_deposit_complete ? 'Complete' : 'Pending'}</Badge></Table.Td>
              <Table.Td>{intake.bank_name || '—'} | {intake.account_type || '—'} | ••••{intake.account_number_last4 || '—'}</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Card>

      {docs.length > 0 && (
        <Card padding="md" radius="md" withBorder>
          <Text fw={600} mb="sm">Signed Compliance Documents</Text>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Document</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Signed</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {docs.map((doc) => (
                <Table.Tr key={doc.id}>
                  <Table.Td>{doc.document_title}</Table.Td>
                  <Table.Td><Badge color={doc.status === 'signed' ? 'green' : 'gray'} size="sm">{doc.status}</Badge></Table.Td>
                  <Table.Td>{doc.signed_at ? new Date(doc.signed_at).toLocaleString() : '—'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <Card padding="md" radius="md" withBorder>
        <Textarea
          label="Admin Notes"
          placeholder="Add notes for the executive or internal records..."
          minRows={3}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.currentTarget.value)}
        />
      </Card>

      {(status === 'submitted' || status === 'review_pending') && (
        <Group justify="flex-end">
          <Button
            color="red"
            variant="outline"
            leftSection={<IconX size={16} />}
            onClick={handleReject}
            loading={processing}
          >
            Return for Corrections
          </Button>
          <Button
            color="green"
            leftSection={<IconCheck size={16} />}
            onClick={handleApprove}
            loading={processing}
          >
            Approve & Mark Payroll Ready
          </Button>
        </Group>
      )}
    </Stack>
  );
};

export default AdminComplianceReview;