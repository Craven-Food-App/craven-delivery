import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  Button,
  Table,
  Badge,
  Group,
  Text,
  Stack,
  Title,
  ActionIcon,
  Modal,
  Paper,
  Divider,
  Alert,
  Collapse,
  List,
  ThemeIcon,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Checkbox,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import {
  IconPlus,
  IconEye,
  IconFileText,
  IconRefresh,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconClock,
  IconChevronDown,
  IconChevronUp,
  IconBook,
  IconUsers,
  IconChecklist,
  IconMail,
  IconShield,
  IconInfoCircle,
  IconEdit,
  IconCoins,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from '@mantine/form';
import dayjs from 'dayjs';

interface ExecutiveAppointment {
  id: string;
  proposed_officer_name: string;
  proposed_officer_email?: string;
  proposed_title: string;
  appointment_type: string;
  board_meeting_date?: string;
  effective_date: string;
  term_length_months?: number;
  authority_granted?: string;
  compensation_structure?: string;
  equity_included: boolean;
  equity_details?: string;
  notes?: string;
  status: string;
  board_resolution_id?: string;
  appointment_letter_url?: string;
  board_resolution_url?: string;
  certificate_url?: string;
  employment_agreement_url?: string;
  deferred_compensation_url?: string;
  confidentiality_ip_url?: string;
  stock_subscription_url?: string;
  pre_incorporation_consent_url?: string;
  certificate_of_incorporation_url?: string;
  bylaws_url?: string;
  bylaws_acknowledgment_url?: string;
  fiduciary_ethics_url?: string;
  conflict_disclosure_url?: string;
  officer_indemnification_url?: string;
  equity_plan_url?: string;
  option_rsu_award_url?: string;
  formation_mode?: boolean;
  created_at: string;
  updated_at: string;
}

const AppointmentList: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<ExecutiveAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<ExecutiveAppointment | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<ExecutiveAppointment | null>(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string>('');
  const [selectedDocumentName, setSelectedDocumentName] = useState<string>('');
  const [documentContent, setDocumentContent] = useState<string>('');
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [fixingNathan, setFixingNathan] = useState(false);
  const [mergingNathan, setMergingNathan] = useState(false);
  const [updatingNathanStatus, setUpdatingNathanStatus] = useState(false);
  const [sendingNathanEmail, setSendingNathanEmail] = useState(false);
  const [instructionsOpened, setInstructionsOpened] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('executive_appointments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load appointments',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
      DRAFT: { color: 'gray', label: 'Draft', icon: <IconFileText size={14} /> },
      SENT_TO_BOARD: { color: 'blue', label: 'Sent to Board', icon: <IconClock size={14} /> },
      BOARD_ADOPTED: { color: 'cyan', label: 'Board Adopted', icon: <IconCheck size={14} /> },
      AWAITING_SIGNATURES: { color: 'orange', label: 'Awaiting Signatures', icon: <IconClock size={14} /> },
      READY_FOR_SECRETARY_REVIEW: { color: 'yellow', label: 'Ready for Review', icon: <IconAlertCircle size={14} /> },
      SECRETARY_APPROVED: { color: 'lime', label: 'Secretary Approved', icon: <IconCheck size={14} /> },
      ACTIVATING: { color: 'indigo', label: 'Activating', icon: <IconClock size={14} /> },
      ACTIVE: { color: 'green', label: 'Active', icon: <IconCheck size={14} /> },
      APPROVED: { color: 'green', label: 'Approved', icon: <IconCheck size={14} /> },
      REJECTED: { color: 'red', label: 'Rejected', icon: <IconX size={14} /> },
    };

    const config = statusConfig[status] || { color: 'gray', label: status, icon: null };
    return (
      <Badge color={config.color} leftSection={config.icon} style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
        {config.label}
      </Badge>
    );
  };

  const handleViewDocument = async (url: string, name: string) => {
    if (!url) {
      notifications.show({
        title: 'No Document',
        message: `${name} has not been generated yet`,
        color: 'yellow',
      });
      return;
    }
    setSelectedDocumentUrl(url);
    setSelectedDocumentName(name);
    setDocumentModalOpen(true);
    setLoadingDocument(true);
    setDocumentContent('');
    
    // For HTML files, fetch the content to render properly
    if (url.includes('.html') || url.endsWith('.html')) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const html = await response.text();
          setDocumentContent(html);
        } else {
          console.error('Failed to fetch document:', response.status);
          setDocumentContent('');
        }
      } catch (error) {
        console.error('Error fetching document:', error);
        setDocumentContent('');
      } finally {
        setLoadingDocument(false);
      }
    } else {
      setLoadingDocument(false);
    }
  };

  const handleFixNathanAppointments = async () => {
    setFixingNathan(true);
    try {
      const { data, error } = await supabase.functions.invoke('governance-fix-nathan-appointments', {
        body: {},
      });

      if (error) throw error;

      if (data) {
        const { appointments_found, successful, failed, results, errors } = data;
        
        // Build detailed message
        let message = `Processed ${appointments_found} appointment(s). ${successful || 0} successful, ${failed || 0} failed.`;
        
        // Add details about partial successes
        const partialSuccesses = results?.filter((r: any) => r.partial_success) || [];
        if (partialSuccesses.length > 0) {
          message += ` ${partialSuccesses.length} partially successful (setup complete, workflow pending).`;
        }
        
        // Add error details if any
        const failedResults = results?.filter((r: any) => !r.success && !r.partial_success) || [];
        if (failedResults.length > 0) {
          const errorMessages = failedResults
            .map((r: any) => {
              const errorMsg = r.error || r.workflow_error || r.workflow_result?.error || 'Unknown error';
              return `${r.appointment_name}: ${errorMsg}`;
            })
            .join('; ');
          message += ` Errors: ${errorMessages}`;
        }
        
        notifications.show({
          title: 'Nathan Curry Appointments Fixed',
          message,
          color: (failed || 0) > 0 ? 'yellow' : 'green',
          autoClose: 15000,
        });

        if (errors && errors.length > 0) {
          console.error('Errors fixing Nathan appointments:', errors);
        }
        
        if (results && results.length > 0) {
          console.log('Fix results:', results);
          // Log detailed results for debugging
          results.forEach((r: any) => {
            if (!r.success && !r.partial_success) {
              console.warn(`Appointment ${r.appointment_id} (${r.appointment_name}):`, {
                error: r.error,
                workflow_triggered: r.workflow_triggered,
                workflow_error: r.workflow_error || r.workflow_result?.error,
                user_created: r.user_created,
                appointment_record_created: r.appointment_record_created,
                resolution_created: r.resolution_created,
              });
            } else if (r.partial_success) {
              console.info(`Appointment ${r.appointment_id} (${r.appointment_name}) - Partial success:`, {
                workflow_triggered: r.workflow_triggered,
                workflow_error: r.workflow_error,
                user_created: r.user_created,
                appointment_record_created: r.appointment_record_created,
                resolution_created: r.resolution_created,
              });
            }
          });
        }
      }

      // Refresh appointments list
      fetchAppointments();
      setTimeout(() => {
        fetchAppointments();
      }, 3000);
    } catch (error: any) {
      console.error('Error fixing Nathan appointments:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to fix Nathan Curry appointments',
        color: 'red',
      });
    } finally {
      setFixingNathan(false);
    }
  };

  const handleUpdateNathanStatus = async () => {
    setUpdatingNathanStatus(true);
    try {
      // First check status
      const { data: checkData, error: checkError } = await supabase.functions.invoke('governance-check-nathan-status', {
        body: {},
      });

      if (checkError) throw checkError;

      if (checkData?.appointments && checkData.appointments.length > 0) {
        const nathanAppt = checkData.appointments[0];
        const appointmentId = nathanAppt.appointment.id;
        const currentStatus = nathanAppt.appointment.status;
        const recommendedStatus = nathanAppt.recommended_status;

        console.log('Nathan status check:', {
          current: currentStatus,
          recommended: recommendedStatus,
          resolution: nathanAppt.resolution?.status,
          documents: nathanAppt.documents,
        });

        // First, sync documents from appointment URLs to executive_documents table
        if (nathanAppt.documents.total === 0) {
          console.log('No documents found in executive_documents, syncing from appointment URLs...');
          const { data: syncData, error: syncError } = await supabase.functions.invoke('governance-sync-appointment-documents', {
            body: { appointment_id: appointmentId },
          });

          if (syncError) {
            console.error('Error syncing documents:', syncError);
            notifications.show({
              title: 'Warning',
              message: `Documents sync had issues: ${syncError.message}. Continuing with status update...`,
              color: 'yellow',
              autoClose: 5000,
            });
          } else {
            notifications.show({
              title: 'Documents Synced',
              message: `Synced ${syncData?.documents_synced || 0} documents from appointment URLs`,
              color: 'blue',
              autoClose: 3000,
            });
          }
        }

        // Update status if needed
        if (recommendedStatus !== currentStatus) {
          const { data: updateData, error: updateError } = await supabase.functions.invoke('governance-update-appointment-status', {
            body: { appointment_id: appointmentId },
          });

          if (updateError) throw updateError;

          notifications.show({
            title: 'Status Updated',
            message: `Updated from ${currentStatus} to ${recommendedStatus}`,
            color: 'green',
            autoClose: 5000,
          });

          fetchAppointments();
        } else {
          notifications.show({
            title: 'Status Check',
            message: `Nathan's appointment is already at ${currentStatus}. Resolution: ${nathanAppt.resolution?.status || 'N/A'}, Documents: ${nathanAppt.documents.signed}/${nathanAppt.documents.total} signed`,
            color: 'blue',
            autoClose: 5000,
          });
        }
      } else {
        notifications.show({
          title: 'Not Found',
          message: 'No Nathan Curry appointments found',
          color: 'yellow',
        });
      }
    } catch (error: any) {
      console.error('Error updating Nathan status:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update status',
        color: 'red',
      });
    } finally {
      setUpdatingNathanStatus(false);
    }
  };

  const handleSendNathanEmail = async () => {
    setSendingNathanEmail(true);
    try {
      // First check status and get appointment ID
      const { data: checkData, error: checkError } = await supabase.functions.invoke('governance-check-nathan-status', {
        body: {},
      });

      if (checkError) throw checkError;

      if (checkData?.appointments && checkData.appointments.length > 0) {
        const nathanAppt = checkData.appointments[0];
        const appointmentId = nathanAppt.appointment.id;

        // First ensure documents are synced
        if (nathanAppt.documents.total === 0) {
          console.log('No documents found, syncing first...');
          const { data: syncData, error: syncError } = await supabase.functions.invoke('governance-sync-appointment-documents', {
            body: { appointment_id: appointmentId },
          });

          if (syncError) {
            throw new Error(`Failed to sync documents: ${syncError.message}`);
          }

          notifications.show({
            title: 'Documents Synced',
            message: `Synced ${syncData?.documents_synced || 0} documents before sending email`,
            color: 'blue',
            autoClose: 3000,
          });
        }

        // Send email - use fetch to get better error details
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        
        if (!accessToken) {
          throw new Error('Not authenticated. Please log in and try again.');
        }

        const supabaseUrl = 'https://xaxbucnjlrfkccsfiddq.supabase.co';
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhheGJ1Y25qbHJma2Njc2ZpZGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyODMyODAsImV4cCI6MjA3Mjg1OTI4MH0.3ETuLETgSEj6W8gYi7WAoUFDPNo4IwTjuSnVtt1BCFE';

        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-appointment-documents-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({ appointmentId }),
        });

        const emailData = await emailResponse.json();
        
        if (!emailResponse.ok) {
          const errorMessage = emailData?.error || emailData?.message || `HTTP ${emailResponse.status}: ${emailResponse.statusText}`;
          const errorDetails = emailData?.details ? ` Details: ${emailData.details}` : '';
          throw new Error(`${errorMessage}${errorDetails}`);
        }

        notifications.show({
          title: 'Email Sent',
          message: `Email sent to ${nathanAppt.proposed_officer_email || emailData?.recipient || 'Nathan Curry'} with ${emailData?.documentsCount || 0} documents`,
          color: 'green',
          autoClose: 5000,
        });

        fetchAppointments();
      } else {
        notifications.show({
          title: 'Not Found',
          message: 'No Nathan Curry appointments found',
          color: 'yellow',
        });
      }
    } catch (error: any) {
      console.error('Error sending email to Nathan:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to send email',
        color: 'red',
      });
    } finally {
      setSendingNathanEmail(false);
    }
  };

  const handleMergeNathanAppointments = async () => {
    setMergingNathan(true);
    try {
      const { data, error } = await supabase.functions.invoke('governance-merge-nathan-appointments', {
        body: {},
      });

      if (error) throw error;

      if (data) {
        const { 
          primary_appointment_id, 
          primary_appointment_name,
          documents_merged,
          has_board_resolution,
          merged_appointments,
          merged_documents 
        } = data;
        
        notifications.show({
          title: 'Nathan Curry Appointments Merged',
          message: `Merged ${merged_appointments} appointment(s) into primary. ${documents_merged} documents preserved. ${has_board_resolution ? 'Resolution included.' : 'No resolution found.'}`,
          color: 'green',
          autoClose: 10000,
        });

        console.log('Merge results:', {
          primary_appointment_id,
          primary_appointment_name,
          documents_merged,
          merged_documents,
        });
      }

      // Refresh appointments list
      fetchAppointments();
      setTimeout(() => {
        fetchAppointments();
      }, 3000);
    } catch (error: any) {
      console.error('Error merging Nathan appointments:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to merge Nathan Curry appointments',
        color: 'red',
      });
    } finally {
      setMergingNathan(false);
    }
  };

  const editForm = useForm({
    initialValues: {
      proposed_officer_name: '',
      proposed_officer_email: '',
      proposed_title: '',
      appointment_type: '',
      effective_date: null as Date | null,
      board_meeting_date: null as Date | null,
      term_length_months: undefined as number | undefined,
      authority_granted: '',
      compensation_structure: '',
      equity_included: false,
      equity_details: '',
      notes: '',
      formation_mode: false,
    },
  });

  const handleEditAppointment = (appointment: ExecutiveAppointment) => {
    setEditingAppointment(appointment);
    editForm.setValues({
      proposed_officer_name: appointment.proposed_officer_name,
      proposed_officer_email: appointment.proposed_officer_email || '',
      proposed_title: appointment.proposed_title,
      appointment_type: appointment.appointment_type,
      effective_date: appointment.effective_date ? dayjs(appointment.effective_date).toDate() : null,
      board_meeting_date: appointment.board_meeting_date ? dayjs(appointment.board_meeting_date).toDate() : null,
      term_length_months: appointment.term_length_months || undefined,
      authority_granted: appointment.authority_granted || '',
      compensation_structure: appointment.compensation_structure || '',
      equity_included: appointment.equity_included || false,
      equity_details: appointment.equity_details || '',
      notes: appointment.notes || '',
      formation_mode: appointment.formation_mode || false,
    });
    setEditModalOpen(true);
  };

  const handleUpdateAppointment = async (values: typeof editForm.values) => {
    if (!editingAppointment) return;
    
    setUpdating(true);
    try {
      const updateData: any = {
        proposed_officer_name: values.proposed_officer_name,
        proposed_officer_email: values.proposed_officer_email || null,
        proposed_title: values.proposed_title,
        appointment_type: values.appointment_type,
        effective_date: values.effective_date ? dayjs(values.effective_date).toISOString() : editingAppointment.effective_date,
        board_meeting_date: values.board_meeting_date ? dayjs(values.board_meeting_date).toISOString() : null,
        term_length_months: values.term_length_months || null,
        authority_granted: values.authority_granted || null,
        compensation_structure: values.compensation_structure || null,
        equity_included: values.equity_included || false,
        equity_details: values.equity_details || null,
        notes: values.notes || null,
        formation_mode: values.formation_mode || false,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('executive_appointments')
        .update(updateData)
        .eq('id', editingAppointment.id);

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Appointment updated successfully! You can now regenerate documents with the new information.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setEditModalOpen(false);
      setEditingAppointment(null);
      editForm.reset();
      fetchAppointments();
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update appointment',
        color: 'red',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRegenerateDocuments = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('governance-backfill-appointment-documents', {
        body: { 
          appointment_id: appointmentId,
          force_regenerate: true, // Force regeneration even if documents exist
        },
      });

      if (error) throw error;

      if (data) {
        const { documents_generated, errors_count, all_errors, results } = data;
        
        if (documents_generated > 0) {
          notifications.show({
            title: 'Success',
            message: `Generated ${documents_generated} document(s). Please refresh to see them.`,
            color: 'green',
          });
        } else if (errors_count > 0) {
          // Show detailed error messages
          const errorMessages = all_errors?.join('\n') || 'Unknown error';
          notifications.show({
            title: 'Document Generation Failed',
            message: `Failed to generate documents:\n${errorMessages}`,
            color: 'red',
            autoClose: 15000,
          });
        } else {
          // Check if there are any results with details
          const resultDetails = results?.map((r: any) => {
            if (r.errors && r.errors.length > 0) {
              return `${r.appointment_name}: ${r.errors.join(', ')}`;
            }
            if (r.reason_no_docs) {
              return `${r.appointment_name}: ${r.reason_no_docs}`;
            }
            if (r.documents_queued && r.documents_queued.length > 0) {
              return `${r.appointment_name}: Queued ${r.documents_queued.join(', ')} but none were generated`;
            }
            return null;
          }).filter(Boolean).join('\n');
          
          const message = resultDetails 
            ? `No documents were generated.\n${resultDetails}`
            : 'No documents were generated. This may be because all documents already exist or templates are missing.';
          
          notifications.show({
            title: 'No Documents Generated',
            message,
            color: 'yellow',
            autoClose: 15000,
          });
        }
      }

      // Refresh immediately and again after a delay to ensure we get the latest data
      fetchAppointments();
      setTimeout(() => {
        fetchAppointments();
      }, 3000);
    } catch (error: any) {
      console.error('Error regenerating documents:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to regenerate documents',
        color: 'red',
      });
    }
  };

  const getDocumentStatus = (appointment: ExecutiveAppointment) => {
    // Core required documents (always counted)
    const coreDocs = [
      appointment.appointment_letter_url,
      appointment.employment_agreement_url,
      appointment.confidentiality_ip_url,
      appointment.board_resolution_url,
      appointment.bylaws_acknowledgment_url,
      appointment.fiduciary_ethics_url,
      appointment.conflict_disclosure_url,
      appointment.officer_indemnification_url,
      appointment.deferred_compensation_url,
    ];
    
    // Formation documents (only if formation_mode is true)
    const formationDocs = appointment.formation_mode ? [
      appointment.pre_incorporation_consent_url,
      appointment.certificate_of_incorporation_url,
      appointment.bylaws_url,
    ] : [];
    
    // Equity documents (only if equity_included is true)
    const equityDocs = appointment.equity_included ? [
      appointment.certificate_url,
      appointment.stock_subscription_url,
      appointment.equity_plan_url,
      appointment.option_rsu_award_url,
    ] : [];
    
    const allDocs = [...coreDocs, ...formationDocs, ...equityDocs];
    const generatedCount = allDocs.filter(url => url && url.trim() !== '').length;
    const totalCount = allDocs.length;
    
    return { generatedCount, totalCount };
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <div>
            <Title order={1} c="dark" mb="xs">
              Executive Appointments
            </Title>
            <Text c="dimmed" size="lg">
              Manage executive appointments and view generated documents
            </Text>
          </div>
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconRefresh size={16} />}
              onClick={fetchAppointments}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              color="orange"
              leftSection={<IconRefresh size={16} />}
              onClick={handleFixNathanAppointments}
              loading={fixingNathan}
            >
              Fix Nathan Curry Appointments
            </Button>
            <Button
              variant="outline"
              color="blue"
              leftSection={<IconUsers size={16} />}
              onClick={handleMergeNathanAppointments}
              loading={mergingNathan}
            >
              Merge Nathan Curry Appointments
            </Button>
            <Button
              variant="outline"
              color="green"
              leftSection={<IconChecklist size={16} />}
              onClick={handleUpdateNathanStatus}
              loading={updatingNathanStatus}
            >
              Update Nathan Status
            </Button>
            <Button
              variant="outline"
              color="violet"
              leftSection={<IconMail size={16} />}
              onClick={handleSendNathanEmail}
              loading={sendingNathanEmail}
            >
              Send Email to Nathan
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate('/company/governance-admin/appointments/new')}
            >
              New Appointment
            </Button>
          </Group>
        </Group>

        {/* Instructions Section */}
        <Card padding="md" radius="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <IconBook size={20} />
              <Title order={3} size="h4">
                Step-by-Step Appointment Instructions
              </Title>
            </Group>
            <Button
              variant="subtle"
              size="xs"
              leftSection={instructionsOpened ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              onClick={() => setInstructionsOpened(!instructionsOpened)}
            >
              {instructionsOpened ? 'Hide' : 'Show'} Instructions
            </Button>
          </Group>
          
          <Collapse in={instructionsOpened}>
            <Stack gap="lg" mt="md">
              <Alert icon={<IconInfoCircle size={16} />} title="Overview" color="blue" variant="light">
                <Text size="sm" mb="xs">
                  This Fortune 500-grade executive appointment workflow ensures proper governance, legal compliance, and comprehensive documentation for all corporate officer appointments. The system automatically generates all required legal documents, manages board approval processes, and maintains complete audit trails.
                </Text>
                <Text size="sm" fw={500}>
                  Total Documents Generated: 9 core documents + 3 formation documents (if Formation Mode) + 4 equity documents (if equity included)
                </Text>
              </Alert>

              <div>
                <Title order={4} size="h5" mb="sm">
                  Step 1: Create New Appointment
                </Title>
                <Text size="sm" c="dimmed" mb="xs">
                  Begin by creating a new appointment record with all required officer details and governance parameters.
                </Text>
                <List spacing="xs" size="sm" icon={
                  <ThemeIcon color="blue" size={20} radius="xl">
                    <IconFileText size={12} />
                  </ThemeIcon>
                }>
                  <List.Item>
                    <Text size="sm" fw={500}>Click the <Badge variant="light" size="sm">+ New Appointment</Badge> button</Text> located in the top-right corner of this page
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Required Fields:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>Officer Full Name (legal name as it will appear on documents)</List.Item>
                      <List.Item>Corporate Email Address (will receive all appointment documents)</List.Item>
                      <List.Item>Executive Title (CEO, CFO, COO, CTO, CXO, or other C-suite position)</List.Item>
                      <List.Item>Effective Date (the date the appointment becomes official)</List.Item>
                      <List.Item>Appointment Type (Initial, Re-appointment, Promotion, or Interim)</List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Formation Mode:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>Enable ONLY if your company's Articles of Incorporation have not yet been filed with the Secretary of State</List.Item>
                      <List.Item>Generates 3 additional pre-incorporation documents: Pre-Incorporation Consent, Certificate of Incorporation (draft), and Company Bylaws</List.Item>
                      <List.Item>Leave disabled if your company is already incorporated</List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Optional Details:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>Annual Compensation (base salary, bonuses, benefits structure)</List.Item>
                      <List.Item>Equity Grant (percentage, share count, vesting schedule, strike price)</List.Item>
                      <List.Item>Department/Division assignment</List.Item>
                      <List.Item>Board Meeting Date (if different from effective date)</List.Item>
                      <List.Item>Term Length (if not indefinite)</List.Item>
                      <List.Item>Authority Granted (specific powers and responsibilities)</List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">Review all information for accuracy, then click <Badge size="sm">Submit</Badge> to create the appointment</Text>
                  </List.Item>
                </List>
              </div>

              <div>
                <Title order={4} size="h5" mb="sm">
                  Step 2: Automatic Document Generation
                </Title>
                <Text size="sm" c="dimmed" mb="xs">
                  The system immediately begins generating all required legal documents using the information you provided. This process typically completes within 10-30 seconds.
                </Text>
                
                <Text size="sm" fw={500} mt="md" mb="xs">Core Documents (9 always generated):</Text>
                <List spacing="xs" size="sm" icon={
                  <ThemeIcon color="green" size={20} radius="xl">
                    <IconCheck size={12} />
                  </ThemeIcon>
                }>
                  <List.Item>
                    <Text size="sm" fw={500}>Appointment Letter</Text> - Official offer letter detailing position, compensation, and start date
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Board Resolution</Text> - Formal board action appointing the officer with authority granted
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Employment Agreement</Text> - Comprehensive employment contract with terms, duties, and termination clauses
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Confidentiality & IP Assignment</Text> - Protects company trade secrets and assigns work product to company
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Bylaws Acknowledgment</Text> - Officer acknowledges receipt and understanding of company bylaws
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Fiduciary Duty & Ethics Acknowledgment</Text> - Confirms understanding of fiduciary obligations to company
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Conflict of Interest Disclosure</Text> - Annual disclosure of potential conflicts requiring board review
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Officer Indemnification Agreement</Text> - Company's commitment to indemnify officer for actions within scope
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Deferred Compensation Agreement</Text> - Salary deferral terms if applicable (or acknowledgment of immediate pay)
                  </List.Item>
                </List>

                <Text size="sm" fw={500} mt="md" mb="xs">Formation Documents (3 additional if Formation Mode enabled):</Text>
                <List spacing="xs" size="sm" icon={
                  <ThemeIcon color="blue" size={20} radius="xl">
                    <IconFileText size={12} />
                  </ThemeIcon>
                }>
                  <List.Item>
                    <Text size="sm" fw={500}>Pre-Incorporation Consent</Text> - Founding team agreement to form the corporation
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Certificate of Incorporation (Draft)</Text> - Articles to be filed with Secretary of State
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Company Bylaws</Text> - Internal governance rules and procedures
                  </List.Item>
                </List>

                <Text size="sm" fw={500} mt="md" mb="xs">Equity Documents (4 additional if equity included):</Text>
                <List spacing="xs" size="sm" icon={
                  <ThemeIcon color="purple" size={20} radius="xl">
                    <IconCoins size={12} />
                  </ThemeIcon>
                }>
                  <List.Item>
                    <Text size="sm" fw={500}>Stock Certificate</Text> - Ownership certificate showing share issuance
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Stock Subscription Agreement</Text> - Officer's purchase or grant of company shares
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Equity Incentive Plan</Text> - Company's overall equity compensation plan document
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Option/RSU Award Agreement</Text> - Specific terms of stock options or restricted stock units
                  </List.Item>
                </List>

                <Alert icon={<IconClock size={14} />} title="Document Generation Timeline" color="yellow" variant="light" mt="md">
                  <Text size="xs">
                    Documents typically generate within 10-30 seconds. If the <Badge size="xs" color="green">Documents</Badge> column shows "No Documents" after 1 minute, click the <Badge size="xs" color="orange">refresh icon</Badge> next to the appointment to regenerate. If documents still don't appear, check that all required company settings are configured (company name, state of incorporation, registered agent, etc.).
                  </Text>
                </Alert>
              </div>

              <div>
                <Title order={4} size="h5" mb="sm">
                  Step 3: Review & Verify Documents
                </Title>
                <Text size="sm" c="dimmed" mb="xs">
                  Carefully review all generated documents to ensure accuracy before proceeding to board approval.
                </Text>
                <List spacing="xs" size="sm" icon={
                  <ThemeIcon color="orange" size={20} radius="xl">
                    <IconChecklist size={12} />
                  </ThemeIcon>
                }>
                  <List.Item>
                    <Text size="sm">Check the <Badge variant="light" size="sm">Documents</Badge> column - you should see a green badge showing "X / Y Generated" where:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>9 documents if no equity and not formation mode</List.Item>
                      <List.Item>12 documents if formation mode (9 + 3)</List.Item>
                      <List.Item>13 documents if equity included (9 + 4)</List.Item>
                      <List.Item>16 documents if both formation mode and equity (9 + 3 + 4)</List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">Click the <Badge variant="light" size="sm" color="blue">eye icon</Badge> to open the appointment details modal</Text>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">In the modal, review each document by clicking the <Badge size="xs" color="blue">View</Badge> button next to each document name</Text>
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Verify each document contains:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>Correct officer name, title, and contact information</List.Item>
                      <List.Item>Accurate compensation and equity terms</List.Item>
                      <List.Item>Proper effective dates and board meeting dates</List.Item>
                      <List.Item>Current company information (legal name, state, registered agent)</List.Item>
                      <List.Item>No unfilled placeholders (if you see [[ ]] brackets, regenerate documents)</List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">If any document is incorrect or missing, click the <Badge variant="light" size="sm" color="orange">refresh icon</Badge> (circular arrow) in the Actions column to regenerate all documents</Text>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">To edit appointment details before regeneration, click the <Badge variant="light" size="sm" color="green">edit icon</Badge> (pencil) in the Actions column</Text>
                  </List.Item>
                </List>
              </div>

              <div>
                <Title order={4} size="h5" mb="sm">
                  Step 4: Board Approval Process
                </Title>
                <Text size="sm" c="dimmed" mb="xs">
                  All executive appointments require formal board approval through a documented voting process.
                </Text>
                <List spacing="xs" size="sm" icon={
                  <ThemeIcon color="purple" size={20} radius="xl">
                    <IconUsers size={12} />
                  </ThemeIcon>
                }>
                  <List.Item>
                    <Text size="sm">Navigate to the <Badge variant="light" size="sm">Resolutions</Badge> tab at the top of this page</Text>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">Find the board resolution automatically created for this appointment (it will show the officer's name and appointment date)</Text>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">Board members can review the resolution details and vote in one of two ways:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item><Text fw={500}>Via Voting Dashboard:</Text> Click the <Badge size="xs">Voting Dashboard</Badge> tab to see all pending resolutions requiring votes</List.Item>
                      <List.Item><Text fw={500}>Via Resolution List:</Text> Click directly on a resolution in the Resolutions tab to view details and cast a vote</List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">Each board member must vote: <Badge size="xs" color="green">For</Badge>, <Badge size="xs" color="red">Against</Badge>, or <Badge size="xs" color="gray">Abstain</Badge></Text>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">Once at least 1 board member votes "For", the resolution status automatically changes to <Badge color="green" size="sm">BOARD_ADOPTED</Badge></Text>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">The appointment status updates to <Badge color="yellow" size="sm">READY_FOR_SECRETARY_REVIEW</Badge> and proceeds to Step 5</Text>
                  </List.Item>
                </List>
                <Alert icon={<IconAlertCircle size={14} />} title="Board Quorum Requirements" color="blue" variant="light" mt="xs">
                  <Text size="xs">
                    The board quorum is set to 1 vote. Any resolution with at least 1 "For" vote will be automatically adopted. The Corporate Secretary should still verify proper governance procedures were followed before final approval.
                  </Text>
                </Alert>
              </div>

              <div>
                <Title order={4} size="h5" mb="sm">
                  Step 5: Corporate Secretary Review & Approval
                </Title>
                <Text size="sm" c="dimmed" mb="xs">
                  The Corporate Secretary performs final compliance review and certifies the appointment is legally valid.
                </Text>
                <List spacing="xs" size="sm" icon={
                  <ThemeIcon color="teal" size={20} radius="xl">
                    <IconShield size={12} />
                  </ThemeIcon>
                }>
                  <List.Item>
                    <Text size="sm">Navigate to the <Badge variant="light" size="sm">Officer Validation</Badge> tab at the top of this page</Text>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">Find appointments with status <Badge color="yellow" size="sm">READY_FOR_SECRETARY_REVIEW</Badge></Text>
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>The Secretary must verify:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>Board quorum was met for the resolution vote</List.Item>
                      <List.Item>All required documents are present and properly executed</List.Item>
                      <List.Item>Appointment complies with company bylaws and applicable law</List.Item>
                      <List.Item>No conflicts of interest or governance issues exist</List.Item>
                      <List.Item>Officer is eligible to serve (not disqualified by law or prior agreements)</List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">If everything is in order, click <Badge size="sm" color="green">Approve</Badge> to certify the appointment</Text>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">Status changes to <Badge color="green" size="sm">SECRETARY_APPROVED</Badge> and the appointment proceeds to final activation</Text>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">If issues are found, click <Badge size="sm" color="red">Reject</Badge> and provide detailed notes for correction</Text>
                  </List.Item>
                </List>
              </div>

              <div>
                <Title order={4} size="h5" mb="sm">
                  Step 6: System Activation & Officer Onboarding
                </Title>
                <Text size="sm" c="dimmed" mb="xs">
                  After Secretary approval, the system automatically provisions access and sends all documents to the new officer.
                </Text>
                <List spacing="xs" size="sm" icon={
                  <ThemeIcon color="green" size={20} radius="xl">
                    <IconMail size={12} />
                  </ThemeIcon>
                }>
                  <List.Item>
                    <Text size="sm" fw={500}>Automatic System Actions (no manual steps required):</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>Creates authentication account in auth system (email/password login)</List.Item>
                      <List.Item>Assigns appropriate role-based permissions (CEO, CFO, CTO, COO, CXO)</List.Item>
                      <List.Item>Provisions access to relevant executive portals (CEO Portal, CFO Portal, etc.)</List.Item>
                      <List.Item>Creates entry in Officers Ledger (accessible via <Badge size="xs">Officers</Badge> tab)</List.Item>
                      <List.Item>Updates cap table if equity was granted (accessible via <Badge size="xs">Cap Table</Badge> tab)</List.Item>
                      <List.Item>Records complete audit trail in Governance Logs (accessible via <Badge size="xs">Logs</Badge> tab)</List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Email Notification to Officer:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>Sent to the email address provided in Step 1</List.Item>
                      <List.Item>Contains login credentials (temporary password to be changed on first login)</List.Item>
                      <List.Item>Includes direct links to view all appointment documents</List.Item>
                      <List.Item>Provides instructions for accessing executive portal</List.Item>
                      <List.Item>Lists next steps for onboarding (document signing, system access, etc.)</List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">Appointment status updates to <Badge color="green" size="sm">ACTIVE</Badge> - the officer is now officially appointed</Text>
                  </List.Item>
                  <List.Item>
                    <Text size="sm">The officer can log in to their executive portal and begin:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>Reviewing and electronically signing required documents</List.Item>
                      <List.Item>Accessing department dashboards and management tools</List.Item>
                      <List.Item>Viewing equity grants and vesting schedules (if applicable)</List.Item>
                      <List.Item>Managing their team and reviewing company financials (based on role)</List.Item>
                    </List>
                  </List.Item>
                </List>
              </div>

              <Divider />

              <div>
                <Title order={4} size="h5" mb="sm" c="red">
                  ⚠️ Troubleshooting Common Issues
                </Title>
                <List spacing="md" size="sm">
                  <List.Item>
                    <Text size="sm" fw={500}>Documents showing "No Documents" or incorrect count:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>Click the <Badge size="xs" color="orange">refresh icon</Badge> in Actions column to regenerate</List.Item>
                      <List.Item>Check that Formation Mode and Equity settings match your intent</List.Item>
                      <List.Item>Verify company settings are complete (company name, state, registered agent) in Settings</List.Item>
                      <List.Item>Wait 30 seconds after creation before checking - generation takes time</List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Documents contain unfilled placeholders like [[PLACEHOLDER]]:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>This means the document template is missing required data</List.Item>
                      <List.Item>Click the <Badge size="xs" color="green">edit icon</Badge> to add missing information</List.Item>
                      <List.Item>Then click <Badge size="xs" color="orange">refresh icon</Badge> to regenerate with complete data</List.Item>
                      <List.Item>Common missing fields: compensation details, equity terms, authority granted</List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Board resolution vote not appearing or not counting:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>Ensure board members are added in the <Badge size="xs">Board Setup</Badge> tab</List.Item>
                      <List.Item>Verify board members have proper authentication accounts</List.Item>
                      <List.Item>Check that the resolution is in "Pending" status (not already adopted or rejected)</List.Item>
                      <List.Item>Refresh the Voting Dashboard to see latest vote counts</List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Officer not receiving activation email:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>Verify the email address is correct in the appointment details</List.Item>
                      <List.Item>Check spam/junk folders for the notification email</List.Item>
                      <List.Item>Use the <Badge size="xs" color="violet">Send Email to [Name]</Badge> button to resend</List.Item>
                      <List.Item>Ensure the appointment has completed all steps and shows ACTIVE status</List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    <Text size="sm" fw={500}>Appointment stuck in a status and won't progress:</Text>
                    <List withPadding size="xs" mt={4}>
                      <List.Item>Check the required action for current status (board vote, secretary approval, etc.)</List.Item>
                      <List.Item>Use status-specific action buttons (Update Status, Send Email) in the button bar above</List.Item>
                      <List.Item>Review Governance Logs to see what actions have been completed</List.Item>
                      <List.Item>Contact system administrator if workflow appears blocked</List.Item>
                    </List>
                  </List.Item>
                </List>
              </div>

              <Alert icon={<IconInfoCircle size={16} />} title="Need Help?" color="grape" variant="light">
                <Text size="sm">
                  For additional support, refer to the <Badge size="sm">Governance Logs</Badge> tab to view complete audit trails, or consult your corporate counsel for guidance on governance procedures and legal compliance requirements.
                </Text>
              </Alert>
            </Stack>
          </Collapse>
        </Card>

        <Group justify="space-between">
          <div></div>
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconRefresh size={16} />}
              onClick={fetchAppointments}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              color="orange"
              leftSection={<IconRefresh size={16} />}
              onClick={handleFixNathanAppointments}
              loading={fixingNathan}
            >
              Fix Nathan Curry Appointments
            </Button>
            <Button
              variant="outline"
              color="blue"
              leftSection={<IconUsers size={16} />}
              onClick={handleMergeNathanAppointments}
              loading={mergingNathan}
            >
              Merge Nathan Curry Appointments
            </Button>
            <Button
              variant="outline"
              color="green"
              leftSection={<IconChecklist size={16} />}
              onClick={handleUpdateNathanStatus}
              loading={updatingNathanStatus}
            >
              Update Nathan Status
            </Button>
            <Button
              variant="outline"
              color="violet"
              leftSection={<IconMail size={16} />}
              onClick={handleSendNathanEmail}
              loading={sendingNathanEmail}
            >
              Send Email to Nathan
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate('/company/governance-admin/appointments/new')}
            >
              New Appointment
            </Button>
          </Group>
        </Group>

        {appointments.length === 0 ? (
          <Card>
            <Alert icon={<IconAlertCircle size={16} />} title="No Appointments" color="blue">
              No executive appointments found. Create a new appointment to get started.
            </Alert>
          </Card>
        ) : (
          <Card>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Officer</Table.Th>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Effective Date</Table.Th>
                  <Table.Th>Documents</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {appointments.map((appointment) => {
                  const { generatedCount, totalCount } = getDocumentStatus(appointment);
                  const hasAnyDoc = generatedCount > 0;

                  return (
                    <Table.Tr key={appointment.id}>
                      <Table.Td>
                        <div>
                          <Text fw={500}>{appointment.proposed_officer_name}</Text>
                          {appointment.proposed_officer_email && (
                            <Text size="xs" c="dimmed">
                              {appointment.proposed_officer_email}
                            </Text>
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td>{appointment.proposed_title}</Table.Td>
                      <Table.Td>{getStatusBadge(appointment.status)}</Table.Td>
                      <Table.Td>
                        {dayjs(appointment.effective_date).format('MMM D, YYYY')}
                      </Table.Td>
                      <Table.Td>
                        {hasAnyDoc ? (
                          <Badge color="green" variant="light" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                            {generatedCount} / {totalCount} Generated
                          </Badge>
                        ) : (
                          <Badge color="yellow" variant="light" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                            No Documents
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setViewModalOpen(true);
                            }}
                            title="View Details"
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="green"
                            onClick={() => handleEditAppointment(appointment)}
                            title="Edit Appointment"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="orange"
                            onClick={() => handleRegenerateDocuments(appointment.id)}
                            title="Regenerate Documents"
                          >
                            <IconRefresh size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Card>
        )}
      </Stack>

      {/* View Appointment Modal */}
      <Modal
        opened={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedAppointment(null);
        }}
        title="Appointment Details"
        size="lg"
      >
        {selectedAppointment && (
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Officer Name
              </Text>
              <Text fw={500}>{selectedAppointment.proposed_officer_name}</Text>
            </div>

            {selectedAppointment.proposed_officer_email && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  Email
                </Text>
                <Text>{selectedAppointment.proposed_officer_email}</Text>
              </div>
            )}

            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Title
              </Text>
              <Text fw={500}>{selectedAppointment.proposed_title}</Text>
            </div>

            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Status
              </Text>
              {getStatusBadge(selectedAppointment.status)}
            </div>

            <Divider />

            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Effective Date
              </Text>
              <Text>{dayjs(selectedAppointment.effective_date).format('MMMM D, YYYY')}</Text>
            </div>

            {selectedAppointment.board_meeting_date && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  Board Meeting Date
                </Text>
                <Text>{dayjs(selectedAppointment.board_meeting_date).format('MMMM D, YYYY')}</Text>
              </div>
            )}

            <Divider />

            <div>
              <Text size="sm" c="dimmed" mb="md">
                Generated Documents
              </Text>
              <Stack gap="xs">
                {/* Core Employment Documents */}
                <Group justify="space-between">
                  <Text size="sm">Appointment Letter</Text>
                  {selectedAppointment.appointment_letter_url ? (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconEye size={14} />}
                      onClick={() =>
                        handleViewDocument(
                          selectedAppointment.appointment_letter_url!,
                          'Appointment Letter'
                        )
                      }
                    >
                      View
                    </Button>
                  ) : (
                    <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                      Not Generated
                    </Badge>
                  )}
                </Group>

                <Group justify="space-between">
                  <Text size="sm">Employment Agreement</Text>
                  {selectedAppointment.employment_agreement_url ? (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconEye size={14} />}
                      onClick={() =>
                        handleViewDocument(
                          selectedAppointment.employment_agreement_url!,
                          'Employment Agreement'
                        )
                      }
                    >
                      View
                    </Button>
                  ) : (
                    <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                      Not Generated
                    </Badge>
                  )}
                </Group>

                <Group justify="space-between">
                  <Text size="sm">Confidentiality & IP Assignment</Text>
                  {selectedAppointment.confidentiality_ip_url ? (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconEye size={14} />}
                      onClick={() =>
                        handleViewDocument(
                          selectedAppointment.confidentiality_ip_url!,
                          'Confidentiality & IP Assignment'
                        )
                      }
                    >
                      View
                    </Button>
                  ) : (
                    <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                      Not Generated
                    </Badge>
                  )}
                </Group>

                {/* Board & Formation Documents */}
                <Group justify="space-between">
                  <Text size="sm">Board Resolution</Text>
                  {selectedAppointment.board_resolution_url ? (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconEye size={14} />}
                      onClick={() =>
                        handleViewDocument(
                          selectedAppointment.board_resolution_url!,
                          'Board Resolution'
                        )
                      }
                    >
                      View
                    </Button>
                  ) : (
                    <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                      Not Generated
                    </Badge>
                  )}
                </Group>

                {selectedAppointment.formation_mode && (
                  <>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text size="sm">Pre-Incorporation Consent</Text>
                        <Badge color="blue" variant="light" size="xs" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Formation
                        </Badge>
                      </Group>
                      {selectedAppointment.pre_incorporation_consent_url ? (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconEye size={14} />}
                          onClick={() =>
                            handleViewDocument(
                              selectedAppointment.pre_incorporation_consent_url!,
                              'Pre-Incorporation Consent'
                            )
                          }
                        >
                          View
                        </Button>
                      ) : (
                        <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Not Generated
                        </Badge>
                      )}
                    </Group>

                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text size="sm">Certificate of Incorporation</Text>
                        <Badge color="blue" variant="light" size="xs" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Formation
                        </Badge>
                      </Group>
                      {selectedAppointment.certificate_of_incorporation_url ? (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconEye size={14} />}
                          onClick={() =>
                            handleViewDocument(
                              selectedAppointment.certificate_of_incorporation_url!,
                              'Certificate of Incorporation'
                            )
                          }
                        >
                          View
                        </Button>
                      ) : (
                        <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Not Generated
                        </Badge>
                      )}
                    </Group>

                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text size="sm">Bylaws</Text>
                        <Badge color="blue" variant="light" size="xs" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Formation
                        </Badge>
                      </Group>
                      {selectedAppointment.bylaws_url ? (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconEye size={14} />}
                          onClick={() =>
                            handleViewDocument(
                              selectedAppointment.bylaws_url!,
                              'Bylaws'
                            )
                          }
                        >
                          View
                        </Button>
                      ) : (
                        <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Not Generated
                        </Badge>
                      )}
                    </Group>
                  </>
                )}

                {/* Governance Documents */}
                <Group justify="space-between">
                  <Text size="sm">Bylaws Acknowledgment</Text>
                  {selectedAppointment.bylaws_acknowledgment_url ? (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconEye size={14} />}
                      onClick={() =>
                        handleViewDocument(
                          selectedAppointment.bylaws_acknowledgment_url!,
                          'Bylaws Acknowledgment'
                        )
                      }
                    >
                      View
                    </Button>
                  ) : (
                    <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                      Not Generated
                    </Badge>
                  )}
                </Group>

                <Group justify="space-between">
                  <Text size="sm">Fiduciary Duty & Ethics</Text>
                  {selectedAppointment.fiduciary_ethics_url ? (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconEye size={14} />}
                      onClick={() =>
                        handleViewDocument(
                          selectedAppointment.fiduciary_ethics_url!,
                          'Fiduciary Duty & Ethics'
                        )
                      }
                    >
                      View
                    </Button>
                  ) : (
                    <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                      Not Generated
                    </Badge>
                  )}
                </Group>

                <Group justify="space-between">
                  <Text size="sm">Conflict of Interest Disclosure</Text>
                  {selectedAppointment.conflict_disclosure_url ? (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconEye size={14} />}
                      onClick={() =>
                        handleViewDocument(
                          selectedAppointment.conflict_disclosure_url!,
                          'Conflict of Interest Disclosure'
                        )
                      }
                    >
                      View
                    </Button>
                  ) : (
                    <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                      Not Generated
                    </Badge>
                  )}
                </Group>

                <Group justify="space-between">
                  <Text size="sm">Officer Indemnification</Text>
                  {selectedAppointment.officer_indemnification_url ? (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconEye size={14} />}
                      onClick={() =>
                        handleViewDocument(
                          selectedAppointment.officer_indemnification_url!,
                          'Officer Indemnification'
                        )
                      }
                    >
                      View
                    </Button>
                  ) : (
                    <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                      Not Generated
                    </Badge>
                  )}
                </Group>

                {/* Equity Documents */}
                {selectedAppointment.equity_included && (
                  <>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text size="sm">Stock Certificate</Text>
                        <Badge color="green" variant="light" size="xs" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Equity
                        </Badge>
                      </Group>
                      {selectedAppointment.certificate_url ? (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconEye size={14} />}
                          onClick={() =>
                            handleViewDocument(
                              selectedAppointment.certificate_url!,
                              'Stock Certificate'
                            )
                          }
                        >
                          View
                        </Button>
                      ) : (
                        <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Not Generated
                        </Badge>
                      )}
                    </Group>

                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text size="sm">Stock Subscription</Text>
                        <Badge color="green" variant="light" size="xs" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Equity
                        </Badge>
                      </Group>
                      {selectedAppointment.stock_subscription_url ? (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconEye size={14} />}
                          onClick={() =>
                            handleViewDocument(
                              selectedAppointment.stock_subscription_url!,
                              'Stock Subscription'
                            )
                          }
                        >
                          View
                        </Button>
                      ) : (
                        <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Not Generated
                        </Badge>
                      )}
                    </Group>

                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text size="sm">Equity Incentive Plan</Text>
                        <Badge color="green" variant="light" size="xs" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Equity
                        </Badge>
                      </Group>
                      {selectedAppointment.equity_plan_url ? (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconEye size={14} />}
                          onClick={() =>
                            handleViewDocument(
                              selectedAppointment.equity_plan_url!,
                              'Equity Incentive Plan'
                            )
                          }
                        >
                          View
                        </Button>
                      ) : (
                        <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Not Generated
                        </Badge>
                      )}
                    </Group>

                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text size="sm">Option/RSU Award</Text>
                        <Badge color="green" variant="light" size="xs" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Equity
                        </Badge>
                      </Group>
                      {selectedAppointment.option_rsu_award_url ? (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconEye size={14} />}
                          onClick={() =>
                            handleViewDocument(
                              selectedAppointment.option_rsu_award_url!,
                              'Option/RSU Award'
                            )
                          }
                        >
                          View
                        </Button>
                      ) : (
                        <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                          Not Generated
                        </Badge>
                      )}
                    </Group>
                  </>
                )}

                {/* Deferred Compensation */}
                <Group justify="space-between">
                  <Text size="sm">Deferred Compensation</Text>
                  {selectedAppointment.deferred_compensation_url ? (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconEye size={14} />}
                      onClick={() =>
                        handleViewDocument(
                          selectedAppointment.deferred_compensation_url!,
                          'Deferred Compensation'
                        )
                      }
                    >
                      View
                    </Button>
                  ) : (
                    <Badge color="yellow" variant="light" size="sm" style={{ maxWidth: 'none', whiteSpace: 'nowrap' }}>
                      Not Generated
                    </Badge>
                  )}
                </Group>
              </Stack>
            </div>

            <Divider />

            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => handleRegenerateDocuments(selectedAppointment.id)}
              >
                Regenerate All Documents
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Document Viewer Modal */}
      <Modal
        opened={documentModalOpen}
        onClose={() => {
          setDocumentModalOpen(false);
          setSelectedDocumentUrl('');
          setSelectedDocumentName('');
          setDocumentContent('');
        }}
        title={selectedDocumentName}
        size="xl"
      >
        {selectedDocumentUrl && (
          <Paper p="md">
            {loadingDocument ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Text>Loading document...</Text>
              </div>
            ) : selectedDocumentUrl.includes('.html') || selectedDocumentUrl.endsWith('.html') ? (
              // For HTML files, render the fetched content in a sandboxed iframe
              documentContent ? (
                <div style={{ width: '100%', height: '600px', border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <iframe
                    srcDoc={documentContent}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                    title={selectedDocumentName}
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              ) : (
                <iframe
                  src={selectedDocumentUrl}
                  style={{
                    width: '100%',
                    height: '600px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                  }}
                  title={selectedDocumentName}
                  sandbox="allow-same-origin allow-scripts"
                />
              )
            ) : selectedDocumentUrl.endsWith('.pdf') || selectedDocumentUrl.includes('.pdf') ? (
              // For PDF files, use embed
              <embed
                src={selectedDocumentUrl}
                type="application/pdf"
                style={{
                  width: '100%',
                  height: '600px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                }}
              />
            ) : (
              // For other file types, use iframe
              <iframe
                src={selectedDocumentUrl}
                style={{
                  width: '100%',
                  height: '600px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                }}
                title={selectedDocumentName}
              />
            )}
            <Group justify="flex-end" mt="md">
              <Button
                variant="light"
                onClick={() => {
                  window.open(selectedDocumentUrl, '_blank');
                }}
              >
                Open in New Tab
              </Button>
            </Group>
          </Paper>
        )}
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        opened={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingAppointment(null);
        }}
        title="Edit Executive Appointment"
        size="xl"
      >
        {editingAppointment && (
          <form onSubmit={editForm.onSubmit(handleUpdateAppointment)}>
            <Stack gap="md">
              <TextInput
                label="Officer Name"
                required
                {...editForm.getInputProps('proposed_officer_name')}
              />

              <TextInput
                label="Officer Email"
                type="email"
                {...editForm.getInputProps('proposed_officer_email')}
              />

              <TextInput
                label="Title/Position"
                required
                {...editForm.getInputProps('proposed_title')}
              />

              <Select
                label="Appointment Type"
                required
                data={[
                  { value: 'officer', label: 'Corporate Officer' },
                  { value: 'director', label: 'Board Director' },
                  { value: 'executive', label: 'Executive' },
                  { value: 'advisor', label: 'Advisor' },
                ]}
                {...editForm.getInputProps('appointment_type')}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <DatePickerInput
                  label="Effective Date"
                  required
                  value={editForm.values.effective_date}
                  onChange={(value) => editForm.setFieldValue('effective_date', value as any)}
                />

                <DatePickerInput
                  label="Board Meeting Date (Optional)"
                  value={editForm.values.board_meeting_date}
                  onChange={(value) => editForm.setFieldValue('board_meeting_date', value as any)}
                />
              </div>

              <NumberInput
                label="Term Length (Months)"
                min={0}
                {...editForm.getInputProps('term_length_months')}
              />

              <Textarea
                label="Authority Granted"
                rows={3}
                {...editForm.getInputProps('authority_granted')}
              />

              <Textarea
                label="Compensation Structure"
                rows={3}
                {...editForm.getInputProps('compensation_structure')}
              />

              <Checkbox
                label="Equity Included"
                {...editForm.getInputProps('equity_included', { type: 'checkbox' })}
              />

              {editForm.values.equity_included && (
                <Textarea
                  label="Equity Details"
                  rows={3}
                  {...editForm.getInputProps('equity_details')}
                />
              )}

              <Textarea
                label="Notes"
                rows={3}
                {...editForm.getInputProps('notes')}
              />

              <Checkbox
                label="Formation Mode (Pre-Incorporation)"
                {...editForm.getInputProps('formation_mode', { type: 'checkbox' })}
              />

              <Alert color="blue" variant="light">
                After updating, use the "Regenerate Documents" button to create new documents with the updated information.
              </Alert>

              <Group justify="flex-end" mt="md">
                <Button
                  variant="subtle"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingAppointment(null);
                    editForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={updating}
                  leftSection={<IconCheck size={16} />}
                >
                  Update Appointment
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </Container>
  );
};

export default AppointmentList;
