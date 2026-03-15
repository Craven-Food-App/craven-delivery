import React, { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Badge,
  Button,
  SimpleGrid,
  Stack,
  Modal,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Skeleton,
  ActionIcon,
  Menu,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconArrowRight,
  IconDownload,
  IconFileText,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV, exportToPrintPDF } from '../utils/exportHelpers';

const STAGES = [
  { value: 'lead', label: 'Lead', color: 'gray' },
  { value: 'prospect', label: 'Prospect', color: 'blue' },
  { value: 'negotiation', label: 'Negotiation', color: 'yellow' },
  { value: 'contract_review', label: 'Contract Review', color: 'orange' },
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'on_hold', label: 'On Hold', color: 'red' },
];

const PARTNER_TYPES = [
  { value: 'restaurant_merchant', label: 'Restaurant/Merchant' },
  { value: 'strategic_corporate', label: 'Strategic/Corporate' },
  { value: 'technology_integration', label: 'Technology/Integration' },
  { value: 'revenue_share', label: 'Revenue Share' },
  { value: 'co_marketing', label: 'Co-Marketing' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'other', label: 'Other' },
];

interface Partnership {
  id: string;
  partner_name: string;
  partner_type: string;
  status: string;
  description: string | null;
  deal_value: number | null;
  priority: string;
  health_score: number | null;
  created_at: string;
  industry: string | null;
  website_url: string | null;
  revenue_ytd: number | null;
  revenue_mtd: number | null;
}

const PartnerPipeline: React.FC = () => {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partnership | null>(null);

  const emptyForm = {
    partner_name: '',
    partner_type: 'other',
    status: 'lead',
    description: '',
    deal_value: 0,
    priority: 'medium',
    industry: '',
    website_url: '',
    revenue_ytd: 0,
    revenue_mtd: 0,
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadPartnerships();
  }, []);

  const loadPartnerships = async () => {
    const { data } = await supabase
      .from('partnerships')
      .select('*')
      .order('created_at', { ascending: false });
    setPartnerships((data as Partnership[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!formData.partner_name.trim()) {
      notifications.show({ title: 'Error', message: 'Partner name is required', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('partnerships').insert({
        partner_name: formData.partner_name,
        partner_type: formData.partner_type as any,
        status: formData.status as any,
        description: formData.description || null,
        deal_value: formData.deal_value || null,
        priority: formData.priority,
        industry: formData.industry || null,
        website_url: formData.website_url || null,
        revenue_ytd: formData.revenue_ytd || 0,
        revenue_mtd: formData.revenue_mtd || 0,
        created_by: user?.id,
        owner_user_id: user?.id,
      });
      if (error) throw error;
      notifications.show({ title: 'Success', message: 'Partnership created', color: 'green' });
      close();
      setFormData(emptyForm);
      loadPartnerships();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p: Partnership) => {
    setEditingPartner(p);
    setFormData({
      partner_name: p.partner_name,
      partner_type: p.partner_type,
      status: p.status,
      description: p.description || '',
      deal_value: Number(p.deal_value) || 0,
      priority: p.priority || 'medium',
      industry: p.industry || '',
      website_url: p.website_url || '',
      revenue_ytd: Number(p.revenue_ytd) || 0,
      revenue_mtd: Number(p.revenue_mtd) || 0,
    });
    openEdit();
  };

  const handleUpdate = async () => {
    if (!editingPartner) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('partnerships').update({
        partner_name: formData.partner_name,
        partner_type: formData.partner_type as any,
        status: formData.status as any,
        description: formData.description || null,
        deal_value: formData.deal_value || null,
        priority: formData.priority,
        industry: formData.industry || null,
        website_url: formData.website_url || null,
        revenue_ytd: formData.revenue_ytd || 0,
        revenue_mtd: formData.revenue_mtd || 0,
      }).eq('id', editingPartner.id);
      if (error) throw error;
      notifications.show({ title: 'Updated', message: 'Partnership updated', color: 'green' });
      closeEdit();
      setEditingPartner(null);
      setFormData(emptyForm);
      loadPartnerships();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const advanceStage = async (id: string, currentStatus: string) => {
    const stageOrder = ['lead', 'prospect', 'negotiation', 'contract_review', 'active'];
    const idx = stageOrder.indexOf(currentStatus);
    if (idx < 0 || idx >= stageOrder.length - 1) return;
    const nextStatus = stageOrder[idx + 1];
    await supabase.from('partnerships').update({ status: nextStatus as any }).eq('id', id);
    loadPartnerships();
    notifications.show({ title: 'Stage Updated', message: `Moved to ${nextStatus.replace('_', ' ')}`, color: 'green' });
  };

  const deletePartnership = async (id: string) => {
    await supabase.from('partnerships').delete().eq('id', id);
    loadPartnerships();
    notifications.show({ title: 'Deleted', message: 'Partnership removed', color: 'orange' });
  };

  if (loading) {
    return <Stack gap="md">{[1, 2, 3].map(i => <Skeleton key={i} height={100} radius="md" />)}</Stack>;
  }

  const pipelineStages = STAGES.filter(s => ['lead', 'prospect', 'negotiation', 'contract_review', 'active'].includes(s.value));

  const renderFormFields = () => (
    <>
      <TextInput
        label="Partner Name"
        required
        value={formData.partner_name}
        onChange={e => setFormData(d => ({ ...d, partner_name: e.target.value }))}
      />
      <SimpleGrid cols={2}>
        <Select
          label="Partner Type"
          data={PARTNER_TYPES}
          value={formData.partner_type}
          onChange={v => setFormData(d => ({ ...d, partner_type: v || 'other' }))}
        />
        <Select
          label="Stage"
          data={STAGES.map(s => ({ value: s.value, label: s.label }))}
          value={formData.status}
          onChange={v => setFormData(d => ({ ...d, status: v || 'lead' }))}
        />
      </SimpleGrid>
      <SimpleGrid cols={2}>
        <TextInput
          label="Industry"
          value={formData.industry}
          onChange={e => setFormData(d => ({ ...d, industry: e.target.value }))}
        />
        <NumberInput
          label="Deal Value ($)"
          value={formData.deal_value}
          onChange={v => setFormData(d => ({ ...d, deal_value: Number(v) || 0 }))}
          min={0}
          thousandSeparator=","
          prefix="$"
        />
      </SimpleGrid>
      <SimpleGrid cols={2}>
        <NumberInput
          label="Revenue YTD ($)"
          value={formData.revenue_ytd}
          onChange={v => setFormData(d => ({ ...d, revenue_ytd: Number(v) || 0 }))}
          min={0}
          thousandSeparator=","
          prefix="$"
        />
        <NumberInput
          label="Revenue MTD ($)"
          value={formData.revenue_mtd}
          onChange={v => setFormData(d => ({ ...d, revenue_mtd: Number(v) || 0 }))}
          min={0}
          thousandSeparator=","
          prefix="$"
        />
      </SimpleGrid>
      <Select
        label="Priority"
        data={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'critical', label: 'Critical' },
        ]}
        value={formData.priority}
        onChange={v => setFormData(d => ({ ...d, priority: v || 'medium' }))}
      />
      <TextInput
        label="Website"
        value={formData.website_url}
        onChange={e => setFormData(d => ({ ...d, website_url: e.target.value }))}
        placeholder="https://"
      />
      <Textarea
        label="Description"
        value={formData.description}
        onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
        minRows={3}
      />
    </>
  );

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Partner Pipeline</Title>
        <Group>
          <Button variant="light" color="gray" leftSection={<IconDownload size={16} />} onClick={() => {
            exportToCSV(partnerships.map(p => ({
              Name: p.partner_name, Type: p.partner_type, Stage: p.status, 'Deal Value': p.deal_value || 0, Priority: p.priority, Industry: p.industry || '',
            })), 'partner-pipeline');
          }}>CSV</Button>
          <Button variant="light" color="gray" leftSection={<IconFileText size={16} />} onClick={() => {
            const rows = partnerships.map(p => `<tr><td>${p.partner_name}</td><td>${p.partner_type}</td><td>${p.status}</td><td>$${Number(p.deal_value || 0).toLocaleString()}</td></tr>`).join('');
            exportToPrintPDF('Partner Pipeline', `<table><tr><th>Name</th><th>Type</th><th>Stage</th><th>Deal Value</th></tr>${rows}</table>`);
          }}>PDF</Button>
          <Button leftSection={<IconPlus size={16} />} color="orange" onClick={open}>
            Add Partner
          </Button>
        </Group>
      </Group>

      <div style={{ overflowX: 'auto' }}>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} style={{ minWidth: 900 }}>
          {pipelineStages.map(stage => {
            const stagePartners = partnerships.filter(p => p.status === stage.value);
            return (
              <Card key={stage.value} shadow="xs" radius="md" padding="sm" withBorder style={{ minHeight: 200 }}>
                <Group justify="space-between" mb="sm">
                  <Badge color={stage.color} variant="light" size="lg">{stage.label}</Badge>
                  <Badge color="gray" variant="light" size="sm">{stagePartners.length}</Badge>
                </Group>
                <Stack gap="xs">
                  {stagePartners.map(p => (
                    <Card key={p.id} shadow="xs" radius="sm" padding="sm" withBorder style={{ cursor: 'pointer' }}>
                      <Group justify="space-between" wrap="nowrap">
                        <div style={{ flex: 1, minWidth: 0 }} onClick={() => handleEdit(p)}>
                          <Text fw={600} size="sm" truncate>{p.partner_name}</Text>
                          <Text size="xs" c="dimmed" truncate>
                            {PARTNER_TYPES.find(t => t.value === p.partner_type)?.label || p.partner_type}
                          </Text>
                          {p.deal_value ? (
                            <Text size="xs" c="green" fw={500}>${Number(p.deal_value).toLocaleString()}</Text>
                          ) : null}
                        </div>
                        <Menu shadow="md" width={160}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" size="sm"><IconDotsVertical size={14} /></ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconEdit size={14} />}
                              onClick={() => handleEdit(p)}
                            >
                              Edit
                            </Menu.Item>
                            {stage.value !== 'active' && (
                              <Menu.Item
                                leftSection={<IconArrowRight size={14} />}
                                onClick={() => advanceStage(p.id, p.status)}
                              >
                                Advance Stage
                              </Menu.Item>
                            )}
                            <Menu.Item
                              leftSection={<IconTrash size={14} />}
                              color="red"
                              onClick={() => deletePartnership(p.id)}
                            >
                              Delete
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Card>
                  ))}
                  {stagePartners.length === 0 && (
                    <Text size="xs" c="dimmed" ta="center" py="md">No partners</Text>
                  )}
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      </div>

      {/* Create Modal */}
      <Modal opened={opened} onClose={close} title="Add New Partner" size="lg">
        <Stack gap="md">
          {renderFormFields()}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button color="orange" loading={saving} onClick={handleCreate}>Create Partner</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Modal */}
      <Modal opened={editOpened} onClose={() => { closeEdit(); setEditingPartner(null); setFormData(emptyForm); }} title="Edit Partner" size="lg">
        <Stack gap="md">
          {renderFormFields()}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => { closeEdit(); setEditingPartner(null); setFormData(emptyForm); }}>Cancel</Button>
            <Button color="orange" loading={saving} onClick={handleUpdate}>Save Changes</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default PartnerPipeline;
