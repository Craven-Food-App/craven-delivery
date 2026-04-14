// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  SegmentedControl,
  Switch,
  Alert,
  Paper,
  List,
  useMantineTheme,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
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
  IconUpload,
  IconInfoCircle,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV, exportToPrintPDF } from '../utils/exportHelpers';
import {
  PIPELINE_STAGES,
  PARTNER_TYPES,
  partnerTypeLabel,
  PARTNERSHIP_DISPOSITIONS,
  dispositionLabel,
} from '../dealConstants';
import { parseCsvRows, rowToImportPayload, PARTNERSHIP_CSV_HEADERS } from '../utils/partnershipDispositionCsv';
import PartnerDealDrawer from '../components/PartnerDealDrawer';
import { pushSignedToOnboarding } from '../partnerOnboardingPush';

/** Stages that can be advanced forward (excludes Lost — use Record closed). */
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
  disposition?: string | null;
  disposition_notes?: string | null;
  next_follow_up_at?: string | null;
  disposition_recorded_at?: string | null;
  ok_to_reengage?: boolean | null;
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

function stageColumnBackground(theme: ReturnType<typeof useMantineTheme>, color: string) {
  const row = theme.colors[color as keyof typeof theme.colors];
  return Array.isArray(row) ? row[0] : theme.colors.gray[0];
}

const PartnerPipeline: React.FC = () => {
  const theme = useMantineTheme();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pipelineFilter, setPipelineFilter] = useState<'all' | 'active' | 'closed'>('all');

  const [lostOpened, { open: openLost, close: closeLost }] = useDisclosure(false);
  const [lostPartnershipId, setLostPartnershipId] = useState<string | null>(null);
  const [lostPartnerName, setLostPartnerName] = useState('');
  const [savingLost, setSavingLost] = useState(false);
  const [lostForm, setLostForm] = useState({
    disposition: 'not_interested',
    disposition_notes: '',
    next_follow_up_at: null,
    ok_to_reengage: true,
  });

  const importRef = useRef<HTMLInputElement>(null);

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

  const visiblePartnerships = useMemo(() => {
    if (pipelineFilter === 'active') return partnerships.filter((p) => p.status !== 'lost');
    if (pipelineFilter === 'closed') return partnerships.filter((p) => p.status === 'lost');
    return partnerships;
  }, [partnerships, pipelineFilter]);

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

  const openLostModal = (id: string, name: string) => {
    setLostPartnershipId(id);
    setLostPartnerName(name);
    setLostForm({
      disposition: 'not_interested',
      disposition_notes: '',
      next_follow_up_at: null,
      ok_to_reengage: true,
    });
    openLost();
  };

  const submitLost = async () => {
    if (!lostPartnershipId || !lostForm.disposition) {
      notifications.show({ title: 'Disposition required', message: 'Choose why this deal closed.', color: 'red' });
      return;
    }
    setSavingLost(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const prev = partnerships.find((p) => p.id === lostPartnershipId);
      const now = new Date().toISOString();
      const nextIso = lostForm.next_follow_up_at
        ? new Date(lostForm.next_follow_up_at).toISOString()
        : null;

      const { error: upErr } = await supabase
        .from('partnerships')
        .update({
          status: 'lost',
          disposition: lostForm.disposition,
          disposition_notes: lostForm.disposition_notes.trim() || null,
          next_follow_up_at: nextIso,
          ok_to_reengage: lostForm.ok_to_reengage,
          disposition_recorded_at: now,
          disposition_recorded_by: user?.id ?? null,
        })
        .eq('id', lostPartnershipId);

      if (upErr) throw upErr;

      const { error: evErr } = await supabase.from('partnership_disposition_events').insert({
        partnership_id: lostPartnershipId,
        previous_status: prev?.status ?? null,
        new_status: 'lost',
        disposition: lostForm.disposition,
        notes: lostForm.disposition_notes.trim() || null,
        next_follow_up_at: nextIso,
        ok_to_reengage: lostForm.ok_to_reengage,
        recorded_by: user?.id ?? null,
      });
      if (evErr) throw evErr;

      const { error: actErr } = await supabase.from('partnership_activities').insert({
        partnership_id: lostPartnershipId,
        activity_type: 'note',
        title: 'Disposition recorded',
        description: `${dispositionLabel(lostForm.disposition)}${lostForm.disposition_notes ? ` — ${lostForm.disposition_notes}` : ''}`,
        performed_by: user?.id ?? null,
      });
      if (actErr) console.warn('activity log', actErr);

      notifications.show({ title: 'Recorded', message: 'Closed deal saved for export & follow-up.', color: 'green' });
      closeLost();
      setLostPartnershipId(null);
      loadPartnerships();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSavingLost(false);
    }
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

  const buildExportRows = (rows: Partnership[]) =>
    rows.map((p) => ({
      partner_name: p.partner_name,
      partner_type: p.partner_type,
      type_label: partnerTypeLabel(p.partner_type),
      status: p.status,
      disposition: p.disposition || '',
      disposition_label: p.disposition ? dispositionLabel(p.disposition) : '',
      disposition_notes: p.disposition_notes || '',
      next_follow_up_at: p.next_follow_up_at || '',
      ok_to_reengage: p.ok_to_reengage === false ? 'no' : 'yes',
      disposition_recorded_at: p.disposition_recorded_at || '',
      deal_value: p.deal_value ?? '',
      priority: p.priority,
      industry: p.industry || '',
      website_url: p.website_url || '',
      assigned_to: p.assigned_to || '',
      last_activity_at: p.last_activity_at || '',
      description: p.description || '',
    }));

  const exportEnterpriseCsv = (rows: Partnership[], filename: string) => {
    exportToCSV(buildExportRows(rows), filename, { utf8Bom: true });
  };

  const downloadImportTemplate = () => {
    const templateRow: Record<string, string> = {};
    PARTNERSHIP_CSV_HEADERS.forEach((h) => {
      templateRow[h] = '';
    });
    exportToCSV([templateRow], 'partner-import-template', { utf8Bom: true });
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const { rows: parsed } = parseCsvRows(text);
    let ok = 0;
    let skipped = 0;
    for (const row of parsed) {
      const payload = rowToImportPayload(row);
      if (!payload) {
        skipped++;
        continue;
      }
      const disposition =
        payload.disposition || (payload.status === 'lost' ? 'other' : null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: inserted, error } = await supabase
          .from('partnerships')
          .insert({
            partner_name: payload.partner_name,
            partner_type: payload.partner_type,
            status: payload.status,
            description: payload.description,
            industry: payload.industry,
            website_url: payload.website_url,
            assigned_to: payload.assigned_to || 'CPO',
            priority: payload.priority,
            created_by: user?.id,
            owner_user_id: user?.id,
            disposition: disposition || null,
            disposition_notes: payload.disposition_notes,
            next_follow_up_at: payload.next_follow_up_at,
            ok_to_reengage: payload.ok_to_reengage,
            disposition_recorded_at: payload.status === 'lost' && disposition ? new Date().toISOString() : null,
            disposition_recorded_by: payload.status === 'lost' && disposition ? user?.id : null,
          })
          .select('id')
          .single();
        if (error) throw error;
        if (inserted?.id && payload.contact_email) {
          await supabase.from('partnership_contacts').insert({
            partnership_id: inserted.id,
            full_name: 'Imported contact',
            email: payload.contact_email,
            phone: payload.contact_phone,
            is_primary: true,
          });
        }
        if (inserted?.id && payload.status === 'lost' && disposition) {
          await supabase.from('partnership_disposition_events').insert({
            partnership_id: inserted.id,
            previous_status: null,
            new_status: 'lost',
            disposition,
            notes: payload.disposition_notes,
            next_follow_up_at: payload.next_follow_up_at,
            ok_to_reengage: payload.ok_to_reengage,
            recorded_by: user?.id ?? null,
          });
        }
        ok++;
      } catch (e: any) {
        console.error(e);
        skipped++;
      }
    }
    notifications.show({
      title: 'Import finished',
      message: `Imported ${ok} row(s). Skipped ${skipped}.`,
      color: ok ? 'green' : 'orange',
    });
    if (importRef.current) importRef.current.value = '';
    loadPartnerships();
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

  const lostOnly = partnerships.filter((p) => p.status === 'lost');

  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={6} maw={720}>
            
            <Text size="sm" c="dimmed">
              Track strategic partners from first lead through signature — or a documented close. Columns are{' '}
              <strong>deal stages</strong> (left to right). Use the filter to focus on active work or closed deals.
            </Text>
          </Stack>
          <Stack gap={6} align="flex-end">
            <SegmentedControl
              value={pipelineFilter}
              onChange={(v) => setPipelineFilter(v as 'all' | 'active' | 'closed')}
              data={[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Closed / lost', value: 'closed' },
              ]}
            />
          </Stack>
        </Group>

      </Stack>

      <Group justify="space-between" align="flex-start" wrap="wrap" gap="lg">
        <Group align="flex-start" wrap="wrap" gap="xl">
          <Stack gap={6}>
            <Text size="xs" tt="uppercase" fw={600} c="dimmed" lts={0.5}>
              Export & reports
            </Text>
            <Group gap="xs">
              <Button
                variant="light"
                color="gray"
                leftSection={<IconDownload size={16} />}
                onClick={() => exportEnterpriseCsv(visiblePartnerships, 'partner-pipeline-enterprise')}
              >
                Export CSV (Excel)
              </Button>
              <Button
                variant="light"
                color="gray"
                leftSection={<IconDownload size={16} />}
                onClick={() => exportEnterpriseCsv(lostOnly, 'partner-closed-dispositions')}
              >
                Export closed only
              </Button>
              <Button
                variant="light"
                color="gray"
                leftSection={<IconFileText size={16} />}
                onClick={() => {
                  const rows = visiblePartnerships
                    .map(
                      (p) =>
                        `<tr><td>${p.partner_name}</td><td>${partnerTypeLabel(p.partner_type)}</td><td>${p.status}</td><td>${p.disposition ? dispositionLabel(p.disposition) : '—'}</td><td>$${Number(p.deal_value || 0).toLocaleString()}</td></tr>`,
                    )
                    .join('');
                  exportToPrintPDF(
                    'Partner Pipeline',
                    `<table><tr><th>Name</th><th>Type</th><th>Stage</th><th>Disposition</th><th>Deal Value</th></tr>${rows}</table>`,
                  );
                }}
              >
                PDF
              </Button>
            </Group>
          </Stack>

          <Divider orientation="vertical" visibleFrom="sm" />

          <Stack gap={6}>
            <Text size="xs" tt="uppercase" fw={600} c="dimmed" lts={0.5}>
              Import
            </Text>
            <Group gap="xs">
              <Button variant="default" size="sm" onClick={downloadImportTemplate}>
                CSV template
              </Button>
              <Button
                variant="light"
                color="gray"
                leftSection={<IconUpload size={16} />}
                onClick={() => importRef.current?.click()}
              >
                Import CSV
              </Button>
              <input
                ref={importRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => void handleImportFile(e.target.files?.[0] ?? null)}
              />
            </Group>
          </Stack>

          <Divider orientation="vertical" visibleFrom="sm" />

          <Stack gap={6}>
            <Text size="xs" tt="uppercase" fw={600} c="dimmed" lts={0.5}>
              Add
            </Text>
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
          </Stack>
        </Group>
      </Group>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: 0, minWidth: 1200 }}>
          {PIPELINE_STAGES.map((stage, idx) => {
            const stagePartners = visiblePartnerships.filter((p) => p.status === stage.value);
            const isLast = idx === PIPELINE_STAGES.length - 1;

            // Subtle left-border accent per stage
            const accentMap: Record<string, string> = {
              gray: '#868e96', blue: '#339af0', cyan: '#22b8cf',
              yellow: '#fab005', orange: '#ff922b', green: '#40c057', red: '#fa5252',
            };
            const accent = accentMap[stage.color] || '#868e96';

            return (
              <div
                key={stage.value}
                style={{
                  flex: '1 1 0',
                  minWidth: 165,
                  borderRight: isLast ? 'none' : '1px solid var(--mantine-color-gray-2)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* ── Column header ── */}
                <div style={{
                  padding: '10px 12px 8px',
                  borderBottom: '2px solid var(--mantine-color-gray-2)',
                  background: 'var(--mantine-color-gray-0)',
                }}>
                  <Group justify="space-between" wrap="nowrap" gap={4}>
                    <Group gap={6} wrap="nowrap" align="center">
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: accent, flexShrink: 0,
                      }} />
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.04em' }}>
                        {stage.label}
                      </Text>
                    </Group>
                    <Badge
                      size="sm"
                      variant="filled"
                      color={stagePartners.length > 0 ? stage.color : 'gray'}
                      radius="xl"
                      style={{ minWidth: 22, height: 20, padding: '0 6px', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {stagePartners.length}
                    </Badge>
                  </Group>
                </div>

                {/* ── Column body ── */}
                <div style={{
                  flex: 1,
                  padding: '8px 8px',
                  overflowY: 'auto',
                  maxHeight: 'calc(100vh - 340px)',
                  minHeight: 180,
                }}>
                  <Stack gap={6}>
                    {stagePartners.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: '1px solid var(--mantine-color-gray-2)',
                          background: 'var(--mantine-color-body)',
                          cursor: 'pointer',
                          transition: 'box-shadow 120ms ease, border-color 120ms ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = accent;
                          e.currentTarget.style.boxShadow = `0 1px 4px ${accent}22`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--mantine-color-gray-2)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <Group justify="space-between" wrap="nowrap" align="flex-start" gap={4}>
                          <div
                            style={{ flex: 1, minWidth: 0 }}
                            onClick={() => openDeal(p.id)}
                            role="presentation"
                          >
                            <Text fw={600} size="sm" truncate lh={1.3}>
                              {p.partner_name}
                            </Text>
                            <Text size="xs" c="dimmed" mt={4} truncate>
                              {partnerTypeLabel(p.partner_type)}
                            </Text>
                            {p.deal_value ? (
                              <Text size="xs" c="teal" fw={600} mt={2} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                ${Number(p.deal_value).toLocaleString()}
                              </Text>
                            ) : null}
                            {p.status === 'lost' && p.disposition ? (
                              <Badge size="xs" variant="light" color="red" mt={4}>
                                {dispositionLabel(p.disposition)}
                              </Badge>
                            ) : null}
                            <Text size="xs" c={!p.last_activity_at ? 'red' : 'dimmed'} mt={4}>
                              {formatRelative(p.last_activity_at)}
                            </Text>
                          </div>
                          <Menu shadow="md" width={220}>
                            <Menu.Target>
                              <ActionIcon variant="subtle" size="xs" color="gray" onClick={(e) => e.stopPropagation()}>
                                <IconDotsVertical size={13} />
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
                              {stage.value !== 'lost' ? (
                                <Menu.Item color="red" onClick={() => openLostModal(p.id, p.partner_name)}>
                                  Record closed
                                </Menu.Item>
                              ) : null}
                              <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => deletePartnership(p.id)}>
                                Delete
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      </div>
                    ))}
                    {stagePartners.length === 0 && (
                      <Text size="xs" c="dimmed" ta="center" py="xl" px="xs" lh={1.5} fs="italic">
                        No deals
                      </Text>
                    )}
                  </Stack>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Alert variant="light" color="gray" icon={<IconInfoCircle size={18} />} title="How this board works" mt="md">
        <List size="sm" spacing={6} withPadding>
          <List.Item>
            <strong>Stages</strong> — Each column is where this relationship sits in the deal. Advance from the ⋮ menu, or set stage when
            creating / importing.
          </List.Item>
          <List.Item>
            <strong>Closed outcomes</strong> — Use <strong>Record closed / not interested</strong> to capture why they walked away;
            export to CSV for CRM, re-engagement lists, and reporting.
          </List.Item>
          <List.Item>
            <strong>Import / export</strong> — Template and CSV import add or update rows; exports match spreadsheet workflows.
          </List.Item>
        </List>
      </Alert>

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

      <Modal
        opened={lostOpened}
        onClose={closeLost}
        title={`Record closed — ${lostPartnerName}`}
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Disposition"
            description="Why they said no or walked away — used for reporting and re-engagement."
            data={PARTNERSHIP_DISPOSITIONS.map((d) => ({ value: d.value, label: d.label }))}
            value={lostForm.disposition}
            onChange={(v) => setLostForm((f) => ({ ...f, disposition: v || 'not_interested' }))}
            required
          />
          <Textarea
            label="Notes"
            placeholder="Context for your team (objections, competitor name, timing, etc.)"
            minRows={3}
            value={lostForm.disposition_notes}
            onChange={(e) => setLostForm((f) => ({ ...f, disposition_notes: e.target.value }))}
          />
          <DatePickerInput
            label="Next follow-up (optional)"
            description="For “not now” or nurture — shows on the card and in export."
            value={lostForm.next_follow_up_at}
            onChange={(d) => setLostForm((f) => ({ ...f, next_follow_up_at: d }))}
            clearable
          />
          <Switch
            label="OK to re-engage / cold outreach"
            description="Turn off for a hard no or do-not-contact."
            checked={lostForm.ok_to_reengage}
            onChange={(e) => setLostForm((f) => ({ ...f, ok_to_reengage: e.currentTarget.checked }))}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeLost}>
              Cancel
            </Button>
            <Button color="red" loading={savingLost} onClick={() => void submitLost()}>
              Save & move to Lost
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
