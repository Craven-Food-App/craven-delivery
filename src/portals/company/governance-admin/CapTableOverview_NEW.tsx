// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Grid,
  Badge,
  Table,
  Progress,
  Loader,
  Alert,
  NumberFormatter,
} from '@mantine/core';
import { IconChartPie, IconAlertCircle, IconLock } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { hasCFOPortalAccess } from '@/utils/torranceAccess';

// ============================================================================
// TYPES
// ============================================================================

interface CapTableData {
  total_authorized: number;
  total_issued: number;
  total_unissued: number;
  holding_company_shares: number;
  holding_company_percentage: number;
  founder_shares: number;
  founder_percentage: number;
  equity_pool: number;
  pool_percentage: number;
  par_value: number;
}

interface ExecutiveEquity {
  name: string;
  title: string;
  shares: number;
  percentage: number;
  strike_price: number;
  user_id?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

const CapTableOverview: React.FC = () => {
  const [capTable, setCapTable] = useState<CapTableData | null>(null);
  const [executives, setExecutives] = useState<ExecutiveEquity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFullCapTableAccess, setHasFullCapTableAccess] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCapTable();
  }, []);

  // ==========================================================================
  // LOAD CAP TABLE DATA
  // ==========================================================================
  const loadCapTable = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get cap table summary
      const { data: capData, error: capError } = await supabase
        .from('cap_tables')
        .select('*')
        .limit(1)
        .single();

      if (capError) throw new Error(`Cap table error: ${capError.message}`);
      if (!capData) throw new Error('No cap table data found');

      setCapTable(capData);

      // 2. Get ALL executives from equity_ledger
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('equity_ledger')
        .select('recipient_user_id, shares_amount, price_per_share')
        .eq('transaction_type', 'grant')
        .order('shares_amount', { ascending: false });

      if (ledgerError) throw new Error(`Equity ledger error: ${ledgerError.message}`);

      // 3. Get executive names from exec_users
      const { data: execData, error: execError } = await supabase
        .from('exec_users')
        .select('user_id, first_name, last_name, title');

      if (execError) throw new Error(`Exec users error: ${execError.message}`);

      // 4. Match ledger to executives
      const executiveEquity: ExecutiveEquity[] = [];

      for (const grant of ledgerData || []) {
        const exec = execData?.find(e => e.user_id === grant.recipient_user_id);
        
        if (exec) {
          const percentage = (grant.shares_amount / capData.total_authorized) * 100;
          
          executiveEquity.push({
            name: `${exec.first_name} ${exec.last_name}`,
            title: exec.title || 'Executive',
            shares: grant.shares_amount,
            percentage: percentage,
            strike_price: grant.price_per_share || 0,
          });
        }
      }

      setExecutives(executiveEquity);
      
      console.log('✅ Cap table loaded:', {
        capTable: capData,
        executives: executiveEquity,
      });

    } catch (err: any) {
      console.error('❌ Cap table load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================
  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="md" style={{ minHeight: 400, justifyContent: 'center' }}>
          <Loader size="lg" />
          <Text c="dimmed">Loading cap table...</Text>
        </Stack>
      </Container>
    );
  }

  // ==========================================================================
  // ERROR STATE
  // ==========================================================================
  if (error || !capTable) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error Loading Cap Table" color="red">
          {error || 'Cap table data not found'}
        </Alert>
      </Container>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>
              <IconChartPie size={32} style={{ marginRight: 12, verticalAlign: 'middle' }} />
              Capitalization Table
            </Title>
            <Text c="dimmed" size="sm" mt={4}>
              Crave'n Inc. - {capTable.total_authorized.toLocaleString()} Authorized Shares at ${capTable.par_value} par value
            </Text>
          </div>
        </Group>

        {/* Overview Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Card padding="xl" radius="md" withBorder style={{ height: '100%', borderColor: '#3b82f6', borderWidth: 2 }}>
              <Stack gap="md">
                <Title order={4} c="dimmed">Total Authorized</Title>
                <Text size="2xl" fw={700} c="blue">
                  <NumberFormatter value={capTable.total_authorized} thousandSeparator />
                </Text>
                <Text size="xs" c="dimmed">Delaware authorized shares</Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Card padding="xl" radius="md" withBorder style={{ height: '100%', borderColor: '#10b981', borderWidth: 2 }}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={4} c="dimmed">Total Issued</Title>
                  <Badge color="green" size="lg">{((capTable.total_issued / capTable.total_authorized) * 100).toFixed(1)}%</Badge>
                </Group>
                <Text size="2xl" fw={700} c="green">
                  <NumberFormatter value={capTable.total_issued} thousandSeparator />
                </Text>
                <Progress value={(capTable.total_issued / capTable.total_authorized) * 100} color="green" size="lg" radius="xl" />
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Card padding="xl" radius="md" withBorder style={{ height: '100%', borderColor: '#eab308', borderWidth: 2 }}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={4} c="dimmed">Unissued</Title>
                  <Badge color="yellow" size="lg">{((capTable.total_unissued / capTable.total_authorized) * 100).toFixed(1)}%</Badge>
                </Group>
                <Text size="2xl" fw={700} style={{ color: '#eab308' }}>
                  <NumberFormatter value={capTable.total_unissued} thousandSeparator />
                </Text>
                <Progress value={(capTable.total_unissued / capTable.total_authorized) * 100} color="yellow" size="lg" radius="xl" />
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Card padding="xl" radius="md" withBorder style={{ height: '100%', borderColor: '#f97316', borderWidth: 2 }}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={4} c="dimmed">Equity Pool</Title>
                  <Badge color="orange" size="lg">Reserved</Badge>
                </Group>
                <Text size="2xl" fw={700} c="orange">
                  <NumberFormatter value={capTable.equity_pool} thousandSeparator />
                </Text>
                <Text size="xs" c="dimmed">{capTable.pool_percentage.toFixed(1)}% reserved</Text>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Share Distribution Table */}
        <Card padding="xl" radius="md" withBorder>
          <Group justify="space-between" mb="xl">
            <div>
              <Title order={3} mb={4}>Share Distribution</Title>
              <Text c="dimmed" size="sm">Complete breakdown of equity ownership</Text>
            </div>
          </Group>

          <Table highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
            <Table.Thead style={{ backgroundColor: '#f9fafb' }}>
              <Table.Tr>
                <Table.Th style={{ fontWeight: 600 }}>Holder</Table.Th>
                <Table.Th style={{ fontWeight: 600 }}>Shares</Table.Th>
                <Table.Th style={{ fontWeight: 600 }}>Percentage</Table.Th>
                <Table.Th style={{ fontWeight: 600 }}>Strike Price</Table.Th>
                <Table.Th style={{ fontWeight: 600 }}>Visual</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {/* Holding Company */}
              <Table.Tr>
                <Table.Td>
                  <div>
                    <Text fw={600} size="sm">Invero, Inc.</Text>
                    <Text size="xs" c="dimmed">Holding Company</Text>
                  </div>
                </Table.Td>
                <Table.Td>
                  <Text fw={700} size="sm">
                    <NumberFormatter value={capTable.holding_company_shares} thousandSeparator />
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color="blue" size="lg" variant="light">
                    {capTable.holding_company_percentage.toFixed(1)}%
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color="gray" size="sm" variant="outline">
                    $0.00
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Progress value={capTable.holding_company_percentage} color="blue" size="sm" radius="xl" style={{ minWidth: 100 }} />
                </Table.Td>
              </Table.Tr>

              {/* Founder */}
              <Table.Tr>
                <Table.Td>
                  <div>
                    <Text fw={600} size="sm">Torrance Stroman</Text>
                    <Text size="xs" c="dimmed">Founder & CEO</Text>
                  </div>
                </Table.Td>
                <Table.Td>
                  <Text fw={700} size="sm">
                    <NumberFormatter value={capTable.founder_shares} thousandSeparator />
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color="green" size="lg" variant="light">
                    {capTable.founder_percentage.toFixed(1)}%
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color="gray" size="sm" variant="outline">
                    $0.00
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Progress value={capTable.founder_percentage} color="green" size="sm" radius="xl" style={{ minWidth: 100 }} />
                </Table.Td>
              </Table.Tr>

              {/* Executives */}
              {executives.map((exec, index) => (
                <Table.Tr key={`exec-${index}`}>
                  <Table.Td>
                    <div>
                      <Text fw={600} size="sm">{exec.name}</Text>
                      <Text size="xs" c="dimmed">{exec.title}</Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={700} size="sm">
                      <NumberFormatter value={exec.shares} thousandSeparator />
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="purple" size="lg" variant="light">
                      {exec.percentage.toFixed(1)}%
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge 
                      color={exec.strike_price === 0 ? "gray" : "indigo"} 
                      size="sm" 
                      variant="outline"
                    >
                      ${exec.strike_price.toFixed(2)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Progress value={exec.percentage} color="purple" size="sm" radius="xl" style={{ minWidth: 100 }} />
                  </Table.Td>
                </Table.Tr>
              ))}

              {/* Pool */}
              <Table.Tr style={{ backgroundColor: '#fef3c7' }}>
                <Table.Td>
                  <div>
                    <Text fw={600} size="sm" c="dimmed">Pool (Reserved)</Text>
                    <Text size="xs" c="dimmed">Available for grants</Text>
                  </div>
                </Table.Td>
                <Table.Td>
                  <Text fw={700} size="sm" c="dimmed">
                    <NumberFormatter value={capTable.equity_pool} thousandSeparator />
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color="orange" size="lg" variant="light">
                    {capTable.pool_percentage.toFixed(1)}%
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color="gray" size="sm" variant="outline">
                    N/A
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Progress value={capTable.pool_percentage} color="orange" size="sm" radius="xl" style={{ minWidth: 100 }} />
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>
    </Container>
  );
};

export default CapTableOverview;

