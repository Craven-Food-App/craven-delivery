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
import { IconFileText, IconCheck, IconClock, IconAlertCircle, IconSignature, IconDownload, IconCircleCheck, IconRefresh } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { PACKET_LABELS, PacketId } from '@/utils/executiveDocumentFlow';
import FinalActivationStage from '@/components/executive/compliance/FinalActivationStage';

type OnboardingDocument = Database['public']['Tables']['executive_documents']['Row'];

const OnboardingPacket: React.FC = () => {
  const navigate = useNavigate();
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<OnboardingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [signingDeadline, setSigningDeadline] = useState<string | null>(null);
  const [executiveId, setExecutiveId] = useState<string | null>(null);
  const [executiveName, setExecutiveName] = useState<string>('');
  const [showFinalActivation, setShowFinalActivation] = useState(false);

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
      setExecutiveId(execUser.id);
      setExecutiveName(execUser.full_name || execUser.name || '');

      // Find their appointment by matching executive_id directly
      const { data: appointments, error: appointmentError } = await supabase
        .from('executive_appointments')
        .select('*')
        .eq('executive_id', execUser.id)
        .not('status', 'in', '("terminated","rejected")')
        .order('created_at', { ascending: false })
        .limit(1);

      if (appointmentError) throw appointmentError;

      const myAppointment = appointments?.[0];

      if (myAppointment) {
        setAppointmentId(myAppointment.id);
        
        // Calculate signing deadline (30 days from document generation or now)
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 30);
        setSigningDeadline(deadline.toISOString());

        // Load executive documents for signing - try appointment_id first, fallback to executive_id
        let { data: docs, error: docsError } = await supabase
          .from('executive_documents')
          .select('*')
          .eq('appointment_id', myAppointment.id)
          .neq('status', 'generated_for_board_only')
          .order('signing_stage', { ascending: true })
          .order('signing_order', { ascending: true });

        // Fallback: query by executive_id if no docs found by appointment_id
        if ((!docs || docs.length === 0) && execUser?.id) {
          const { data: docsByExec, error: docsByExecError } = await supabase
            .from('executive_documents')
            .select('*')
            .eq('executive_id', execUser.id)
            .neq('status', 'generated_for_board_only')
            .order('signing_stage', { ascending: true })
            .order('signing_order', { ascending: true });
          if (!docsByExecError && docsByExec && docsByExec.length > 0) {
            docs = docsByExec;
            docsError = null;
          }
        }

        if (docsError) throw docsError;
        setDocuments(docs || []);

        // Check if all core docs are signed → unlock Final Activation
        const allSigned = docs && docs.length > 0 && docs.every(d => d.signature_status === 'signed');
        setShowFinalActivation(!!allSigned);
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

  const handleRegeneratePacket = async () => {
    if (!appointmentId) return;
    setRegenerating(true);
    try {
      // Call the backfill edge function with force_regenerate
      const { data, error } = await supabase.functions.invoke('governance-backfill-appointment-documents', {
        body: {
          appointment_id: appointmentId,
          force_regenerate: true,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Reset document statuses to pending so they can be re-signed
      await supabase
        .from('executive_documents')
        .update({
          signature_status: 'pending',
          status: 'generated',
          signed_file_url: null,
          signed_at: null,
          signed_by_user: null,
          signer_roles: null,
        })
        .eq('appointment_id', appointmentId);

      // Generate fresh signature tokens
      await supabase.functions.invoke('generate-executive-signature-token', {
        body: { appointment_id: appointmentId },
      });

      notifications.show({
        title: 'Documents Regenerated',
        message: 'All documents have been regenerated with the latest templates. You can now re-sign them.',
        color: 'green',
      });

      // Reload
      setLoading(true);
      await loadOnboarding();
    } catch (error: any) {
      console.error('Error regenerating packet:', error);
      notifications.show({
        title: 'Regeneration Failed',
        message: error.message || 'Failed to regenerate documents',
        color: 'red',
      });
    } finally {
      setRegenerating(false);
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
      'certificate': 'Certificate of Appointment',
      'certificate_of_incorporation': 'Certificate of Incorporation',
      'board_resolution': 'Board Resolution (Appointment)',
      'bylaws_officers_excerpt': 'Bylaws – Officers (Excerpt)',
      'bylaws': 'Company Bylaws',
      'bylaws_acknowledgment': 'Bylaws Acknowledgment & Consent',
      'offer_letter': 'Executive Offer Letter',
      'appointment_letter': 'Executive Appointment Letter',
      'confidentiality_ip': 'Confidentiality & IP Assignment',
      'employment_agreement': 'Employment Agreement',
      'fiduciary_ethics': 'Fiduciary Duty & Ethics Acknowledgment',
      'conflict_disclosure': 'Conflict of Interest Disclosure',
      'officer_indemnification': 'Officer Indemnification Agreement',
      'deferred_comp_addendum': 'Deferred Compensation Addendum',
      'deferred_compensation': 'Deferred Compensation Agreement',
      'stock_issuance': 'Stock Subscription/Issuance Agreement',
      'stock_subscription': 'Stock Subscription Agreement',
      'founders_agreement': "Founders' Agreement",
      'shareholders_agreement': "Shareholders' Agreement",
      'equity_plan': 'Equity Incentive Plan',
      'option_rsu_award': 'Option/RSU Award Agreement',
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
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2} c="dark" mb="xs">
              <IconFileText size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 12 }} />
              Executive Onboarding Packet
            </Title>
            <Text c="dimmed">
              Review and sign your appointment documents to complete your onboarding.
            </Text>
          </div>
          <Button
            variant="outline"
            color="orange"
            leftSection={<IconRefresh size={16} />}
            onClick={handleRegeneratePacket}
            loading={regenerating}
            size="sm"
          >
            Regenerate Documents
          </Button>
        </Group>

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

        {completedCount === totalCount && totalCount > 0 && !showFinalActivation && (
          <Alert icon={<IconCheck size={16} />} title="All Documents Signed" color="green">
            Congratulations! You have completed signing all required documents. Your appointment will be finalized shortly.
          </Alert>
        )}

        {showFinalActivation && appointmentId && executiveId && (
          <Paper shadow="sm" p="lg" withBorder>
            <Stack gap="md">
              <Title order={3} c="dark">
                <IconCircleCheck size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
                Final Activation
              </Title>
              <FinalActivationStage
                appointmentId={appointmentId}
                executiveId={executiveId}
                executiveName={executiveName}
              />
            </Stack>
          </Paper>
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

