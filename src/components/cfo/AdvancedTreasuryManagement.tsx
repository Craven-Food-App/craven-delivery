import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Grid,
  Group,
  Stack,
  Card,
  Text,
  Title,
  Badge,
  Button,
  Table,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Textarea,
  Alert,
  Paper,
  Divider,
  Tabs,
  ActionIcon,
  Tooltip,
  Loader,
  Box,
  RingProgress,
  Center,
} from '@mantine/core';
import {
  IconBuildingBank,
  IconTrendingUp,
  IconTrendingDown,
  IconArrowsRightLeft,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconInfoCircle,
  IconPlus,
  IconEdit,
  IconRefresh,
  IconChartLine,
  IconCash,
  IconWallet,
} from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { MantineTable } from './MantineTable';
import { FuturisticChart } from './FuturisticChart';

interface BankAccount {
  id: string;
  name: string;
  institution: string;
  currency: string;
  current_balance: number;
  updated_at: string;
}

interface Reconciliation {
  id: string;
  period: string;
  type: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface CashFlowEntry {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
}

export const AdvancedTreasuryManagement: React.FC = () => {
  const toast = useToast();
  const toastRef = useRef(toast);
  const hasLoadedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
  const [activeTab, setActiveTab] = useState<string>('accounts');
  const [isMobile, setIsMobile] = useState(false);
  const [tablesMissing, setTablesMissing] = useState(false);
  
  // Keep toast ref updated
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  
  // Modals
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [reconciliationModalOpen, setReconciliationModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<BankAccount | null>(null);
  
  // Forms
  const accountForm = useForm({
    initialValues: {
      name: '',
      institution: '',
      currency: 'USD',
      current_balance: 0,
    },
    validate: {
      name: (value) => (!value ? 'Account name is required' : null),
      institution: (value) => (!value ? 'Institution is required' : null),
      current_balance: (value) => (value < 0 ? 'Balance cannot be negative' : null),
    },
  });

  const transferForm = useForm({
    initialValues: {
      from_account_id: '',
      to_account_id: '',
      amount: 0,
      description: '',
      transfer_date: new Date(),
    },
    validate: {
      from_account_id: (value) => (!value ? 'Source account is required' : null),
      to_account_id: (value) => (!value ? 'Destination account is required' : null),
      amount: (value) => (value <= 0 ? 'Amount must be greater than 0' : null),
      description: (value) => (!value ? 'Description is required' : null),
    },
  });

  const reconciliationForm = useForm({
    initialValues: {
      period: '',
      type: 'bank',
      notes: '',
    },
    validate: {
      period: (value) => (!value ? 'Period is required (YYYY-MM)' : null),
      type: (value) => (!value ? 'Type is required' : null),
    },
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      // @ts-ignore - bank_accounts table exists but not in generated types yet
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('name');
      
      if (error) {
        // Check if table is missing
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('schema cache')) {
          setAccounts([]);
          setTablesMissing(true);
          return;
        }
        throw error;
      }
      // Table exists (even if empty)
      setAccounts((data || []) as BankAccount[]);
      setTablesMissing(false);
    } catch (error: any) {
      // Silently handle missing table errors - do not log to console
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table') || error?.message?.includes('schema cache')) {
        setAccounts([]);
        setTablesMissing(true);
        return;
      }
      // Only log unexpected errors
      console.error('Error loading accounts:', error);
      toastRef.current.error('Failed to load bank accounts', 'Error');
    }
  }, []);

  const loadReconciliations = useCallback(async () => {
    try {
      // @ts-ignore - reconciliations table exists but not in generated types yet
      const { data, error } = await supabase
        .from('reconciliations')
        .select('*')
        .order('period', { ascending: false })
        .limit(20);
      
      if (error) {
        // Check if table is missing
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('schema cache')) {
          setReconciliations([]);
          setTablesMissing(true);
          return;
        }
        throw error;
      }
      // Table exists (even if empty)
      setReconciliations((data || []) as Reconciliation[]);
      setTablesMissing(false);
    } catch (error: any) {
      // Silently handle missing table errors - do not log to console
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table') || error?.message?.includes('schema cache')) {
        setReconciliations([]);
        setTablesMissing(true);
        return;
      }
      // Only log unexpected errors
      console.error('Error loading reconciliations:', error);
    }
  }, []);

  const loadCashFlow = useCallback(async () => {
    try {
      // Get invoices (outflows) and receivables (inflows)
      const [invoicesRes, receivablesRes] = await Promise.all([
        // @ts-ignore - invoices table exists but not in generated types yet
        supabase
          .from('invoices')
          .select('amount, invoice_date, status')
          .eq('status', 'paid')
          .gte('invoice_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        // @ts-ignore - receivables table exists but not in generated types yet
        supabase
          .from('receivables')
          .select('amount, issue_date, status')
          .eq('status', 'paid')
          .gte('issue_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      ]);

      // Handle missing tables gracefully - suppress console errors
      let hasMissingTable = false;
      if (invoicesRes.error && (invoicesRes.error.code === 'PGRST205' || invoicesRes.error.message?.includes('Could not find the table') || invoicesRes.error.message?.includes('schema cache'))) {
        invoicesRes.data = [];
        invoicesRes.error = null; // Clear error to prevent logging
        hasMissingTable = true;
      }
      if (receivablesRes.error && (receivablesRes.error.code === 'PGRST205' || receivablesRes.error.message?.includes('Could not find the table') || receivablesRes.error.message?.includes('schema cache'))) {
        receivablesRes.data = [];
        receivablesRes.error = null; // Clear error to prevent logging
        hasMissingTable = true;
      }
      
      if (hasMissingTable) {
        setTablesMissing(true);
      } else {
        setTablesMissing(false);
      }

      // Group by date
      const flowMap = new Map<string, { inflow: number; outflow: number }>();
      
      (receivablesRes.data || []).forEach((r: any) => {
        const date = r.issue_date;
        const existing = flowMap.get(date) || { inflow: 0, outflow: 0 };
        existing.inflow += Number(r.amount) || 0;
        flowMap.set(date, existing);
      });

      (invoicesRes.data || []).forEach((i: any) => {
        const date = i.invoice_date;
        const existing = flowMap.get(date) || { inflow: 0, outflow: 0 };
        existing.outflow += Number(i.amount) || 0;
        flowMap.set(date, existing);
      });

      const flowData: CashFlowEntry[] = Array.from(flowMap.entries())
        .map(([date, flow]) => ({
          date,
          inflow: flow.inflow,
          outflow: flow.outflow,
          net: flow.inflow - flow.outflow,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setCashFlow(flowData);
    } catch (error: any) {
      // Only log non-404 errors (missing tables are expected if migrations haven't run)
      if (error.code !== 'PGRST205' && !error.message?.includes('Could not find the table')) {
        console.error('Error loading cash flow:', error);
      } else {
        setCashFlow([]);
      }
    }
  }, []);

  useEffect(() => {
    // Only load data once on mount
    if (hasLoadedRef.current) return;
    
    hasLoadedRef.current = true;
    setLoading(true);
    Promise.all([loadAccounts(), loadReconciliations(), loadCashFlow()]).finally(() => {
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  const totalCash = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (Number(acc.current_balance) || 0), 0);
  }, [accounts]);

  const handleCreateAccount = async (values: typeof accountForm.values) => {
    setLoading(true);
    try {
      // @ts-ignore - bank_accounts table exists but not in generated types yet
      const { error } = await supabase.from('bank_accounts').insert({
        name: values.name,
        institution: values.institution,
        currency: values.currency,
        current_balance: values.current_balance,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success('Bank account created', 'Success');
      setAccountModalOpen(false);
      accountForm.reset();
      await loadAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async (accountId: string, newBalance: number) => {
    setLoading(true);
    try {
      // @ts-ignore - bank_accounts table exists but not in generated types yet
      const { error } = await supabase
        .from('bank_accounts')
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      if (error) throw error;
      toast.success('Balance updated', 'Success');
      await loadAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update balance', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (values: typeof transferForm.values) => {
    if (values.from_account_id === values.to_account_id) {
      toast.error('Source and destination accounts must be different', 'Error');
      return;
    }

    setLoading(true);
    try {
      const fromAccount = accounts.find(a => a.id === values.from_account_id);
      const toAccount = accounts.find(a => a.id === values.to_account_id);

      if (!fromAccount || !toAccount) {
        throw new Error('Account not found');
      }

      if (Number(fromAccount.current_balance) < values.amount) {
        toast.error('Insufficient funds in source account', 'Error');
        setLoading(false);
        return;
      }

      // Update both accounts
      // @ts-ignore - bank_accounts table exists but not in generated types yet
      const { error: error1 } = await supabase
        .from('bank_accounts')
        .update({
          current_balance: Number(fromAccount.current_balance) - values.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', values.from_account_id);

      if (error1) throw error1;

      // @ts-ignore - bank_accounts table exists but not in generated types yet
      const { error: error2 } = await supabase
        .from('bank_accounts')
        .update({
          current_balance: Number(toAccount.current_balance) + values.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', values.to_account_id);

      if (error2) throw error2;

      toast.success('Transfer completed', 'Success');
      setTransferModalOpen(false);
      transferForm.reset();
      await loadAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process transfer', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReconciliation = async (values: typeof reconciliationForm.values) => {
    setLoading(true);
    try {
      // @ts-ignore - reconciliations table exists but not in generated types yet
      const { error } = await supabase.from('reconciliations').insert({
        period: values.period,
        type: values.type,
        status: 'open',
        notes: values.notes || null,
      });

      if (error) throw error;
      toast.success('Reconciliation created', 'Success');
      setReconciliationModalOpen(false);
      reconciliationForm.reset();
      await loadReconciliations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create reconciliation', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (account: BankAccount) => {
    setEditAccount(account);
    accountForm.setValues({
      name: account.name,
      institution: account.institution,
      currency: account.currency,
      current_balance: Number(account.current_balance),
    });
    setAccountModalOpen(true);
  };

  const handleUpdateAccount = async (values: typeof accountForm.values) => {
    if (!editAccount) return;

    setLoading(true);
    try {
      // @ts-ignore - bank_accounts table exists but not in generated types yet
      const { error } = await supabase
        .from('bank_accounts')
        .update({
          name: values.name,
          institution: values.institution,
          currency: values.currency,
          current_balance: values.current_balance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editAccount.id);

      if (error) throw error;
      toast.success('Account updated', 'Success');
      setAccountModalOpen(false);
      setEditAccount(null);
      accountForm.reset();
      await loadAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update account', 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && accounts.length === 0) {
    return (
      <Center p={40}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Loading treasury data...</Text>
        </Stack>
      </Center>
    );
  }


  return (
    <Stack gap="lg" p={isMobile ? 16 : 24}>
      {/* Header */}
      <Group justify="space-between" wrap="wrap">
        <Box>
          <Title order={2}>Advanced Treasury Management</Title>
          <Text c="dimmed" size="sm">
            Comprehensive cash management, bank account oversight, and reconciliation
          </Text>
        </Box>
        <Group gap="xs">
          <ActionIcon variant="light" onClick={() => {
            setLoading(true);
            Promise.all([loadAccounts(), loadReconciliations(), loadCashFlow()]).finally(() => {
              setLoading(false);
            });
          }}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Migration Notice */}
      {tablesMissing && (
        <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Database Setup Required">
          <Text size="sm" mb="xs">
            The treasury management tables need to be created. Please run the migration:
          </Text>
          <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
            supabase/migrations/20250120000000_add_bank_accounts_update_policy.sql
          </Text>
          <Text size="xs" c="dimmed" mt="xs">
            This will create the bank_accounts, reconciliations, receivables, and invoices tables.
          </Text>
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={600}>Total Cash</Text>
              <IconCash size={20} color="#10b981" />
            </Group>
            <Text size="xl" fw={700} c="green">
              ${totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={600}>Bank Accounts</Text>
              <IconBuildingBank size={20} color="#3b82f6" />
            </Group>
            <Text size="xl" fw={700}>
              {accounts.length}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Active accounts
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={600}>Open Reconciliations</Text>
              <IconCheck size={20} color="#f59e0b" />
            </Group>
            <Text size="xl" fw={700}>
              {reconciliations.filter(r => r.status === 'open').length}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Pending reconciliation
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={600}>Net Cash Flow</Text>
              <IconChartLine size={20} color="#8b5cf6" />
            </Group>
            <Text size="xl" fw={700} c={cashFlow.length > 0 && cashFlow[cashFlow.length - 1]?.net < 0 ? 'red' : 'green'}>
              {cashFlow.length > 0
                ? `$${cashFlow[cashFlow.length - 1].net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '$0.00'}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Last 90 days
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onChange={(val) => val && setActiveTab(val)}>
        <Tabs.List>
          <Tabs.Tab value="accounts">Bank Accounts</Tabs.Tab>
          <Tabs.Tab value="cashflow">Cash Flow</Tabs.Tab>
          <Tabs.Tab value="reconciliations">Reconciliations</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="accounts" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={4}>Bank Account Management</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  setEditAccount(null);
                  accountForm.reset();
                  setAccountModalOpen(true);
                }}
              >
                Add Account
              </Button>
            </Group>

            {accounts.length === 0 ? (
              <Alert icon={<IconInfoCircle size={16} />} title="No accounts">
                Create your first bank account to start managing treasury operations.
              </Alert>
            ) : (
              <Box style={{ overflow: 'auto' }}>
                <MantineTable
                  data={accounts}
                  loading={loading}
                  size={isMobile ? 'small' : 'default'}
                  scroll={{ x: isMobile ? 800 : 'auto' }}
                  pagination={{ pageSize: isMobile ? 5 : 10 }}
                  columns={[
                    {
                      title: 'Account Name',
                      dataIndex: 'name',
                      render: (value: string, record: BankAccount) => (
                        <Group gap="xs">
                          <IconBuildingBank size={16} />
                          <Text fw={500}>{value}</Text>
                        </Group>
                      ),
                    },
                    {
                      title: 'Institution',
                      dataIndex: 'institution',
                    },
                    {
                      title: 'Currency',
                      dataIndex: 'currency',
                      width: 100,
                    },
                    {
                      title: 'Balance',
                      dataIndex: 'current_balance',
                      render: (value: number) => (
                        <Text fw={600}>
                          ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      ),
                    },
                    {
                      title: 'Last Updated',
                      dataIndex: 'updated_at',
                      render: (value: string) => new Date(value).toLocaleDateString(),
                      width: 150,
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      width: 200,
                      render: (_: any, record: BankAccount) => (
                        <Group gap="xs">
                          <Tooltip label="Edit account">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => openEditModal(record)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Update balance">
                            <ActionIcon
                              variant="light"
                              color="green"
                              onClick={() => {
                                const newBalance = prompt('Enter new balance:', String(record.current_balance));
                                if (newBalance !== null) {
                                  const num = parseFloat(newBalance);
                                  if (!isNaN(num) && num >= 0) {
                                    handleUpdateBalance(record.id, num);
                                  } else {
                                    toast.error('Invalid balance amount', 'Error');
                                  }
                                }
                              }}
                            >
                              <IconRefresh size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      ),
                    },
                  ]}
                />
              </Box>
            )}

            {accounts.length > 1 && (
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={5}>Inter-Account Transfer</Title>
                  <Button
                    leftSection={<IconArrowsRightLeft size={16} />}
                    onClick={() => {
                      transferForm.reset();
                      setTransferModalOpen(true);
                    }}
                  >
                    Initiate Transfer
                  </Button>
                </Group>
                <Text size="sm" c="dimmed">
                  Transfer funds between bank accounts with full audit trail
                </Text>
              </Card>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="cashflow" pt="md">
          <Stack gap="md">
            <Title order={4}>Cash Flow Analysis</Title>
            {cashFlow.length > 0 ? (
              <>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <FuturisticChart
                    data={cashFlow.map(cf => ({
                      date: new Date(cf.date).toLocaleDateString('default', { month: 'short', day: 'numeric' }),
                      Inflow: cf.inflow,
                      Outflow: cf.outflow,
                      Net: cf.net,
                    }))}
                    type="composed"
                    title="90-Day Cash Flow Trend"
                    height={400}
                    colors={['#10b981', '#ef4444', '#3b82f6']}
                    dataKeys={{ revenue: 'Inflow', expenses: 'Outflow', profit: 'Net' }}
                  />
                </Card>
                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                      <Text fw={600} mb="md">Recent Cash Inflows</Text>
                      <Stack gap="xs">
                        {cashFlow
                          .filter(cf => cf.inflow > 0)
                          .slice(-5)
                          .reverse()
                          .map((cf, idx) => (
                            <Group key={idx} justify="space-between">
                              <Text size="sm">{new Date(cf.date).toLocaleDateString()}</Text>
                              <Text size="sm" fw={600} c="green">
                                +${cf.inflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Text>
                            </Group>
                          ))}
                      </Stack>
                    </Card>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                      <Text fw={600} mb="md">Recent Cash Outflows</Text>
                      <Stack gap="xs">
                        {cashFlow
                          .filter(cf => cf.outflow > 0)
                          .slice(-5)
                          .reverse()
                          .map((cf, idx) => (
                            <Group key={idx} justify="space-between">
                              <Text size="sm">{new Date(cf.date).toLocaleDateString()}</Text>
                              <Text size="sm" fw={600} c="red">
                                -${cf.outflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Text>
                            </Group>
                          ))}
                      </Stack>
                    </Card>
                  </Grid.Col>
                </Grid>
              </>
            ) : (
              <Alert icon={<IconInfoCircle size={16} />} title="No cash flow data">
                Cash flow data will appear here once invoices and receivables are processed.
              </Alert>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="reconciliations" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={4}>Reconciliation Management</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  reconciliationForm.reset();
                  reconciliationForm.setFieldValue('period', new Date().toISOString().slice(0, 7));
                  setReconciliationModalOpen(true);
                }}
              >
                New Reconciliation
              </Button>
            </Group>

            {reconciliations.length === 0 ? (
              <Alert icon={<IconInfoCircle size={16} />} title="No reconciliations">
                Create a reconciliation to track period-end closing activities.
              </Alert>
            ) : (
              <Box style={{ overflow: 'auto' }}>
                <MantineTable
                  data={reconciliations}
                  loading={loading}
                  size={isMobile ? 'small' : 'default'}
                  scroll={{ x: isMobile ? 800 : 'auto' }}
                  pagination={{ pageSize: isMobile ? 5 : 10 }}
                  columns={[
                    {
                      title: 'Period',
                      dataIndex: 'period',
                      render: (value: string) => {
                        const [year, month] = value.split('-');
                        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' });
                      },
                    },
                    {
                      title: 'Type',
                      dataIndex: 'type',
                      render: (value: string) => (
                        <Badge variant="light" color="blue">
                          {value.toUpperCase()}
                        </Badge>
                      ),
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      render: (value: string) => (
                        <Badge
                          color={value === 'tied' ? 'green' : value === 'exception' ? 'red' : 'yellow'}
                          variant="light"
                        >
                          {value.toUpperCase()}
                        </Badge>
                      ),
                    },
                    {
                      title: 'Created',
                      dataIndex: 'created_at',
                      render: (value: string) => new Date(value).toLocaleDateString(),
                      width: 150,
                    },
                    {
                      title: 'Notes',
                      dataIndex: 'notes',
                      render: (value: string | null) => value || '-',
                    },
                  ]}
                />
              </Box>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Create/Edit Account Modal */}
      <Modal
        title={editAccount ? 'Edit Bank Account' : 'Add Bank Account'}
        opened={accountModalOpen}
        onClose={() => {
          setAccountModalOpen(false);
          setEditAccount(null);
          accountForm.reset();
        }}
        size={isMobile ? '90%' : 600}
      >
        <form onSubmit={accountForm.onSubmit(editAccount ? handleUpdateAccount : handleCreateAccount)}>
          <Stack gap="md">
            <TextInput
              label="Account Name"
              placeholder="e.g., Operating Account"
              required
              {...accountForm.getInputProps('name')}
            />
            <TextInput
              label="Institution"
              placeholder="e.g., Chase Bank"
              required
              {...accountForm.getInputProps('institution')}
            />
            <Select
              label="Currency"
              data={['USD', 'EUR', 'GBP', 'CAD', 'AUD']}
              {...accountForm.getInputProps('currency')}
            />
            <NumberInput
              label="Current Balance"
              placeholder="0.00"
              required
              min={0}
              step={100}
              decimalScale={2}
              fixedDecimalScale
              {...accountForm.getInputProps('current_balance')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setAccountModalOpen(false);
                  setEditAccount(null);
                  accountForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                {editAccount ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        title="Inter-Account Transfer"
        opened={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          transferForm.reset();
        }}
        size={isMobile ? '90%' : 600}
      >
        <form onSubmit={transferForm.onSubmit(handleTransfer)}>
          <Stack gap="md">
            <Select
              label="From Account"
              placeholder="Select source account"
              required
              data={accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.institution}) - $${Number(acc.current_balance).toLocaleString()}` }))}
              {...transferForm.getInputProps('from_account_id')}
            />
            <Select
              label="To Account"
              placeholder="Select destination account"
              required
              data={accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.institution}) - $${Number(acc.current_balance).toLocaleString()}` }))}
              {...transferForm.getInputProps('to_account_id')}
            />
            <NumberInput
              label="Transfer Amount"
              placeholder="0.00"
              required
              min={0.01}
              step={100}
              decimalScale={2}
              fixedDecimalScale
              {...transferForm.getInputProps('amount')}
            />
            <TextInput
              label="Description"
              placeholder="e.g., Operating cash transfer"
              required
              {...transferForm.getInputProps('description')}
            />
            <DatePickerInput
              label="Transfer Date"
              value={transferForm.values.transfer_date}
              onChange={(date) => {
                if (date) {
                  transferForm.setFieldValue('transfer_date', date as any);
                }
              }}
            />
            <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Note">
              This transfer will immediately update both account balances. Ensure sufficient funds are available.
            </Alert>
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setTransferModalOpen(false);
                  transferForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Process Transfer
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Reconciliation Modal */}
      <Modal
        title="New Reconciliation"
        opened={reconciliationModalOpen}
        onClose={() => {
          setReconciliationModalOpen(false);
          reconciliationForm.reset();
        }}
        size={isMobile ? '90%' : 600}
      >
        <form onSubmit={reconciliationForm.onSubmit(handleCreateReconciliation)}>
          <Stack gap="md">
            <TextInput
              label="Period (YYYY-MM)"
              placeholder="2024-01"
              required
              {...reconciliationForm.getInputProps('period')}
            />
            <Select
              label="Reconciliation Type"
              required
              data={[
                { value: 'bank', label: 'Bank Reconciliation' },
                { value: 'ar', label: 'Accounts Receivable' },
                { value: 'ap', label: 'Accounts Payable' },
                { value: 'deferred_rev', label: 'Deferred Revenue' },
              ]}
              {...reconciliationForm.getInputProps('type')}
            />
            <Textarea
              label="Notes"
              placeholder="Additional notes or observations"
              rows={4}
              {...reconciliationForm.getInputProps('notes')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setReconciliationModalOpen(false);
                  reconciliationForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create Reconciliation
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};
