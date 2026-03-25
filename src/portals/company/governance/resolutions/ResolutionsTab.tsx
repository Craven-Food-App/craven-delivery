import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Table, Badge, Group, Button, Tabs, Loader, Alert, Modal, TextInput, Textarea, Select } from '@mantine/core';
import { IconFileText, IconPlus, IconCheck, IconClock, IconX } from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

interface Resolution {
  id: string;
  resolution_number: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  meeting_date: string | null;
  effective_date: string | null;
  created_at: string;
  created_by: string | null;
  related_officer_id: string | null;
}

const ResolutionsTab: React.FC = () => {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'adopted' | 'pending'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState('');
  const [formMeetingDate, setFormMeetingDate] = useState<Date | null>(null);
  const [formEffectiveDate, setFormEffectiveDate] = useState<Date | null>(null);

  useEffect(() => { loadResolutions(); }, []);

  const loadResolutions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('governance_board_resolutions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { console.error('Error loading resolutions:', error); return; }
      setResolutions(data || []);
    } catch (err) { console.error('Error loading resolutions:', err); }
    finally { setLoading(false); }
  };

  const handleCreateResolution = async () => {
    if (!formTitle || !formType) {
      notifications.show({ title: 'Error', message: 'Title and type are required', color: 'red' });
      return;
    }
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate resolution number
      const resNumber = `RES-${dayjs().format('YYYY')}-${String(resolutions.length + 1).padStart(3, '0')}`;

      const { error } = await supabase.from('governance_board_resolutions').insert({
        resolution_number: resNumber,
        title: formTitle,
        description: formDescription || null,
        type: formType,
        status: 'DRAFT',
        meeting_date: formMeetingDate ? dayjs(formMeetingDate).format('YYYY-MM-DD') : null,
        effective_date: formEffectiveDate ? dayjs(formEffectiveDate).format('YYYY-MM-DD') : null,
        created_by: user?.id || null,
      });

      if (error) throw error;

      notifications.show({ title: 'Success', message: `Resolution ${resNumber} created`, color: 'green' });
      setModalOpen(false);
      setFormTitle(''); setFormDescription(''); setFormType('');
      setFormMeetingDate(null); setFormEffectiveDate(null);
      loadResolutions();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message || 'Failed to create resolution', color: 'red' });
    } finally { setSaving(false); }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      'DRAFT': { color: 'gray', icon: <IconClock size={14} /> },
      'PENDING_VOTE': { color: 'orange', icon: <IconClock size={14} /> },
      'ADOPTED': { color: 'green', icon: <IconCheck size={14} /> },
      'REJECTED': { color: 'red', icon: <IconX size={14} /> },
    };
    const config = statusConfig[status] || { color: 'gray', icon: <IconFileText size={14} /> };
    return <Badge color={config.color} leftSection={config.icon}>{status.replace('_', ' ')}</Badge>;
  };

  const filteredResolutions = resolutions.filter(r => {
    if (activeTab === 'adopted') return r.status === 'ADOPTED';
    if (activeTab === 'pending') return r.status === 'DRAFT' || r.status === 'PENDING_VOTE';
    return true;
  });

  const adoptedCount = resolutions.filter(r => r.status === 'ADOPTED').length;
  const pendingCount = resolutions.filter(r => r.status === 'DRAFT' || r.status === 'PENDING_VOTE').length;

  if (loading) {
    return (<Stack align="center" gap="md" py="xl"><Loader size="lg" /><Text c="dimmed">Loading resolutions...</Text></Stack>);
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>Board Resolutions</Title>
          <Text c="dimmed">Corporate resolutions and board decisions</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          New Resolution
        </Button>
      </Group>

      <Group gap="md">
        <Card padding="lg" withBorder style={{ flex: 1 }}>
          <Stack gap="xs"><Text size="sm" c="dimmed">Total Resolutions</Text><Text size="2xl" fw={700}>{resolutions.length}</Text></Stack>
        </Card>
        <Card padding="lg" withBorder style={{ flex: 1 }}>
          <Stack gap="xs"><Text size="sm" c="dimmed">Adopted</Text><Text size="2xl" fw={700} c="green">{adoptedCount}</Text></Stack>
        </Card>
        <Card padding="lg" withBorder style={{ flex: 1 }}>
          <Stack gap="xs"><Text size="sm" c="dimmed">Pending</Text><Text size="2xl" fw={700} c="orange">{pendingCount}</Text></Stack>
        </Card>
      </Group>

      <Tabs value={activeTab} onChange={(v) => setActiveTab(v as 'all' | 'adopted' | 'pending')}>
        <Tabs.List>
          <Tabs.Tab value="all">All Resolutions ({resolutions.length})</Tabs.Tab>
          <Tabs.Tab value="adopted">Adopted ({adoptedCount})</Tabs.Tab>
          <Tabs.Tab value="pending">Pending ({pendingCount})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={activeTab} pt="xl">
          {filteredResolutions.length === 0 ? (
            <Alert title="No Resolutions" color="gray">No resolutions found matching the selected filter.</Alert>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Resolution #</Table.Th><Table.Th>Title</Table.Th><Table.Th>Type</Table.Th>
                  <Table.Th>Status</Table.Th><Table.Th>Meeting Date</Table.Th><Table.Th>Effective Date</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredResolutions.map((resolution) => (
                  <Table.Tr key={resolution.id}>
                    <Table.Td><Text fw={500}>{resolution.resolution_number}</Text></Table.Td>
                    <Table.Td>
                      <Text>{resolution.title}</Text>
                      {resolution.description && <Text size="xs" c="dimmed" mt={4}>{resolution.description.substring(0, 100)}...</Text>}
                    </Table.Td>
                    <Table.Td><Badge variant="light">{resolution.type}</Badge></Table.Td>
                    <Table.Td>{getStatusBadge(resolution.status)}</Table.Td>
                    <Table.Td>{resolution.meeting_date ? new Date(resolution.meeting_date).toLocaleDateString() : 'N/A'}</Table.Td>
                    <Table.Td>{resolution.effective_date ? new Date(resolution.effective_date).toLocaleDateString() : 'N/A'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* New Resolution Modal */}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Create New Resolution" size="lg">
        <Stack gap="md">
          <TextInput label="Title" placeholder="Resolution to appoint new officer..." value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
          <Textarea label="Description" placeholder="Detailed description of the resolution..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={4} />
          <Select label="Type" placeholder="Select resolution type" value={formType} onChange={(v) => setFormType(v || '')} required
            data={[
              { value: 'officer_appointment', label: 'Officer Appointment' },
              { value: 'stock_issuance', label: 'Stock Issuance' },
              { value: 'equity_grant', label: 'Equity Grant' },
              { value: 'compensation', label: 'Compensation' },
              { value: 'bylaw_amendment', label: 'Bylaw Amendment' },
              { value: 'policy_change', label: 'Policy Change' },
              { value: 'board_action', label: 'Board Action' },
              { value: 'corporate_action', label: 'Corporate Action' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <DatePickerInput label="Meeting Date" placeholder="Select meeting date" value={formMeetingDate} onChange={setFormMeetingDate} />
          <DatePickerInput label="Effective Date" placeholder="Select effective date" value={formEffectiveDate} onChange={setFormEffectiveDate} />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateResolution} loading={saving} leftSection={<IconPlus size={16} />}>Create Resolution</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default ResolutionsTab;
