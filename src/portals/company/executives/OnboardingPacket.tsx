// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  Button,
  Progress,
  Alert,
  Loader,
  Paper,
  SimpleGrid,
} from '@mantine/core';
import { IconFileText, IconCheck, IconClock, IconAlertCircle, IconSignature, IconDownload, IconCircleCheck } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { PACKET_LABELS, PacketId } from '@/utils/executiveDocumentFlow';

type OnboardingDocument = Database['public']['Tables']['executive_documents']['Row'];

const OnboardingPacket: React.FC = () => {
  const navigate = useNavigate();
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<OnboardingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingDeadline, setSigningDeadline] = useState<string | null>(null);

  useEffect(() => {
    loadOnboarding();
  }, []);

  const loadOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find user's executive record
      const { data: execUser } = await supabase
        .from('exec_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!execUser) return;

      // Find their appointment in executive_appointments
      const { data: appointments, error: appointmentError } = await supabase
        .from('executive_appointments')
        .select('*')
        .in('status', ['authorized_to_offer', 'offer_accepted', 'documents_generated', 'documents_sent', 'signing_in_progress', 'partially_signed'])
        .order('created_at', { ascending: false });

      if (appointmentError) throw appointmentError;

      // Find appointment matching this executive's role/title
      const myAppointment = appointments?.find(apt => 
        apt.proposed_title?.toLowerCase() === execUser.role?.toLowerCase() ||
        apt.proposed_title?.toLowerCase().includes(execUser.role?.toLowerCase())
      );

      if (myAppointment) {
        setAppointmentId(myAppointment.id);
        
        // Calculate signing deadline (30 days from document generation or now)
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 30);
        setSigningDeadline(deadline.toISOString());

        // Load executive documents for signing
        const { data: docs, error: docsError } = await supabase
          .from('executive_documents')
          .select('*')
          .eq('appointment_id', myAppointment.id)
          .neq('status', 'generated_for_board_only')
          .order('signing_stage', { ascending: true })
          .order('signing_order', { ascending: true });

        if (docsError) throw docsError;
        setDocuments(docs || []);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load onboarding',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'green';
      case 'pending':
      case 'sent':
        return 'yellow';
      default:
        return 'blue';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <IconCheck size={16} />;
      case 'pending':
      case 'sent':
        return <IconClock size={16} />;
      default:
        return <IconFileText size={16} />;
    }
  };

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

  const getDocumentUrl = (doc: OnboardingDocument): string | null => {
    return doc.file_url || doc.signed_file_url || null;
  };

  const getDocumentIcon = (doc: OnboardingDocument) => {
    const status = doc.signature_status || 'pending';
    return getStatusIcon(status);
  };

  const completedCount = documents.filter(doc => doc.signature_status === 'signed').length;
  const totalCount = documents.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleSignDocument = async (document: OnboardingDocument) => {
    try {
      if (document.signature_token) {
        navigate(`/executive/sign?token=${document.signature_token}`);
        return;
      }

      if (!appointmentId) {
        notifications.show({
          title: 'Error',
          message: 'Unable to access signing portal',
          color: 'red',
        });
        return;
      }

      // Generate token via edge function (uses service role to bypass RLS)
      const { data, error } = await supabase.functions.invoke('generate-executive-signature-token', {
        body: { appointment_id: appointmentId }
      });

      if (error || !data?.ok) {
        console.error('Error generating signature token:', error || data?.error);
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

  const handleGoToSigning = async () => {
    try {
      // Get a signature token from one of the documents
      // All documents for an executive share the same token
      const docWithToken = documents.find(doc => doc.signature_token);
      
      if (docWithToken?.signature_token) {
        // Use existing token
        navigate(`/executive/sign?token=${docWithToken.signature_token}`);
        return;
      }

      if (!appointmentId) {
        notifications.show({
          title: 'Error',
          message: 'Unable to access signing portal',
          color: 'red',
        });
        return;
      }

      // Generate token via edge function (uses service role to bypass RLS)
      const { data, error } = await supabase.functions.invoke('generate-executive-signature-token', {
        body: { appointment_id: appointmentId }
      });

      if (error || !data?.ok) {
        console.error('Error generating signature token:', error || data?.error);
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

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Loader size="lg" />
      </Container>
    );
  }

  if (!appointmentId) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="No Active Onboarding" color="blue">
          You don't have any active onboarding packets. If you're expecting documents, please contact the executive team.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={2} c="dark" mb="xs">
            <IconFileText size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 12 }} />
            Executive Onboarding Packet
          </Title>
          <Text c="dimmed">
            Review and sign your appointment documents to complete your onboarding.
          </Text>
        </div>

        <Card padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  Onboarding Progress
                </Text>
                <Text size="xl" fw={700}>
                  {completedCount} of {totalCount} documents signed
                </Text>
              </div>
              <Badge color={completedCount === totalCount && totalCount > 0 ? 'green' : 'yellow'} size="lg">
                {completedCount === totalCount && totalCount > 0 ? 'COMPLETE' : 'IN PROGRESS'}
              </Badge>
            </Group>

            <Progress value={progressPercentage} size="lg" color="green" />

            {signingDeadline && completedCount < totalCount && (
              <Alert icon={<IconClock size={16} />} color="yellow" title="Signing Deadline">
                Please complete all signatures by {new Date(signingDeadline).toLocaleDateString()}
              </Alert>
            )}
          </Stack>
        </Card>

        <Stack gap="xl">
          {Object.entries(PACKET_LABELS).map(([packetId, label]) => {
            const stageDocuments = documents.filter(doc => doc.packet_id === packetId);
            if (stageDocuments.length === 0) return null;

            const stageCompletedCount = stageDocuments.filter(d => d.signature_status === 'signed').length;
            const stageProgress = (stageCompletedCount / stageDocuments.length) * 100;

            return (
              <Paper key={packetId} shadow="sm" p="lg" withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <div>
                      <Text size="lg" fw={600}>{label}</Text>
                      <Text size="sm" c="dimmed">
                        {stageCompletedCount} of {stageDocuments.length} documents signed
                      </Text>
                    </div>
                    <Badge 
                      color={stageCompletedCount === stageDocuments.length ? 'green' : 'yellow'} 
                      size="lg"
                    >
                      {stageCompletedCount === stageDocuments.length ? 'COMPLETE' : 'IN PROGRESS'}
                    </Badge>
                  </Group>

                  <Progress value={stageProgress} size="sm" color="green" />

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    {stageDocuments.map((doc) => (
                      <Paper key={doc.id} shadow="xs" p="md" withBorder bg="gray.0">
                        <Stack gap="md">
                          <Group justify="space-between">
                            <div>
                              <Group gap="xs">
                                {getDocumentIcon(doc)}
                                <Text fw={500} size="sm">{getDocumentTypeName(doc.type)}</Text>
                              </Group>
                              <Text size="xs" c="dimmed" mt={4}>
                                Stage {doc.signing_stage || 0}, Order {doc.signing_order || 0}
                              </Text>
                            </div>
                            <Badge color={getStatusColor(doc.signature_status || 'pending')} size="sm">
                              {doc.signature_status || 'pending'}
                            </Badge>
                          </Group>

                          {doc.signature_status === 'pending' && (
                            <Button
                              onClick={() => handleSignDocument(doc)}
                              leftSection={<IconSignature size={16} />}
                              color="green"
                              size="sm"
                            >
                              Sign Document
                            </Button>
                          )}

                          {doc.signature_status === 'signed' && doc.signed_at && (
                            <Alert icon={<IconCircleCheck size={16} />} color="green" p="xs">
                              <Text size="xs">Signed on {new Date(doc.signed_at).toLocaleDateString()}</Text>
                            </Alert>
                          )}

                          {(doc.file_url || doc.signed_file_url) && (
                            <Button
                              variant="outline"
                              onClick={() => window.open(getDocumentUrl(doc), '_blank')}
                              leftSection={<IconDownload size={16} />}
                              size="sm"
                            >
                              View Document
                            </Button>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </SimpleGrid>
                </Stack>
              </Paper>
            );
          })}
        </Stack>

        {completedCount === totalCount && totalCount > 0 && (
          <Alert icon={<IconCheck size={16} />} title="All Documents Signed" color="green">
            Congratulations! You have completed signing all required documents. Your appointment will be finalized shortly.
          </Alert>
        )}

        <Group justify="center" mt="md">
          <Button
            size="lg"
            leftSection={<IconSignature size={20} />}
            onClick={handleGoToSigning}
            disabled={completedCount === totalCount}
          >
            Go to Signing Portal
          </Button>
        </Group>
      </Stack>
    </Container>
  );
};

export default OnboardingPacket;

