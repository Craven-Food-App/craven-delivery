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
  Button,
  Tabs,
} from '@mantine/core';
import { IconChartPie, IconAlertCircle, IconDownload, IconCoins } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import EquityGrantsList from '../governance-admin/EquityGrantsList';
import EquityGrantWizard from '../governance-admin/wizards/EquityGrantWizard';
import {
  fetchTorranceUserId,
  FOUNDER_BOARD_ROLES_LINE,
  FOUNDER_CEO_LABEL,
} from '@/utils/capTableCanonical';

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
  micro_equity_pool?: number; // Micro-Equity Pool (1,400,000)
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

const AUTHORIZED_SHARES = 70000000;
const HOLDING_COMPANY_SHARES = 40600000;
const FOUNDER_SHARES = 10500000;
const MICRO_POOL_SHARES = 1400000;

function isTorranceStromanDisplayName(name: string | undefined | null): boolean {
  const n = (name || '').toLowerCase();
  return n.includes('torrance') && n.includes('stroman');
}

function isMarkaylaDanzyDisplayName(name: string | undefined | null): boolean {
  const n = (name || '').toLowerCase();
  return (n.includes('markayla') && n.includes('danzy')) || n.includes('markayla danzy');
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

  const toNumber = (value: any, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const formatFixed = (value: any, digits = 1): string => {
    return toNumber(value).toFixed(digits);
  };

  const normalizeCapTable = (raw: any): CapTableData => {
    // Canonical company structure: 70,000,000 authorized shares.
    const totalAuthorized = AUTHORIZED_SHARES;
    const holdingShares = HOLDING_COMPANY_SHARES;
    const founderShares = FOUNDER_SHARES;
    const inferredIssued = holdingShares + founderShares;
    const totalIssued = Math.max(toNumber(raw?.total_issued, inferredIssued), inferredIssued);
    const totalUnissued = Math.max(totalAuthorized - totalIssued, 0);
    const microEquityPool = MICRO_POOL_SHARES;
    const equityPool = Math.max(totalUnissued - microEquityPool, 0);
    const denominator = totalAuthorized > 0 ? totalAuthorized : 1;

    return {
      total_authorized: totalAuthorized,
      total_issued: totalIssued,
      total_unissued: totalUnissued,
      holding_company_shares: holdingShares,
      holding_company_percentage: toNumber(raw?.holding_company_percentage, (holdingShares / denominator) * 100),
      founder_shares: founderShares,
      founder_percentage: toNumber(raw?.founder_percentage, (founderShares / denominator) * 100),
      equity_pool: equityPool,
      micro_equity_pool: microEquityPool,
      pool_percentage: toNumber(raw?.pool_percentage, (equityPool / denominator) * 100),
      par_value: toNumber(raw?.par_value, 0.001),
    };
  };

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
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (capError) throw new Error(`Cap table error: ${capError.message}`);
      if (!capData) {
        // No cap table exists yet - use normalized defaults with complete numeric fields
        setCapTable(normalizeCapTable({}));
        setExecutives([]);
        setLoading(false);
        return;
      }

      const normalizedCapData = normalizeCapTable(capData);
      setCapTable(normalizedCapData);

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
          // Skip old 18M grants - these are outdated Torrance data
          // Torrance should have 10.5M, not 18M
          if (grant.shares_amount >= 17500000 && grant.shares_amount <= 18500000) {
            console.log(`🚫 Skipping old 18M grant for user_id ${grant.recipient_user_id} - outdated data`);
            return;
          }
          
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

      const torranceUserId = await fetchTorranceUserId();
      if (torranceUserId && sharesByUserId[torranceUserId]) {
        delete sharesByUserId[torranceUserId];
        console.log(
          '📌 Removed founder ledger aggregate for CEO user_id — stake shown only as canonical founder row',
        );
      }

      const recipientUserIdsAfterFounder = Object.keys(sharesByUserId);

      // 3. Get exec_users with role information (skip .in([]) — PostgREST rejects empty IN lists)
      let execData: { id: string; user_id: string; title: string | null; role: string }[] = [];
      if (recipientUserIdsAfterFounder.length > 0) {
        const { data, error: execError } = await supabase
          .from('exec_users')
          .select('id, user_id, title, role')
          .in('user_id', recipientUserIdsAfterFounder);

        if (execError) throw new Error(`Exec users error: ${execError.message}`);
        execData = data || [];
      }

      console.log('👥 Exec users found:', execData?.map(e => ({
        user_id: e.user_id,
        title: e.title,
        role: e.role
      })));

      // 4. Get names from user_profiles (match auth user via user_id, not profile row id)
      const { data: userProfiles } =
        recipientUserIdsAfterFounder.length > 0
          ? await supabase
              .from('user_profiles')
              .select('user_id, full_name')
              .in('user_id', recipientUserIdsAfterFounder)
          : { data: [] as { user_id: string | null; full_name: string | null }[] };

      // 5. Get names from employees (fallback)
      const { data: employees } =
        recipientUserIdsAfterFounder.length > 0
          ? await supabase
              .from('employees')
              .select('user_id, first_name, last_name')
              .in('user_id', recipientUserIdsAfterFounder)
          : { data: [] as { user_id: string; first_name: string | null; last_name: string | null }[] };

      // Build name map - prioritize user_profiles, then employees
      const nameMap: Record<string, string> = {};
      (userProfiles || []).forEach(profile => {
        const uid = profile.user_id;
        if (uid && profile.full_name) nameMap[uid] = profile.full_name;
      });
      (employees || []).forEach(emp => {
        if (emp.user_id && !nameMap[emp.user_id]) {
          const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
          if (fullName) nameMap[emp.user_id] = fullName;
        }
      });

      // 6. Build executive equity list with proper names
      const executiveEquity: ExecutiveEquity[] = [];

      for (const userId of recipientUserIdsAfterFounder) {
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
          
          // Skip entries where name is just "CEO" or "Chief Executive Officer" - these are duplicates
          // Torrance Stroman should be the only CEO entry
          if (name === 'CEO' || name === 'Chief Executive Officer' || 
              (name && name.toUpperCase() === 'CEO') ||
              (exec?.title === 'Chief Executive Officer' && !nameMap[userId])) {
            console.log(`🚫 Skipping duplicate CEO entry for user_id ${userId} - name: ${name}, title: ${exec?.title}`);
            continue;
          }

          // Founder / CEO stake is the single 10.5M (15%) founder row — not a separate executive line.
          if (isTorranceStromanDisplayName(name)) {
            console.log(
              `🚫 Skipping ledger-only row for Torrance (shown as ${FOUNDER_CEO_LABEL} / ${FOUNDER_SHARES.toLocaleString()} shares): user_id ${userId}`,
            );
            continue;
          }
          
          // Title should be the role/title, not the name
          const title = exec?.title || (exec?.role ? exec.role.toUpperCase() : 'Executive');

          if (isMarkaylaDanzyDisplayName(name)) {
            console.log(`🚫 Skipping non-executive equity row (Markayla Danzy) for user_id ${userId}`);
            continue;
          }

          const percentage = (shareData.shares / normalizedCapData.total_authorized) * 100;
          
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

      // Derive canonical cap table totals so UI is correct even if persisted cap_tables row is stale.
      const execTotal = executiveEquity.reduce((sum, e) => sum + toNumber(e.shares, 0), 0);
      const totalIssued = HOLDING_COMPANY_SHARES + FOUNDER_SHARES + execTotal;
      const totalUnissued = Math.max(AUTHORIZED_SHARES - totalIssued, 0);
      const reservedPool = Math.max(totalUnissued - MICRO_POOL_SHARES, 0);

      setCapTable({
        total_authorized: AUTHORIZED_SHARES,
        total_issued: totalIssued,
        total_unissued: totalUnissued,
        holding_company_shares: HOLDING_COMPANY_SHARES,
        holding_company_percentage: (HOLDING_COMPANY_SHARES / AUTHORIZED_SHARES) * 100,
        founder_shares: FOUNDER_SHARES,
        founder_percentage: (FOUNDER_SHARES / AUTHORIZED_SHARES) * 100,
        equity_pool: reservedPool,
        micro_equity_pool: MICRO_POOL_SHARES,
        pool_percentage: (reservedPool / AUTHORIZED_SHARES) * 100,
        par_value: toNumber(capData.par_value, 0.001),
      });

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

    // Recalculate all percentages from actual shares to ensure 100% accuracy
    // This ensures the pie chart always sums to exactly 100%
    const totalAuthorized = Math.max(toNumber(capTable.total_authorized, 0), 1);

    const data: PieChartData[] = [
      {
        name: 'Invero, Inc.',
        value: (capTable.holding_company_shares / totalAuthorized) * 100,
        shares: capTable.holding_company_shares,
        color: '#3b82f6', // Blue
      },
      {
        name: `Torrance Stroman — ${FOUNDER_CEO_LABEL}`,
        value: (capTable.founder_shares / totalAuthorized) * 100,
        shares: capTable.founder_shares,
        color: '#8b5cf6', // Purple
      },
      ...executives.map(exec => ({
        name: exec.name,
        value: (exec.shares / totalAuthorized) * 100,
        shares: exec.shares,
        color: '#ec4899', // Pink
      })),
      {
        name: 'Equity Pool',
        value: (capTable.equity_pool / totalAuthorized) * 100,
        shares: capTable.equity_pool,
        color: '#f97316', // Orange
      },
      ...(capTable.micro_equity_pool && capTable.micro_equity_pool > 0 ? [{
        name: 'Equity Pool (Micro-Equity)',
        value: (capTable.micro_equity_pool / totalAuthorized) * 100,
        shares: capTable.micro_equity_pool,
        color: '#fb923c', // Lighter orange
      }] : []),
    ];

    // Filter out zero values and verify sum
    const filteredData = data.filter(item => item.value > 0);
    
    // Calculate total percentage to verify it's 100%
    const totalPercentage = filteredData.reduce((sum, item) => sum + item.value, 0);
    
    // If there's a rounding difference, adjust the largest slice to make it exactly 100%
    if (Math.abs(totalPercentage - 100) > 0.01 && filteredData.length > 0) {
      const diff = 100 - totalPercentage;
      // Find the largest slice and adjust it
      const largestIndex = filteredData.reduce((maxIdx, item, idx) => 
        item.value > filteredData[maxIdx].value ? idx : maxIdx, 0
      );
      filteredData[largestIndex].value += diff;
    }

    // Debug log to verify percentages sum to 100%
    console.log('📊 [PIE CHART] Percentages:', filteredData.map(d => `${d.name}: ${formatFixed(d.value, 2)}%`));
    console.log('📊 [PIE CHART] Total:', formatFixed(filteredData.reduce((sum, d) => sum + d.value, 0), 2) + '%');

    return filteredData;
  };

  // ==========================================================================
  // EXPORT TO CSV
  // ==========================================================================
  const exportToCSV = () => {
    if (!capTable) return;

    // Recalculate all percentages from actual shares for CSV export accuracy
    const totalAuthorized = Math.max(toNumber(capTable.total_authorized, 0), 1);
    const holdingCompanyPercentage = (capTable.holding_company_shares / totalAuthorized) * 100;
    const founderPercentage = (capTable.founder_shares / totalAuthorized) * 100;
    const equityPoolPercentage = (capTable.equity_pool / totalAuthorized) * 100;
    
    const rows = [
      ['Holder', 'Shares', 'Percentage', 'Strike Price'],
      ['Invero, Inc. (Holding Company)', capTable.holding_company_shares, `${formatFixed(holdingCompanyPercentage, 1)}%`, '$0.00'],
      [`Torrance Stroman (${FOUNDER_CEO_LABEL})`, capTable.founder_shares, `${formatFixed(founderPercentage, 1)}%`, '$0.00'],
      ...executives.map(exec => {
        const execPercentage = (exec.shares / totalAuthorized) * 100;
        return [exec.name, exec.shares, `${formatFixed(execPercentage, 1)}%`, `$${formatFixed(exec.strike_price, 2)}`];
      }),
      ['Equity Pool (Reserved)', capTable.equity_pool, `${formatFixed(equityPoolPercentage, 1)}%`, 'N/A'],
      ...(capTable.micro_equity_pool && capTable.micro_equity_pool > 0 ? [
        ['Equity Pool (Micro-Equity)', capTable.micro_equity_pool, `${formatFixed((capTable.micro_equity_pool / totalAuthorized) * 100, 1)}%`, 'N/A']
      ] : []),
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
      <Container size="xl" py="md" style={{ padding: '16px 24px' }}>
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
      <Container size="xl" py="md" style={{ padding: '16px 24px' }}>
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
    <Container size="xl" py="md" style={{ padding: '16px 24px' }}>
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>
              <IconChartPie size={36} style={{ marginRight: 12, verticalAlign: 'middle' }} />
              Cap Table & Equity
            </Title>
            <Text c="dimmed" size="sm" mt={4}>
              Crave'n Inc. - {capTable.total_authorized.toLocaleString()} Authorized Shares at ${capTable.par_value} par value
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
            <Card padding="md" radius="md" withBorder style={{ height: '100%', borderColor: '#3b82f6', borderWidth: 2 }}>
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
                {/* Show breakdown if micro_equity_pool exists */}
                {capTable.micro_equity_pool && capTable.micro_equity_pool > 0 && (
                  <Stack gap="xs" mt="xs">
                    <Group justify="space-between" gap="xs">
                      <Text size="xs" c="dimmed">Micro-Equity Pool:</Text>
                      <Text size="xs" fw={500}>
                        <NumberFormatter value={capTable.micro_equity_pool} thousandSeparator />
                      </Text>
                    </Group>
                    <Group justify="space-between" gap="xs">
                      <Text size="xs" c="dimmed">Equity Pool:</Text>
                      <Text size="xs" fw={500}>
                        <NumberFormatter value={capTable.equity_pool} thousandSeparator />
                      </Text>
                    </Group>
                  </Stack>
                )}
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
                <Text size="xs" c="dimmed">{formatFixed(capTable.pool_percentage, 1)}% reserved</Text>
                {/* Show micro-equity pool if it exists */}
                {capTable.micro_equity_pool && capTable.micro_equity_pool > 0 && (
                  <Stack gap="xs" mt="xs" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
                    <Group justify="space-between" gap="xs">
                      <Text size="xs" c="dimmed">Micro-Equity Pool:</Text>
                      <Text size="xs" fw={500} c="orange">
                        <NumberFormatter value={capTable.micro_equity_pool} thousandSeparator />
                      </Text>
                    </Group>
                  </Stack>
                )}
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Ownership Distribution - Chart + Table */}
        <Grid>
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <Card padding="xl" radius="md" withBorder>
              <Title order={3} mb="md">Ownership Distribution</Title>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={430}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={155}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        `${toNumber(props?.payload?.shares).toLocaleString()} shares (${formatFixed(value, 1)}%)`,
                        'Ownership'
                      ]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      wrapperStyle={{ paddingTop: 16 }}
                      formatter={(value, entry: any) => {
                        const pct = toNumber(entry?.payload?.value);
                        return `${value} (${formatFixed(pct, 1)}%)`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Text c="dimmed" ta="center" py="xl">No ownership data available</Text>
              )}
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 5 }}>
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
                  {(() => {
                    // Recalculate all percentages from actual shares to ensure 100% accuracy
                    const totalAuthorized = Math.max(toNumber(capTable.total_authorized, 0), 1);
                    
                    // Calculate accurate percentages
                    const holdingCompanyPercentage = (capTable.holding_company_shares / totalAuthorized) * 100;
                    const founderPercentage = (capTable.founder_shares / totalAuthorized) * 100;
                    
                    return (
                      <>
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
                              {holdingCompanyPercentage.toFixed(1)}%
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="gray" size="sm" variant="outline">
                              $0.00
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Progress value={holdingCompanyPercentage} color="blue" size="sm" radius="xl" style={{ minWidth: 100 }} />
                          </Table.Td>
                        </Table.Tr>

                        {/* Founder */}
                        <Table.Tr>
                          <Table.Td>
                            <div>
                              <Text fw={600} size="sm">Torrance Stroman</Text>
                              <Text size="xs" c="dimmed">{FOUNDER_CEO_LABEL}</Text>
                              <Text size="xs" c="dimmed">{FOUNDER_BOARD_ROLES_LINE}</Text>
                            </div>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={700} size="sm">
                              <NumberFormatter value={capTable.founder_shares} thousandSeparator />
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="green" size="lg" variant="light">
                              {founderPercentage.toFixed(1)}%
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="gray" size="sm" variant="outline">
                              $0.00
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Progress value={founderPercentage} color="green" size="sm" radius="xl" style={{ minWidth: 100 }} />
                          </Table.Td>
                        </Table.Tr>

                        {/* Executives */}
                        {executives.map((exec, index) => {
                          const execPercentage = (exec.shares / totalAuthorized) * 100;
                          return (
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
                                  {execPercentage.toFixed(1)}%
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Badge 
                                  color={exec.strike_price === 0 ? "gray" : "indigo"} 
                                  size="sm" 
                                  variant="outline"
                                >
                                  ${formatFixed(exec.strike_price, 2)}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Progress value={execPercentage} color="purple" size="sm" radius="xl" style={{ minWidth: 100 }} />
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                      </>
                    );
                  })()}

                  {(() => {
                    // Recalculate pool percentages from actual shares
                    const totalAuthorized = Math.max(toNumber(capTable.total_authorized, 0), 1);
                    const equityPoolPercentage = (capTable.equity_pool / totalAuthorized) * 100;
                    const microEquityPoolPercentage = capTable.micro_equity_pool 
                      ? (capTable.micro_equity_pool / totalAuthorized) * 100 
                      : 0;
                    
                    return (
                      <>
                        {/* Equity Pool */}
                        <Table.Tr style={{ backgroundColor: '#fef3c7' }}>
                          <Table.Td>
                            <div>
                              <Text fw={600} size="sm" c="dimmed">Equity Pool (Reserved)</Text>
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
                              {equityPoolPercentage.toFixed(1)}%
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="gray" size="sm" variant="outline">
                              N/A
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Progress value={equityPoolPercentage} color="orange" size="sm" radius="xl" style={{ minWidth: 100 }} />
                          </Table.Td>
                        </Table.Tr>

                        {/* Micro-Equity Pool */}
                        {capTable.micro_equity_pool && capTable.micro_equity_pool > 0 && (
                          <Table.Tr style={{ backgroundColor: '#fff7ed' }}>
                            <Table.Td>
                              <div>
                                <Text fw={600} size="sm" c="dimmed">Equity Pool (Micro-Equity)</Text>
                                <Text size="xs" c="dimmed">Micro-equity grants</Text>
                              </div>
                            </Table.Td>
                            <Table.Td>
                              <Text fw={700} size="sm" c="dimmed">
                                <NumberFormatter value={capTable.micro_equity_pool} thousandSeparator />
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge color="orange" size="lg" variant="light">
                                {microEquityPoolPercentage.toFixed(1)}%
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Badge color="gray" size="sm" variant="outline">
                                N/A
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Progress 
                                value={microEquityPoolPercentage} 
                                color="orange" 
                                size="sm" 
                                radius="xl" 
                                style={{ minWidth: 100 }} 
                              />
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </>
                    );
                  })()}
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

