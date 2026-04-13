// @ts-nocheck
/**
 * CPO — Vendor directory: operational vendor records (name, POC, terms, renewal).
 * Backed by partnerships (partner_type = vendor) + partnership_contacts; full detail in PartnerDealDrawer.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Group,
  Button,
  TextInput,
  Textarea,
  Table,
  Badge,
  Modal,
  Paper,
  Skeleton,
  ActionIcon,
  ScrollArea,
  SimpleGrid,
  Divider,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconSearch, IconDownload, IconUpload, IconEdit, IconTrash, IconFileText } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV } from '../utils/exportHelpers';
import { parseCsvRows, rowToVendorImportPayload, VENDOR_CSV_HEADERS } from '../utils/vendorCsv';
import PartnerDealDrawer from '../components/PartnerDealDrawer';
import { PIPELINE_STAGES } from '../dealConstants';

function stageLabel(status: string | undefined) {
  return PIPELINE_STAGES.find((s) => s.value === status)?.label ?? status ?? '—';
}

function primaryContact(contacts) {
  if (!contacts?.length) return null;
  return contacts.find((c) => c.is_primary) ?? contacts[0];
}

const VendorRecords: React.FC = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerId, setDrawerId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);
  const importRef = useRef(null);

  const [form, setForm] = useState({
    partner_name: '',
    poc_name: '',
    poc_title: '',
    poc_email: '',
    poc_phone: '',
    industry: '',
    website_url: '',
    payment_terms: '',
    renewal_date: null,
    contract_start_date: null,
    contract_end_date: null,
    assigned_to: 'CPO',
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('partnerships')
        .select(
          `
          id,
          partner_name,
          partner_type,
          status,
          industry,
          website_url,
          payment_terms,
          renewal_date,
          contract_start_date,
          contract_end_date,
          assigned_to,
          last_activity_at,
          notes,
          disposition,
          disposition_notes,
          partnership_contacts (
            id,
            full_name,
            title,
            email,
            phone,
            is_primary
          )
        `,
        )
        .eq('partner_type', 'vendor')
        .order('partner_name', { ascending: true });

      if (error) throw error;
      setRows(data || []);
    } catch (e: any) {
      console.error(e);
      notifications.show({ title: 'Could not load vendors', message: e?.message ?? String(e), color: 'red' });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const poc = primaryContact(r.partnership_contacts);
      const hay = [
        r.partner_name,
        r.industry,
        r.assigned_to,
        poc?.full_name,
        poc?.email,
        poc?.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const openRecord = (id) => {
    setDrawerId(id);
    setDrawerOpen(true);
  };

  const resetForm = () =>
    setForm({
      partner_name: '',
      poc_name: '',
      poc_title: '',
      poc_email: '',
      poc_phone: '',
      industry: '',
      website_url: '',
      payment_terms: '',
      renewal_date: null,
      contract_start_date: null,
      contract_end_date: null,
      assigned_to: 'CPO',
      notes: '',
    });

  const handleCreate = async () => {
    if (!form.partner_name.trim()) {
      notifications.show({ title: 'Vendor name required', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: inserted, error } = await supabase
        .from('partnerships')
        .insert({
          partner_name: form.partner_name.trim(),
          partner_type: 'vendor',
          status: 'in_talks',
          industry: form.industry.trim() || null,
          website_url: form.website_url.trim() || null,
          payment_terms: form.payment_terms.trim() || null,
          renewal_date: form.renewal_date ? new Date(form.renewal_date).toISOString().slice(0, 10) : null,
          contract_start_date: form.contract_start_date
            ? new Date(form.contract_start_date).toISOString().slice(0, 10)
            : null,
          contract_end_date: form.contract_end_date
            ? new Date(form.contract_end_date).toISOString().slice(0, 10)
            : null,
          assigned_to: form.assigned_to.trim() || 'CPO',
          notes: form.notes.trim() || null,
          created_by: user?.id,
          owner_user_id: user?.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (inserted?.id && (form.poc_name.trim() || form.poc_email.trim())) {
        await supabase.from('partnership_contacts').insert({
          partnership_id: inserted.id,
          full_name: form.poc_name.trim() || 'Primary contact',
          title: form.poc_title.trim() || null,
          email: form.poc_email.trim() || null,
          phone: form.poc_phone.trim() || null,
          is_primary: true,
        });
      }

      notifications.show({ title: 'Vendor saved', message: 'You can add more detail in the record.', color: 'green' });
      close();
      resetForm();
      await load();
      if (inserted?.id) openRecord(inserted.id);
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err?.message ?? String(err), color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const deleteVendor = async (id, name) => {
    if (!window.confirm(`Remove vendor record for “${name}”? This cannot be undone.`)) return;
    const { error } = await supabase.from('partnerships').delete().eq('id', id);
    if (error) {
      notifications.show({ title: 'Could not delete', message: error.message, color: 'red' });
      return;
    }
    notifications.show({ title: 'Removed', color: 'orange' });
    load();
    if (drawerId === id) {
      setDrawerOpen(false);
      setDrawerId(null);
    }
  };

  const exportCsv = () => {
    const out = filtered.map((r) => {
      const poc = primaryContact(r.partnership_contacts);
      return {
        vendor_name: r.partner_name,
        point_of_contact: poc?.full_name ?? '',
        title: poc?.title ?? '',
        email: poc?.email ?? '',
        phone: poc?.phone ?? '',
        industry: r.industry ?? '',
        website: r.website_url ?? '',
        payment_terms: r.payment_terms ?? '',
        renewal_date: r.renewal_date ?? '',
        contract_start: r.contract_start_date ?? '',
        contract_end: r.contract_end_date ?? '',
        assigned_to: r.assigned_to ?? '',
        pipeline_stage: r.status ?? '',
        notes: r.notes ?? '',
        disposition: r.disposition ?? '',
        disposition_notes: r.disposition_notes ?? '',
      };
    });
    exportToCSV(out, 'vendor-directory', { utf8Bom: true });
  };

  const downloadVendorTemplate = () => {
    const templateRow = {};
    VENDOR_CSV_HEADERS.forEach((h) => {
      templateRow[h] = '';
    });
    exportToCSV([templateRow], 'vendor-import-template', { utf8Bom: true });
  };

  const handleImportCsv = async (file) => {
    if (!file) return;
    const text = await file.text();
    const { rows: parsed } = parseCsvRows(text);
    let ok = 0;
    let skipped = 0;
    for (const row of parsed) {
      const payload = rowToVendorImportPayload(row);
      if (!payload) {
        skipped++;
        continue;
      }
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const now = new Date().toISOString();
        const isLost = payload.status === 'lost';
        const disp = isLost ? payload.disposition : null;

        const { data: inserted, error } = await supabase
          .from('partnerships')
          .insert({
            partner_name: payload.partner_name,
            partner_type: 'vendor',
            status: payload.status,
            industry: payload.industry,
            website_url: payload.website_url,
            payment_terms: payload.payment_terms,
            renewal_date: payload.renewal_date,
            contract_start_date: payload.contract_start_date,
            contract_end_date: payload.contract_end_date,
            assigned_to: payload.assigned_to || 'CPO',
            notes: payload.notes,
            created_by: user?.id,
            owner_user_id: user?.id,
            disposition: disp,
            disposition_notes: isLost ? payload.disposition_notes : null,
            disposition_recorded_at: isLost && disp ? now : null,
            disposition_recorded_by: isLost && disp ? user?.id : null,
            ok_to_reengage: true,
          })
          .select('id')
          .single();

        if (error) throw error;

        if (
          inserted?.id &&
          (payload.poc_name || payload.email || payload.phone || payload.poc_title)
        ) {
          await supabase.from('partnership_contacts').insert({
            partnership_id: inserted.id,
            full_name: payload.poc_name?.trim() || 'Primary contact',
            title: payload.poc_title,
            email: payload.email,
            phone: payload.phone,
            is_primary: true,
          });
        }

        if (inserted?.id && isLost && disp) {
          await supabase.from('partnership_disposition_events').insert({
            partnership_id: inserted.id,
            previous_status: null,
            new_status: 'lost',
            disposition: disp,
            notes: payload.disposition_notes,
            next_follow_up_at: null,
            ok_to_reengage: true,
            recorded_by: user?.id ?? null,
          });
        }

        ok++;
      } catch (e) {
        console.error(e);
        skipped++;
      }
    }
    notifications.show({
      title: 'Import finished',
      message: `Imported ${ok} vendor row(s). Skipped ${skipped}.`,
      color: ok ? 'green' : 'orange',
    });
    if (importRef.current) importRef.current.value = '';
    load();
  };

  if (loading) {
    return (
      <Stack gap="md">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={48} radius="md" />
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Title order={3}>Vendors</Title>
        <Text size="sm" c="dimmed" maw={900}>
          Vendor master list: legal / DBA name, primary point of contact, commercial terms, and renewal dates. Open a row
          for the full record (activity, documents, tasks, and pipeline stage live in the workspace — use the main{' '}
          <strong>Pipeline</strong> tab for deal movement). Use <strong>CSV template</strong> for import column names; exports
          are compatible with re-import.
        </Text>
      </Stack>

      <Paper p="md" withBorder radius="md">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <TextInput
            placeholder="Search vendor, contact, email, phone…"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <Group gap="xs">
            <Button variant="default" size="sm" leftSection={<IconFileText size={16} />} onClick={downloadVendorTemplate}>
              CSV template
            </Button>
            <Button
              variant="light"
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
              onChange={(e) => void handleImportCsv(e.target.files?.[0] ?? null)}
            />
            <Button variant="light" leftSection={<IconDownload size={16} />} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button leftSection={<IconPlus size={16} />} color="orange" onClick={() => { resetForm(); open(); }}>
              Add vendor
            </Button>
          </Group>
        </Group>
      </Paper>

      <ScrollArea>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Vendor</Table.Th>
              <Table.Th>Point of contact</Table.Th>
              <Table.Th>Title</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Phone</Table.Th>
              <Table.Th>Industry</Table.Th>
              <Table.Th>Payment terms</Table.Th>
              <Table.Th>Renewal</Table.Th>
              <Table.Th>Assigned</Table.Th>
              <Table.Th>Stage</Table.Th>
              <Table.Th w={100}> </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={11}>
                  <Text c="dimmed" py="xl" ta="center">
                    {rows.length === 0
                      ? 'No vendors yet — add one or tag partnerships as Vendor on the Pipeline.'
                      : 'No matches for this search.'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filtered.map((r) => {
                const poc = primaryContact(r.partnership_contacts);
                return (
                  <Table.Tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openRecord(r.id)}>
                    <Table.Td>
                      <Text fw={600} size="sm">
                        {r.partner_name}
                      </Text>
                      {r.website_url ? (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {r.website_url}
                        </Text>
                      ) : null}
                    </Table.Td>
                    <Table.Td>{poc?.full_name ?? '—'}</Table.Td>
                    <Table.Td>{poc?.title ?? '—'}</Table.Td>
                    <Table.Td>
                      <Text size="sm">{poc?.email ?? '—'}</Text>
                    </Table.Td>
                    <Table.Td>{poc?.phone ?? '—'}</Table.Td>
                    <Table.Td>{r.industry ?? '—'}</Table.Td>
                    <Table.Td>
                      <Text size="xs" lineClamp={2}>
                        {r.payment_terms ?? '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {r.renewal_date ? new Date(r.renewal_date).toLocaleDateString() : '—'}
                    </Table.Td>
                    <Table.Td>{r.assigned_to ?? '—'}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="gray" size="sm">
                        {stageLabel(r.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Group gap={4}>
                        <ActionIcon variant="subtle" color="orange" onClick={() => openRecord(r.id)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => deleteVendor(r.id, r.partner_name)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Modal opened={opened} onClose={close} title="Add vendor" size="lg">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Creates a vendor record with a primary point of contact. Open the record afterward for tasks, documents, and
            relationship notes.
          </Text>
          <Divider label="Vendor" labelPosition="left" />
          <TextInput
            label="Vendor name"
            required
            placeholder="Legal or DBA name"
            value={form.partner_name}
            onChange={(e) => setForm((f) => ({ ...f, partner_name: e.target.value }))}
          />
          <SimpleGrid cols={2}>
            <TextInput label="Industry" value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} />
            <TextInput
              label="Website"
              placeholder="https://"
              value={form.website_url}
              onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
            />
          </SimpleGrid>

          <Divider label="Point of contact" labelPosition="left" />
          <SimpleGrid cols={2}>
            <TextInput
              label="Name"
              placeholder="Primary contact"
              value={form.poc_name}
              onChange={(e) => setForm((f) => ({ ...f, poc_name: e.target.value }))}
            />
            <TextInput label="Title" value={form.poc_title} onChange={(e) => setForm((f) => ({ ...f, poc_title: e.target.value }))} />
          </SimpleGrid>
          <SimpleGrid cols={2}>
            <TextInput
              label="Email"
              type="email"
              value={form.poc_email}
              onChange={(e) => setForm((f) => ({ ...f, poc_email: e.target.value }))}
            />
            <TextInput label="Phone" value={form.poc_phone} onChange={(e) => setForm((f) => ({ ...f, poc_phone: e.target.value }))} />
          </SimpleGrid>

          <Divider label="Commercial" labelPosition="left" />
          <TextInput
            label="Payment terms"
            placeholder="e.g. Net 30, ACH weekly"
            value={form.payment_terms}
            onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))}
          />
          <SimpleGrid cols={3}>
            <DatePickerInput
              label="Renewal date"
              value={form.renewal_date}
              onChange={(d) => setForm((f) => ({ ...f, renewal_date: d }))}
              clearable
            />
            <DatePickerInput
              label="Contract start"
              value={form.contract_start_date}
              onChange={(d) => setForm((f) => ({ ...f, contract_start_date: d }))}
              clearable
            />
            <DatePickerInput
              label="Contract end"
              value={form.contract_end_date}
              onChange={(d) => setForm((f) => ({ ...f, contract_end_date: d }))}
              clearable
            />
          </SimpleGrid>
          <TextInput
            label="Assigned to"
            value={form.assigned_to}
            onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
          />
          <Textarea
            label="Notes"
            placeholder="Scope of work, SLAs, billing ID…"
            minRows={3}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button color="orange" loading={saving} onClick={() => void handleCreate()}>
              Save vendor
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
        onUpdated={load}
      />
    </Stack>
  );
};

export default VendorRecords;
