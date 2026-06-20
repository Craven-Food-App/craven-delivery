// @ts-nocheck
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Stack, Title, Text, Card, Group, Badge, Button, Loader, Center,
  ScrollArea, Table, Drawer, Divider, ActionIcon, Tooltip, Tabs,
  Textarea, TextInput, Select,
} from '@mantine/core';
import {
  IconRefresh, IconTruckDelivery, IconCheck, IconX, IconMail, IconPhone,
  IconFileText, IconShieldCheck, IconUsers, IconHistory, IconNotes,
  IconExternalLink, IconBuildingFactory2, IconClipboardList,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CX_REQUIRED_DOCS } from '@/lib/cx/requiredDocs';

const STATUS_COLORS: Record<string, string> = {
  draft: 'gray', submitted: 'yellow', under_review: 'orange',
  contacted: 'blue', docs_pending: 'orange', approved: 'green',
  rejected: 'red', activated: 'teal',
};
const STATUS_FILTERS = ['all', 'submitted', 'under_review', 'contacted', 'docs_pending', 'approved', 'rejected'];

export default function CXApplications() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('cx_applications').select('*').neq('status', 'draft')
      .order('submitted_at', { ascending: false, nullsFirst: false });
    if (error) toast.error(error.message || 'Failed to load CX applications');
    else setApps((data as any[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = apps.reduce((acc: any, a: any) => {
    const s = (a.status || 'submitted').toLowerCase();
    acc[s] = (acc[s] || 0) + 1; return acc;
  }, {});

  const filtered = useMemo(() => apps.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!`${a.legal_name||''} ${a.dba||''} ${a.owner_name||''} ${a.owner_email||''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [apps, statusFilter, query]);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <div>
          <Group gap="xs" align="center">
            <IconTruckDelivery size={22} color="#F97316" />
            <Title order={3}>Crave'N Express — Courier Applications</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Full enterprise courier company applications submitted at <code>/cx/apply</code>. Review documents,
            verify compliance, contact references, and approve carriers into the CX program.
          </Text>
        </div>
        <Group gap="xs">
          <Badge color="yellow" variant="light">Submitted: {counts.submitted || 0}</Badge>
          <Badge color="orange" variant="light">Review: {(counts.under_review||0) + (counts.docs_pending||0)}</Badge>
          <Badge color="blue" variant="light">Contacted: {counts.contacted || 0}</Badge>
          <Badge color="green" variant="light">Approved: {counts.approved || 0}</Badge>
          <Badge color="red" variant="light">Rejected: {counts.rejected || 0}</Badge>
          <Tooltip label="Refresh"><ActionIcon variant="light" onClick={load}><IconRefresh size={16} /></ActionIcon></Tooltip>
        </Group>
      </Group>

      <Group gap="xs">
        <Select size="xs" value={statusFilter} onChange={(v) => setStatusFilter(v || 'all')}
          data={STATUS_FILTERS.map(s => ({ value: s, label: s.replace('_',' ') }))} w={180} />
        <TextInput size="xs" placeholder="Search company, contact, email…" value={query} onChange={(e) => setQuery(e.currentTarget.value)} w={300} />
      </Group>

      <Card withBorder radius="md" p={0}>
        {loading ? <Center p="xl"><Loader /></Center>
         : filtered.length === 0 ? (
          <Center p="xl">
            <Stack align="center" gap={4}>
              <Text fw={600}>No applications match your filters</Text>
              <Text size="sm" c="dimmed">Submitted applications from <code>/cx/apply</code> appear here.</Text>
            </Stack>
          </Center>
         ) : (
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead><Table.Tr>
                <Table.Th>Submitted</Table.Th><Table.Th>Company</Table.Th>
                <Table.Th>Officer</Table.Th><Table.Th>Service area</Table.Th>
                <Table.Th>Fleet</Table.Th><Table.Th>Phone</Table.Th>
                <Table.Th>Status</Table.Th><Table.Th />
              </Table.Tr></Table.Thead>
              <Table.Tbody>
                {filtered.map((a) => (
                  <Table.Tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(a)}>
                    <Table.Td><Text size="xs" c="dimmed">{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : new Date(a.created_at).toLocaleString()}</Text></Table.Td>
                    <Table.Td><div><Text fw={600}>{a.legal_name || '—'}</Text>{a.dba && <Text size="xs" c="dimmed">DBA {a.dba}</Text>}</div></Table.Td>
                    <Table.Td><div><Text size="sm">{a.owner_name || '—'}</Text><Text size="xs" c="dimmed">{a.owner_title}</Text></div></Table.Td>
                    <Table.Td><Text size="xs" lineClamp={2} maw={220}>{a.service_cities || '—'}</Text></Table.Td>
                    <Table.Td><Text size="sm">{a.fleet_size || '—'}</Text></Table.Td>
                    <Table.Td><Text size="sm">{a.owner_phone || '—'}</Text></Table.Td>
                    <Table.Td><Badge color={STATUS_COLORS[(a.status || 'submitted').toLowerCase()] || 'gray'} variant="light">{(a.status || 'submitted').replace('_',' ')}</Badge></Table.Td>
                    <Table.Td><Button size="xs" variant="light" onClick={(e) => { e.stopPropagation(); setSelected(a); }}>Open</Button></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      <Drawer opened={!!selected} onClose={() => setSelected(null)} position="right" size="xl"
        title={selected && <Group gap="xs">
          {selected.logo_url
            ? <img src={selected.logo_url} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain', background: '#fff', border: '1px solid #eee' }} />
            : <IconBuildingFactory2 size={18} color="#F97316" />}
          <Text fw={700}>{selected.legal_name || 'CX Application'}</Text>
          <Badge color={STATUS_COLORS[(selected.status||'submitted')] || 'gray'} variant="light">{(selected.status||'submitted').replace('_',' ')}</Badge>
        </Group>}
      >
        {selected && <ApplicationReview app={selected} onChange={setSelected} onClose={() => { setSelected(null); load(); }} />}
      </Drawer>
    </Stack>
  );
}

function ApplicationReview({ app, onChange, onClose }: any) {
  const [docs, setDocs] = useState<any[]>([]);
  const [refs, setRefs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [notes, setNotes] = useState(app.internal_notes || '');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [acting, setActing] = useState(false);

  const reload = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    const [d, r, e] = await Promise.all([
      supabase.from('cx_application_documents').select('*').eq('application_id', app.id),
      supabase.from('cx_application_references').select('*').eq('application_id', app.id),
      supabase.from('cx_application_events').select('*').eq('application_id', app.id).order('created_at', { ascending: false }),
    ]);
    setDocs(d.data || []); setRefs(r.data || []); setEvents(e.data || []);
    if (showLoader) setLoading(false);
  }, [app.id]);
  useEffect(() => { reload(true); }, [reload]);

  const allRequiredVerified = CX_REQUIRED_DOCS.filter(d => d.required).every(d => docs.find((x:any) => x.doc_type === d.key && x.verified));
  const atLeastOneRefContacted = refs.some(r => r.contacted_at);
  const canApprove = allRequiredVerified && !!app.msa_signed_at && atLeastOneRefContacted;

  async function setStatus(status: string) {
    setActing(true);
    const patch: any = { status };
    if (status === 'approved' || status === 'rejected') patch.reviewed_at = new Date().toISOString();
    const { error } = await supabase.from('cx_applications').update(patch).eq('id', app.id);
    if (error) { toast.error(error.message); setActing(false); return; }
    await supabase.from('cx_application_events').insert({ application_id: app.id, event_type: 'status_changed', payload: { to: status } });
    toast.success(`Marked ${status.replace('_',' ')}`);
    onChange({ ...app, ...patch });
    setActing(false);
    if (status === 'approved' || status === 'rejected') onClose();
  }
  async function verifyDoc(doc: any, verified: boolean) {
    // Optimistic update so UI doesn't flicker / change tabs
    setDocs((prev) => prev.map((x: any) => x.id === doc.id ? { ...x, verified, verified_at: verified ? new Date().toISOString() : null } : x));
    const { error } = await supabase.from('cx_application_documents').update({ verified, verified_at: verified ? new Date().toISOString() : null }).eq('id', doc.id);
    if (error) { toast.error(error.message); reload(); return; }
    toast.success(verified ? 'Document verified' : 'Verification removed');
    supabase.from('cx_application_events').insert({ application_id: app.id, event_type: 'doc_verified', payload: { doc_type: doc.doc_type, verified } });
  }
  async function setDocExpiry(doc: any, exp: string) {
    setDocs((prev) => prev.map((x: any) => x.id === doc.id ? { ...x, expires_at: exp || null } : x));
    await supabase.from('cx_application_documents').update({ expires_at: exp || null }).eq('id', doc.id);
  }
  async function getSignedDocUrl(doc: any): Promise<string> {
    // The stored file_url is already a 7-day signed URL from upload; try to use it directly.
    // If expired, refresh via edge function.
    try {
      const { data } = await supabase.functions.invoke('cx-doc-signed-url', { body: { path: doc.file_url } });
      return data?.url || doc.file_url;
    } catch {
      return doc.file_url;
    }
  }
  async function markRefContacted(r: any, contact_notes: string) {
    await supabase.from('cx_application_references').update({ contacted_at: new Date().toISOString(), contact_notes }).eq('id', r.id);
    reload();
  }
  async function saveNotes() {
    await supabase.from('cx_applications').update({ internal_notes: notes }).eq('id', app.id);
    await supabase.from('cx_application_events').insert({ application_id: app.id, event_type: 'note_added' });
    toast.success('Notes saved');
  }

  if (loading) return <Center p="xl"><Loader /></Center>;

  return (
    <Stack gap="md">
      <Tabs value={activeTab} onChange={(v) => v && setActiveTab(v)} variant="pills" color="orange" keepMounted={false}>
        <Tabs.List grow>
          <Tabs.Tab value="overview" leftSection={<IconClipboardList size={14} />}>Overview</Tabs.Tab>
          <Tabs.Tab value="docs" leftSection={<IconFileText size={14} />}>Documents</Tabs.Tab>
          <Tabs.Tab value="compliance" leftSection={<IconShieldCheck size={14} />}>Compliance</Tabs.Tab>
          <Tabs.Tab value="refs" leftSection={<IconUsers size={14} />}>References</Tabs.Tab>
          <Tabs.Tab value="legal" leftSection={<IconFileText size={14} />}>Legal</Tabs.Tab>
          <Tabs.Tab value="notes" leftSection={<IconNotes size={14} />}>Notes</Tabs.Tab>
          <Tabs.Tab value="audit" leftSection={<IconHistory size={14} />}>Audit</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Stack gap="sm">
            <Card withBorder p="md" radius="md">
              <Group justify="space-between" wrap="nowrap">
                <div>
                  <Text size="xs" c="dimmed">Company</Text>
                  <Text fw={700} size="lg">{app.legal_name}</Text>
                  {app.dba && <Text size="sm" c="dimmed">DBA: {app.dba}</Text>}
                  <Text size="xs" c="dimmed" mt={4}>EIN {app.ein} • {app.business_structure} • {app.state_of_incorporation} • {app.years_in_operation ? `${app.years_in_operation}y` : ''}</Text>
                </div>
                {app.website && <Button component="a" href={app.website} target="_blank" variant="light" leftSection={<IconExternalLink size={14}/>}>Website</Button>}
              </Group>
              <Divider my="sm"/>
              <Group grow align="flex-start">
                <div>
                  <Text size="xs" c="dimmed">Owner / Officer</Text>
                  <Text fw={600}>{app.owner_name}</Text>
                  <Text size="xs" c="dimmed">{app.owner_title}</Text>
                  <Group gap={4} mt={4}><Button size="compact-xs" variant="subtle" component="a" href={`mailto:${app.owner_email}`} leftSection={<IconMail size={12}/>}>{app.owner_email}</Button></Group>
                  <Group gap={4}><Button size="compact-xs" variant="subtle" component="a" href={`tel:${app.owner_phone}`} leftSection={<IconPhone size={12}/>}>{app.owner_phone}</Button></Group>
                </div>
                <div>
                  <Text size="xs" c="dimmed">24/7 dispatch</Text>
                  <Text fw={600}>{app.dispatch_contact_name || '—'}</Text>
                  <Text size="xs">{app.dispatch_contact_phone}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Address</Text>
                  <Text size="sm">{app.business_address_line1}</Text>
                  {app.business_address_line2 && <Text size="sm">{app.business_address_line2}</Text>}
                  <Text size="sm">{app.business_city}, {app.business_state} {app.business_zip}</Text>
                </div>
              </Group>
            </Card>
            <Card withBorder p="md" radius="md">
              <Text fw={600} mb="xs">Operations</Text>
              <Group grow>
                <Stat label="Fleet size" value={app.fleet_size} />
                <Stat label="Daily capacity" value={app.daily_volume_capacity} />
                <Stat label="Driver model" value={app.driver_model} />
              </Group>
              <Divider my="sm"/>
              <Text size="xs" c="dimmed">Service area</Text>
              <Text size="sm">{app.service_cities}</Text>
              {app.service_zips && <><Text size="xs" c="dimmed" mt={6}>ZIPs</Text><Text size="xs">{app.service_zips}</Text></>}
              <Text size="xs" c="dimmed" mt={6}>Hours</Text>
              <Text size="sm">{app.hours_of_operation}</Text>
              <Text size="xs" c="dimmed" mt={6}>Vehicle mix</Text>
              <Text size="sm">{app.vehicle_mix?.notes || '—'}</Text>
              {app.current_clients && <><Text size="xs" c="dimmed" mt={6}>Current clients</Text><Text size="sm">{app.current_clients}</Text></>}
            </Card>

            <Card withBorder p="md" radius="md" bg={canApprove ? 'green.0' : 'gray.0'}>
              <Group justify="space-between" wrap="nowrap">
                <div>
                  <Text fw={700}>Approval gate</Text>
                  <Text size="xs" c="dimmed">
                    {allRequiredVerified ? '✓' : '✗'} All required docs verified &nbsp;·&nbsp;
                    {app.msa_signed_at ? '✓' : '✗'} MSA signed &nbsp;·&nbsp;
                    {atLeastOneRefContacted ? '✓' : '✗'} ≥1 reference contacted
                  </Text>
                </div>
                <Group gap="xs">
                  <Button size="xs" color="red" variant="light" leftSection={<IconX size={14}/>} loading={acting} onClick={() => setStatus('rejected')}>Reject</Button>
                  <Button size="xs" color="blue" variant="light" loading={acting} onClick={() => setStatus('contacted')}>Mark contacted</Button>
                  <Button size="xs" color="orange" variant="light" loading={acting} onClick={() => setStatus('docs_pending')}>Request docs</Button>
                  <Button size="xs" color="green" leftSection={<IconCheck size={14}/>} loading={acting} disabled={!canApprove} onClick={() => setStatus('approved')}>Approve</Button>
                </Group>
              </Group>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="docs" pt="md">
          <Stack gap="xs">
            {CX_REQUIRED_DOCS.map((spec) => {
              const d = docs.find((x: any) => x.doc_type === spec.key);
              return (
                <Card key={spec.key} withBorder p="sm" radius="md">
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Group gap="xs">
                        <Text fw={600}>{spec.label}</Text>
                        {spec.required && <Badge size="xs" color="orange" variant="light">Required</Badge>}
                        {d && <Badge size="xs" color={d.verified ? 'green' : 'yellow'} variant="light">{d.verified ? 'Verified' : 'Uploaded'}</Badge>}
                      </Group>
                      <Text size="xs" c="dimmed">{spec.description}</Text>
                      {d && (
                        <Group gap="xs" mt="xs" wrap="wrap">
                          <DocOpenLink doc={d} getUrl={getSignedDocUrl} />
                          {spec.needsExpiration && (
                            <TextInput size="xs" type="date" value={d.expires_at || ''} onChange={(e) => setDocExpiry(d, e.currentTarget.value)} placeholder="Expires" w={150}/>
                          )}
                        </Group>
                      )}
                    </div>
                    {d ? (
                      <Button size="xs" color={d.verified ? 'gray' : 'green'} variant="light" leftSection={<IconCheck size={14}/>}
                        onClick={() => verifyDoc(d, !d.verified)}>{d.verified ? 'Unverify' : 'Verify'}</Button>
                    ) : (
                      <Badge color="gray" variant="light">Not uploaded</Badge>
                    )}
                  </Group>
                </Card>
              );
            })}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="compliance" pt="md">
          <Card withBorder p="md" radius="md">
            <Stack gap="xs">
              <Compliance label="MVR program" value={app.mvr_program} sub={app.mvr_provider} />
              <Compliance label="Drug testing program" value={app.drug_testing_program} />
              <div><Text size="xs" c="dimmed">Driver onboarding & safety standards</Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{app.driver_onboarding_standards || '—'}</Text></div>
              <div><Text size="xs" c="dimmed">Incident reporting process</Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{app.incident_reporting_process || '—'}</Text></div>
              <div><Text size="xs" c="dimmed">Claims history (24mo)</Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{app.claims_history || '—'}</Text></div>
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="refs" pt="md">
          <Stack gap="xs">
            {refs.length === 0 && <Text c="dimmed" size="sm">No references on file.</Text>}
            {refs.map((r) => <ReferenceCard key={r.id} r={r} onContacted={markRefContacted} />)}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="legal" pt="md">
          <Card withBorder p="md" radius="md">
            <LegalRow label="Master Services Agreement" at={app.msa_signed_at} />
            <Divider my="sm"/>
            <LegalRow label="Independent Carrier Agreement" at={app.carrier_agreement_signed_at} />
            <Divider my="sm"/>
            <LegalRow label="Indemnification Addendum" at={app.indemnification_signed_at} />
            <Divider my="sm"/>
            <Text size="xs" c="dimmed">Typed signature (E-SIGN Act)</Text>
            <Text size="xl" fs="italic" ff="cursive, serif" c="dark" mt={4}>
              {app.signature_typed || app.signature_payload?.typed_name || app.signature_payload?.typed || '—'}
            </Text>
            <Text size="xs" c="dimmed" mt="xs">
              Certified truthful: {app.certified_truthful ? '✓' : '—'} · ACH intent: {app.ach_intent ? '✓' : '—'}
            </Text>
            {app.signature_payload && (
              <Stack gap={2} mt="sm">
                <Text size="xs" c="dimmed">Signed at: {app.signature_payload.signed_at ? new Date(app.signature_payload.signed_at).toLocaleString() : '—'}</Text>
                <Text size="xs" c="dimmed">IP address: {app.signature_payload.ip_address || '—'}</Text>
                <Text size="xs" c="dimmed" lineClamp={2}>User-agent: {app.signature_payload.user_agent || '—'}</Text>
                {app.signature_payload.consent_text && (
                  <Text size="xs" c="dimmed" mt={4} fs="italic">"{app.signature_payload.consent_text}"</Text>
                )}
              </Stack>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="notes" pt="md">
          <Textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)} minRows={8} autosize placeholder="Internal CPO/exec notes…" />
          <Group justify="flex-end" mt="xs"><Button size="xs" color="orange" onClick={saveNotes}>Save notes</Button></Group>
        </Tabs.Panel>

        <Tabs.Panel value="audit" pt="md">
          <Stack gap={4}>
            {events.length === 0 && <Text size="sm" c="dimmed">No events yet.</Text>}
            {events.map((e) => (
              <Group key={e.id} gap="xs" wrap="nowrap" style={{ fontSize: 12 }}>
                <Text size="xs" c="dimmed" miw={150}>{new Date(e.created_at).toLocaleString()}</Text>
                <Badge size="xs" variant="light">{e.event_type}</Badge>
                <Text size="xs">{JSON.stringify(e.payload)}</Text>
              </Group>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function Stat({ label, value }: any) {
  return <div><Text size="xs" c="dimmed">{label}</Text><Text fw={700}>{value ?? '—'}</Text></div>;
}
function Compliance({ label, value, sub }: any) {
  return <Group justify="space-between">
    <div><Text fw={600}>{label}</Text>{sub && <Text size="xs" c="dimmed">{sub}</Text>}</div>
    <Badge color={value === true ? 'green' : value === false ? 'red' : 'gray'}>{value === true ? 'Yes' : value === false ? 'No' : '—'}</Badge>
  </Group>;
}
function LegalRow({ label, at }: any) {
  return <Group justify="space-between">
    <div><Text fw={600}>{label}</Text>{at && <Text size="xs" c="dimmed">Signed {new Date(at).toLocaleString()}</Text>}</div>
    <Badge color={at ? 'green' : 'gray'}>{at ? 'Signed' : 'Pending'}</Badge>
  </Group>;
}
function ReferenceCard({ r, onContacted }: any) {
  const [notes, setNotes] = useState(r.contact_notes || '');
  return (
    <Card withBorder p="sm" radius="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div style={{ flex: 1 }}>
          <Text fw={600}>{r.company_name}</Text>
          <Text size="xs" c="dimmed">{r.contact_name} • {r.relationship} • {r.years_worked}</Text>
          <Group gap="xs" mt={4}>
            {r.contact_email && <Button size="compact-xs" variant="subtle" component="a" href={`mailto:${r.contact_email}`} leftSection={<IconMail size={12}/>}>{r.contact_email}</Button>}
            {r.contact_phone && <Button size="compact-xs" variant="subtle" component="a" href={`tel:${r.contact_phone}`} leftSection={<IconPhone size={12}/>}>{r.contact_phone}</Button>}
          </Group>
        </div>
        {r.contacted_at ? (
          <Badge color="green" variant="light">Contacted {new Date(r.contacted_at).toLocaleDateString()}</Badge>
        ) : (
          <Button size="xs" color="blue" variant="light" onClick={() => onContacted(r, notes)}>Mark contacted</Button>
        )}
      </Group>
      <Textarea size="xs" mt="xs" placeholder="Notes from the call…" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} minRows={2} autosize />
    </Card>
  );
}

function DocOpenLink({ doc, getUrl }: { doc: any; getUrl: (d: any) => Promise<string> }) {
  const [loading, setLoading] = useState(false);
  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    const url = await getUrl(doc);
    setLoading(false);
    // Use a synthetic anchor to bypass popup blockers (synchronous user gesture chain best-effort)
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  return (
    <Button
      size="compact-xs"
      variant="light"
      color="orange"
      loading={loading}
      leftSection={<IconExternalLink size={12} />}
      onClick={handleClick}
    >
      {doc.file_name || 'View file'}
    </Button>
  );
}
