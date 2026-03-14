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
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEye, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface Document {
  id: string;
  partnership_id: string;
  document_name: string;
  document_type: string;
  file_url: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  partnerships?: { partner_name: string };
}

const ContractManagement: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [partnerships, setPartnerships] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string | null>('all');

  const [formData, setFormData] = useState({
    partnership_id: '',
    document_name: '',
    document_type: 'contract',
    status: 'draft',
    expires_at: null as Date | null,
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('partnership_documents').insert({
        partnership_id: formData.partnership_id,
        document_name: formData.document_name,
        document_type: formData.document_type,
        status: formData.status,
        expires_at: formData.expires_at?.toISOString() || null,
        uploaded_by: user?.id,
      });
      if (error) throw error;
      notifications.show({ title: 'Success', message: 'Document added', color: 'green' });
      close();
      loadData();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const deleteDoc = async (id: string) => {
    await supabase.from('partnership_documents').delete().eq('id', id);
    loadData();
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
      <Group justify="space-between">
        <Title order={3}>Contract Management</Title>
        <Button leftSection={<IconPlus size={16} />} color="orange" onClick={open}>
          Add Document
        </Button>
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
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Document</Table.Th>
              <Table.Th>Partner</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Expires</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredDocs.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
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
                    <Group gap={4}>
                      <ActionIcon variant="subtle" color="red" size="sm" onClick={() => deleteDoc(doc.id)}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
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
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button color="orange" loading={saving} onClick={handleCreate}>Add Document</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default ContractManagement;
