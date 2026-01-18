import React, { useState, useEffect } from 'react';
import {
  Select,
  Checkbox,
  Textarea,
  Group,
  Stack,
  Alert,
  Grid,
  Badge,
  Divider,
  Paper,
  Text,
  Table,
  Button,
  ScrollArea,
  Modal,
} from '@mantine/core';
import { IconChecklist, IconFileText, IconCheck, IconX, IconEye } from '@tabler/icons-react';
import { WizardLayout, WizardStep } from './shared/WizardLayout';
import { useWizard } from './shared/useWizard';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
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

const OfficerValidationWizard: React.FC = () => {
  const [appointments, setAppointments] = useState<ValidationAppointment[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<ValidationAppointment | null>(null);
  const [validationChecks, setValidationChecks] = useState({
    identityVerified: false,
    backgroundCheck: false,
    boardApproved: false,
    documentsComplete: false,
  });
  const [notes, setNotes] = useState('');
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ url: string; type: string } | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    if (selectedAppointmentId) {
      const appointment = appointments.find(apt => apt.id === selectedAppointmentId);
      setSelectedAppointment(appointment || null);
      
      // Auto-check documents complete if all are signed
      if (appointment) {
        const allSigned = appointment.documents.every(doc => doc.signature_status === 'signed');
        setValidationChecks(prev => ({ ...prev, documentsComplete: allSigned }));
      }
    }
  }, [selectedAppointmentId, appointments]);

  const loadAppointments = async () => {
    try {
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('executive_appointments')
        .select('*')
        .eq('status', 'authorized_to_offer')
        .order('created_at', { ascending: false });

      if (appointmentsError) throw appointmentsError;

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
      console.error('Error loading appointments:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load appointments',
        color: 'red',
      });
    }
  };

  const validateSelection = (): boolean => {
    if (!selectedAppointmentId) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select an appointment to validate',
        color: 'red',
      });
      return false;
    }
    return true;
  };

  const validateChecks = (): boolean => {
    const allChecked = Object.values(validationChecks).every(check => check === true);
    if (!allChecked) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please complete all validation checks before approving',
        color: 'red',
      });
      return false;
    }
    return true;
  };

  const handleComplete = async () => {
    if (!selectedAppointment) return;

    try {
      const { error } = await supabase.functions.invoke('activate-executive-officer', {
        body: {
          appointment_id: selectedAppointment.id,
          validation_checks: validationChecks,
          notes: notes || null,
        },
      });

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: `${selectedAppointment.proposed_officer_name} has been validated and activated!`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Reload appointments
      await loadAppointments();
      setSelectedAppointmentId('');
      setSelectedAppointment(null);
      setValidationChecks({
        identityVerified: false,
        backgroundCheck: false,
        boardApproved: false,
        documentsComplete: false,
      });
      setNotes('');
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to validate and activate officer',
        color: 'red',
      });
      throw error;
    }
  };

  const viewDocument = (doc: { file_url: string; type: string }) => {
    setSelectedDocument({ url: doc.file_url, type: doc.type });
    setDocumentModalOpen(true);
  };

  const steps: WizardStep[] = [
    {
      label: 'Select Appointment',
      description: 'Choose appointment to validate',
      icon: <IconChecklist size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Select an executive appointment that is ready for Corporate Secretary validation. All documents must be signed before validation.
          </Alert>
          <Select
            label="Executive Appointment"
            placeholder="Select an appointment"
            required
            data={appointments.map((apt) => ({
              value: apt.id,
              label: `${apt.proposed_officer_name} - ${apt.proposed_title}`,
            }))}
            value={selectedAppointmentId}
            onChange={(value) => setSelectedAppointmentId(value || '')}
            searchable
            size="md"
          />
          {selectedAppointment && (
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" fw={600}>Appointment Details</Text>
                <Text size="sm"><strong>Name:</strong> {selectedAppointment.proposed_officer_name}</Text>
                <Text size="sm"><strong>Email:</strong> {selectedAppointment.proposed_officer_email}</Text>
                <Text size="sm"><strong>Title:</strong> {selectedAppointment.proposed_title}</Text>
                <Text size="sm"><strong>Effective Date:</strong> {dayjs(selectedAppointment.effective_date).format('MMMM D, YYYY')}</Text>
              </Stack>
            </Paper>
          )}
        </Stack>
      ),
      validate: validateSelection,
    },
    {
      label: 'Review Documents',
      description: 'Review all signed documents',
      icon: <IconFileText size={18} />,
      component: (
        <Stack gap="md">
          {selectedAppointment ? (
            <>
              <Alert color="blue" variant="light">
                Review all documents that have been signed by the executive. Click on any document to view it.
              </Alert>
              <ScrollArea h={400}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Document Type</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Signed Date</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {selectedAppointment.documents.map((doc) => (
                      <Table.Tr key={doc.id}>
                        <Table.Td>{getDocumentTypeName(doc.type)}</Table.Td>
                        <Table.Td>
                          <Badge
                            color={doc.signature_status === 'signed' ? 'green' : 'yellow'}
                            variant="light"
                          >
                            {doc.signature_status === 'signed' ? 'Signed' : 'Pending'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {doc.signed_at ? dayjs(doc.signed_at).format('MMM D, YYYY') : 'N/A'}
                        </Table.Td>
                        <Table.Td>
                          {doc.file_url && (
                            <Button
                              size="xs"
                              variant="light"
                              leftSection={<IconEye size={14} />}
                              onClick={() => viewDocument(doc)}
                            >
                              View
                            </Button>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
              <Alert
                color={selectedAppointment.documents.every(doc => doc.signature_status === 'signed') ? 'green' : 'yellow'}
                variant="light"
              >
                {selectedAppointment.documents.filter(doc => doc.signature_status === 'signed').length} of {selectedAppointment.documents.length} documents signed
              </Alert>
            </>
          ) : (
            <Alert color="gray" variant="light">
              Please select an appointment first
            </Alert>
          )}
        </Stack>
      ),
      validate: () => {
        if (!selectedAppointment) return false;
        const allSigned = selectedAppointment.documents.every(doc => doc.signature_status === 'signed');
        if (!allSigned) {
          notifications.show({
            title: 'Validation Error',
            message: 'All documents must be signed before validation',
            color: 'red',
          });
          return false;
        }
        return true;
      },
    },
    {
      label: 'Validation Checklist',
      description: 'Complete validation checks',
      icon: <IconChecklist size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Complete all validation checks before approving the appointment.
          </Alert>
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Checkbox
                label="Identity Verified"
                description="Executive's identity has been verified through official documents"
                checked={validationChecks.identityVerified}
                onChange={(e) =>
                  setValidationChecks({ ...validationChecks, identityVerified: e.currentTarget.checked })
                }
                size="md"
              />
              <Divider />
              <Checkbox
                label="Background Check Complete"
                description="Background check has been completed and cleared"
                checked={validationChecks.backgroundCheck}
                onChange={(e) =>
                  setValidationChecks({ ...validationChecks, backgroundCheck: e.currentTarget.checked })
                }
                size="md"
              />
              <Divider />
              <Checkbox
                label="Board Approval Confirmed"
                description="Board resolution has been adopted and approved"
                checked={validationChecks.boardApproved}
                onChange={(e) =>
                  setValidationChecks({ ...validationChecks, boardApproved: e.currentTarget.checked })
                }
                size="md"
              />
              <Divider />
              <Checkbox
                label="All Documents Complete"
                description="All required documents have been signed and are complete"
                checked={validationChecks.documentsComplete}
                onChange={(e) =>
                  setValidationChecks({ ...validationChecks, documentsComplete: e.currentTarget.checked })
                }
                size="md"
                disabled={selectedAppointment ? selectedAppointment.documents.every(doc => doc.signature_status === 'signed') : false}
              />
            </Stack>
          </Paper>
        </Stack>
      ),
      validate: validateChecks,
    },
    {
      label: 'Notes & Approval',
      description: 'Add notes and approve',
      icon: <IconCheck size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="green" variant="light" icon={<IconCheck size={16} />}>
            All validation checks are complete. Add any additional notes and approve the appointment to activate the executive officer.
          </Alert>
          <Textarea
            label="Validation Notes (Optional)"
            placeholder="Add any additional notes or comments about this validation..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            size="md"
          />
          {selectedAppointment && (
            <Paper p="md" withBorder style={{ backgroundColor: '#f0fdf4' }}>
              <Stack gap="xs">
                <Text size="sm" fw={600} c="green">Ready to Activate</Text>
                <Text size="sm">
                  <strong>Officer:</strong> {selectedAppointment.proposed_officer_name}
                </Text>
                <Text size="sm">
                  <strong>Title:</strong> {selectedAppointment.proposed_title}
                </Text>
                <Text size="sm">
                  <strong>Email:</strong> {selectedAppointment.proposed_officer_email}
                </Text>
              </Stack>
            </Paper>
          )}
        </Stack>
      ),
      validate: () => true,
    },
  ];

  const wizard = useWizard({
    steps,
    onComplete: handleComplete,
  });

  return (
    <>
      <WizardLayout
        title="Officer Validation & Activation"
        subtitle="Step-by-step process to validate and activate an executive officer"
        steps={steps}
        activeStep={wizard.activeStep}
        completedSteps={wizard.completedSteps}
        onStepChange={wizard.handleStepChange}
        onNext={wizard.handleNext}
        onBack={wizard.handleBack}
        onComplete={handleComplete}
        loading={wizard.loading}
        error={wizard.error}
      />

      {/* Document Viewer Modal */}
      <Modal
        opened={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        title="View Document"
        size="xl"
      >
        {selectedDocument && (
          <iframe
            src={selectedDocument.url}
            style={{ width: '100%', height: '600px', border: 'none' }}
            title={selectedDocument.type}
          />
        )}
      </Modal>
    </>
  );
};

export default OfficerValidationWizard;




































