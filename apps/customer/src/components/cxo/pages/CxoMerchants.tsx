import React, { useEffect, useState } from 'react';
import { Stack, Table, Button, Card, Group, Text, Title, Loader, Center, Badge, Grid, ActionIcon } from '@mantine/core';
import { MetricCard } from '@/components/cxo/shared/MetricCard';
import { StatusBadge } from '@/components/cxo/shared/StatusBadge';
import { merchantsRepository } from '@/lib/cxo/repositories/merchantsRepository';
import { ticketsRepository } from '@/lib/cxo/repositories/ticketsRepository';
import { Merchant, ExperienceTicket } from '@/types/cxo';
import { IconBuildingStore, IconAlertTriangle, IconStar, IconClock, IconTarget } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';

const CxoMerchants: React.FC = () => {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantTickets, setMerchantTickets] = useState<ExperienceTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [merchantsData, ticketsData] = await Promise.all([
        merchantsRepository.getAll(),
        ticketsRepository.getAll({ type: 'merchant' }),
      ]);
      setMerchants(merchantsData);
      setMerchantTickets(ticketsData);
    } catch (error) {
      console.error('Error loading merchant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtRisk = async (merchantId: string, currentStatus: boolean) => {
    const success = await merchantsRepository.updateAtRisk(merchantId, !currentStatus);
    if (success) {
      notifications.show({
        title: 'Success',
        message: `Merchant ${!currentStatus ? 'marked as' : 'removed from'} at-risk`,
        color: 'green',
      });
      loadData();
    } else {
      notifications.show({
        title: 'Error',
        message: 'Failed to update merchant status',
        color: 'red',
      });
    }
  };

  const activeMerchants = merchants.filter((m) => m.status === 'active').length;
  const atRiskMerchants = merchants.filter((m) => m.isAtRisk).length;
  const avgPrepTime =
    merchants.length > 0
      ? merchants.reduce((sum, m) => sum + (m.avgPrepMinutes || 0), 0) / merchants.filter((m) => m.avgPrepMinutes).length
      : 0;
  const avgRating =
    merchants.length > 0
      ? merchants.reduce((sum, m) => sum + (m.rating || 0), 0) / merchants.filter((m) => m.rating).length
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
      <Title order={2}>Restaurant / Merchant Experience</Title>

      {/* Merchant KPIs */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard title="Total Active Merchants" value={activeMerchants} icon={<IconBuildingStore size={20} />} color="blue" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="At-Risk Merchants"
            value={atRiskMerchants}
            icon={<IconAlertTriangle size={20} />}
            color="red"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Average Prep Time"
            value={avgPrepTime > 0 ? `${Math.round(avgPrepTime)} min` : 'N/A'}
            icon={<IconClock size={20} />}
            color="orange"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Average Rating"
            value={avgRating > 0 ? avgRating.toFixed(2) : 'N/A'}
            icon={<IconStar size={20} />}
            color="yellow"
          />
        </Grid.Col>
      </Grid>

      {/* Merchant Tickets */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          Merchant Tickets
        </Title>
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
            {merchantTickets.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center" py="md">
                    No merchant tickets found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              merchantTickets.map((ticket) => (
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

      {/* Merchant Directory */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>Merchant Directory</Title>
          <Button
            leftSection={<IconTarget size={16} />}
            variant="light"
            onClick={() => navigate('/cxo/initiatives')}
          >
            Create Merchant Experience Initiative
          </Button>
        </Group>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Zone</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Avg Prep Minutes</Table.Th>
              <Table.Th>Rating</Table.Th>
              <Table.Th>At Risk</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {merchants.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text c="dimmed" ta="center" py="md">
                    No merchants found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              merchants.map((merchant) => (
                <Table.Tr key={merchant.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {merchant.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{merchant.zone || 'N/A'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={merchant.status} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{merchant.avgPrepMinutes ? `${Math.round(merchant.avgPrepMinutes)} min` : 'N/A'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{merchant.rating ? merchant.rating.toFixed(2) : 'N/A'}</Text>
                  </Table.Td>
                  <Table.Td>
                    {merchant.isAtRisk ? (
                      <Badge color="red">Yes</Badge>
                    ) : (
                      <Badge color="gray">No</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={() => handleToggleAtRisk(merchant.id, merchant.isAtRisk)}
                    >
                      {merchant.isAtRisk ? 'Clear Risk' : 'Mark At Risk'}
                    </Button>
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

export default CxoMerchants;

