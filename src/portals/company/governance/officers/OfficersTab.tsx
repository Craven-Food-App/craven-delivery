import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Table, Badge, Group, Button, Loader, Alert, Modal, Select, TextInput } from '@mantine/core';
import { IconUser, IconPlus, IconCheck, IconX } from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

interface Officer {
  id: string;
  position: string;
  executive_id: string;
  appointed_date: string;
  term_start: string;
  term_end: string | null;
  resolution_id: string | null;
  status: string;
  created_at: string;
  executive_name?: string;
  executive_email?: string;
  executive_title?: string;
}

interface ExecOption {
  value: string;
  label: string;
}

const OfficersTab: React.FC = () => {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [execOptions, setExecOptions] = useState<ExecOption[]>([]);

  // Form state
  const [formPosition, setFormPosition] = useState('');
  const [formExecId, setFormExecId] = useState('');
  const [formAppointedDate, setFormAppointedDate] = useState<Date | null>(new Date());
  const [formTermStart, setFormTermStart] = useState<Date | null>(new Date());

  useEffect(() => {
    loadOfficers();
    loadExecOptions();
  }, []);

  const loadExecOptions = async () => {
    try {
      const { data } = await supabase.from('exec_users').select('id, user_id, title');
      if (!data) return;

      const userIds = data.map(e => e.user_id).filter(Boolean);
      const { data: profiles } = userIds.length
        ? await supabase.from('user_profiles').select('user_id, full_name').in('user_id', userIds)
        : { data: [] as any[] };

      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      setExecOptions(data.map(e => ({
        value: e.id,
        label: nameMap.get(e.user_id) || e.title || 'Unknown',
      })));
    } catch (err) {
      console.error('Error loading exec options:', err);
    }
  };

  const loadOfficers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('corporate_officers')
        .select(`*, exec_users:executive_id (id, user_id, title, role)`)
        .order('appointed_date', { ascending: false });

      if (error) { console.error('Error loading officers:', error); return; }

      const transformed = await Promise.all(
        (data || []).map(async (officer: any) => {
          const exec = officer.exec_users;
          let fullName = exec?.title || 'Unknown';
          let email = '';
          if (exec?.user_id) {
            const { data: profileData } = await supabase
              .from('user_profiles').select('full_name, email').eq('user_id', exec.user_id).maybeSingle();
            if (profileData) { fullName = profileData.full_name || fullName; email = profileData.email || ''; }
          }
          return { ...officer, executive_name: fullName, executive_email: email, executive_title: exec?.title || exec?.role || '' };
        })
      );
      setOfficers(transformed);
    } catch (err) { console.error('Error loading officers:', err); }
    finally { setLoading(false); }
  };

  const handleAppointOfficer = async () => {
    if (!formPosition || !formExecId || !formAppointedDate || !formTermStart) {
      notifications.show({ title: 'Error', message: 'All fields are required', color: 'red' });
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase.from('corporate_officers').insert({
        position: formPosition,
        executive_id: formExecId,
        appointed_date: dayjs(formAppointedDate).format('YYYY-MM-DD'),
        term_start: dayjs(formTermStart).format('YYYY-MM-DD'),
        status: 'active',
      });
      if (error) throw error;
      notifications.show({ title: 'Success', message: 'Officer appointed successfully', color: 'green' });
      setModalOpen(false);
      setFormPosition(''); setFormExecId('');
      loadOfficers();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message || 'Failed to appoint officer', color: 'red' });
    } finally { setSaving(false); }
  };

  const getPositionLabel = (position: string) => {
    const labels: Record<string, string> = {
      'president': 'President', 'secretary': 'Secretary', 'treasurer': 'Treasurer',
      'vice-president': 'Vice President', 'assistant-secretary': 'Assistant Secretary',
      'assistant-treasurer': 'Assistant Treasurer', 'ceo': 'Chief Executive Officer',
      'cfo': 'Chief Financial Officer', 'cto': 'Chief Technology Officer',
      'coo': 'Chief Operating Officer', 'cpo': 'Chief Product Officer',
    };
    return labels[position] || position;
  };

  const activeOfficers = officers.filter(o => o.status === 'active');
  const terminatedOfficers = officers.filter(o => o.status === 'terminated');

  if (loading) {
    return (<Stack align="center" gap="md" py="xl"><Loader size="lg" /><Text c="dimmed">Loading officers...</Text></Stack>);
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>Corporate Officers</Title>
          <Text c="dimmed">Corporate officer positions and executive titles</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          Appoint Officer
        </Button>
      </Group>

      <Group gap="md">
        <Card padding="lg" withBorder style={{ flex: 1 }}>
          <Stack gap="xs"><Text size="sm" c="dimmed">Active Officers</Text><Text size="2xl" fw={700} c="green">{activeOfficers.length}</Text></Stack>
        </Card>
        <Card padding="lg" withBorder style={{ flex: 1 }}>
          <Stack gap="xs"><Text size="sm" c="dimmed">Total Officers</Text><Text size="2xl" fw={700}>{officers.length}</Text></Stack>
        </Card>
        <Card padding="lg" withBorder style={{ flex: 1 }}>
          <Stack gap="xs"><Text size="sm" c="dimmed">Terminated</Text><Text size="2xl" fw={700} c="red">{terminatedOfficers.length}</Text></Stack>
        </Card>
      </Group>

      <div>
        <Title order={3} mb="md">Active Officers</Title>
        {activeOfficers.length === 0 ? (
          <Alert title="No Active Officers" color="gray">No active corporate officers found.</Alert>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Position</Table.Th><Table.Th>Officer</Table.Th><Table.Th>Title</Table.Th>
                <Table.Th>Appointed Date</Table.Th><Table.Th>Term Start</Table.Th><Table.Th>Term End</Table.Th><Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {activeOfficers.map((officer) => (
                <Table.Tr key={officer.id}>
                  <Table.Td><Badge variant="light" color="blue">{getPositionLabel(officer.position)}</Badge></Table.Td>
                  <Table.Td>
                    <Text fw={500}>{officer.executive_name}</Text>
                    {officer.executive_email && <Text size="xs" c="dimmed">{officer.executive_email}</Text>}
                  </Table.Td>
                  <Table.Td><Text size="sm">{officer.executive_title}</Text></Table.Td>
                  <Table.Td>{new Date(officer.appointed_date).toLocaleDateString()}</Table.Td>
                  <Table.Td>{new Date(officer.term_start).toLocaleDateString()}</Table.Td>
                  <Table.Td>{officer.term_end ? new Date(officer.term_end).toLocaleDateString() : 'Indefinite'}</Table.Td>
                  <Table.Td><Badge color="green" leftSection={<IconCheck size={14} />}>{officer.status}</Badge></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>

      {terminatedOfficers.length > 0 && (
        <div>
          <Title order={3} mb="md">Terminated Officers</Title>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr><Table.Th>Position</Table.Th><Table.Th>Officer</Table.Th><Table.Th>Appointed Date</Table.Th><Table.Th>Term End</Table.Th><Table.Th>Status</Table.Th></Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {terminatedOfficers.map((officer) => (
                <Table.Tr key={officer.id}>
                  <Table.Td><Badge variant="light">{getPositionLabel(officer.position)}</Badge></Table.Td>
                  <Table.Td><Text fw={500}>{officer.executive_name}</Text></Table.Td>
                  <Table.Td>{new Date(officer.appointed_date).toLocaleDateString()}</Table.Td>
                  <Table.Td>{officer.term_end ? new Date(officer.term_end).toLocaleDateString() : 'N/A'}</Table.Td>
                  <Table.Td><Badge color="red" leftSection={<IconX size={14} />}>{officer.status}</Badge></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}

      {/* Appoint Officer Modal */}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Appoint Corporate Officer" size="md">
        <Stack gap="md">
          <Select label="Position" placeholder="Select position" value={formPosition} onChange={(v) => setFormPosition(v || '')} required
            data={[
              { value: 'president', label: 'President' },
              { value: 'secretary', label: 'Secretary' },
              { value: 'treasurer', label: 'Treasurer' },
              { value: 'vice-president', label: 'Vice President' },
              { value: 'assistant-secretary', label: 'Assistant Secretary' },
              { value: 'assistant-treasurer', label: 'Assistant Treasurer' },
              { value: 'ceo', label: 'Chief Executive Officer' },
              { value: 'cfo', label: 'Chief Financial Officer' },
              { value: 'cto', label: 'Chief Technology Officer' },
              { value: 'coo', label: 'Chief Operating Officer' },
              { value: 'cpo', label: 'Chief Product Officer' },
            ]}
          />
          <Select label="Executive" placeholder="Select executive" value={formExecId} onChange={(v) => setFormExecId(v || '')} required
            data={execOptions} searchable />
          <DatePickerInput label="Appointed Date" value={formAppointedDate} onChange={setFormAppointedDate} required />
          <DatePickerInput label="Term Start Date" value={formTermStart} onChange={setFormTermStart} required />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAppointOfficer} loading={saving} leftSection={<IconCheck size={16} />}>Appoint Officer</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default OfficersTab;
