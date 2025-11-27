import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Badge,
  Stack,
  Group,
  Text,
  Checkbox,
  Textarea,
  Modal,
  Loader,
  Alert,
  ScrollArea,
  Paper,
} from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconFileText, IconUserCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';

interface ValidationAppointment {
  id: string;
  proposed_officer_name: string;
  proposed_officer_email: string;
  proposed_title: string;
  effective_date: string;
  board_resolution_id?: string;
  documents: Array<{
    id: string;
    type: string;
    signature_status: string;
    signed_at: string;
    file_url: string;
  }>;
}

const getDocumentTypeName = (type: string) => {
  const names: Record<string, string> = {
    pre_incorporation_consent: 'Pre-Incorporation Consent',
    appointment_letter: 'Appointment Letter',
    board_resolution: 'Board Resolution',
    certificate: 'Stock Certificate',
    employment_agreement: 'Employment Agreement',
    confidentiality_ip: 'Confidentiality & IP',
    stock_subscription: 'Stock Subscription',
    deferred_compensation: 'Deferred Compensation',
    bylaws_acknowledgment: 'Bylaws Acknowledgment',
    conflict_of_interest: 'Conflict of Interest',
  };
  return names[type] || type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const OfficerValidation: React.FC = () => {
  const [appointments, setAppointments] = useState<ValidationAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<ValidationAppointment | null>(null);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationChecks, setValidationChecks] = useState({
    identityVerified: false,
    backgroundCheck: false,
    boardApproved: false,
    documentsComplete: false,
  });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchPendingValidations();
  }, []);

  const fetchPendingValidations = async () => {
    setLoading(true);
    try {
      // Fetch appointments ready for validation (authorized to offer by board)
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('executive_appointments')
        .select('*')
        .eq('status', 'authorized_to_offer')
        .order('created_at', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Fetch documents for each appointment
      const appointmentsWithDocs = await Promise.all(
        (appointmentsData || []).map(async (appointment) => {
          const { data: documents } = await supabase
            .from('executive_documents')
            .select('*')
            .eq('appointment_id', appointment.id)
            .order('created_at', { ascending: true });

          return {
            ...appointment,
            documents: documents || [],
          };
        })
      );

      setAppointments(appointmentsWithDocs);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load appointments',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateAndApprove = async () => {
    if (!selectedAppointment) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      notifications.show({
        title: 'Error',
        message: 'You must be logged in',
        color: 'red',
      });
      return;
    }

    setValidating(true);
    try {
      // Update appointment status
      const { error: updateError } = await supabase
        .from('executive_appointments')
        .update({
          status: 'SECRETARY_APPROVED',
          secretary_approved_at: new Date().toISOString(),
          secretary_approved_by: user.id,
        })
        .eq('id', selectedAppointment.id);

      if (updateError) throw updateError;

      // Create governance log entry
      await supabase.from('governance_logs').insert({
        action: 'OFFICER_VALIDATED',
        actor_id: user.id,
        entity_type: 'APPOINTMENT',
        entity_id: selectedAppointment.id,
        description: `Corporate Secretary validated appointment for ${selectedAppointment.proposed_officer_name}`,
        data: {
          validation_checks: validationChecks,
          notes,
          officer_name: selectedAppointment.proposed_officer_name,
          title: selectedAppointment.proposed_title,
        },
      });

      // Log timeline event
      await supabase.from('officer_activation_timeline').insert({
        appointment_id: selectedAppointment.id,
        event_type: 'SECRETARY_VALIDATED',
        event_description: 'Corporate Secretary validated and approved executive appointment',
        performed_by: user.id,
        metadata: {
          validation_checks: validationChecks,
          notes,
        },
      });

      // Trigger activation workflow (edge function)
      const { error: activationError } = await supabase.functions.invoke('activate-executive-officer', {
        body: { appointment_id: selectedAppointment.id },
      });

      if (activationError) {
        console.error('Activation workflow error:', activationError);
        // Don't fail the validation if activation fails - it can be retried
        notifications.show({
          title: 'Warning',
          message: 'Officer validated but activation workflow may need manual retry',
          color: 'yellow',
        });
      } else {
        notifications.show({
          title: 'Success',
          message: 'Officer validated and activation workflow started',
          color: 'green',
        });
      }

      setValidationModalOpen(false);
      setSelectedAppointment(null);
      setValidationChecks({
        identityVerified: false,
        backgroundCheck: false,
        boardApproved: false,
        documentsComplete: false,
      });
      setNotes('');
      fetchPendingValidations();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to validate officer',
        color: 'red',
      });
    } finally {
      setValidating(false);
    }
  };

  const openValidationModal = (appointment: ValidationAppointment) => {
    setSelectedAppointment(appointment);
    // Auto-check documents complete if all are signed
    const allSigned = appointment.documents.every((d) => d.signature_status === 'signed');
    setValidationChecks({
      identityVerified: false,
      backgroundCheck: false,
      boardApproved: false,
      documentsComplete: allSigned,
    });
    setNotes('');
    setValidationModalOpen(true);
  };

  if (loading) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Loader size="lg" />
        <Text c="dimmed">Loading pending validations...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Card>
        <Group justify="space-between" mb="md">
          <div>
            <Text size="lg" fw={600}>
              Officer Validation Queue
            </Text>
            <Text size="sm" c="dimmed">
              Review and validate executives who have completed document signing
            </Text>
          </div>
          <Badge size="lg" color="orange">
            {appointments.length} Pending
          </Badge>
        </Group>

        {appointments.length === 0 ? (
          <Alert color="blue" icon={<IconCheck size={16} />}>
            No appointments pending validation. All executives have been processed.
          </Alert>
        ) : (
          <ScrollArea>
            <Table>
              <thead>
                <tr>
                  <th>Officer Name</th>
                  <th>Title</th>
                  <th>Email</th>
                  <th>Documents</th>
                  <th>Effective Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => {
                  const signedCount = appointment.documents.filter((d) => d.signature_status === 'signed').length;
                  const totalDocs = appointment.documents.length;
                  return (
                    <tr key={appointment.id}>
                      <td>
                        <Text fw={500}>{appointment.proposed_officer_name}</Text>
                      </td>
                      <td>{appointment.proposed_title}</td>
                      <td>
                        <Text size="sm" c="dimmed">
                          {appointment.proposed_officer_email || 'N/A'}
                        </Text>
                      </td>
                      <td>
                        <Badge color={signedCount === totalDocs ? 'green' : 'orange'}>
                          {signedCount} / {totalDocs} signed
                        </Badge>
                      </td>
                      <td>
                        {dayjs(appointment.effective_date).format('MMM D, YYYY')}
                      </td>
                      <td>
                        <Button
                          size="xs"
                          leftSection={<IconUserCheck size={16} />}
                          onClick={() => openValidationModal(appointment)}
                        >
                          Validate & Approve
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      <Modal
        opened={validationModalOpen}
        onClose={() => {
          if (!validating) {
            setValidationModalOpen(false);
            setSelectedAppointment(null);
          }
        }}
        title="Validate & Approve Executive"
        size="lg"
        closeOnClickOutside={!validating}
        closeOnEscape={!validating}
      >
        {selectedAppointment && (
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Text fw={600} size="lg" mb="xs">
                {selectedAppointment.proposed_officer_name}
              </Text>
              <Text size="sm" c="dimmed">
                Title: {selectedAppointment.proposed_title}
              </Text>
              <Text size="sm" c="dimmed">
                Email: {selectedAppointment.proposed_officer_email || 'N/A'}
              </Text>
              <Text size="sm" c="dimmed">
                Effective Date: {dayjs(selectedAppointment.effective_date).format('MMMM D, YYYY')}
              </Text>
            </Paper>

            <div>
              <Text fw={500} mb="xs">
                Signed Documents:
              </Text>
              <ScrollArea h={200}>
                <Stack gap="xs">
                  {selectedAppointment.documents.length === 0 ? (
                    <Text size="sm" c="dimmed">No documents found</Text>
                  ) : (
                    selectedAppointment.documents.map((doc) => (
                      <Group key={doc.id} justify="space-between">
                        <Group gap="xs">
                          <IconFileText size={16} />
                          <Text size="sm">{getDocumentTypeName(doc.type)}</Text>
                        </Group>
                        <Badge
                          color={doc.signature_status === 'signed' ? 'green' : 'red'}
                          size="sm"
                        >
                          {doc.signature_status}
                        </Badge>
                      </Group>
                    ))
                  )}
                </Stack>
              </ScrollArea>
            </div>

            <div>
              <Text fw={500} mb="xs">
                Validation Checklist:
              </Text>
              <Stack gap="xs">
                <Checkbox
                  label="Identity Verified"
                  checked={validationChecks.identityVerified}
                  onChange={(e) =>
                    setValidationChecks({ ...validationChecks, identityVerified: e.currentTarget.checked })
                  }
                  disabled={validating}
                />
                <Checkbox
                  label="Background Check Complete"
                  checked={validationChecks.backgroundCheck}
                  onChange={(e) =>
                    setValidationChecks({ ...validationChecks, backgroundCheck: e.currentTarget.checked })
                  }
                  disabled={validating}
                />
                <Checkbox
                  label="Board Approval Confirmed"
                  checked={validationChecks.boardApproved}
                  onChange={(e) =>
                    setValidationChecks({ ...validationChecks, boardApproved: e.currentTarget.checked })
                  }
                  disabled={validating}
                />
                <Checkbox
                  label="All Documents Complete"
                  checked={validationChecks.documentsComplete}
                  onChange={(e) =>
                    setValidationChecks({ ...validationChecks, documentsComplete: e.currentTarget.checked })
                  }
                  disabled={validating}
                />
              </Stack>
            </div>

            <Textarea
              label="Notes"
              placeholder="Additional notes or comments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={validating}
              minRows={3}
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="light"
                onClick={() => {
                  setValidationModalOpen(false);
                  setSelectedAppointment(null);
                }}
                disabled={validating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleValidateAndApprove}
                disabled={
                  validating ||
                  !validationChecks.identityVerified ||
                  !validationChecks.backgroundCheck ||
                  !validationChecks.boardApproved ||
                  !validationChecks.documentsComplete
                }
                loading={validating}
                leftSection={<IconUserCheck size={16} />}
              >
                {validating ? 'Validating...' : 'Validate & Approve'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default OfficerValidation;

