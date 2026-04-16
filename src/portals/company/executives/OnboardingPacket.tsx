// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
} from '@mantine/core';
import { IconFileText, IconCheck, IconClock, IconAlertCircle, IconSignature, IconDownload, IconCircleCheck, IconRefresh } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { PACKET_LABELS, PacketId } from '@/utils/executiveDocumentFlow';
import FinalActivationStage from '@/components/executive/compliance/FinalActivationStage';

type OnboardingDocument = Database['public']['Tables']['executive_documents']['Row'];

const DOCUMENT_TYPE_ALIASES: Record<string, string> = {
  offer_letter: 'appointment_letter',
  company_bylaws: 'bylaws',
  fiduciary_ethics_ack: 'fiduciary_ethics',
  conflict_of_interest: 'conflict_disclosure',
  stock_issuance: 'stock_subscription',
  deferred_comp_addendum: 'deferred_compensation',
  equity_incentive_plan: 'equity_plan',
};

const getCanonicalDocumentType = (type: string): string => DOCUMENT_TYPE_ALIASES[type] || type;

const getDocumentCreatedTime = (doc: OnboardingDocument): number => {
  if (!doc.created_at) return 0;
  const time = new Date(doc.created_at).getTime();
  return Number.isFinite(time) ? time : 0;
};

const dedupeDocuments = (docs: OnboardingDocument[]): OnboardingDocument[] => {
  // Filter out orphan docs that have no packet_id/signing_stage — they are
  // legacy or regeneration artefacts that would shadow properly-staged docs.
  const staged = docs.filter(d => d.packet_id && d.signing_stage != null);

  const latestByType = new Map<string, OnboardingDocument>();

  // Sort newest first so, within the same canonical type, the freshest wins
  [...staged]
    .sort((a, b) => getDocumentCreatedTime(b) - getDocumentCreatedTime(a))
    .forEach((doc) => {
      const key = getCanonicalDocumentType(doc.type);
      if (!latestByType.has(key)) {
        latestByType.set(key, doc);
      }
    });

  return [...latestByType.values()].sort((a, b) => {
    const stageDiff = (a.signing_stage || 0) - (b.signing_stage || 0);
    if (stageDiff !== 0) return stageDiff;

    const orderDiff = (a.signing_order || 0) - (b.signing_order || 0);
    if (orderDiff !== 0) return orderDiff;

    return getDocumentCreatedTime(b) - getDocumentCreatedTime(a);
  });
};

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
  const [canRegenerate, setCanRegenerate] = useState(false);
  const [appointmentStatus, setAppointmentStatus] = useState<string>('');
  const [awaitingSecretaryReview, setAwaitingSecretaryReview] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [documentViewerTitle, setDocumentViewerTitle] = useState('');
  const [documentViewerBlobUrl, setDocumentViewerBlobUrl] = useState<string | null>(null);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const documentViewerBlobRef = useRef<string | null>(null);

  const revokeDocumentViewerBlob = () => {
    const url = documentViewerBlobRef.current;
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    documentViewerBlobRef.current = null;
    setDocumentViewerBlobUrl(null);
  };

  useEffect(() => {
    loadOnboarding();
  }, []);

  useEffect(() => {
    return () => {
      const url = documentViewerBlobRef.current;
      if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      documentViewerBlobRef.current = null;
    };
  }, []);

  const loadOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has regeneration privileges (board member, CEO, or secretary)
      const { data: execUser } = await supabase
        .from('exec_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!execUser) return;
      setExecutiveId(execUser.id);
      setExecutiveName(execUser.full_name || execUser.name || '');

      // Check board membership and roles for regenerate permission
      const { data: boardMember } = await supabase
        .from('board_members')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const execRole = (execUser.role || execUser.title || '').toLowerCase();
      const isCeoOrSecretary = execRole.includes('ceo') || 
        execRole.includes('chief executive') || 
        execRole.includes('secretary');
      
      setCanRegenerate(!!boardMember || isCeoOrSecretary);

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
        setAppointmentStatus(myAppointment.status || '');
        
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

        const visibleDocs = dedupeDocuments(docs || []);
        setDocuments(visibleDocs);

        const allSigned = visibleDocs.length > 0 && visibleDocs.every(d => d.signature_status === 'signed');
        
        // Final Activation only unlocks AFTER Secretary approves the signed packet
        const secretaryApproved = ['SECRETARY_APPROVED', 'ACTIVATING', 'payroll_ready'].includes(myAppointment.status);
        setShowFinalActivation(allSigned && secretaryApproved);
        
        // If all docs signed but secretary hasn't reviewed yet, show waiting state
        const pendingReview = allSigned && !secretaryApproved;
        setAwaitingSecretaryReview(pendingReview);
        
        // Auto-transition appointment to READY_FOR_SECRETARY_REVIEW if all signed and still in signing status
        if (allSigned && ['partially_signed', 'signing_in_progress', 'fully_signed'].includes(myAppointment.status)) {
          await supabase
            .from('executive_appointments')
            .update({ status: 'READY_FOR_SECRETARY_REVIEW', updated_at: new Date().toISOString() })
            .eq('id', myAppointment.id);
          setAppointmentStatus('READY_FOR_SECRETARY_REVIEW');
        }

        // Auto-advance: if secretary approved AND compliance is already complete, skip to active
        if (myAppointment.status === 'SECRETARY_APPROVED' && myAppointment.compliance_status === 'payroll_ready') {
          await supabase
            .from('executive_appointments')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', myAppointment.id);
          setAppointmentStatus('active');
          setShowFinalActivation(false);
        }
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

  const looksLikeHtmlContent = (snippet: string): boolean => {
    const s = snippet.trimStart().slice(0, 800).toLowerCase();
    return (
      s.startsWith('<!doctype') ||
      s.startsWith('<html') ||
      s.startsWith('<head') ||
      s.startsWith('<!--') ||
      (s.startsWith('<') && /<(html|head|body|div|table|style|meta|title)\b/i.test(s))
    );
  };

  const handleViewDocument = async (doc: OnboardingDocument) => {
    const url = getDocumentUrl(doc);
    if (!url) {
      notifications.show({ title: 'No document', message: 'This document has no file URL yet.', color: 'yellow' });
      return;
    }

    const lower = url.toLowerCase();
    if (lower.includes('.pdf') || lower.endsWith('.pdf')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    setViewingDocId(doc.id);
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) {
        throw new Error(`Failed to load document (${res.status})`);
      }
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      const text = await res.text();
      const treatAsHtml =
        contentType.includes('text/html') ||
        lower.includes('.html') ||
        lower.includes('.htm') ||
        looksLikeHtmlContent(text);

      if (treatAsHtml) {
        revokeDocumentViewerBlob();
        const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        documentViewerBlobRef.current = blobUrl;
        setDocumentViewerBlobUrl(blobUrl);
        setDocumentViewerTitle(getDocumentTypeName(doc.type));
        setDocumentViewerOpen(true);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setViewingDocId(null);
    }
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
          {canRegenerate && (
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
          )}
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
                              onClick={() => handleViewDocument(doc)}
                              loading={viewingDocId === doc.id}
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

        {awaitingSecretaryReview && (
          <Alert icon={<IconClock size={16} />} title="Awaiting Secretary Review" color="blue">
            All documents have been signed. Your packet is now pending review by the Corporate Secretary before final activation steps (tax, eligibility, and direct deposit) become available.
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

        <Modal
          opened={documentViewerOpen}
          onClose={() => {
            setDocumentViewerOpen(false);
            revokeDocumentViewerBlob();
          }}
          title={documentViewerTitle || 'Document'}
          size="95%"
          styles={{ body: { padding: 0 } }}
        >
          {documentViewerBlobUrl && (
            <iframe
              title={documentViewerTitle}
              src={documentViewerBlobUrl}
              style={{
                width: '100%',
                height: '85vh',
                border: 'none',
                display: 'block',
              }}
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-downloads"
            />
          )}
        </Modal>
      </Stack>
    </Container>
  );
};

export default OnboardingPacket;

