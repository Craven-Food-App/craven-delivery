// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import {
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Button,
  Loader,
  Center,
  ScrollArea,
  Table,
  Modal,
  Divider,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconRefresh, IconTruckDelivery, IconCheck, IconX, IconMail, IconPhone } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CXApplication {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: string | null;
  business_type: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  contacted: 'blue',
};

export default function CXApplications() {
  const [apps, setApps] = useState<CXApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CXApplication | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('merchant_partnership_requests')
      .select('*')
      .eq('business_type', 'courier_service')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(error.message || 'Failed to load CX applications');
    } else {
      setApps((data as CXApplication[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any)
      .from('merchant_partnership_requests')
      .update({ status })
      .eq('id', id);
    if (error) {
      toast.error(error.message || 'Failed to update');
      return;
    }
    toast.success(`Application ${status}`);
    setSelected(null);
    load();
  };

  const counts = apps.reduce(
    (acc, a) => {
      const s = (a.status || 'pending').toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <div>
          <Group gap="xs" align="center">
            <IconTruckDelivery size={22} color="#F97316" />
            <Title order={3}>Crave'N Express — Courier Applications</Title>
          </Group>
          <Text size="sm" c="dimmed">
            All submissions from <code>/cx/signup</code> land here. Review, contact, and approve courier
            companies to onboard them into the CX program.
          </Text>
        </div>
        <Group gap="xs">
          <Badge color="yellow" variant="light">Pending: {counts.pending || 0}</Badge>
          <Badge color="blue" variant="light">Contacted: {counts.contacted || 0}</Badge>
          <Badge color="green" variant="light">Approved: {counts.approved || 0}</Badge>
          <Badge color="red" variant="light">Rejected: {counts.rejected || 0}</Badge>
          <Tooltip label="Refresh">
            <ActionIcon variant="light" onClick={load}><IconRefresh size={16} /></ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Card withBorder radius="md" p={0}>
        {loading ? (
          <Center p="xl"><Loader /></Center>
        ) : apps.length === 0 ? (
          <Center p="xl">
            <Stack align="center" gap={4}>
              <Text fw={600}>No CX applications yet</Text>
              <Text size="sm" c="dimmed">When a courier company submits the CX signup form, it will appear here.</Text>
            </Stack>
          </Center>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Submitted</Table.Th>
                  <Table.Th>Company</Table.Th>
                  <Table.Th>Contact</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Phone</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {apps.map((a) => (
                  <Table.Tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(a)}>
                    <Table.Td><Text size="xs" c="dimmed">{new Date(a.created_at).toLocaleString()}</Text></Table.Td>
                    <Table.Td><Text fw={600}>{a.business_name || '—'}</Text></Table.Td>
                    <Table.Td>{a.contact_name || '—'}</Table.Td>
                    <Table.Td>{a.email || '—'}</Table.Td>
                    <Table.Td>{a.phone || '—'}</Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLORS[(a.status || 'pending').toLowerCase()] || 'gray'} variant="light">
                        {a.status || 'pending'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Button size="xs" variant="light" onClick={(e) => { e.stopPropagation(); setSelected(a); }}>
                        Review
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      <Modal
        opened={!!selected}
        onClose={() => setSelected(null)}
        title={<Text fw={700}>CX Application — {selected?.business_name}</Text>}
        size="lg"
        centered
      >
        {selected && (
          <Stack gap="sm">
            <Group gap="xs">
              <Badge color={STATUS_COLORS[(selected.status || 'pending').toLowerCase()] || 'gray'}>
                {selected.status || 'pending'}
              </Badge>
              <Text size="xs" c="dimmed">Submitted {new Date(selected.created_at).toLocaleString()}</Text>
            </Group>
            <Divider />
            <Group grow>
              <div>
                <Text size="xs" c="dimmed">Primary contact</Text>
                <Text fw={600}>{selected.contact_name || '—'}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Company</Text>
                <Text fw={600}>{selected.business_name || '—'}</Text>
              </div>
            </Group>
            <Group grow>
              <Button
                component="a"
                href={`mailto:${selected.email}`}
                leftSection={<IconMail size={14} />}
                variant="light"
                disabled={!selected.email}
              >
                {selected.email || 'No email'}
              </Button>
              <Button
                component="a"
                href={`tel:${selected.phone}`}
                leftSection={<IconPhone size={14} />}
                variant="light"
                disabled={!selected.phone}
              >
                {selected.phone || 'No phone'}
              </Button>
            </Group>
            <div>
              <Text size="xs" c="dimmed" mb={4}>Service area, fleet size, notes</Text>
              <Card withBorder p="sm" radius="sm" bg="gray.0">
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{selected.notes || '—'}</Text>
              </Card>
            </div>
            <Divider />
            <Group justify="flex-end" gap="xs">
              <Button variant="default" leftSection={<IconX size={14} />} color="red"
                onClick={() => updateStatus(selected.id, 'rejected')}>
                Reject
              </Button>
              <Button variant="light" color="blue"
                onClick={() => updateStatus(selected.id, 'contacted')}>
                Mark contacted
              </Button>
              <Button color="orange" leftSection={<IconCheck size={14} />}
                onClick={() => updateStatus(selected.id, 'approved')}>
                Approve
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}