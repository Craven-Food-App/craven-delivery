import React, { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Badge,
  Button,
  Stack,
  Table,
  Modal,
  TextInput,
  Select,
  Skeleton,
  ActionIcon,
  Tooltip,
  FileInput,
  Progress,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconAlertTriangle, IconDownload, IconUpload, IconFile, IconFileText } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV, exportToPrintPDF } from '../utils/exportHelpers';

interface Document {
  id: string;
  partnership_id: string;
  document_name: string;
  document_type: string;
  file_url: string | null;
  file_size_bytes: number | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  partnerships?: { partner_name: string };
}

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';

const ContractManagement: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [partnerships, setPartnerships] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filter, setFilter] = useState<string | null>('all');

  const [formData, setFormData] = useState({
    partnership_id: '',
    document_name: '',
    document_type: 'contract',
    status: 'draft',
    expires_at: null as Date | null,
    file: null as File | null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [docsRes, partnersRes] = await Promise.all([
      supabase.from('partnership_documents').select('*, partnerships(partner_name)').order('created_at', { ascending: false }),
      supabase.from('partnerships').select('id, partner_name').order('partner_name'),
    ]);
    setDocuments((docsRes.data as Document[]) || []);
    setPartnerships((partnersRes.data || []).map(p => ({ value: p.id, label: p.partner_name })));
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!formData.partnership_id || !formData.document_name) {
      notifications.show({ title: 'Error', message: 'Partner and document name required', color: 'red' });
      return;
    }
    setSaving(true);
    setUploadProgress(0);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let fileUrl: string | null = null;
      let fileSize: number | null = null;

      // Upload file if selected
      if (formData.file) {
        setUploadProgress(20);
        const timestamp = Date.now();
        const safeName = formData.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${timestamp}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('partnership-documents')
          .upload(filePath, formData.file);

        if (uploadError) throw uploadError;
        setUploadProgress(70);

        const { data: urlData } = supabase.storage
          .from('partnership-documents')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        fileSize = formData.file.size;
        setUploadProgress(90);
      }

      const { error } = await supabase.from('partnership_documents').insert({
        partnership_id: formData.partnership_id,
        document_name: formData.document_name,
        document_type: formData.document_type,
        status: formData.status,
        expires_at: formData.expires_at?.toISOString() || null,
        uploaded_by: user?.id,
        file_url: fileUrl,
        file_size_bytes: fileSize,
      });
      if (error) throw error;
      setUploadProgress(100);
      notifications.show({ title: 'Success', message: 'Document added', color: 'green' });
      close();
      setFormData({ partnership_id: '', document_name: '', document_type: 'contract', status: 'draft', expires_at: null, file: null });
      loadData();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const deleteDoc = async (id: string) => {
    await supabase.from('partnership_documents').delete().eq('id', id);
    loadData();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'green';
      case 'approved': return 'blue';
      case 'pending_review': return 'yellow';
      case 'expired': return 'red';
      default: return 'gray';
    }
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };

  const filteredDocs = filter === 'all'
    ? documents
    : filter === 'expiring'
      ? documents.filter(d => isExpiringSoon(d.expires_at))
      : documents.filter(d => d.status === filter);

  if (loading) return <Stack gap="md">{[1, 2].map(i => <Skeleton key={i} height={200} radius="md" />)}</Stack>;

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="wrap">
        <Title order={3}>Contract Management</Title>
        <Group>
          <Button variant="light" color="gray" leftSection={<IconDownload size={16} />} onClick={() => {
            exportToCSV(documents.map(d => ({
              Document: d.document_name, Partner: d.partnerships?.partner_name || '', Type: d.document_type, Status: d.status, Expires: d.expires_at || '',
            })), 'contracts');
          }}>CSV</Button>
          <Button variant="light" color="gray" leftSection={<IconFileText size={16} />} onClick={() => {
            const rows = documents.map(d => `<tr><td>${d.document_name}</td><td>${d.partnerships?.partner_name || ''}</td><td>${d.document_type}</td><td>${d.status}</td><td>${d.expires_at ? new Date(d.expires_at).toLocaleDateString() : '—'}</td></tr>`).join('');
            exportToPrintPDF('Contract Management', `<table><tr><th>Document</th><th>Partner</th><th>Type</th><th>Status</th><th>Expires</th></tr>${rows}</table>`);
          }}>PDF</Button>
          <Button leftSection={<IconPlus size={16} />} color="orange" onClick={open}>
            Add Document
          </Button>
        </Group>
      </Group>

      <Group>
        {[
          { value: 'all', label: 'All' },
          { value: 'draft', label: 'Draft' },
          { value: 'pending_review', label: 'Pending Review' },
          { value: 'signed', label: 'Signed' },
          { value: 'expiring', label: 'Expiring Soon' },
        ].map(f => (
          <Badge
            key={f.value}
            variant={filter === f.value ? 'filled' : 'light'}
            color={f.value === 'expiring' ? 'red' : 'orange'}
            style={{ cursor: 'pointer' }}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Badge>
        ))}
      </Group>

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Document</Table.Th>
                <Table.Th>Partner</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>File</Table.Th>
                <Table.Th>Expires</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredDocs.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" c="dimmed" py="xl">No documents found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredDocs.map(doc => (
                  <Table.Tr key={doc.id}>
                    <Table.Td>
                      <Text fw={500} size="sm">{doc.document_name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{doc.partnerships?.partner_name || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" size="sm">{doc.document_type}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(doc.status)} size="sm">{doc.status.replace('_', ' ')}</Badge>
                    </Table.Td>
                    <Table.Td>
                      {doc.file_url ? (
                        <Tooltip label={`Download (${formatFileSize(doc.file_size_bytes)})`}>
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => window.open(doc.file_url!, '_blank')}
                          >
                            <IconDownload size={14} />
                          </ActionIcon>
                        </Tooltip>
                      ) : (
                        <Text size="xs" c="dimmed">No file</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {doc.expires_at ? (
                          <>
                            <Text size="sm">{new Date(doc.expires_at).toLocaleDateString()}</Text>
                            {isExpiringSoon(doc.expires_at) && (
                              <Tooltip label="Expiring soon">
                                <IconAlertTriangle size={14} color="orange" />
                              </Tooltip>
                            )}
                          </>
                        ) : (
                          <Text size="sm" c="dimmed">—</Text>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon variant="subtle" color="red" size="sm" onClick={() => deleteDoc(doc.id)}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </div>
      </Card>

      <Modal opened={opened} onClose={close} title="Add Document" size="md">
        <Stack gap="md">
          <Select
            label="Partner"
            data={partnerships}
            value={formData.partnership_id}
            onChange={v => setFormData(d => ({ ...d, partnership_id: v || '' }))}
            searchable
            required
          />
          <TextInput
            label="Document Name"
            required
            value={formData.document_name}
            onChange={e => setFormData(d => ({ ...d, document_name: e.target.value }))}
          />
          <Select
            label="Document Type"
            data={[
              { value: 'contract', label: 'Contract' },
              { value: 'nda', label: 'NDA' },
              { value: 'sla', label: 'SLA' },
              { value: 'mou', label: 'MOU' },
              { value: 'amendment', label: 'Amendment' },
              { value: 'invoice', label: 'Invoice' },
              { value: 'other', label: 'Other' },
            ]}
            value={formData.document_type}
            onChange={v => setFormData(d => ({ ...d, document_type: v || 'contract' }))}
          />
          <Select
            label="Status"
            data={[
              { value: 'draft', label: 'Draft' },
              { value: 'pending_review', label: 'Pending Review' },
              { value: 'approved', label: 'Approved' },
              { value: 'signed', label: 'Signed' },
            ]}
            value={formData.status}
            onChange={v => setFormData(d => ({ ...d, status: v || 'draft' }))}
          />
          <DateInput
            label="Expiration Date"
            value={formData.expires_at}
            onChange={v => setFormData(d => ({ ...d, expires_at: v as any }))}
            clearable
          />
          <FileInput
            label="Upload File"
            placeholder="Select PDF, DOC, XLS, or image"
            accept={ACCEPTED_TYPES}
            leftSection={<IconUpload size={16} />}
            value={formData.file}
            onChange={file => setFormData(d => ({ ...d, file: file }))}
            clearable
          />
          {formData.file && (
            <Group gap="xs">
              <IconFile size={14} />
              <Text size="xs" c="dimmed">{formData.file.name} ({formatFileSize(formData.file.size)})</Text>
            </Group>
          )}
          {saving && uploadProgress > 0 && (
            <Progress value={uploadProgress} color="orange" size="sm" animated />
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button color="orange" loading={saving} onClick={handleCreate}>
              {formData.file ? 'Upload & Add' : 'Add Document'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default ContractManagement;
