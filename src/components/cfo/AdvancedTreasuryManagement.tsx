import React, { useState, useEffect } from 'react';
import {
  Grid,
  Group,
  Stack,
  Card,
  Text,
  Title,
  Badge,
  Button,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Table,
  ActionIcon,
  Tooltip,
  Alert,
  Box,
  Tabs,
  Paper,
} from '@mantine/core';
import {
  IconBuildingBank,
  IconWorld,
  IconTrendingUp,
  IconTrendingDown,
  IconPlus,
  IconEdit,
  IconTrash,
  IconInfoCircle,
  IconCash,
  IconChartLine,
  IconShield,
  IconTarget,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { modals } from '@mantine/modals';
import { FuturisticChart } from './FuturisticChart';

interface BankAccount {
  id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  current_balance: number;
  currency: string;
  interest_rate?: number;
  last_updated: string;
}

interface Investment {
  id: string;
  name: string;
  type: 'equity' | 'bond' | 'money_market' | 'other';
  amount: number;
  return_rate: number;
  maturity_date?: string;
  risk_level: 'low' | 'medium' | 'high';
}

interface FXExposure {
  currency: string;
  amount: number;
  usd_equivalent: number;
  exposure_pct: number;
  hedge_status: 'hedged' | 'partial' | 'unhedged';
}

interface DebtInstrument {
  id: string;
  name: string;
  type: 'line_of_credit' | 'term_loan' | 'bond' | 'other';
  principal: number;
  interest_rate: number;
  maturity_date: string;
  monthly_payment: number;
  remaining_balance: number;
}

export const AdvancedTreasuryManagement: React.FC = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [fxExposures, setFxExposures] = useState<FXExposure[]>([]);
  const [debtInstruments, setDebtInstruments] = useState<DebtInstrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('cash');
  const [bankModalOpened, setBankModalOpened] = useState(false);
  const [investmentModalOpened, setInvestmentModalOpened] = useState(false);
  const [debtModalOpened, setDebtModalOpened] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchTreasuryData();
  }, []);

  const fetchTreasuryData = async () => {
    setLoading(true);
    try {
      // Fetch bank accounts
      // @ts-ignore - Type compatibility
      const { data: banks } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('current_balance', { ascending: false });

      setBankAccounts((banks || []) as BankAccount[]);

      // Mock investment data (would come from investments table)
      setInvestments([
        {
          id: '1',
          name: 'Money Market Fund',
          type: 'money_market',
          amount: 2500000,
          return_rate: 4.2,
          risk_level: 'low',
        },
        {
          id: '2',
          name: 'Corporate Bonds',
          type: 'bond',
          amount: 1500000,
          return_rate: 5.8,
          maturity_date: '2026-12-31',
          risk_level: 'medium',
        },
      ]);

      // Calculate FX exposure
      const totalCash = (banks || []).reduce((sum: number, b: any) => sum + (b.current_balance || 0), 0);
      const fxData: FXExposure[] = [
        { currency: 'USD', amount: totalCash * 0.7, usd_equivalent: totalCash * 0.7, exposure_pct: 70, hedge_status: 'hedged' },
        { currency: 'EUR', amount: totalCash * 0.2, usd_equivalent: totalCash * 0.2 * 1.1, exposure_pct: 20, hedge_status: 'partial' },
        { currency: 'GBP', amount: totalCash * 0.1, usd_equivalent: totalCash * 0.1 * 1.25, exposure_pct: 10, hedge_status: 'unhedged' },
      ];
      setFxExposures(fxData);

      // Mock debt data
      setDebtInstruments([
        {
          id: '1',
          name: 'Revolving Credit Line',
          type: 'line_of_credit',
          principal: 5000000,
          interest_rate: 5.5,
          maturity_date: '2025-12-31',
          monthly_payment: 0,
          remaining_balance: 2000000,
        },
        {
          id: '2',
          name: 'Term Loan',
          type: 'term_loan',
          principal: 3000000,
          interest_rate: 6.2,
          maturity_date: '2027-06-30',
          monthly_payment: 50000,
          remaining_balance: 2500000,
        },
      ]);
    } catch (error) {
      console.error('Error fetching treasury data:', error);
      toast.error('Failed to load treasury data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const totalCash = bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  const totalInvestments = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalDebt = debtInstruments.reduce((sum, debt) => sum + (debt.remaining_balance || 0), 0);
  const netCashPosition = totalCash + totalInvestments - totalDebt;
  const cashUtilization = totalDebt > 0 ? (totalDebt / (totalCash + totalInvestments)) * 100 : 0;

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <Box>
          <Title order={2}>Advanced Treasury Management</Title>
          <Text c="dimmed" size="sm">
            Comprehensive cash, investment, debt, and FX exposure management
          </Text>
        </Box>
        <Badge size="lg" color="blue" variant="light" leftSection={<IconShield size={16} />}>
          Treasury Operations
        </Badge>
      </Group>

      {/* Key Treasury Metrics */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Total Cash</Text>
              <IconCash size={20} color="#10b981" />
            </Group>
            <Text size="xl" fw={700} c="green">
              ${(totalCash / 1000000).toFixed(2)}M
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Across {bankAccounts.length} accounts
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Investments</Text>
              <IconTrendingUp size={20} color="#3b82f6" />
            </Group>
            <Text size="xl" fw={700} c="blue">
              ${(totalInvestments / 1000000).toFixed(2)}M
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {investments.length} positions
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Total Debt</Text>
              <IconTrendingDown size={20} color="#ef4444" />
            </Group>
            <Text size="xl" fw={700} c="red">
              ${(totalDebt / 1000000).toFixed(2)}M
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {debtInstruments.length} instruments
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Net Position</Text>
              <IconTarget size={20} color={netCashPosition > 0 ? '#10b981' : '#ef4444'} />
            </Group>
            <Text size="xl" fw={700} c={netCashPosition > 0 ? 'green' : 'red'}>
              ${(netCashPosition / 1000000).toFixed(2)}M
            </Text>
            <Badge
              color={cashUtilization < 30 ? 'green' : cashUtilization < 60 ? 'yellow' : 'red'}
              variant="light"
              size="sm"
              mt={4}
            >
              {cashUtilization.toFixed(1)}% utilization
            </Badge>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'cash')}>
        <Tabs.List>
          <Tabs.Tab value="cash" leftSection={<IconBuildingBank size={16} />}>
            Cash Positions
          </Tabs.Tab>
          <Tabs.Tab value="investments" leftSection={<IconTrendingUp size={16} />}>
            Investments
          </Tabs.Tab>
          <Tabs.Tab value="debt" leftSection={<IconTrendingDown size={16} />}>
            Debt Management
          </Tabs.Tab>
          <Tabs.Tab value="fx" leftSection={<IconWorld size={16} />}>
            FX Exposure
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="cash" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Bank Accounts & Cash Positions</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setBankModalOpened(true)}
              >
                Add Account
              </Button>
            </Group>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Bank Name</Table.Th>
                  <Table.Th>Account Type</Table.Th>
                  <Table.Th>Account Number</Table.Th>
                  <Table.Th>Balance</Table.Th>
                  <Table.Th>Currency</Table.Th>
                  <Table.Th>Interest Rate</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {bankAccounts.map((account) => (
                  <Table.Tr key={account.id}>
                    <Table.Td>{account.bank_name}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{account.account_type}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace">
                        ****{account.account_number?.slice(-4)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>
                        ${(account.current_balance / 1000).toFixed(0)}K
                      </Text>
                    </Table.Td>
                    <Table.Td>{account.currency}</Table.Td>
                    <Table.Td>
                      {account.interest_rate ? `${account.interest_rate}%` : 'N/A'}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Edit">
                          <ActionIcon variant="subtle" color="blue">
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon variant="subtle" color="red">
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="investments" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Investment Portfolio</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setInvestmentModalOpened(true)}
              >
                Add Investment
              </Button>
            </Group>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Investment Name</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Return Rate</Table.Th>
                  <Table.Th>Risk Level</Table.Th>
                  <Table.Th>Maturity</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {investments.map((investment) => (
                  <Table.Tr key={investment.id}>
                    <Table.Td>{investment.name}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{investment.type}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>
                        ${(investment.amount / 1000).toFixed(0)}K
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="green">{investment.return_rate}%</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          investment.risk_level === 'low'
                            ? 'green'
                            : investment.risk_level === 'medium'
                            ? 'yellow'
                            : 'red'
                        }
                        variant="light"
                      >
                        {investment.risk_level}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {investment.maturity_date || 'N/A'}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Edit">
                          <ActionIcon variant="subtle" color="blue">
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon variant="subtle" color="red">
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="debt" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Debt Instruments</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setDebtModalOpened(true)}
              >
                Add Debt Instrument
              </Button>
            </Group>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Principal</Table.Th>
                  <Table.Th>Interest Rate</Table.Th>
                  <Table.Th>Remaining Balance</Table.Th>
                  <Table.Th>Monthly Payment</Table.Th>
                  <Table.Th>Maturity</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {debtInstruments.map((debt) => (
                  <Table.Tr key={debt.id}>
                    <Table.Td>{debt.name}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{debt.type}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text>${(debt.principal / 1000).toFixed(0)}K</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text>{debt.interest_rate}%</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600} c="red">
                        ${(debt.remaining_balance / 1000).toFixed(0)}K
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {debt.monthly_payment > 0 ? (
                        <Text>${(debt.monthly_payment / 1000).toFixed(0)}K</Text>
                      ) : (
                        <Text c="dimmed">N/A</Text>
                      )}
                    </Table.Td>
                    <Table.Td>{debt.maturity_date}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Edit">
                          <ActionIcon variant="subtle" color="blue">
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon variant="subtle" color="red">
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="fx" pt="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Foreign Exchange Exposure</Title>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Currency</Table.Th>
                      <Table.Th>Amount</Table.Th>
                      <Table.Th>USD Equivalent</Table.Th>
                      <Table.Th>Exposure %</Table.Th>
                      <Table.Th>Hedge Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {fxExposures.map((fx, idx) => (
                      <Table.Tr key={idx}>
                        <Table.Td>
                          <Text fw={600}>{fx.currency}</Text>
                        </Table.Td>
                        <Table.Td>
                          {fx.currency === 'USD'
                            ? `$${(fx.amount / 1000).toFixed(0)}K`
                            : `${(fx.amount / 1000).toFixed(0)}K ${fx.currency}`}
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600}>
                            ${(fx.usd_equivalent / 1000).toFixed(0)}K
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text>{fx.exposure_pct}%</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              fx.hedge_status === 'hedged'
                                ? 'green'
                                : fx.hedge_status === 'partial'
                                ? 'yellow'
                                : 'red'
                            }
                            variant="light"
                          >
                            {fx.hedge_status}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">FX Risk Summary</Title>
                <Stack gap="md">
                  <Alert
                    icon={<IconInfoCircle size={16} />}
                    title="Hedging Recommendation"
                    color="blue"
                  >
                    <Text size="sm">
                      Consider hedging 50% of unhedged GBP exposure to reduce currency risk.
                    </Text>
                  </Alert>
                  <Paper p="md" withBorder>
                    <Text size="sm" c="dimmed" mb={4}>
                      Total FX Exposure
                    </Text>
                    <Text size="xl" fw={700}>
                      ${(fxExposures.reduce((sum, fx) => sum + fx.usd_equivalent, 0) / 1000).toFixed(0)}K
                    </Text>
                  </Paper>
                  <Paper p="md" withBorder>
                    <Text size="sm" c="dimmed" mb={4}>
                      Hedged Exposure
                    </Text>
                    <Text size="xl" fw={700} c="green">
                      {(
                        (fxExposures.filter((fx) => fx.hedge_status === 'hedged').reduce((sum, fx) => sum + fx.usd_equivalent, 0) /
                          fxExposures.reduce((sum, fx) => sum + fx.usd_equivalent, 0)) *
                        100
                      ).toFixed(1)}
                      %
                    </Text>
                  </Paper>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

