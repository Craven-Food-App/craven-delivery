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
  Table,
  Modal,
} from '@mantine/core';
import { IconFileText, IconCheck, IconClock, IconAlertCircle, IconSignature } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';

type OnboardingDocument = Database['public']['Tables']['executive_documents']['Row'];

interface Onboarding {
  id: string;
  appointment_id: string;
  status: string;
  documents_required: any[];
  documents_completed: any[];
  signing_deadline: string | null;
}

const OnboardingPacket: React.FC = () => {
  const navigate = useNavigate();
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [documents, setDocuments] = useState<OnboardingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingModalOpen, setSigningModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<OnboardingDocument | null>(null);

  useEffect(() => {
    loadOnboarding();
  }, []);

  const loadOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's active onboarding
      const { data: onboardingData, error: onboardingError } = await supabase
        .from('executive_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'documents_sent', 'signing_in_progress', 'partially_signed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (onboardingError) throw onboardingError;

      if (onboardingData) {
        // @ts-ignore - Database query type compatibility
        setOnboarding(onboardingData);

        // Load executive documents for signing (only those with signature requirements)
        const { data: docs, error: docsError } = await supabase
          .from('executive_documents')
          .select('*')
          .eq('appointment_id', onboardingData.appointment_id)
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

  const completedCount = documents.filter(doc => doc.signature_status === 'signed').length;
  const totalCount = documents.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleSignDocument = (document: OnboardingDocument) => {
    setSelectedDocument(document);
    setSigningModalOpen(true);
  };

  const handleGoToSigning = () => {
    navigate('/executive/sign');
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Loader size="lg" />
      </Container>
    );
  }

  if (!onboarding) {
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
              <Badge color={getStatusColor(onboarding.status)} size="lg">
                {onboarding.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </Group>

            <Progress value={progressPercentage} size="lg" color="green" />

            {onboarding.signing_deadline && (
              <Alert icon={<IconClock size={16} />} color="yellow" title="Signing Deadline">
                Please complete all signatures by {new Date(onboarding.signing_deadline).toLocaleDateString()}
              </Alert>
            )}
          </Stack>
        </Card>

        <Card padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">Documents to Sign</Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Document</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {documents.map((doc) => {
                const docUrl = getDocumentUrl(doc);
                const status = doc.signature_status || 'pending';
                const stage = doc.signing_stage || 0;
                return (
                  <Table.Tr key={doc.id}>
                    <Table.Td>
                      <Text fw={500}>{getDocumentTypeName(doc.type)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">Stage {stage}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getStatusColor(status)}
                        leftSection={getStatusIcon(status)}
                      >
                        {status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {status !== 'signed' && (
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconSignature size={14} />}
                            onClick={() => handleSignDocument(doc)}
                          >
                            Sign
                          </Button>
                        )}
                        {docUrl && (
                          <Button
                            size="xs"
                            variant="subtle"
                            component="a"
                            href={docUrl}
                            target="_blank"
                          >
                            View
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          {documents.length === 0 && (
            <Alert icon={<IconAlertCircle size={16} />} title="No Documents" color="blue" mt="md">
              No documents have been assigned to your onboarding packet yet.
            </Alert>
          )}
        </Card>

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

        <Modal
          opened={signingModalOpen}
          onClose={() => {
            setSigningModalOpen(false);
            setSelectedDocument(null);
          }}
          title={`Sign ${selectedDocument ? getDocumentTypeName(selectedDocument.type) : 'Document'}`}
          size="lg"
        >
          <Stack gap="md">
            <Text>You will be redirected to the signing portal to complete this document.</Text>
            <Button
              fullWidth
              onClick={() => {
                setSigningModalOpen(false);
                navigate('/executive/sign');
              }}
            >
              Continue to Signing Portal
            </Button>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
};

export default OnboardingPacket;

