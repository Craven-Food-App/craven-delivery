import React, { useEffect, useState } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Button,
  FileButton,
  Table,
  Badge,
  TextInput,
  Select,
  Modal,
  Image,
  ScrollArea,
} from '@mantine/core';
import {
  IconUpload,
  IconSearch,
  IconEye,
  IconDownload,
  IconFileText,
  IconCheck,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';
import { AuditDocument } from './types';

export const DocumentationCenter: React.FC = () => {
  const [documents, setDocuments] = useState<AuditDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<AuditDocument | null>(null);
  const [previewOpened, setPreviewOpened] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [typeFilter]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_documents')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(100);

      if (typeFilter) query = query.eq('document_type', typeFilter);

      const { data, error } = await query;
      if (error) throw error;
      setDocuments((data || []) as AuditDocument[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `audit-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audit-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audit-documents')
        .getPublicUrl(filePath);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: insertError } = await supabase
        .from('audit_documents')
        .insert({
          document_type: 'other',
          document_name: file.name,
          file_url: publicUrl,
          file_size_bytes: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        });

      if (insertError) throw insertError;

      notifications.show({
        title: 'Success',
        message: 'Document uploaded successfully',
        color: 'green',
      });

      setFile(null);
      fetchDocuments();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to upload document',
        color: 'red',
      });
    }
  };

  const filteredDocs = documents.filter(doc =>
    !searchTerm ||
    doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Text fw={700} size="xl" mb="xs">Documentation Center</Text>
          <Text c="dimmed" size="sm">Centralized library of all audit-related documents</Text>
        </div>
        <FileButton onChange={setFile} accept="image/*,application/pdf">
          {(props) => (
            <Button {...props} leftSection={<IconUpload size={16} />}>
              Upload Document
            </Button>
          )}
        </FileButton>
      </Group>

      {file && (
        <Card withBorder p="md" style={{ backgroundColor: '#f0f9ff' }}>
          <Group justify="space-between">
            <div>
              <Text fw={600}>{file.name}</Text>
              <Text size="sm" c="dimmed">{(file.size / 1024).toFixed(2)} KB</Text>
            </div>
            <Group>
              <Button variant="light" onClick={() => setFile(null)}>Cancel</Button>
              <Button onClick={handleUpload}>Upload</Button>
            </Group>
          </Group>
        </Card>
      )}

      <Group gap="md">
        <TextInput
          placeholder="Search documents..."
          leftSection={<IconSearch size={16} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="Document Type"
          data={['receipt', 'invoice', 'contract', 'settlement_sheet', 'tax_form', 'w9', 'other']}
          value={typeFilter}
          onChange={setTypeFilter}
          clearable
          style={{ width: 200 }}
        />
      </Group>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Document Name</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Uploaded</Table.Th>
            <Table.Th>Size</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filteredDocs.map((doc) => (
            <Table.Tr key={doc.id}>
              <Table.Td>
                <Group gap="xs">
                  <IconFileText size={16} />
                  <Text size="sm">{doc.document_name}</Text>
                </Group>
              </Table.Td>
              <Table.Td>
                <Badge variant="light" size="sm">{doc.document_type}</Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{dayjs(doc.uploaded_at).format('MMM D, YYYY')}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(2)} KB` : '-'}</Text>
              </Table.Td>
              <Table.Td>
                <Badge color={doc.verified ? 'green' : 'yellow'} size="sm">
                  {doc.verified ? 'Verified' : 'Unverified'}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconEye size={14} />}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setPreviewOpened(true);
                    }}
                  >
                    View
                  </Button>
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconDownload size={14} />}
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    Download
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal
        opened={previewOpened}
        onClose={() => setPreviewOpened(false)}
        title={selectedDoc?.document_name}
        size="xl"
      >
        {selectedDoc && (
          <ScrollArea h={600}>
            {selectedDoc.mime_type?.startsWith('image/') ? (
              <Image src={selectedDoc.file_url} alt={selectedDoc.document_name} />
            ) : (
              <iframe
                src={selectedDoc.file_url}
                style={{ width: '100%', height: '600px', border: 'none' }}
                title={selectedDoc.document_name}
              />
            )}
          </ScrollArea>
        )}
      </Modal>
    </Stack>
  );
};

