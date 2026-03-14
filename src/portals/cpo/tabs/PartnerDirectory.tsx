import React, { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Badge,
  Stack,
  TextInput,
  SimpleGrid,
  Avatar,
  Modal,
  Button,
  Table,
  ActionIcon,
  Skeleton,
  Divider,
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
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

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

const PartnerDirectory: React.FC = () => {
  const [partners, setPartners] = useState<PartnerWithContacts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithContacts | null>(null);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [contactOpened, { open: openContact, close: closeContact }] = useDisclosure(false);
  const [contactForm, setContactForm] = useState({ full_name: '', title: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: partnershipsData } = await supabase
      .from('partnerships')
      .select('*')
      .order('partner_name');

    const { data: contactsData } = await supabase
      .from('partnership_contacts')
      .select('*');

    const mapped = (partnershipsData || []).map(p => ({
      ...p,
      contacts: (contactsData || []).filter(c => c.partnership_id === p.id),
    }));

    setPartners(mapped as PartnerWithContacts[]);
    setLoading(false);
  };

  const filtered = partners.filter(p =>
    p.partner_name.toLowerCase().includes(search.toLowerCase()) ||
    p.industry?.toLowerCase().includes(search.toLowerCase()) ||
    p.contacts.some(c => c.full_name.toLowerCase().includes(search.toLowerCase()))
  );

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

  const statusColors: Record<string, string> = {
    active: 'green', lead: 'gray', prospect: 'blue', negotiation: 'yellow',
    contract_review: 'orange', on_hold: 'red', churned: 'dark', terminated: 'dark',
  };

  if (loading) return <Stack gap="md">{[1, 2, 3].map(i => <Skeleton key={i} height={120} radius="md" />)}</Stack>;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Partner Directory</Title>
        <TextInput
          placeholder="Search partners or contacts..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 280 }}
        />
      </Group>

      {filtered.length === 0 ? (
        <Card shadow="sm" radius="md" padding="xl" withBorder>
          <Text ta="center" c="dimmed">No partners found. Add partners through the Pipeline tab.</Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {filtered.map(p => (
            <Card
              key={p.id}
              shadow="sm"
              radius="md"
              padding="lg"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => openPartnerDetail(p)}
            >
              <Group justify="space-between" mb="sm">
                <Group gap="sm">
                  <Avatar color="orange" radius="xl" size={40}>
                    {p.partner_name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text fw={600} size="sm">{p.partner_name}</Text>
                    <Text size="xs" c="dimmed">{p.industry || 'No industry'}</Text>
                  </div>
                </Group>
                <Badge color={statusColors[p.status] || 'gray'} size="sm">{p.status}</Badge>
              </Group>
              <Group gap="xs">
                <Badge variant="light" size="xs" color="gray">
                  <IconUser size={10} style={{ marginRight: 4 }} />
                  {p.contacts.length} contacts
                </Badge>
                {p.website_url && (
                  <Badge
                    variant="light"
                    size="xs"
                    color="blue"
                    style={{ cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); window.open(p.website_url!, '_blank'); }}
                  >
                    <IconExternalLink size={10} style={{ marginRight: 4 }} />
                    Website
                  </Badge>
                )}
              </Group>
              {p.health_score != null && (
                <Text size="xs" c={p.health_score >= 70 ? 'green' : p.health_score >= 40 ? 'yellow' : 'red'} mt="xs">
                  Health: {p.health_score}%
                </Text>
              )}
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Partner Detail Modal */}
      <Modal opened={detailOpened} onClose={closeDetail} title={selectedPartner?.partner_name || 'Partner'} size="lg">
        {selectedPartner && (
          <Stack gap="md">
            <Group justify="space-between">
              <Badge color={statusColors[selectedPartner.status]} size="lg">{selectedPartner.status}</Badge>
              {selectedPartner.website_url && (
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconExternalLink size={14} />}
                  onClick={() => window.open(selectedPartner.website_url!, '_blank')}
                >
                  Website
                </Button>
              )}
            </Group>

            <Divider label="Contacts" labelPosition="center" />

            <Group justify="space-between">
              <Text fw={600} size="sm">Contacts ({selectedPartner.contacts.length})</Text>
              <Button
                size="xs"
                variant="light"
                color="orange"
                leftSection={<IconPlus size={14} />}
                onClick={openContact}
              >
                Add Contact
              </Button>
            </Group>

            {selectedPartner.contacts.length === 0 ? (
              <Text c="dimmed" ta="center" py="md">No contacts yet</Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Title</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Phone</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedPartner.contacts.map(c => (
                    <Table.Tr key={c.id}>
                      <Table.Td><Text fw={500} size="sm">{c.full_name}</Text></Table.Td>
                      <Table.Td><Text size="sm">{c.title || '—'}</Text></Table.Td>
                      <Table.Td>
                        {c.email ? (
                          <Group gap={4}>
                            <IconMail size={12} />
                            <Text size="sm">{c.email}</Text>
                          </Group>
                        ) : '—'}
                      </Table.Td>
                      <Table.Td>
                        {c.phone ? (
                          <Group gap={4}>
                            <IconPhone size={12} />
                            <Text size="sm">{c.phone}</Text>
                          </Group>
                        ) : '—'}
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => deleteContact(c.id)}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        )}
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
