import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Table,
  Badge,
  Button,
  Group,
  TextInput,
  Select,
  Loader,
  Alert,
  Anchor,
} from '@mantine/core';
import { IconFolder, IconDownload, IconEye, IconAlertCircle, IconFileText } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

interface Document {
  id: string;
  title: string;
  type: string;
  signing_status: string;
  created_at: string;
  pdf_url?: string;
  html_template?: string;
}

const DocumentVault: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  const loadDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get exec_users.id for current user
      const { data: currentExec, error: execError } = await supabase
        .from('exec_users')
        .select('id, user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (execError || !currentExec) {
        console.error('Unable to verify executive status:', execError);
        setDocuments([]);
        setLoading(false);
        return;
      }

      // Fetch documents from executive_documents table (primary source)
      let query = supabase
        .from('executive_documents')
        .select('id, type, file_url, signature_status, created_at, appointment_id')
        .eq('executive_id', currentExec.id)
        .order('created_at', { ascending: false });

      const { data: execDocs, error: execDocsError } = await query;

      if (execDocsError) {
        console.error('Error fetching executive_documents:', execDocsError);
      }

      // Also fetch from executive_appointments URLs
      const { data: appointments } = await supabase
        .from('executive_appointments')
        .select('id, proposed_officer_email, proposed_officer_name, appointment_letter_url, board_resolution_url, certificate_url, employment_agreement_url, confidentiality_ip_url, stock_subscription_url, deferred_compensation_url, pre_incorporation_consent_url, created_at')
        .eq('proposed_officer_email', user.email)
        .in('status', ['APPROVED', 'SENT_TO_BOARD', 'ACTIVE', 'DRAFT', 'AWAITING_SIGNATURES', 'READY_FOR_SECRETARY_REVIEW', 'BOARD_ADOPTED']);

      // Build document list from appointments
      const appointmentDocs: Document[] = [];
      if (appointments && appointments.length > 0) {
        appointments.forEach((appointment) => {
          const docFields = [
            { field: 'appointment_letter_url', type: 'appointment_letter', title: 'Appointment Letter' },
            { field: 'board_resolution_url', type: 'board_resolution', title: 'Board Resolution' },
            { field: 'certificate_url', type: 'certificate', title: 'Stock Certificate' },
            { field: 'employment_agreement_url', type: 'employment_agreement', title: 'Employment Agreement' },
            { field: 'confidentiality_ip_url', type: 'confidentiality_ip', title: 'Confidentiality & IP Assignment' },
            { field: 'stock_subscription_url', type: 'stock_subscription', title: 'Stock Subscription' },
            { field: 'deferred_compensation_url', type: 'deferred_compensation', title: 'Deferred Compensation' },
            { field: 'pre_incorporation_consent_url', type: 'pre_incorporation_consent', title: 'Pre-Incorporation Consent' },
          ];

          docFields.forEach(({ field, type, title }) => {
            const url = (appointment as any)[field];
            if (url) {
              // Check if this document already exists in execDocs
              const existingDoc = execDocs?.find((d: any) => d.appointment_id === appointment.id && d.type === type);
              if (!existingDoc) {
                appointmentDocs.push({
                  id: `appointment-${appointment.id}-${type}`,
                  title,
                  type,
                  signing_status: 'pending',
                  created_at: appointment.created_at || new Date().toISOString(),
                  pdf_url: url,
                });
              }
            }
          });
        });
      }

      // Merge execDocs and appointmentDocs
      const mergedDocs: Document[] = [];
      
      // Add execDocs
      if (execDocs) {
        execDocs.forEach((doc: any) => {
          mergedDocs.push({
            id: doc.id,
            title: doc.type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Document',
            type: doc.type,
            signing_status: doc.signature_status === 'signed' ? 'completed' : doc.signature_status === 'pending' ? 'pending' : 'pending',
            created_at: doc.created_at,
            pdf_url: doc.file_url,
          });
        });
      }

      // Add appointmentDocs that aren't already in mergedDocs
      appointmentDocs.forEach((apptDoc) => {
        const exists = mergedDocs.some(d => d.id === apptDoc.id || (d.type === apptDoc.type && d.signing_status === apptDoc.signing_status));
        if (!exists) {
          mergedDocs.push(apptDoc);
        }
      });

      // Filter by status if needed
      const filteredDocs = statusFilter === 'all' 
        ? mergedDocs 
        : mergedDocs.filter(doc => doc.signing_status === statusFilter);

      setDocuments(filteredDocs);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load documents',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'pending':
        return 'yellow';
      default:
        return 'blue';
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Loader size="lg" />
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={2} c="dark" mb="xs">
            <IconFolder size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 12 }} />
            Document Vault
          </Title>
          <Text c="dimmed">
            Access all your executive documents, certificates, and agreements.
          </Text>
        </div>

        <Card padding="lg" radius="md" withBorder>
          <Group mb="md">
            <TextInput
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
              leftSection={<IconFileText size={16} />}
            />
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || 'all')}
              data={[
                { value: 'all', label: 'All Status' },
                { value: 'completed', label: 'Signed' },
                { value: 'pending', label: 'Pending' },
              ]}
            />
          </Group>

          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Document</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredDocuments.map((doc) => (
                <Table.Tr key={doc.id}>
                  <Table.Td>
                    <Text fw={500}>{doc.title}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light">{doc.type}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(doc.signing_status)}>
                      {doc.signing_status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {new Date(doc.created_at).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {doc.pdf_url && (
                        <>
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconEye size={14} />}
                            component="a"
                            href={doc.pdf_url}
                            target="_blank"
                          >
                            View
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconDownload size={14} />}
                            component="a"
                            href={doc.pdf_url}
                            download
                          >
                            Download
                          </Button>
                        </>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {filteredDocuments.length === 0 && (
            <Alert icon={<IconAlertCircle size={16} />} title="No Documents" color="blue" mt="md">
              {searchTerm ? 'No documents match your search.' : 'No documents found in your vault.'}
            </Alert>
          )}
        </Card>
      </Stack>
    </Container>
  );
};

export default DocumentVault;

