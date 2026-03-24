// @ts-nocheck
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
  Divider,
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
import { PIPELINE_STAGES, PARTNER_TYPES, partnerTypeLabel } from '../dealConstants';
import PartnerDealDrawer from '../components/PartnerDealDrawer';
import { pushSignedToOnboarding } from '../partnerOnboardingPush';

/** Stages that can be advanced forward (excludes Lost — use Mark lost). */
const ADVANCE_ORDER = PIPELINE_STAGES.filter((s) => s.value !== 'lost').map((s) => s.value);

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
  assigned_to: string | null;
  owner_user_id: string | null;
  estimated_locations_reach: number | null;
  estimated_monthly_volume_impact: string | null;
  last_activity_at: string | null;
  stage_entered_at: string | null;
  leverage_score: string | null;
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function impactLine(p: Partnership): string {
  const parts: string[] = [];
  if (p.estimated_locations_reach != null && p.estimated_locations_reach > 0) {
    parts.push(`${p.estimated_locations_reach} loc`);
  }
  if (p.estimated_monthly_volume_impact) {
    parts.push(p.estimated_monthly_volume_impact);
  }
  return parts.length ? parts.join(' · ') : '—';
}

const PartnerPipeline: React.FC = () => {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    partner_name: '',
    partner_type: 'demand',
    status: 'lead',
    description: '',
    deal_value: null as number | null,
    priority: 'medium',
    industry: '',
    website_url: '',
    revenue_ytd: 0,
    revenue_mtd: 0,
    assigned_to: 'CPO',
    decision_maker_name: '',
    decision_maker_title: '',
    contact_phone: '',
    contact_email: '',
    estimated_locations_reach: null as number | null,
    estimated_monthly_volume_impact: '',
    leverage_score: '' as string,
  };

  const [formData, setFormData] = useState(emptyForm);

  const loadPartnerships = async () => {
    const { data } = await supabase.from('partnerships').select('*').order('updated_at', { ascending: false });
    setPartnerships((data as Partnership[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadPartnerships();
  }, []);

  const openDeal = (id: string) => {
    setDrawerId(id);
    setDrawerOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.partner_name.trim()) {
      notifications.show({ title: 'Error', message: 'Partner name is required', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: inserted, error } = await supabase
        .from('partnerships')
        .insert({
          partner_name: formData.partner_name.trim(),
          partner_type: formData.partner_type,
          status: formData.status,
          description: formData.description || null,
          deal_value: formData.deal_value,
          priority: formData.priority,
          industry: formData.industry || null,
          website_url: formData.website_url || null,
          revenue_ytd: formData.revenue_ytd || 0,
          revenue_mtd: formData.revenue_mtd || 0,
          assigned_to: formData.assigned_to || null,
          created_by: user?.id,
          owner_user_id: user?.id,
          estimated_locations_reach: formData.estimated_locations_reach,
          estimated_monthly_volume_impact: formData.estimated_monthly_volume_impact || null,
          leverage_score: formData.leverage_score || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (inserted?.id && (formData.decision_maker_name.trim() || formData.contact_email.trim())) {
        await supabase.from('partnership_contacts').insert({
          partnership_id: inserted.id,
          full_name: formData.decision_maker_name.trim() || 'Primary contact',
          title: formData.decision_maker_title.trim() || null,
          email: formData.contact_email.trim() || null,
          phone: formData.contact_phone.trim() || null,
          is_primary: true,
        });
      }

      if (inserted?.id && formData.status === 'signed') {
        await pushSignedToOnboarding(inserted.id);
      }

      notifications.show({ title: 'Success', message: 'Partner created', color: 'green' });
      close();
      setFormData(emptyForm);
      loadPartnerships();
      if (inserted?.id) openDeal(inserted.id);
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const advanceStage = async (id: string, currentStatus: string) => {
    const idx = ADVANCE_ORDER.indexOf(currentStatus);
    if (idx < 0 || idx >= ADVANCE_ORDER.length - 1) return;
    const nextStatus = ADVANCE_ORDER[idx + 1];
    const { error } = await supabase.from('partnerships').update({ status: nextStatus }).eq('id', id);
    if (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
      return;
    }
    if (nextStatus === 'signed') {
      const r = await pushSignedToOnboarding(id);
      if (r.ok && !r.skipped) {
        notifications.show({ title: 'Onboarding', message: 'Checklist created for Ops.', color: 'teal' });
      }
    }
    loadPartnerships();
    notifications.show({ title: 'Stage updated', message: `Moved to ${nextStatus}`, color: 'green' });
  };

  const markLost = async (id: string) => {
    const { error } = await supabase.from('partnerships').update({ status: 'lost' }).eq('id', id);
    if (error) {
      notifications.show({ title: 'Could not update', message: error.message, color: 'red' });
      return;
    }
    loadPartnerships();
    notifications.show({ title: 'Marked lost', color: 'orange' });
  };

  const deletePartnership = async (id: string) => {
    const { error } = await supabase.from('partnerships').delete().eq('id', id);
    if (error) {
      notifications.show({ title: 'Could not delete', message: error.message, color: 'red' });
      return;
    }
    loadPartnerships();
    notifications.show({ title: 'Deleted', message: 'Partner removed', color: 'orange' });
  };

  if (loading) {
    return <Stack gap="md">{[1, 2, 3].map((i) => <Skeleton key={i} height={100} radius="md" />)}</Stack>;
  }

  const renderCreateForm = () => (
    <Stack gap="md">
      <Divider label="Core" labelPosition="left" />
      <TextInput
        label="Partner name"
        required
        value={formData.partner_name}
        onChange={(e) => setFormData((d) => ({ ...d, partner_name: e.target.value }))}
      />
      <SimpleGrid cols={2}>
        <Select
          label="Partner type"
          data={PARTNER_TYPES}
          value={formData.partner_type}
          onChange={(v) => setFormData((d) => ({ ...d, partner_type: v || 'demand' }))}
        />
        <TextInput label="Industry" value={formData.industry} onChange={(e) => setFormData((d) => ({ ...d, industry: e.target.value }))} />
      </SimpleGrid>
      <TextInput
        label="Website"
        value={formData.website_url}
        onChange={(e) => setFormData((d) => ({ ...d, website_url: e.target.value }))}
        placeholder="https://"
      />

      <Divider label="Relationship owner" labelPosition="left" />
      <TextInput
        label="Assigned to"
        description="Defaults to CPO"
        value={formData.assigned_to}
        onChange={(e) => setFormData((d) => ({ ...d, assigned_to: e.target.value }))}
      />
      <SimpleGrid cols={2}>
        <TextInput
          label="Decision maker name"
          value={formData.decision_maker_name}
          onChange={(e) => setFormData((d) => ({ ...d, decision_maker_name: e.target.value }))}
        />
        <TextInput
          label="Decision maker title"
          value={formData.decision_maker_title}
          onChange={(e) => setFormData((d) => ({ ...d, decision_maker_title: e.target.value }))}
        />
      </SimpleGrid>
      <SimpleGrid cols={2}>
        <TextInput
          label="Contact phone"
          value={formData.contact_phone}
          onChange={(e) => setFormData((d) => ({ ...d, contact_phone: e.target.value }))}
        />
        <TextInput
          label="Contact email"
          value={formData.contact_email}
          onChange={(e) => setFormData((d) => ({ ...d, contact_email: e.target.value }))}
        />
      </SimpleGrid>

      <Divider label="Deal intelligence" labelPosition="left" />
      <SimpleGrid cols={2}>
        <NumberInput
          label="Estimated locations (or reach)"
          value={formData.estimated_locations_reach ?? undefined}
          onChange={(v) => setFormData((d) => ({ ...d, estimated_locations_reach: typeof v === 'number' ? v : null }))}
          min={0}
        />
        <TextInput
          label="Est. monthly volume impact"
          description="$ or orders"
          value={formData.estimated_monthly_volume_impact}
          onChange={(e) => setFormData((d) => ({ ...d, estimated_monthly_volume_impact: e.target.value }))}
        />
      </SimpleGrid>
      <Select
        label="Priority"
        data={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'strategic', label: 'Strategic' },
        ]}
        value={formData.priority}
        onChange={(v) => setFormData((d) => ({ ...d, priority: v || 'medium' }))}
      />
      <Select
        label="Leverage score"
        data={[
          { value: '', label: '—' },
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ]}
        value={formData.leverage_score}
        onChange={(v) => setFormData((d) => ({ ...d, leverage_score: v || '' }))}
      />

      <Divider label="Deal stage" labelPosition="left" />
      <Select
        label="Stage"
        data={PIPELINE_STAGES.map((s) => ({ value: s.value, label: s.label }))}
        value={formData.status}
        onChange={(v) => setFormData((d) => ({ ...d, status: v || 'lead' }))}
      />
      <NumberInput
        label="Deal value (optional)"
        value={formData.deal_value ?? undefined}
        onChange={(v) => setFormData((d) => ({ ...d, deal_value: typeof v === 'number' ? v : null }))}
        min={0}
        thousandSeparator=","
        prefix="$"
      />

      <Divider label="Notes" labelPosition="left" />
      <Textarea
        label="Notes"
        minRows={4}
        value={formData.description}
        onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
      />
    </Stack>
  );

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Partner pipeline</Title>
        <Group>
          <Button
            variant="light"
            color="gray"
            leftSection={<IconDownload size={16} />}
            onClick={() => {
              exportToCSV(
                partnerships.map((p) => ({
                  Name: p.partner_name,
                  Type: partnerTypeLabel(p.partner_type),
                  Stage: p.status,
                  'Deal value': p.deal_value || 0,
                  Priority: p.priority,
                  'Last activity': p.last_activity_at || '',
                })),
                'partner-pipeline',
              );
            }}
          >
            CSV
          </Button>
          <Button
            variant="light"
            color="gray"
            leftSection={<IconFileText size={16} />}
            onClick={() => {
              const rows = partnerships
                .map(
                  (p) =>
                    `<tr><td>${p.partner_name}</td><td>${partnerTypeLabel(p.partner_type)}</td><td>${p.status}</td><td>$${Number(p.deal_value || 0).toLocaleString()}</td></tr>`,
                )
                .join('');
              exportToPrintPDF('Partner Pipeline', `<table><tr><th>Name</th><th>Type</th><th>Stage</th><th>Deal Value</th></tr>${rows}</table>`);
            }}
          >
            PDF
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            color="orange"
            onClick={() => {
              setFormData(emptyForm);
              open();
            }}
          >
            New partner
          </Button>
        </Group>
      </Group>

      <div style={{ overflowX: 'auto' }}>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 7 }} style={{ minWidth: 1100 }}>
          {PIPELINE_STAGES.map((stage) => {
            const stagePartners = partnerships.filter((p) => p.status === stage.value);
            return (
              <Card key={stage.value} shadow="xs" radius="md" padding="sm" withBorder style={{ minHeight: 220 }}>
                <Group justify="space-between" mb="sm">
                  <Badge color={stage.color} variant="light" size="lg">
                    {stage.label}
                  </Badge>
                  <Badge color="gray" variant="light" size="sm">
                    {stagePartners.length}
                  </Badge>
                </Group>
                <Stack gap="xs">
                  {stagePartners.map((p) => (
                    <Card key={p.id} shadow="xs" radius="sm" padding="sm" withBorder>
                      <Group justify="space-between" wrap="nowrap" align="flex-start">
                        <div
                          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                          onClick={() => openDeal(p.id)}
                          role="presentation"
                        >
                          <Text fw={600} size="sm" truncate>
                            {p.partner_name}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>
                            {partnerTypeLabel(p.partner_type)}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {impactLine(p)}
                          </Text>
                          {p.deal_value ? (
                            <Text size="xs" c="green" fw={500}>
                              ${Number(p.deal_value).toLocaleString()}
                            </Text>
                          ) : null}
                          <Text size="xs" mt={4}>
                            Last:{' '}
                            <Text span c={!p.last_activity_at ? 'red' : 'dimmed'}>
                              {formatRelative(p.last_activity_at)}
                            </Text>
                          </Text>
                        </div>
                        <Menu shadow="md" width={180}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" size="sm" onClick={(e) => e.stopPropagation()}>
                              <IconDotsVertical size={14} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => openDeal(p.id)}>
                              Open workspace
                            </Menu.Item>
                            {stage.value !== 'signed' && stage.value !== 'lost' && (
                              <Menu.Item
                                leftSection={<IconArrowRight size={14} />}
                                onClick={() => advanceStage(p.id, p.status)}
                              >
                                Advance stage
                              </Menu.Item>
                            )}
                            <Menu.Item color="red" onClick={() => markLost(p.id)}>
                              Mark lost
                            </Menu.Item>
                            <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => deletePartnership(p.id)}>
                              Delete
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Card>
                  ))}
                  {stagePartners.length === 0 && (
                    <Text size="xs" c="dimmed" ta="center" py="md">
                      No partners
                    </Text>
                  )}
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      </div>

      <Modal opened={opened} onClose={close} title="New strategic partner" size="lg">
        <Stack gap="md">
          {renderCreateForm()}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button color="orange" loading={saving} onClick={handleCreate}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>

      <PartnerDealDrawer
        opened={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerId(null);
        }}
        partnershipId={drawerId}
        onUpdated={loadPartnerships}
      />
    </Stack>
  );
};

export default PartnerPipeline;
