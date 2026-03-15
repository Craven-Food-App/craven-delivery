import React, { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Badge,
  Button,
  Stack,
  SimpleGrid,
  Select,
  Modal,
  TextInput,
  NumberInput,
  Progress,
  Table,
  ActionIcon,
  Skeleton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconEdit, IconChartBar } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface KPI {
  id: string;
  partnership_id: string;
  kpi_name: string;
  target_value: number;
  actual_value: number;
  unit: string;
  period: string;
}

interface Partner {
  id: string;
  partner_name: string;
  status: string;
}

const PartnerScorecards: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KPI | null>(null);

  const [form, setForm] = useState({
    kpi_name: '',
    target_value: 0,
    actual_value: 0,
    unit: '',
    period: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [partnersRes, kpisRes] = await Promise.all([
      supabase.from('partnerships').select('id, partner_name, status').order('partner_name'),
      supabase.from('partnership_kpis').select('*').order('created_at', { ascending: false }),
    ]);
    setPartners((partnersRes.data as Partner[]) || []);
    setKpis((kpisRes.data as KPI[]) || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedPartnerId || !form.kpi_name) {
      notifications.show({ title: 'Error', message: 'Select a partner and enter KPI name', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      if (editingKpi) {
        const { error } = await supabase.from('partnership_kpis').update({
          kpi_name: form.kpi_name,
          target_value: form.target_value,
          actual_value: form.actual_value,
          unit: form.unit,
          period: form.period,
          updated_at: new Date().toISOString(),
        }).eq('id', editingKpi.id);
        if (error) throw error;
        notifications.show({ title: 'Updated', message: 'KPI updated', color: 'green' });
      } else {
        const { error } = await supabase.from('partnership_kpis').insert({
          partnership_id: selectedPartnerId,
          kpi_name: form.kpi_name,
          target_value: form.target_value,
          actual_value: form.actual_value,
          unit: form.unit,
          period: form.period,
        });
        if (error) throw error;
        notifications.show({ title: 'Created', message: 'KPI added', color: 'green' });
      }
      close();
      setEditingKpi(null);
      setForm({ kpi_name: '', target_value: 0, actual_value: 0, unit: '', period: '' });
      loadData();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const deleteKpi = async (id: string) => {
    await supabase.from('partnership_kpis').delete().eq('id', id);
    loadData();
  };

  const editKpi = (kpi: KPI) => {
    setEditingKpi(kpi);
    setForm({
      kpi_name: kpi.kpi_name,
      target_value: kpi.target_value,
      actual_value: kpi.actual_value,
      unit: kpi.unit,
      period: kpi.period,
    });
    open();
  };

  const getStatus = (target: number, actual: number) => {
    if (target === 0) return { label: 'No Target', color: 'gray' };
    const pct = (actual / target) * 100;
    if (pct >= 100) return { label: 'Exceeded', color: 'green' };
    if (pct >= 75) return { label: 'On Track', color: 'blue' };
    if (pct >= 50) return { label: 'Behind', color: 'yellow' };
    return { label: 'At Risk', color: 'red' };
  };

  const filteredKpis = selectedPartnerId
    ? kpis.filter(k => k.partnership_id === selectedPartnerId)
    : kpis;

  // Overview: per-partner KPI health
  const partnerHealth = partners.map(p => {
    const pKpis = kpis.filter(k => k.partnership_id === p.id);
    if (pKpis.length === 0) return { ...p, avgPct: null, count: 0 };
    const avgPct = Math.round(
      pKpis.reduce((sum, k) => sum + (k.target_value > 0 ? (k.actual_value / k.target_value) * 100 : 0), 0) / pKpis.length
    );
    return { ...p, avgPct, count: pKpis.length };
  });

  if (loading) return <Stack gap="md">{[1, 2].map(i => <Skeleton key={i} height={200} radius="md" />)}</Stack>;

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="wrap">
        <Title order={3}>Partner Scorecards</Title>
        <Group>
          <Select
            placeholder="All Partners"
            data={partners.map(p => ({ value: p.id, label: p.partner_name }))}
            value={selectedPartnerId}
            onChange={setSelectedPartnerId}
            clearable
            searchable
            style={{ minWidth: 220 }}
          />
          <Button
            leftSection={<IconPlus size={16} />}
            color="orange"
            onClick={() => {
              setEditingKpi(null);
              setForm({ kpi_name: '', target_value: 0, actual_value: 0, unit: '', period: '' });
              if (!selectedPartnerId && partners.length > 0) {
                setSelectedPartnerId(partners[0].id);
              }
              open();
            }}
            disabled={partners.length === 0}
          >
            Add KPI
          </Button>
        </Group>
      </Group>

      {/* Overview Grid */}
      {!selectedPartnerId && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {partnerHealth.filter(p => p.count > 0).map(p => (
            <Card
              key={p.id}
              shadow="sm"
              radius="md"
              padding="lg"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedPartnerId(p.id)}
            >
              <Group justify="space-between" mb="sm">
                <Text fw={600} size="sm">{p.partner_name}</Text>
                <Badge size="xs" color={
                  p.avgPct! >= 100 ? 'green' : p.avgPct! >= 75 ? 'blue' : p.avgPct! >= 50 ? 'yellow' : 'red'
                }>
                  {p.avgPct}%
                </Badge>
              </Group>
              <Progress
                value={Math.min(p.avgPct!, 100)}
                color={p.avgPct! >= 100 ? 'green' : p.avgPct! >= 75 ? 'blue' : p.avgPct! >= 50 ? 'yellow' : 'red'}
                size="lg"
                radius="xl"
              />
              <Text size="xs" c="dimmed" mt="xs">{p.count} KPIs tracked</Text>
            </Card>
          ))}
          {partnerHealth.every(p => p.count === 0) && (
            <Card shadow="sm" radius="md" padding="xl" withBorder>
              <Text ta="center" c="dimmed">No KPIs configured yet. Select a partner and add KPIs.</Text>
            </Card>
          )}
        </SimpleGrid>
      )}

      {/* KPI Table */}
      {(selectedPartnerId || filteredKpis.length > 0) && (
        <Card shadow="sm" radius="md" withBorder padding={0}>
          <div style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  {!selectedPartnerId && <Table.Th>Partner</Table.Th>}
                  <Table.Th>KPI</Table.Th>
                  <Table.Th>Period</Table.Th>
                  <Table.Th>Target</Table.Th>
                  <Table.Th>Actual</Table.Th>
                  <Table.Th>Progress</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredKpis.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={selectedPartnerId ? 7 : 8}>
                      <Text ta="center" c="dimmed" py="xl">No KPIs for this partner</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filteredKpis.map(kpi => {
                    const pct = kpi.target_value > 0 ? Math.round((kpi.actual_value / kpi.target_value) * 100) : 0;
                    const status = getStatus(kpi.target_value, kpi.actual_value);
                    const partner = partners.find(p => p.id === kpi.partnership_id);
                    return (
                      <Table.Tr key={kpi.id}>
                        {!selectedPartnerId && <Table.Td><Text size="sm">{partner?.partner_name || '—'}</Text></Table.Td>}
                        <Table.Td><Text fw={500} size="sm">{kpi.kpi_name}</Text></Table.Td>
                        <Table.Td><Text size="sm">{kpi.period || '—'}</Text></Table.Td>
                        <Table.Td><Text size="sm">{kpi.target_value}{kpi.unit ? ` ${kpi.unit}` : ''}</Text></Table.Td>
                        <Table.Td><Text size="sm" fw={600}>{kpi.actual_value}{kpi.unit ? ` ${kpi.unit}` : ''}</Text></Table.Td>
                        <Table.Td style={{ minWidth: 120 }}>
                          <Progress value={Math.min(pct, 100)} color={status.color} size="sm" radius="xl" />
                          <Text size={10} c="dimmed" ta="center">{pct}%</Text>
                        </Table.Td>
                        <Table.Td><Badge size="xs" color={status.color}>{status.label}</Badge></Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            <ActionIcon variant="subtle" size="sm" onClick={() => editKpi(kpi)}><IconEdit size={14} /></ActionIcon>
                            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => deleteKpi(kpi.id)}><IconTrash size={14} /></ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })
                )}
              </Table.Tbody>
            </Table>
          </div>
        </Card>
      )}

      <Modal opened={opened} onClose={() => { close(); setEditingKpi(null); }} title={editingKpi ? 'Edit KPI' : 'Add KPI'} size="md">
        <Stack gap="md">
          {!editingKpi && (
            <Select
              label="Partner"
              data={partners.map(p => ({ value: p.id, label: p.partner_name }))}
              value={selectedPartnerId}
              onChange={setSelectedPartnerId}
              required
              searchable
            />
          )}
          <TextInput label="KPI Name" required value={form.kpi_name} onChange={e => setForm(f => ({ ...f, kpi_name: e.target.value }))} placeholder="e.g., Monthly Order Volume" />
          <SimpleGrid cols={2}>
            <NumberInput label="Target Value" value={form.target_value} onChange={v => setForm(f => ({ ...f, target_value: Number(v) || 0 }))} min={0} />
            <NumberInput label="Actual Value" value={form.actual_value} onChange={v => setForm(f => ({ ...f, actual_value: Number(v) || 0 }))} min={0} />
          </SimpleGrid>
          <SimpleGrid cols={2}>
            <TextInput label="Unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g., %, $, orders" />
            <TextInput label="Period" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="e.g., 2026-Q1" />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => { close(); setEditingKpi(null); }}>Cancel</Button>
            <Button color="orange" loading={saving} onClick={handleSave}>{editingKpi ? 'Update' : 'Add KPI'}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default PartnerScorecards;
