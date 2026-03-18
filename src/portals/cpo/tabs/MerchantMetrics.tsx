import React, { useState, useEffect } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Stack,
  SimpleGrid,
  Badge,
  Table,
  TextInput,
  Select,
  Loader,
  Center,
  Progress,
  ThemeIcon,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconBuildingStore,
  IconCategory,
  IconMapPin,
  IconSearch,
  IconTrendingUp,
  IconClock,
  IconCheck,
  IconAlertTriangle,
  IconExternalLink,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface MerchantRow {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  state: string | null;
  status: string;
  request_count: number;
  marketplace_type: string | null;
  last_requested_at: string | null;
  source: 'seeded' | 'signed_up';
  onboarding_status?: string | null;
  is_active?: boolean;
}

interface CategoryBreakdown {
  category: string;
  count: number;
}

const MerchantMetrics: React.FC = () => {
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      // Fetch seeded marketplace merchants
      const { data: seeded, error: seededError } = await supabase
        .from('restaurants_master')
        .select('id, name, category, city, state, status, request_count, marketplace_type, last_requested_at')
        .order('name', { ascending: true });

      if (seededError) throw seededError;

      const seededRows: MerchantRow[] = (seeded || []).map(m => ({
        ...m,
        source: 'seeded' as const,
      }));

      // Fetch real signed-up merchants
      const { data: realMerchants, error: realError } = await supabase
        .from('restaurants')
        .select('id, name, cuisine_type, city, state, is_active, onboarding_status, restaurant_type, created_at')
        .order('name', { ascending: true });

      if (realError) throw realError;

      const realRows: MerchantRow[] = (realMerchants || []).map(m => ({
        id: m.id,
        name: m.name,
        category: m.cuisine_type || m.restaurant_type || null,
        city: m.city,
        state: m.state,
        status: m.is_active ? 'ACTIVE' : (m.onboarding_status || 'onboarding'),
        request_count: 0,
        marketplace_type: 'restaurant',
        last_requested_at: null,
        source: 'signed_up' as const,
        onboarding_status: m.onboarding_status,
        is_active: m.is_active,
      }));

      // Combine, with real merchants first
      setMerchants([...realRows, ...seededRows]);
    } catch (err) {
      console.error('Error fetching merchants:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalMerchants = merchants.length;
  const signedUpMerchants = merchants.filter(m => m.source === 'signed_up');
  const activeMerchants = merchants.filter(m => m.status === 'REQUESTABLE' || m.status === 'ACTIVE').length;
  const comingSoon = merchants.filter(m => m.status === 'COMING_SOON').length;
  const onboarding = signedUpMerchants.filter(m => !m.is_active).length;
  const totalRequests = merchants.reduce((sum, m) => sum + (m.request_count || 0), 0);

  const categories = merchants.reduce<Record<string, number>>((acc, m) => {
    const cat = m.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const categoryBreakdown: CategoryBreakdown[] = Object.entries(categories)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const cities = merchants.reduce<Record<string, number>>((acc, m) => {
    const city = m.city || 'Unknown';
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {});

  const topCities = Object.entries(cities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const uniqueCategories = [...new Set(merchants.map(m => m.category).filter(Boolean))] as string[];

  const filtered = merchants.filter(m => {
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || m.category === categoryFilter;
    const matchesStatus = !statusFilter || m.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <Center py="xl">
        <Loader color="orange" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={3}>Merchant Metrics</Title>
          <Text size="sm" c="dimmed">Read-only overview of all marketplace merchants</Text>
        </div>
        <Badge color="orange" variant="light" size="lg">
          {totalMerchants} Total Merchants
        </Badge>
      </Group>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
        <Card padding="md" radius="md" withBorder>
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={4}>Active Merchants</Text>
              <Text size="xl" fw={700}>{activeMerchants}</Text>
            </div>
            <ThemeIcon color="green" variant="light" size="lg" radius="md">
              <IconCheck size={18} />
            </ThemeIcon>
          </Group>
          <Progress value={(activeMerchants / totalMerchants) * 100} color="green" size="sm" mt="sm" />
          <Text size="xs" c="dimmed" mt={4}>{((activeMerchants / totalMerchants) * 100).toFixed(0)}% of total</Text>
        </Card>

        <Card padding="md" radius="md" withBorder>
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={4}>Coming Soon</Text>
              <Text size="xl" fw={700}>{comingSoon}</Text>
            </div>
            <ThemeIcon color="yellow" variant="light" size="lg" radius="md">
              <IconClock size={18} />
            </ThemeIcon>
          </Group>
          <Text size="xs" c="dimmed" mt="sm">Pending activation</Text>
        </Card>

        <Card padding="md" radius="md" withBorder>
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={4}>Total Requests</Text>
              <Text size="xl" fw={700}>{totalRequests.toLocaleString()}</Text>
            </div>
            <ThemeIcon color="orange" variant="light" size="lg" radius="md">
              <IconTrendingUp size={18} />
            </ThemeIcon>
          </Group>
          <Text size="xs" c="dimmed" mt="sm">Customer demand signals</Text>
        </Card>

        <Card padding="md" radius="md" withBorder>
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={4}>Categories</Text>
              <Text size="xl" fw={700}>{uniqueCategories.length}</Text>
            </div>
            <ThemeIcon color="blue" variant="light" size="lg" radius="md">
              <IconCategory size={18} />
            </ThemeIcon>
          </Group>
          <Text size="xs" c="dimmed" mt="sm">Unique merchant types</Text>
        </Card>
      </SimpleGrid>

      {/* Category + City breakdown */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Card padding="md" radius="md" withBorder>
          <Title order={5} mb="sm">Category Breakdown</Title>
          <Stack gap="xs">
            {categoryBreakdown.slice(0, 8).map(({ category, count }) => (
              <Group key={category} justify="space-between">
                <Text size="sm">{category}</Text>
                <Group gap="xs">
                  <Progress
                    value={(count / totalMerchants) * 100}
                    color="orange"
                    size="sm"
                    style={{ width: 100 }}
                  />
                  <Text size="xs" c="dimmed" w={30} ta="right">{count}</Text>
                </Group>
              </Group>
            ))}
          </Stack>
        </Card>

        <Card padding="md" radius="md" withBorder>
          <Title order={5} mb="sm">Top Cities</Title>
          <Stack gap="xs">
            {topCities.map(([city, count]) => (
              <Group key={city} justify="space-between">
                <Group gap="xs">
                  <IconMapPin size={14} color="#868e96" />
                  <Text size="sm">{city}</Text>
                </Group>
                <Badge variant="light" color="orange" size="sm">{count} merchants</Badge>
              </Group>
            ))}
            {topCities.length === 0 && (
              <Text size="sm" c="dimmed">No city data available</Text>
            )}
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Merchant Table */}
      <Card padding="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={5}>Merchant Directory</Title>
          <Text size="xs" c="dimmed">{filtered.length} results</Text>
        </Group>

        <Group mb="md" gap="sm">
          <TextInput
            placeholder="Search merchants..."
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 300 }}
            size="sm"
          />
          <Select
            placeholder="Category"
            data={uniqueCategories.map(c => ({ value: c, label: c }))}
            value={categoryFilter}
            onChange={setCategoryFilter}
            clearable
            size="sm"
            style={{ maxWidth: 200 }}
          />
          <Select
            placeholder="Status"
            data={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'REQUESTABLE', label: 'Requestable' },
              { value: 'COMING_SOON', label: 'Coming Soon' },
              { value: 'onboarding', label: 'Onboarding' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            clearable
            size="sm"
            style={{ maxWidth: 150 }}
          />
        </Group>

        <Table.ScrollContainer minWidth={600}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>City</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th ta="right">Requests</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.slice(0, 50).map((m) => (
                <Table.Tr key={m.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <IconBuildingStore size={14} color="#868e96" />
                      <Text size="sm" fw={500}>{m.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{m.category || '—'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {m.city ? `${m.city}${m.state ? `, ${m.state}` : ''}` : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      color={m.status === 'REQUESTABLE' ? 'green' : 'yellow'}
                      variant="light"
                    >
                      {m.status === 'REQUESTABLE' ? 'Active' : 'Coming Soon'}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm" fw={500}>{m.request_count || 0}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        {filtered.length > 50 && (
          <Text size="xs" c="dimmed" ta="center" mt="sm">
            Showing 50 of {filtered.length} merchants
          </Text>
        )}
      </Card>
    </Stack>
  );
};

export default MerchantMetrics;
