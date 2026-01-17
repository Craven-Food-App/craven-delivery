import React, { useEffect, useState } from 'react';
import { Stack, Table, Button, Select, Group, Text, Title, Loader, Center, Badge, Card, Grid } from '@mantine/core';
import { StatusBadge } from '@/components/cxo/shared/StatusBadge';
import { MetricCard } from '@/components/cxo/shared/MetricCard';
import { driversRepository } from '@/lib/cxo/repositories/driversRepository';
import { ticketsRepository } from '@/lib/cxo/repositories/ticketsRepository';
import { Driver, ExperienceTicket } from '@/types/cxo';
import { IconUsers, IconUserCheck, IconUserX } from '@tabler/icons-react';

const CxoDrivers: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverTickets, setDriverTickets] = useState<ExperienceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [driversData, ticketsData] = await Promise.all([
        statusFilter ? driversRepository.getByStatus(statusFilter as any) : driversRepository.getAll(),
        ticketsRepository.getAll({ type: 'driver' }),
      ]);
      setDrivers(driversData);
      setDriverTickets(ticketsData);
    } catch (error) {
      console.error('Error loading driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeDrivers = drivers.filter((d) => d.status === 'active').length;
  const onlineDrivers = drivers.filter((d) => d.onlineState === 'online').length;
  const offlineDrivers = drivers.filter((d) => d.onlineState === 'offline').length;
  const suspendedDrivers = drivers.filter((d) => d.status === 'suspended').length;
  const avgRating =
    drivers.length > 0
      ? drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.filter((d) => d.rating).length
      : 0;

  if (loading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Title order={2}>Driver Experience Oversight</Title>

      {/* Driver KPIs */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard title="Total Active Drivers" value={activeDrivers} icon={<IconUsers size={20} />} color="blue" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard title="Online" value={onlineDrivers} icon={<IconUserCheck size={20} />} color="green" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard title="Offline" value={offlineDrivers} icon={<IconUserX size={20} />} color="gray" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard title="Suspended" value={suspendedDrivers} icon={<IconUserX size={20} />} color="red" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Average Rating"
            value={avgRating > 0 ? avgRating.toFixed(2) : 'N/A'}
            icon={<IconUsers size={20} />}
            color="yellow"
          />
        </Grid.Col>
      </Grid>

      {/* Driver Issue Tickets */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>Driver Issue Tickets</Title>
          <Select
            placeholder="Filter by status"
            data={[
              { value: '', label: 'All Statuses' },
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
            ]}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || '')}
            clearable
          />
        </Group>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Created</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Priority</Table.Th>
              <Table.Th>Summary</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {driverTickets.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center" py="md">
                    No driver tickets found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              driverTickets.map((ticket) => (
                <Table.Tr key={ticket.id}>
                  <Table.Td>
                    <Text size="sm">{new Date(ticket.createdAt).toLocaleDateString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{ticket.category}</Text>
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={ticket.priority} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>
                      {ticket.summary}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={ticket.status} />
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Driver Directory */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          Driver Directory
        </Title>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Online State</Table.Th>
              <Table.Th>Home Zone</Table.Th>
              <Table.Th>Rating</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {drivers.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center" py="md">
                    No drivers found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              drivers.map((driver) => (
                <Table.Tr key={driver.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {driver.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={driver.status} />
                  </Table.Td>
                  <Table.Td>
                    <Badge color={driver.onlineState === 'online' ? 'green' : 'gray'}>
                      {driver.onlineState}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{driver.homeZone || 'N/A'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{driver.rating ? driver.rating.toFixed(2) : 'N/A'}</Text>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
};

export default CxoDrivers;

