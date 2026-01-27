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
  Button,
  Tabs,
} from '@mantine/core';
import { IconChartPie, IconAlertCircle, IconDownload, IconCoins } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import EquityGrantsList from '../governance-admin/EquityGrantsList';
import EquityGrantWizard from '../governance-admin/wizards/EquityGrantWizard';

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
}

interface PieChartData {
  name: string;
  value: number;
  shares: number;
  color: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

const CapTableEquityPageEnhanced: React.FC = () => {
  const [capTable, setCapTable] = useState<CapTableData | null>(null);
  const [executives, setExecutives] = useState<ExecutiveEquity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grantWizardOpen, setGrantWizardOpen] = useState(false);

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

      // 2. Get ALL transactions from equity_ledger (grants AND cancellations)
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('equity_ledger')
        .select('recipient_user_id, shares_amount, price_per_share, transaction_type, grant_id')
        .in('transaction_type', ['grant', 'cancellation'])
        .not('recipient_user_id', 'is', null);

      if (ledgerError) throw new Error(`Equity ledger error: ${ledgerError.message}`);

      // Build map of revoked grants (by grant_id or by user_id + shares_amount)
      const revokedGrantKeys = new Set<string>();
      (ledgerData || [])
        .filter(t => t.transaction_type === 'cancellation')
        .forEach(revocation => {
          if (revocation.grant_id) {
            revokedGrantKeys.add(`grant_id:${revocation.grant_id}`);
          } else {
            revokedGrantKeys.add(`${revocation.recipient_user_id}_${revocation.shares_amount}`);
          }
        });

      // Filter out revoked grants and calculate net shares
      const activeGrants = (ledgerData || []).filter(entry => {
        if (entry.transaction_type === 'cancellation') return false; // Don't count cancellations as grants
        
        const grantKey = entry.grant_id 
          ? `grant_id:${entry.grant_id}` 
          : `${entry.recipient_user_id}_${entry.shares_amount}`;
        
        return !revokedGrantKeys.has(grantKey);
      });

      // Aggregate NET shares by recipient_user_id (grants minus cancellations)
      const sharesByUserId: Record<string, { shares: number; strikePrice: number }> = {};
      activeGrants.forEach(grant => {
        if (grant.recipient_user_id && grant.transaction_type === 'grant') {
          if (!sharesByUserId[grant.recipient_user_id]) {
            sharesByUserId[grant.recipient_user_id] = {
              shares: 0,
              strikePrice: grant.price_per_share || 0,
            };
          }
          sharesByUserId[grant.recipient_user_id].shares += grant.shares_amount || 0;
        }
      });

      // Also subtract cancellations directly
      (ledgerData || [])
        .filter(t => t.transaction_type === 'cancellation')
        .forEach(cancellation => {
          if (cancellation.recipient_user_id && sharesByUserId[cancellation.recipient_user_id]) {
            sharesByUserId[cancellation.recipient_user_id].shares -= cancellation.shares_amount || 0;
          }
        });

      // Remove any users with zero or negative shares (fully revoked)
      Object.keys(sharesByUserId).forEach(userId => {
        if (sharesByUserId[userId].shares <= 0) {
          console.log(`🚫 Removing user ${userId} - shares are ${sharesByUserId[userId].shares} (revoked)`);
          delete sharesByUserId[userId];
        }
      });

      console.log('📊 Net shares by user_id after filtering revoked:', sharesByUserId);
      const recipientUserIds = Object.keys(sharesByUserId);
      
      if (recipientUserIds.length === 0) {
        setExecutives([]);
        return;
      }

      // 3. Get exec_users with role information
      const { data: execData, error: execError } = await supabase
        .from('exec_users')
        .select('id, user_id, title, role')
        .in('user_id', recipientUserIds);

      if (execError) throw new Error(`Exec users error: ${execError.message}`);
      
      console.log('👥 Exec users found:', execData?.map(e => ({
        user_id: e.user_id,
        title: e.title,
        role: e.role
      })));

      // 4. Get names from user_profiles
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', recipientUserIds);

      // 5. Get names from employees (fallback)
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id, first_name, last_name')
        .in('user_id', recipientUserIds);

      // Build name map - prioritize user_profiles, then employees
      const nameMap: Record<string, string> = {};
      (userProfiles || []).forEach(profile => {
        if (profile.full_name) nameMap[profile.id] = profile.full_name;
      });
      (employees || []).forEach(emp => {
        if (emp.user_id && !nameMap[emp.user_id]) {
          const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
          if (fullName) nameMap[emp.user_id] = fullName;
        }
      });

      // 6. Build executive equity list with proper names
      const executiveEquity: ExecutiveEquity[] = [];

      for (const userId of recipientUserIds) {
        const exec = execData?.find(e => e.user_id === userId);
        const shareData = sharesByUserId[userId];
        
        if (shareData && shareData.shares > 0) {
          // Get name - prioritize actual name, never use title as name
          let name = nameMap[userId];
          
          // Final fallback - use a generic name but log warning
          if (!name) {
            console.warn(`⚠️ No name found for user_id: ${userId}, using role/title as fallback`);
            // Use role if available, otherwise title, but make it clear it's not a name
            if (exec?.role) {
              const roleMap: Record<string, string> = {
                'ceo': 'CEO',
                'cfo': 'CFO',
                'cto': 'CTO',
                'coo': 'COO',
              };
              name = roleMap[exec.role.toLowerCase()] || exec.role.toUpperCase();
            } else {
              name = exec?.title || 'Executive';
            }
          }
          
          // Title should be the role/title, not the name
          const title = exec?.title || (exec?.role ? exec.role.toUpperCase() : 'Executive');
          
          const percentage = (shareData.shares / capData.total_authorized) * 100;
          
          executiveEquity.push({
            name: name,
            title: title,
            shares: shareData.shares,
            percentage: percentage,
            strike_price: shareData.strikePrice,
          });
        }
      }

      // Sort by shares descending
      executiveEquity.sort((a, b) => b.shares - a.shares);

      setExecutives(executiveEquity);

    } catch (err: any) {
      console.error('❌ Cap table load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // PIE CHART DATA
  // ==========================================================================
  const getPieChartData = (): PieChartData[] => {
    if (!capTable) return [];

    const data: PieChartData[] = [
      {
        name: 'Invero, Inc.',
        value: capTable.holding_company_percentage,
        shares: capTable.holding_company_shares,
        color: '#3b82f6', // Blue
      },
      {
        name: 'Torrance Stroman',
        value: capTable.founder_percentage,
        shares: capTable.founder_shares,
        color: '#8b5cf6', // Purple
      },
      ...executives.map(exec => ({
        name: exec.name,
        value: exec.percentage,
        shares: exec.shares,
        color: '#ec4899', // Pink
      })),
      {
        name: 'Equity Pool',
        value: capTable.pool_percentage,
        shares: capTable.equity_pool,
        color: '#f97316', // Orange
      },
    ];

    return data.filter(item => item.value > 0);
  };

  // ==========================================================================
  // EXPORT TO CSV
  // ==========================================================================
  const exportToCSV = () => {
    if (!capTable) return;

    const rows = [
      ['Holder', 'Shares', 'Percentage', 'Strike Price'],
      ['Invero, Inc. (Holding Company)', capTable.holding_company_shares, `${capTable.holding_company_percentage.toFixed(1)}%`, '$0.00'],
      ['Torrance Stroman (Founder)', capTable.founder_shares, `${capTable.founder_percentage.toFixed(1)}%`, '$0.00'],
      ...executives.map(exec => [exec.name, exec.shares, `${exec.percentage.toFixed(1)}%`, `$${exec.strike_price.toFixed(2)}`]),
      ['Equity Pool (Reserved)', capTable.equity_pool, `${capTable.pool_percentage.toFixed(1)}%`, 'N/A'],
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cap-table-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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

  const pieData = getPieChartData();

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>
              <IconChartPie size={36} style={{ marginRight: 12, verticalAlign: 'middle' }} />
              Cap Table & Equity
            </Title>
            <Text c="dimmed" size="sm" mt={4}>
              Crave'n Inc. - 70,000,000 Authorized Shares at ${capTable.par_value.toFixed(4)} par value
            </Text>
          </div>
          <Group>
            <Button
              leftSection={<IconDownload size={16} />}
              variant="light"
              onClick={exportToCSV}
            >
              Export CSV
            </Button>
            <Button
              leftSection={<IconCoins size={16} />}
              onClick={() => setGrantWizardOpen(true)}
            >
              Grant Equity
            </Button>
          </Group>
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

        {/* Ownership Distribution - Chart + Table */}
        <Grid>
          <Grid.Col span={{ base: 12, lg: 5 }}>
            <Card padding="xl" radius="md" withBorder>
              <Title order={3} mb="md">Ownership Distribution</Title>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        `${props.payload.shares.toLocaleString()} shares (${value.toFixed(1)}%)`,
                        'Ownership'
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Text c="dimmed" ta="center" py="xl">No ownership data available</Text>
              )}
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 7 }}>
            <Card padding="xl" radius="md" withBorder>
              <Title order={3} mb="md">Share Distribution</Title>
              <Table highlightOnHover verticalSpacing="md">
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
          </Grid.Col>
        </Grid>

        {/* Equity Grants History */}
        <Card padding="xl" radius="md" withBorder>
          <Tabs defaultValue="grants">
            <Tabs.List>
              <Tabs.Tab value="grants">Equity Grants History</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="grants" pt="xl">
              <EquityGrantsList />
            </Tabs.Panel>
          </Tabs>
        </Card>
      </Stack>

      {/* Grant Equity Wizard Modal */}
      {grantWizardOpen && (
        <EquityGrantWizard
          opened={grantWizardOpen}
          onClose={() => {
            setGrantWizardOpen(false);
            loadCapTable();
          }}
        />
      )}
    </Container>
  );
};

export default CapTableEquityPageEnhanced;

