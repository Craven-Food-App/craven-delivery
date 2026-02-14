// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Group,
  Stack,
  Alert,
  Grid,
  Badge,
  Divider,
  Paper,
  Text,
  Button,
  Progress,
  Card,
  List,
  ThemeIcon,
} from '@mantine/core';
import { IconSignature, IconFileText, IconCheck, IconClock, IconArrowRight, IconDownload } from '@tabler/icons-react';
import { WizardLayout, WizardStep } from './shared/WizardLayout';
import { useWizard } from './shared/useWizard';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

interface SigningDocument {
  id: string;
  type: string;
  signature_status: string;
  signed_at: string | null;
  file_url: string | null;
  signing_order: number;
  signing_stage: string;
}

const getDocumentTypeName = (type: string): string => {
  const typeMap: Record<string, string> = {
    'pre_incorporation_consent': 'Pre-Incorporation Consent',
    'certificate_of_incorporation': 'Certificate of Incorporation',
    'company_bylaws': 'Company Bylaws',
    'bylaws_acknowledgment': 'Bylaws Acknowledgment & Consent',
    'board_resolution': 'Board Resolution (Appointment)',
    'appointment_letter': 'Executive Appointment Letter',
    'employment_agreement': 'Employment Agreement',
    'confidentiality_ip': 'Confidentiality & IP Assignment',
    'fiduciary_duty_ethics': 'Fiduciary Duty & Ethics Acknowledgment',
    'conflict_of_interest': 'Conflict of Interest Disclosure',
    'stock_subscription': 'Stock Subscription Agreement',
    'equity_incentive_plan': 'Equity Incentive Plan',
    'option_rsu_award': 'Option/RSU Award Agreement',
    'deferred_compensation': 'Deferred Compensation Agreement',
    'officer_indemnification': 'Officer Indemnification Agreement',
  };
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const DocumentSigningWizard: React.FC = () => {
  const navigate = useNavigate();
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<SigningDocument[]>([]);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signingDeadline, setSigningDeadline] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: execUser } = await supabase
        .from('exec_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!execUser) return;

      const { data: appointments, error: appointmentError } = await supabase
        .from('executive_appointments')
        .select('*')
        .in('status', ['authorized_to_offer', 'offer_accepted', 'documents_generated', 'documents_sent', 'signing_in_progress', 'partially_signed'])
        .order('created_at', { ascending: false });

      if (appointmentError) throw appointmentError;

      const myAppointment = appointments?.find(apt => 
        apt.proposed_title?.toLowerCase() === execUser.role?.toLowerCase() ||
        apt.proposed_title?.toLowerCase().includes(execUser.role?.toLowerCase())
      );

      if (myAppointment) {
        setAppointmentId(myAppointment.id);
        
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 30);
        setSigningDeadline(deadline.toISOString());

        const { data: docs, error: docsError } = await supabase
          .from('executive_documents')
          .select('*')
          .eq('appointment_id', myAppointment.id)
          .neq('status', 'generated_for_board_only')
          .order('signing_stage', { ascending: true })
          .order('signing_order', { ascending: true });

        if (docsError) throw docsError;
        
        const sortedDocs = (docs || []).sort((a, b) => {
          if (a.signing_stage !== b.signing_stage) {
            return a.signing_stage.localeCompare(b.signing_stage);
          }
          return (a.signing_order || 0) - (b.signing_order || 0);
        });
        
        setDocuments(sortedDocs);
        
        // Find first unsigned document
        const firstUnsigned = sortedDocs.findIndex(doc => doc.signature_status !== 'signed');
        if (firstUnsigned >= 0) {
          setCurrentDocumentIndex(firstUnsigned);
        }
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load documents',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignDocument = async () => {
    try {
      if (!appointmentId) {
        notifications.show({
          title: 'Error',
          message: 'Unable to access signing portal',
          color: 'red',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-executive-signature-token', {
        body: { appointment_id: appointmentId }
      });

      if (error || !data?.ok) {
        notifications.show({
          title: 'Error',
          message: 'Failed to generate signing link',
          color: 'red',
        });
        return;
      }

      navigate(`/executive/sign?token=${data.token}`);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to access signing portal',
        color: 'red',
      });
    }
  };

  const completedCount = documents.filter(doc => doc.signature_status === 'signed').length;
  const totalCount = documents.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const currentDocument = documents[currentDocumentIndex];

  const validateOverview = (): boolean => {
    if (documents.length === 0) {
      notifications.show({
        title: 'No Documents',
        message: 'No documents available for signing',
        color: 'yellow',
      });
      return false;
    }
    return true;
  };

  const handleComplete = async () => {
    notifications.show({
      title: 'All Documents Signed',
      message: 'Congratulations! All documents have been signed. Your appointment is now ready for Corporate Secretary validation.',
      color: 'green',
      icon: <IconCheck size={16} />,
    });
    
    // Reload to check status
    await loadDocuments();
  };

  const steps: WizardStep[] = [
    {
      label: 'Overview',
      description: 'Review documents to sign',
      icon: <IconFileText size={18} />,
      component: (
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Welcome to the document signing process. You need to sign {totalCount} documents to complete your executive appointment.
          </Alert>
          <Card padding="lg" withBorder>
            <Stack gap="md">
              <div>
                <Text size="sm" fw={600} c="dimmed" mb="xs">Signing Progress</Text>
                <Progress value={progressPercentage} size="lg" color="green" mb="xs" />
                <Group justify="space-between">
                  <Text size="sm">
                    {completedCount} of {totalCount} documents signed
                  </Text>
                  <Text size="sm" fw={600} c="green">
                    {Math.round(progressPercentage)}% Complete
                  </Text>
                </Group>
              </div>
              {signingDeadline && (
                <Alert color="yellow" variant="light">
                  <Text size="sm">
                    <strong>Signing Deadline:</strong> {dayjs(signingDeadline).format('MMMM D, YYYY')}
                  </Text>
                </Alert>
              )}
            </Stack>
          </Card>
          <Card padding="md" withBorder>
            <Text size="sm" fw={600} mb="md">Documents to Sign</Text>
            <List spacing="xs">
              {documents.map((doc, index) => (
                <List.Item
                  key={doc.id}
                  icon={
                    <ThemeIcon
                      color={doc.signature_status === 'signed' ? 'green' : 'gray'}
                      size={20}
                      radius="xl"
                    >
                      {doc.signature_status === 'signed' ? (
                        <IconCheck size={12} />
                      ) : (
                        <IconClock size={12} />
                      )}
                    </ThemeIcon>
                  }
                >
                  <Group justify="space-between">
                    <Text size="sm">{getDocumentTypeName(doc.type)}</Text>
                    <Badge
                      color={doc.signature_status === 'signed' ? 'green' : 'yellow'}
                      variant="light"
                      size="sm"
                    >
                      {doc.signature_status === 'signed' ? 'Signed' : 'Pending'}
                    </Badge>
                  </Group>
                </List.Item>
              ))}
            </List>
          </Card>
        </Stack>
      ),
      validate: validateOverview,
    },
    {
      label: 'Sign Documents',
      description: 'Sign each document in order',
      icon: <IconSignature size={18} />,
      component: (
        <Stack gap="md">
          {currentDocument ? (
            <>
              <Alert color="blue" variant="light">
                You are currently signing: <strong>{getDocumentTypeName(currentDocument.type)}</strong>
              </Alert>
              <Card padding="lg" withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <div>
                      <Text size="lg" fw={600} mb={4}>
                        {getDocumentTypeName(currentDocument.type)}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Document {currentDocumentIndex + 1} of {totalCount}
                      </Text>
                    </div>
                    <Badge
                      color={currentDocument.signature_status === 'signed' ? 'green' : 'yellow'}
                      variant="light"
                      size="lg"
                    >
                      {currentDocument.signature_status === 'signed' ? 'Signed' : 'Pending'}
                    </Badge>
                  </Group>
                  <Divider />
                  {currentDocument.signature_status === 'signed' ? (
                    <Alert color="green" variant="light" icon={<IconCheck size={16} />}>
                      <Text size="sm">This document has been signed on {dayjs(currentDocument.signed_at).format('MMMM D, YYYY')}</Text>
                    </Alert>
                  ) : (
                    <Alert color="yellow" variant="light">
                      <Text size="sm" mb="md">
                        This document requires your signature. Click the button below to open the signing portal.
                      </Text>
                      <Button
                        leftSection={<IconSignature size={16} />}
                        onClick={handleSignDocument}
                        size="md"
                        fullWidth
                      >
                        Sign This Document
                      </Button>
                    </Alert>
                  )}
                  {currentDocument.file_url && (
                    <Button
                      variant="light"
                      leftSection={<IconDownload size={16} />}
                      component="a"
                      href={currentDocument.file_url}
                      target="_blank"
                      size="sm"
                    >
                      Download Document
                    </Button>
                  )}
                </Stack>
              </Card>
              <Group justify="space-between" mt="md">
                <Button
                  variant="subtle"
                  onClick={() => {
                    if (currentDocumentIndex > 0) {
                      setCurrentDocumentIndex(currentDocumentIndex - 1);
                    }
                  }}
                  disabled={currentDocumentIndex === 0}
                >
                  Previous Document
                </Button>
                <Button
                  onClick={() => {
                    if (currentDocumentIndex < documents.length - 1) {
                      setCurrentDocumentIndex(currentDocumentIndex + 1);
                    }
                  }}
                  disabled={currentDocumentIndex >= documents.length - 1}
                  rightSection={<IconArrowRight size={16} />}
                >
                  Next Document
                </Button>
              </Group>
            </>
          ) : (
            <Alert color="gray" variant="light">
              No documents available for signing
            </Alert>
          )}
        </Stack>
      ),
      validate: () => true,
    },
    {
      label: 'Completion',
      description: 'All documents signed',
      icon: <IconCheck size={18} />,
      component: (
        <Stack gap="md">
          {completedCount === totalCount ? (
            <>
              <Alert color="green" variant="light" icon={<IconCheck size={16} />}>
                <Text size="lg" fw={600} mb="xs">Congratulations!</Text>
                <Text size="sm">
                  All {totalCount} documents have been successfully signed. Your appointment is now ready for Corporate Secretary validation.
                </Text>
              </Alert>
              <Card padding="lg" withBorder style={{ backgroundColor: '#f0fdf4' }}>
                <Stack gap="xs">
                  <Text size="sm" fw={600} c="green">Next Steps</Text>
                  <List size="sm" spacing="xs">
                    <List.Item>Corporate Secretary will review your signed documents</List.Item>
                    <List.Item>Once validated, you will be activated as an executive officer</List.Item>
                    <List.Item>You will receive access to executive portals and systems</List.Item>
                  </List>
                </Stack>
              </Card>
            </>
          ) : (
            <Alert color="yellow" variant="light">
              <Text size="sm">
                You still have {totalCount - completedCount} document(s) remaining to sign. Please complete all signatures before finalizing.
              </Text>
            </Alert>
          )}
        </Stack>
      ),
      validate: () => completedCount === totalCount,
    },
  ];

  const wizard = useWizard({
    steps,
    onComplete: handleComplete,
  });

  if (loading) {
    return (
      <Paper p="xl" radius="md">
        <Stack align="center" gap="md">
          <Text>Loading documents...</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <WizardLayout
      title="Document Signing Process"
      subtitle="Step-by-step guide to sign all required executive documents"
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
  );
};

export default DocumentSigningWizard;




















































