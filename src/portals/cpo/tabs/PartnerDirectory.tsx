import React, { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Badge,
  Stack,
  TextInput,
  Avatar,
  Modal,
  Button,
  Table,
  ActionIcon,
  Skeleton,
  Divider,
  Box,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Progress,
  Tooltip,
  Select,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconUser,
  IconPlus,
  IconTrash,
  IconExternalLink,
  IconMail,
  IconPhone,
  IconDownload,
  IconFileText,
  IconBuilding,
  IconChevronRight,
  IconUsers,
  IconHeartHandshake,
  IconX,
  IconWorld,
  IconBriefcase,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV, exportToPrintPDF } from '../utils/exportHelpers';

interface Contact {
  id: string;
  partnership_id: string;
  full_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  notes: string | null;
}

interface PartnerWithContacts {
  id: string;
  partner_name: string;
  partner_type: string;
  status: string;
  website_url: string | null;
  industry: string | null;
  health_score: number | null;
  contacts: Contact[];
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  signed: { color: 'green', label: 'Signed' },
  active: { color: 'green', label: 'Active' },
  lead: { color: 'gray', label: 'Lead' },
  contacted: { color: 'blue', label: 'Contacted' },
  in_talks: { color: 'cyan', label: 'In Talks' },
  negotiating: { color: 'yellow', label: 'Negotiating' },
  verbal_agreement: { color: 'orange', label: 'Verbal Agreement' },
  lost: { color: 'red', label: 'Lost' },
  prospect: { color: 'blue', label: 'Prospect' },
  negotiation: { color: 'yellow', label: 'Negotiation' },
  contract_review: { color: 'orange', label: 'Contract Review' },
  on_hold: { color: 'red', label: 'On Hold' },
  churned: { color: 'dark', label: 'Churned' },
  terminated: { color: 'dark', label: 'Terminated' },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status] || { color: 'gray', label: status.replace(/_/g, ' ') };

const PartnerDirectory: React.FC = () => {
  const [partners, setPartners] = useState<PartnerWithContacts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithContacts | null>(null);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [contactOpened, { open: openContact, close: closeContact }] = useDisclosure(false);
  const [contactForm, setContactForm] = useState({ full_name: '', title: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: partnershipsData }, { data: contactsData }] = await Promise.all([
      supabase.from('partnerships').select('*').order('partner_name'),
      supabase.from('partnership_contacts').select('*'),
    ]);
    const mapped = (partnershipsData || []).map(p => ({
      ...p,
      contacts: (contactsData || []).filter(c => c.partnership_id === p.id),
    }));
    setPartners(mapped as PartnerWithContacts[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let result = partners;
    if (statusFilter) result = result.filter(p => p.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.partner_name.toLowerCase().includes(q) ||
        p.industry?.toLowerCase().includes(q) ||
        p.contacts.some(c => c.full_name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [partners, search, statusFilter]);

  const statusOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    partners.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      value: status,
      label: `${getStatusConfig(status).label} (${count})`,
    }));
  }, [partners]);

  const stats = useMemo(() => ({
    total: partners.length,
    totalContacts: partners.reduce((sum, p) => sum + p.contacts.length, 0),
    avgHealth: partners.filter(p => p.health_score != null).length > 0
      ? Math.round(partners.filter(p => p.health_score != null).reduce((s, p) => s + (p.health_score || 0), 0) / partners.filter(p => p.health_score != null).length)
      : null,
  }), [partners]);

  const openPartnerDetail = (p: PartnerWithContacts) => {
    setSelectedPartner(p);
    openDetail();
  };

  const addContact = async () => {
    if (!selectedPartner || !contactForm.full_name) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('partnership_contacts').insert({
        partnership_id: selectedPartner.id,
        full_name: contactForm.full_name,
        title: contactForm.title || null,
        email: contactForm.email || null,
        phone: contactForm.phone || null,
      });
      if (error) throw error;
      notifications.show({ title: 'Success', message: 'Contact added', color: 'green' });
      closeContact();
      setContactForm({ full_name: '', title: '', email: '', phone: '' });
      loadData();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (id: string) => {
    await supabase.from('partnership_contacts').delete().eq('id', id);
    loadData();
    notifications.show({ title: 'Deleted', message: 'Contact removed', color: 'orange' });
  };

  const deletePartner = async (id: string, name: string) => {
    if (!window.confirm(`Delete partner "${name}" and all associated contacts? This cannot be undone.`)) return;
    try {
      await supabase.from('partnership_contacts').delete().eq('partnership_id', id);
      const { error } = await supabase.from('partnerships').delete().eq('id', id);
      if (error) throw error;
      notifications.show({ title: 'Deleted', message: `${name} removed`, color: 'orange' });
      closeDetail();
      setSelectedPartner(null);
      loadData();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  if (loading) return <Stack gap="md">{[1, 2, 3].map(i => <Skeleton key={i} height={60} radius="md" />)}</Stack>;

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="md" align="center">
          <Title order={3}>Partner Directory</Title>
          <Text size="sm" c="dimmed">{filtered.length} of {partners.length} partners</Text>
        </Group>
        <Group gap="xs">
          <Button variant="subtle" color="gray" size="xs" leftSection={<IconDownload size={14} />} onClick={() => {
            const rows = partners.flatMap(p => p.contacts.length > 0
              ? p.contacts.map(c => ({ Partner: p.partner_name, Status: p.status, Industry: p.industry || '', Contact: c.full_name, Title: c.title || '', Email: c.email || '', Phone: c.phone || '' }))
              : [{ Partner: p.partner_name, Status: p.status, Industry: p.industry || '', Contact: '', Title: '', Email: '', Phone: '' }]
            );
            exportToCSV(rows, 'partner-directory');
          }}>CSV</Button>
          <Button variant="subtle" color="gray" size="xs" leftSection={<IconFileText size={14} />} onClick={() => {
            const rows = partners.map(p => `<tr><td>${p.partner_name}</td><td>${p.status}</td><td>${p.industry || ''}</td><td>${p.contacts.length}</td></tr>`).join('');
            exportToPrintPDF('Partner Directory', `<table><tr><th>Partner</th><th>Status</th><th>Industry</th><th>Contacts</th></tr>${rows}</table>`);
          }}>PDF</Button>
        </Group>
      </Group>

      {/* Summary strip */}
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
        <Paper p="sm" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon size={32} radius="md" color="orange" variant="light"><IconBuilding size={16} /></ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Partners</Text>
              <Text fw={700} size="lg" style={{ fontVariantNumeric: 'tabular-nums' }}>{stats.total}</Text>
            </div>
          </Group>
        </Paper>
        <Paper p="sm" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon size={32} radius="md" color="blue" variant="light"><IconUsers size={16} /></ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Contacts</Text>
              <Text fw={700} size="lg" style={{ fontVariantNumeric: 'tabular-nums' }}>{stats.totalContacts}</Text>
            </div>
          </Group>
        </Paper>
        {stats.avgHealth != null && (
          <Paper p="sm" radius="md" withBorder>
            <Group gap="sm">
              <ThemeIcon size={32} radius="md" color={stats.avgHealth >= 70 ? 'green' : stats.avgHealth >= 40 ? 'yellow' : 'red'} variant="light">
                <IconHeartHandshake size={16} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Avg Health</Text>
                <Text fw={700} size="lg" style={{ fontVariantNumeric: 'tabular-nums' }}>{stats.avgHealth}%</Text>
              </div>
            </Group>
          </Paper>
        )}
      </SimpleGrid>

      {/* Filters */}
      <Group gap="sm">
        <TextInput
          placeholder="Search partners, contacts, emails..."
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 360 }}
          size="sm"
        />
        <Select
          placeholder="All statuses"
          data={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          clearable
          size="sm"
          style={{ minWidth: 180 }}
        />
      </Group>

      {/* Directory Table */}
      {filtered.length === 0 ? (
        <Paper p="xl" radius="md" withBorder>
          <Text ta="center" c="dimmed">No partners match your criteria.</Text>
        </Paper>
      ) : (
        <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr style={{ backgroundColor: '#f8f9fa' }}>
                <Table.Th style={{ width: '30%' }}>Partner</Table.Th>
                <Table.Th style={{ width: '15%' }}>Status</Table.Th>
                <Table.Th style={{ width: '15%' }}>Industry</Table.Th>
                <Table.Th style={{ width: '10%', textAlign: 'center' }}>Contacts</Table.Th>
                <Table.Th style={{ width: '15%' }}>Health</Table.Th>
                <Table.Th style={{ width: '15%', textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map(p => {
                const sc = getStatusConfig(p.status);
                const primary = p.contacts.find(c => c.is_primary) || p.contacts[0];
                return (
                  <Table.Tr
                    key={p.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openPartnerDetail(p)}
                  >
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar
                          color="orange"
                          radius="md"
                          size={36}
                          style={{ flexShrink: 0 }}
                        >
                          {p.partner_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <div style={{ minWidth: 0 }}>
                          <Text fw={600} size="sm" truncate>{p.partner_name}</Text>
                          {primary && (
                            <Text size="xs" c="dimmed" truncate>
                              {primary.full_name}{primary.title ? ` · ${primary.title}` : ''}
                            </Text>
                          )}
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={sc.color} size="sm" radius="sm">{sc.label}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={p.industry ? undefined : 'dimmed'}>{p.industry || '—'}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Text size="sm" fw={500} style={{ fontVariantNumeric: 'tabular-nums' }}>{p.contacts.length}</Text>
                    </Table.Td>
                    <Table.Td>
                      {p.health_score != null ? (
                        <Group gap="xs" wrap="nowrap">
                          <Progress
                            value={p.health_score}
                            color={p.health_score >= 70 ? 'green' : p.health_score >= 40 ? 'yellow' : 'red'}
                            size="sm"
                            style={{ flex: 1, maxWidth: 60 }}
                          />
                          <Text size="xs" fw={500} style={{ fontVariantNumeric: 'tabular-nums', width: 28 }}>
                            {p.health_score}%
                          </Text>
                        </Group>
                      ) : (
                        <Text size="xs" c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        {p.website_url && (
                          <Tooltip label="Visit website" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              onClick={e => { e.stopPropagation(); window.open(p.website_url!, '_blank'); }}
                            >
                              <IconWorld size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {primary?.email && (
                          <Tooltip label={primary.email} withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              onClick={e => { e.stopPropagation(); window.open(`mailto:${primary.email}`); }}
                            >
                              <IconMail size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label="Delete partner" withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={e => { e.stopPropagation(); deletePartner(p.id, p.partner_name); }}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <IconChevronRight size={14} style={{ color: '#ced4da' }} />
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {/* Partner Detail Modal */}
      <Modal opened={detailOpened} onClose={closeDetail} size="lg" padding={0} withCloseButton={false} title={null}>
        {selectedPartner && (() => {
          const sc = getStatusConfig(selectedPartner.status);
          return (
            <Stack gap={0}>
              <Box px="lg" py="md" style={{ borderBottom: '1px solid #e9ecef' }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group gap="md" align="center" wrap="nowrap">
                    <Avatar color="orange" radius="md" size={48}>{selectedPartner.partner_name.charAt(0).toUpperCase()}</Avatar>
                    <div>
                      <Text fw={700} size="lg">{selectedPartner.partner_name}</Text>
                      <Group gap="xs" mt={2}>
                        <Badge variant="light" color={sc.color} size="sm">{sc.label}</Badge>
                        {selectedPartner.industry && <Text size="xs" c="dimmed">{selectedPartner.industry}</Text>}
                        {selectedPartner.partner_type && <Text size="xs" c="dimmed">· {selectedPartner.partner_type}</Text>}
                      </Group>
                    </div>
                  </Group>
                  <Group gap="xs">
                    {selectedPartner.website_url && (
                      <Button variant="light" size="xs" leftSection={<IconExternalLink size={14} />} onClick={() => window.open(selectedPartner.website_url!, '_blank')}>
                        Website
                      </Button>
                    )}
                    <Tooltip label="Delete partner" withArrow>
                      <ActionIcon variant="subtle" color="red" onClick={() => deletePartner(selectedPartner.id, selectedPartner.partner_name)} size="lg">
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <ActionIcon variant="subtle" color="gray" onClick={closeDetail} size="lg"><IconX size={18} /></ActionIcon>
                  </Group>
                </Group>
              </Box>

              <Box px="lg" py="md">
                <Stack gap="md">
                  {/* Health + metadata row */}
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                    <Paper p="sm" radius="md" withBorder>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>Health Score</Text>
                      {selectedPartner.health_score != null ? (
                        <>
                          <Text fw={700} size="xl" style={{ fontVariantNumeric: 'tabular-nums' }}>{selectedPartner.health_score}%</Text>
                          <Progress
                            value={selectedPartner.health_score}
                            color={selectedPartner.health_score >= 70 ? 'green' : selectedPartner.health_score >= 40 ? 'yellow' : 'red'}
                            size="sm"
                            mt={4}
                          />
                        </>
                      ) : (
                        <Text c="dimmed" size="sm">Not scored</Text>
                      )}
                    </Paper>
                    <Paper p="sm" radius="md" withBorder>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>Contacts</Text>
                      <Text fw={700} size="xl" style={{ fontVariantNumeric: 'tabular-nums' }}>{selectedPartner.contacts.length}</Text>
                    </Paper>
                    <Paper p="sm" radius="md" withBorder>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>Partner ID</Text>
                      <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>{selectedPartner.id.slice(0, 12)}…</Text>
                    </Paper>
                  </SimpleGrid>

                  {/* Contacts section */}
                  <Divider />
                  <Group justify="space-between">
                    <Text fw={600} size="sm">Contacts</Text>
                    <Button size="xs" variant="light" color="orange" leftSection={<IconPlus size={14} />} onClick={openContact}>
                      Add Contact
                    </Button>
                  </Group>

                  {selectedPartner.contacts.length === 0 ? (
                    <Text c="dimmed" ta="center" py="md" size="sm">No contacts yet. Add one to get started.</Text>
                  ) : (
                    <Stack gap={0}>
                      {selectedPartner.contacts.map((c, idx) => (
                        <React.Fragment key={c.id}>
                          {idx > 0 && <Divider />}
                          <Group px="sm" py="xs" justify="space-between" wrap="nowrap" style={{ minHeight: 48 }}>
                            <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                              <Avatar size={32} radius="xl" color="blue">{c.full_name.charAt(0)}</Avatar>
                              <div style={{ minWidth: 0 }}>
                                <Group gap="xs" wrap="nowrap">
                                  <Text fw={600} size="sm" truncate>{c.full_name}</Text>
                                  {c.is_primary && <Badge size="xs" variant="light" color="orange">Primary</Badge>}
                                </Group>
                                <Text size="xs" c="dimmed" truncate>
                                  {[c.title, c.email, c.phone].filter(Boolean).join(' · ') || 'No details'}
                                </Text>
                              </div>
                            </Group>
                            <Group gap={4} wrap="nowrap">
                              {c.email && (
                                <Tooltip label={c.email} withArrow>
                                  <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => window.open(`mailto:${c.email}`)}>
                                    <IconMail size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              {c.phone && (
                                <Tooltip label={c.phone} withArrow>
                                  <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => window.open(`tel:${c.phone}`)}>
                                    <IconPhone size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              <ActionIcon variant="subtle" color="red" size="sm" onClick={() => deleteContact(c.id)}>
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          </Group>
                        </React.Fragment>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Box>
            </Stack>
          );
        })()}
      </Modal>

      {/* Add Contact Modal */}
      <Modal opened={contactOpened} onClose={closeContact} title="Add Contact" size="md">
        <Stack gap="md">
          <TextInput label="Full Name" required value={contactForm.full_name} onChange={e => setContactForm(d => ({ ...d, full_name: e.target.value }))} />
          <TextInput label="Title" value={contactForm.title} onChange={e => setContactForm(d => ({ ...d, title: e.target.value }))} />
          <TextInput label="Email" value={contactForm.email} onChange={e => setContactForm(d => ({ ...d, email: e.target.value }))} />
          <TextInput label="Phone" value={contactForm.phone} onChange={e => setContactForm(d => ({ ...d, phone: e.target.value }))} />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeContact}>Cancel</Button>
            <Button color="orange" loading={saving} onClick={addContact}>Add Contact</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default PartnerDirectory;
