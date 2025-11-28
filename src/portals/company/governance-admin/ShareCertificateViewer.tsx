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
  Modal,
  Loader,
  Alert,
  Anchor,
} from '@mantine/core';
import { IconCertificate, IconDownload, IconEye, IconAlertCircle, IconEdit } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { NumberInput, Select } from '@mantine/core';

interface Certificate {
  id: string;
  certificate_number: string;
  recipient_user_id: string;
  shares_amount: number;
  share_class: string;
  issue_date: string;
  status: string;
  document_url: string;
  recipient_name?: string;
  recipient_email?: string;
}

const ShareCertificateViewer: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [editShares, setEditShares] = useState<number>(0);
  const [editShareClass, setEditShareClass] = useState<string>('Common');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('share_certificates')
        .select('*')
        .order('issue_date', { ascending: false });

      if (error) throw error;

      // Enrich with user info
      const enrichedCertificates = await Promise.all(
        (data || []).map(async (cert) => {
          let recipientName = 'Unknown';
          let recipientEmail = '';

          // Try user_profiles first
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', cert.recipient_user_id)
            .maybeSingle();

          if (profile) {
            recipientName = profile.full_name || '';
            recipientEmail = profile.email || '';
          }

          // If still no email/name, try employees table
          if (!recipientEmail || !recipientName) {
            const { data: employee } = await supabase
              .from('employees')
              .select('email, first_name, last_name')
              .eq('user_id', cert.recipient_user_id)
              .maybeSingle();

            if (employee) {
              recipientEmail = recipientEmail || employee.email || '';
              recipientName = recipientName || 
                (employee.first_name && employee.last_name 
                  ? `${employee.first_name} ${employee.last_name}`
                  : employee.first_name || employee.last_name || 'Unknown');
            }
          }

          return {
            ...cert,
            recipient_name: recipientName,
            recipient_email: recipientEmail,
          };
        })
      );

      setCertificates(enrichedCertificates);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load certificates',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCertificates = certificates.filter(
    (cert) =>
      cert.certificate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (cert: Certificate) => {
    setEditingCertificate(cert);
    setEditShares(cert.shares_amount);
    setEditShareClass(cert.share_class);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCertificate) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('share_certificates')
        .update({
          shares_amount: editShares,
          share_class: editShareClass,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCertificate.id);

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Certificate updated successfully',
        color: 'green',
      });

      setEditModalOpen(false);
      setEditingCertificate(null);
      loadCertificates(); // Reload to refresh the list
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update certificate',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'issued':
        return 'green';
      case 'cancelled':
        return 'red';
      case 'replaced':
        return 'yellow';
      default:
        return 'gray';
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
            <IconCertificate size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 12 }} />
            Share Certificates
          </Title>
          <Text c="dimmed">
            View and manage all issued share certificates.
          </Text>
        </div>

        <Card padding="lg" radius="md" withBorder>
          <Group mb="md">
            <TextInput
              placeholder="Search by certificate number, name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
            />
          </Group>

          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Certificate #</Table.Th>
                <Table.Th>Recipient</Table.Th>
                <Table.Th>Shares</Table.Th>
                <Table.Th>Share Class</Table.Th>
                <Table.Th>Issue Date</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredCertificates.map((cert) => (
                <Table.Tr key={cert.id}>
                  <Table.Td>
                    <Text fw={500}>{cert.certificate_number}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text>{cert.recipient_name}</Text>
                    <Text size="xs" c="dimmed">
                      {cert.recipient_email}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{cert.shares_amount.toLocaleString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light">{cert.share_class}</Badge>
                  </Table.Td>
                  <Table.Td>
                    {new Date(cert.issue_date).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(cert.status)}>{cert.status}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="light"
                        color="blue"
                        leftSection={<IconEdit size={14} />}
                        onClick={() => handleEdit(cert)}
                      >
                        Edit
                      </Button>
                      {cert.document_url && (
                        <>
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconEye size={14} />}
                            onClick={() => {
                              setSelectedCertificate(cert);
                              setPreviewModalOpen(true);
                            }}
                          >
                            View
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconDownload size={14} />}
                            component="a"
                            href={cert.document_url}
                            target="_blank"
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

          {filteredCertificates.length === 0 && (
            <Alert icon={<IconAlertCircle size={16} />} title="No Certificates" color="blue" mt="md">
              {searchTerm ? 'No certificates match your search.' : 'No share certificates have been issued yet.'}
            </Alert>
          )}
        </Card>

        <Modal
          opened={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setSelectedCertificate(null);
          }}
          title={`Certificate ${selectedCertificate?.certificate_number}`}
          size="xl"
        >
          {selectedCertificate && (
            <Stack gap="md">
              <Group>
                <Text fw={500}>Recipient:</Text>
                <Text>{selectedCertificate.recipient_name}</Text>
              </Group>
              <Group>
                <Text fw={500}>Shares:</Text>
                <Text>{selectedCertificate.shares_amount.toLocaleString()} {selectedCertificate.share_class}</Text>
              </Group>
              <Group>
                <Text fw={500}>Issue Date:</Text>
                <Text>{new Date(selectedCertificate.issue_date).toLocaleDateString()}</Text>
              </Group>
              {selectedCertificate.document_url && (
                <Anchor href={selectedCertificate.document_url} target="_blank">
                  <Button leftSection={<IconDownload size={16} />} fullWidth>
                    Download Certificate PDF
                  </Button>
                </Anchor>
              )}
            </Stack>
          )}
        </Modal>

        <Modal
          opened={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingCertificate(null);
          }}
          title={`Edit Certificate ${editingCertificate?.certificate_number}`}
          size="md"
        >
          {editingCertificate && (
            <Stack gap="md">
              <Group>
                <Text fw={500}>Recipient:</Text>
                <Text>{editingCertificate.recipient_name}</Text>
              </Group>

              <NumberInput
                label="Shares Amount"
                value={editShares}
                onChange={(value) => setEditShares(typeof value === 'number' ? value : 0)}
                min={0}
                step={1000}
                thousandSeparator=","
                required
              />

              <Select
                label="Share Class"
                value={editShareClass}
                onChange={(value) => setEditShareClass(value || 'Common')}
                data={['Common', 'Preferred', 'Class A', 'Class B', 'Class C']}
                required
              />

              <Group justify="flex-end" mt="md">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingCertificate(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} loading={saving}>
                  Save Changes
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>
      </Stack>
    </Container>
  );
};

export default ShareCertificateViewer;

