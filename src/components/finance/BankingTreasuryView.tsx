import React, { useState, useEffect, useCallback } from 'react';
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
  Select,
  Table,
  Tabs,
  Alert,
  Box,
  Paper,
  Progress,
  Tooltip,
  ActionIcon,
  Divider,
  Timeline,
  RingProgress,
  SegmentedControl,
  Textarea,
  Switch,
  Loader,
  NumberInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconBuildingBank,
  IconPlus,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconDownload,
  IconUpload,
  IconCheck,
  IconX,
  IconClock,
  IconTrendingUp,
  IconTrendingDown,
  IconInfoCircle,
  IconAlertTriangle,
  IconCreditCard,
  IconTransfer,
  IconFileText,
  IconChartLine,
  IconCurrencyDollar,
  IconSettings,
  IconEye,
  IconCopy,
  IconCalendar,
  IconWorld,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { message } from 'antd';
import { useForm } from '@mantine/form';
import dayjs from 'dayjs';
import { hasFullAccess } from '@/utils/torranceAccess';

interface BankAccount {
  id: string;
  name: string;
  institution: string | null;
  currency: string;
  current_balance: number;
  available_balance: number;
  pending_balance: number;
  ledger_balance: number;
  account_type: string | null;
  account_classification: string | null;
  account_number_masked: string | null;
  routing_number: string | null;
  status: string;
  last_reconciled_at: string | null;
  last_reconciled_balance: number | null;
}

interface BankingTransaction {
  id: string;
  transaction_number: string;
  bank_account_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  transaction_date: string;
  description: string;
  status: string;
  reconciled: boolean;
}

interface WireTransfer {
  id: string;
  wire_number: string;
  bank_account_id: string;
  transfer_type: string;
  direction: string;
  amount: number;
  currency: string;
  beneficiary_name: string;
  status: string;
  requested_date: string;
  executed_date: string | null;
}

interface ACHTransfer {
  id: string;
  ach_number: string;
  bank_account_id: string;
  ach_type: string;
  amount: number;
  receiver_name: string;
  effective_date: string;
  status: string;
}

interface Reconciliation {
  id: string;
  reconciliation_number: string;
  bank_account_id: string;
  reconciliation_date: string;
  statement_ending_balance: number;
  ledger_ending_balance: number;
  difference: number;
  status: string;
}

interface CashForecast {
  id: string;
  forecast_number: string;
  forecast_date: string;
  forecast_start_date: string;
  forecast_end_date: string;
  opening_cash_balance: number;
  projected_inflows: number;
  projected_outflows: number;
  projected_ending_balance: number;
  status: string;
}

export const BankingTreasuryView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Data state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankingTransaction[]>([]);
  const [wireTransfers, setWireTransfers] = useState<WireTransfer[]>([]);
  const [achTransfers, setACHTransfers] = useState<ACHTransfer[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [cashForecasts, setCashForecasts] = useState<CashForecast[]>([]);

  // Modal states
  const [accountModalOpened, setAccountModalOpened] = useState(false);
  const [transactionModalOpened, setTransactionModalOpened] = useState(false);
  const [wireModalOpened, setWireModalOpened] = useState(false);
  const [achModalOpened, setACHModalOpened] = useState(false);
  const [reconciliationModalOpened, setReconciliationModalOpened] = useState(false);
  const [forecastModalOpened, setForecastModalOpened] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [canManage, setCanManage] = useState(false);

  // Forms
  const accountForm = useForm({
    initialValues: {
      name: '',
      institution: '',
      currency: 'USD',
      account_type: 'checking',
      account_classification: 'operating',
      account_number_masked: '',
      routing_number: '',
      swift_code: '',
      iban: '',
      daily_limit: '',
      transaction_limit: '',
      status: 'active',
    },
  });

  const transactionForm = useForm({
    initialValues: {
      bank_account_id: '',
      transaction_type: 'deposit',
      amount: 0,
      currency: 'USD',
      transaction_date: new Date(),
      description: '',
      reference_number: '',
      counterparty_name: '',
    },
  });

  const wireForm = useForm({
    initialValues: {
      bank_account_id: '',
      transfer_type: 'domestic',
      direction: 'outgoing',
      amount: 0,
      currency: 'USD',
      beneficiary_name: '',
      beneficiary_account: '',
      beneficiary_bank_name: '',
      beneficiary_bank_routing: '',
      beneficiary_bank_swift: '',
      payment_instructions: '',
      requested_date: new Date(),
    },
  });

  const achForm = useForm({
    initialValues: {
      bank_account_id: '',
      ach_type: 'credit',
      amount: 0,
      receiver_name: '',
      receiver_account: '',
      receiver_account_type: 'checking',
      receiver_routing: '',
      effective_date: new Date(),
      company_name: '',
    },
  });

  const reconciliationForm = useForm({
    initialValues: {
      bank_account_id: '',
      reconciliation_date: new Date(),
      statement_start_date: new Date(),
      statement_end_date: new Date(),
      statement_ending_balance: 0,
      ledger_ending_balance: 0,
    },
  });

  const forecastForm = useForm({
    initialValues: {
      forecast_date: new Date(),
      forecast_start_date: new Date(),
      forecast_end_date: new Date(),
      forecast_type: 'monthly',
      opening_cash_balance: 0,
      projected_inflows: 0,
      projected_outflows: 0,
    },
  });

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Use Promise.allSettled to handle individual failures gracefully
      await Promise.allSettled([
        fetchBankAccounts(),
        fetchTransactions(),
        fetchWireTransfers(),
        fetchACHTransfers(),
        fetchReconciliations(),
        fetchCashForecasts(),
      ]);
    } catch (error: any) {
      console.error('Error fetching banking data:', error);
      // Only show error if it's not a table not found error
      if (!error?.message?.includes('Could not find the table') && 
          !error?.message?.includes('schema cache') &&
          error?.code !== 'PGRST116' &&
          error?.code !== '42P01') {
        message.error(error?.message || 'Failed to load Banking & Treasury data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCanManage(false);
        return;
      }

      const userEmail = user.email?.toLowerCase();
      
      // TORRANCE STROMAN: UNIVERSAL ACCESS - CHECK FIRST
      if (hasFullAccess(userEmail)) {
        setCanManage(true);
        return;
      }

      // Check if user is CFO
      const { data: execUser } = await supabase
        .from('exec_users')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'cfo')
        .maybeSingle();

      if (execUser) {
        setCanManage(true);
        return;
      }

      // Check finance employees with can_view_all_financials
      const { data: financeEmployee } = await supabase
        .from('finance_employees')
        .select('can_view_all_financials')
        .eq('employee_id', user.id)
        .maybeSingle();

      if (financeEmployee?.can_view_all_financials) {
        setCanManage(true);
        return;
      }

      setCanManage(false);
    } catch (error) {
      console.error('Error checking access:', error);
      setCanManage(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('name', { ascending: true });

      if (error && error.code !== 'PGRST116') throw error;
      setBankAccounts((data || []) as any);
    } catch (error: any) {
      console.error('Error fetching bank accounts:', error);
      if (error.code !== 'PGRST116') throw error;
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('banking_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(100);

      if (error) {
        // Handle table not found errors gracefully
        if (error.code === 'PGRST116' || 
            error.message?.includes('Could not find the table') ||
            error.message?.includes('schema cache') ||
            error.code === '42P01') {
          console.warn('banking_transactions table not found, proceeding with empty data');
          setTransactions([]);
          return;
        }
        throw error;
      }
      setTransactions((data || []) as any);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      // If it's a table not found error, just set empty array
      if (error.code === 'PGRST116' || 
          error.message?.includes('Could not find the table') ||
          error.message?.includes('schema cache') ||
          error.code === '42P01') {
        setTransactions([]);
        return;
      }
      throw error;
    }
  };

  const fetchWireTransfers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('wire_transfers')
        .select('*')
        .order('requested_date', { ascending: false })
        .limit(50);

      if (error) {
        // Handle table not found errors gracefully
        if (error.code === 'PGRST116' || 
            error.message?.includes('Could not find the table') ||
            error.message?.includes('schema cache') ||
            error.code === '42P01') {
          console.warn('wire_transfers table not found, proceeding with empty data');
          setWireTransfers([]);
          return;
        }
        throw error;
      }
      setWireTransfers((data || []) as any);
    } catch (error: any) {
      console.error('Error fetching wire transfers:', error);
      // If it's a table not found error, just set empty array
      if (error.code === 'PGRST116' || 
          error.message?.includes('Could not find the table') ||
          error.message?.includes('schema cache') ||
          error.code === '42P01') {
        setWireTransfers([]);
        return;
      }
      throw error;
    }
  };

  const fetchACHTransfers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('ach_transfers')
        .select('*')
        .order('effective_date', { ascending: false })
        .limit(50);

      if (error) {
        // Handle table not found errors gracefully
        if (error.code === 'PGRST116' || 
            error.message?.includes('Could not find the table') ||
            error.message?.includes('schema cache') ||
            error.code === '42P01') {
          console.warn('ach_transfers table not found, proceeding with empty data');
          setACHTransfers([]);
          return;
        }
        throw error;
      }
      setACHTransfers((data || []) as any);
    } catch (error: any) {
      console.error('Error fetching ACH transfers:', error);
      // If it's a table not found error, just set empty array
      if (error.code === 'PGRST116' || 
          error.message?.includes('Could not find the table') ||
          error.message?.includes('schema cache') ||
          error.code === '42P01') {
        setACHTransfers([]);
        return;
      }
      throw error;
    }
  };

  const fetchReconciliations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('banking_reconciliations')
        .select('*')
        .order('reconciliation_date', { ascending: false })
        .limit(50);

      if (error) {
        // Handle table not found errors gracefully
        if (error.code === 'PGRST116' || 
            error.message?.includes('Could not find the table') ||
            error.message?.includes('schema cache') ||
            error.code === '42P01') {
          console.warn('banking_reconciliations table not found, proceeding with empty data');
          setReconciliations([]);
          return;
        }
        throw error;
      }
      setReconciliations((data || []) as any);
    } catch (error: any) {
      console.error('Error fetching reconciliations:', error);
      // If it's a table not found error, just set empty array
      if (error.code === 'PGRST116' || 
          error.message?.includes('Could not find the table') ||
          error.message?.includes('schema cache') ||
          error.code === '42P01') {
        setReconciliations([]);
        return;
      }
      throw error;
    }
  };

  const fetchCashForecasts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('cash_forecasts')
        .select('*')
        .order('forecast_date', { ascending: false })
        .limit(20);

      if (error) {
        // Handle table not found errors gracefully
        if (error.code === 'PGRST116' || 
            error.message?.includes('Could not find the table') ||
            error.message?.includes('schema cache') ||
            error.code === '42P01') {
          console.warn('cash_forecasts table not found, proceeding with empty data');
          setCashForecasts([]);
          return;
        }
        throw error;
      }
      setCashForecasts((data || []) as any);
    } catch (error: any) {
      console.error('Error fetching cash forecasts:', error);
      // If it's a table not found error, just set empty array
      if (error.code === 'PGRST116' || 
          error.message?.includes('Could not find the table') ||
          error.message?.includes('schema cache') ||
          error.code === '42P01') {
        setCashForecasts([]);
        return;
      }
      throw error;
    }
  };

  // Create/Update Bank Account
  const handleCreateOrUpdateAccount = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to manage bank accounts');
        return;
      }

      const accountData = {
        name: values.name,
        institution: values.institution,
        currency: values.currency,
        account_type: values.account_type,
        account_classification: values.account_classification,
        account_number_masked: values.account_number_masked,
        routing_number: values.routing_number,
        swift_code: values.swift_code || null,
        iban: values.iban || null,
        daily_limit: values.daily_limit ? parseFloat(values.daily_limit) : null,
        transaction_limit: values.transaction_limit ? parseFloat(values.transaction_limit) : null,
        status: values.status,
        current_balance: 0,
        available_balance: 0,
        pending_balance: 0,
        ledger_balance: 0,
        updated_at: new Date().toISOString(),
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('bank_accounts')
          .update(accountData)
          .eq('id', editingAccount.id);

        if (error) throw error;
        message.success('Bank account updated successfully');
      } else {
        const { error } = await supabase
          .from('bank_accounts')
          .insert(accountData);

        if (error) throw error;
        message.success('Bank account created successfully');
      }

      setAccountModalOpened(false);
      setEditingAccount(null);
      accountForm.reset();
      fetchBankAccounts();
    } catch (error: any) {
      console.error('Error saving bank account:', error);
      message.error(error?.message || 'Failed to save bank account');
    }
  };

  // Create Transaction
  const handleCreateTransaction = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to create transactions');
        return;
      }

      const { error } = await (supabase as any)
        .from('banking_transactions')
        .insert({
          bank_account_id: values.bank_account_id,
          transaction_type: values.transaction_type,
          amount: values.amount,
          currency: values.currency,
          transaction_date: dayjs(values.transaction_date).format('YYYY-MM-DD'),
          description: values.description,
          reference_number: values.reference_number || null,
          counterparty_name: values.counterparty_name || null,
          status: 'pending',
          created_by: user.id,
        });

      if (error) throw error;
      message.success('Transaction created successfully');
      setTransactionModalOpened(false);
      transactionForm.reset();
      fetchTransactions();
      fetchBankAccounts();
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      message.error(error?.message || 'Failed to create transaction');
    }
  };

  // Create Wire Transfer
  const handleCreateWireTransfer = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to create wire transfers');
        return;
      }

      const { error } = await (supabase as any)
        .from('wire_transfers')
        .insert({
          bank_account_id: values.bank_account_id,
          transfer_type: values.transfer_type,
          direction: values.direction,
          amount: values.amount,
          currency: values.currency,
          beneficiary_name: values.beneficiary_name,
          beneficiary_account: values.beneficiary_account,
          beneficiary_bank_name: values.beneficiary_bank_name,
          beneficiary_bank_routing: values.beneficiary_bank_routing || null,
          beneficiary_bank_swift: values.beneficiary_bank_swift || null,
          payment_instructions: values.payment_instructions || null,
          requested_date: dayjs(values.requested_date).format('YYYY-MM-DD'),
          status: 'draft',
          requires_approval: true,
          created_by: user.id,
        });

      if (error) throw error;
      message.success('Wire transfer created successfully');
      setWireModalOpened(false);
      wireForm.reset();
      fetchWireTransfers();
    } catch (error: any) {
      console.error('Error creating wire transfer:', error);
      message.error(error?.message || 'Failed to create wire transfer');
    }
  };

  // Create ACH Transfer
  const handleCreateACHTransfer = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to create ACH transfers');
        return;
      }

      const { error } = await (supabase as any)
        .from('ach_transfers')
        .insert({
          bank_account_id: values.bank_account_id,
          ach_type: values.ach_type,
          amount: values.amount,
          receiver_name: values.receiver_name,
          receiver_account: values.receiver_account,
          receiver_account_type: values.receiver_account_type,
          receiver_routing: values.receiver_routing,
          company_name: values.company_name || 'Crave\'n, Inc.',
          effective_date: dayjs(values.effective_date).format('YYYY-MM-DD'),
          status: 'draft',
          requires_approval: true,
          created_by: user.id,
        });

      if (error) throw error;
      message.success('ACH transfer created successfully');
      setACHModalOpened(false);
      achForm.reset();
      fetchACHTransfers();
    } catch (error: any) {
      console.error('Error creating ACH transfer:', error);
      message.error(error?.message || 'Failed to create ACH transfer');
    }
  };

  // Create Reconciliation
  const handleCreateReconciliation = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to create reconciliations');
        return;
      }

      const difference = values.statement_ending_balance - values.ledger_ending_balance;

      const { error } = await (supabase as any)
        .from('banking_reconciliations')
        .insert({
          bank_account_id: values.bank_account_id,
          reconciliation_date: dayjs(values.reconciliation_date).format('YYYY-MM-DD'),
          statement_start_date: dayjs(values.statement_start_date).format('YYYY-MM-DD'),
          statement_end_date: dayjs(values.statement_end_date).format('YYYY-MM-DD'),
          statement_ending_balance: values.statement_ending_balance,
          ledger_ending_balance: values.ledger_ending_balance,
          difference: difference,
          status: difference === 0 ? 'reconciled' : 'discrepancy',
          created_by: user.id,
        });

      if (error) throw error;
      message.success('Reconciliation created successfully');
      setReconciliationModalOpened(false);
      reconciliationForm.reset();
      fetchReconciliations();
    } catch (error: any) {
      console.error('Error creating reconciliation:', error);
      message.error(error?.message || 'Failed to create reconciliation');
    }
  };

  // Create Cash Forecast
  const handleCreateCashForecast = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to create cash forecasts');
        return;
      }

      const { error } = await (supabase as any)
        .from('cash_forecasts')
        .insert({
          forecast_date: dayjs(values.forecast_date).format('YYYY-MM-DD'),
          forecast_start_date: dayjs(values.forecast_start_date).format('YYYY-MM-DD'),
          forecast_end_date: dayjs(values.forecast_end_date).format('YYYY-MM-DD'),
          forecast_type: values.forecast_type,
          opening_cash_balance: values.opening_cash_balance,
          projected_inflows: values.projected_inflows,
          projected_outflows: values.projected_outflows,
          status: 'draft',
          created_by: user.id,
        });

      if (error) throw error;
      message.success('Cash forecast created successfully');
      setForecastModalOpened(false);
      forecastForm.reset();
      fetchCashForecasts();
    } catch (error: any) {
      console.error('Error creating cash forecast:', error);
      message.error(error?.message || 'Failed to create cash forecast');
    }
  };

  // Approve Wire Transfer
  const handleApproveWire = async (wireId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to approve wire transfers');
        return;
      }

      const { error } = await (supabase as any)
        .from('wire_transfers')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', wireId);

      if (error) throw error;
      message.success('Wire transfer approved');
      fetchWireTransfers();
    } catch (error: any) {
      message.error(error?.message || 'Failed to approve wire transfer');
    }
  };

  // Execute Wire Transfer
  const handleExecuteWire = async (wireId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to execute wire transfers');
        return;
      }

      const { error } = await (supabase as any)
        .from('wire_transfers')
        .update({
          status: 'completed',
          executed_by: user.id,
          executed_at: new Date().toISOString(),
          executed_date: dayjs().format('YYYY-MM-DD'),
        })
        .eq('id', wireId);

      if (error) throw error;
      message.success('Wire transfer executed');
      fetchWireTransfers();
      fetchBankAccounts();
    } catch (error: any) {
      message.error(error?.message || 'Failed to execute wire transfer');
    }
  };

  // Calculate metrics
  const totalCash = bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  const totalAvailable = bankAccounts.reduce((sum, acc) => sum + (acc.available_balance || 0), 0);
  const totalPending = bankAccounts.reduce((sum, acc) => sum + (acc.pending_balance || 0), 0);
  const pendingWires = wireTransfers.filter(w => w.status === 'pending_approval' || w.status === 'approved').length;
  const pendingACH = achTransfers.filter(a => a.status === 'pending_approval' || a.status === 'approved').length;
  const unreconciledAccounts = bankAccounts.filter(acc => !acc.last_reconciled_at || dayjs().diff(dayjs(acc.last_reconciled_at), 'days') > 30).length;

  // Auto-refresh
  useEffect(() => {
    fetchAllData();
    checkAccess();
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [fetchAllData]);

  if (loading) {
    return (
      <Stack align="center" justify="center" style={{ minHeight: '400px' }}>
        <Loader size="xl" />
        <Text>Loading Banking & Treasury data...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <Box>
          <Title order={2}>Banking & Treasury</Title>
          <Text c="dimmed" size="sm">
            Enterprise-grade cash management, multi-bank operations, and treasury management
          </Text>
        </Box>
        <Group>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setEditingAccount(null);
              accountForm.reset();
              setAccountModalOpened(true);
            }}
            disabled={!canManage}
          >
            New Bank Account
          </Button>
          <Badge size="lg" color="teal" variant="light" leftSection={<IconBuildingBank size={16} />}>
            Treasury
          </Badge>
        </Group>
      </Group>

      {/* Access Notice */}
      {!canManage && (
        <Alert color="blue" title="View-Only Mode">
          You are viewing Banking & Treasury in read-only mode. To manage accounts, process transfers, or create forecasts, you need Finance Department access (CFO or Finance Employee with permissions).
        </Alert>
      )}

      {/* Key Metrics */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Total Cash</Text>
              <IconCurrencyDollar size={20} color="#10b981" />
            </Group>
            <Text size="xl" fw={700} c="teal">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCash)}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Across {bankAccounts.length} accounts
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Available Balance</Text>
              <IconCheck size={20} color="#1890ff" />
            </Group>
            <Text size="xl" fw={700} c="blue">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAvailable)}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Immediately available
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Pending Transfers</Text>
              <IconClock size={20} color="#f59e0b" />
            </Group>
            <Text size="xl" fw={700} c="yellow">
              {pendingWires + pendingACH}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {pendingWires} wires, {pendingACH} ACH
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Unreconciled</Text>
              <IconAlertTriangle size={20} color="#ef4444" />
            </Group>
            <Text size="xl" fw={700} c="red">
              {unreconciledAccounts}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Accounts need reconciliation
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'overview')}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconBuildingBank size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="accounts" leftSection={<IconBuildingBank size={16} />}>
            Bank Accounts ({bankAccounts.length})
          </Tabs.Tab>
          <Tabs.Tab value="transactions" leftSection={<IconFileText size={16} />}>
            Transactions ({transactions.length})
          </Tabs.Tab>
          <Tabs.Tab value="wires" leftSection={<IconTransfer size={16} />}>
            Wire Transfers ({wireTransfers.length})
          </Tabs.Tab>
          <Tabs.Tab value="ach" leftSection={<IconCreditCard size={16} />}>
            ACH Transfers ({achTransfers.length})
          </Tabs.Tab>
          <Tabs.Tab value="reconciliation" leftSection={<IconCheck size={16} />}>
            Reconciliation ({reconciliations.length})
          </Tabs.Tab>
          <Tabs.Tab value="forecasts" leftSection={<IconChartLine size={16} />}>
            Cash Forecasts ({cashForecasts.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Grid gutter="md">
            <Grid.Col span={12}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Bank Accounts Summary</Title>
                {bankAccounts.length === 0 ? (
                  <Alert color="blue">No bank accounts configured</Alert>
                ) : (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Account Name</Table.Th>
                        <Table.Th>Institution</Table.Th>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>Balance</Table.Th>
                        <Table.Th>Available</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Last Reconciled</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {bankAccounts.map((account) => (
                        <Table.Tr key={account.id}>
                          <Table.Td>
                            <Text fw={600}>{account.name}</Text>
                            {account.account_number_masked && (
                              <Text size="xs" c="dimmed" ff="monospace">
                                {account.account_number_masked}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>{account.institution || 'N/A'}</Table.Td>
                          <Table.Td>
                            <Badge variant="light">{account.account_type || 'checking'}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={600}>
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency || 'USD' }).format(account.current_balance || 0)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text c="blue">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency || 'USD' }).format(account.available_balance || 0)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={
                                account.status === 'active'
                                  ? 'green'
                                  : account.status === 'frozen'
                                  ? 'red'
                                  : 'gray'
                              }
                              variant="light"
                            >
                              {account.status?.toUpperCase() || 'ACTIVE'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            {account.last_reconciled_at ? (
                              <Text size="sm">{dayjs(account.last_reconciled_at).format('MM/DD/YYYY')}</Text>
                            ) : (
                              <Text size="sm" c="dimmed">Never</Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <ActionIcon
                                variant="light"
                                onClick={() => {
                                  setSelectedAccount(account);
                                  setAccountModalOpened(true);
                                }}
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                              {canManage && (
                                <ActionIcon
                                  variant="light"
                                  onClick={() => {
                                    setEditingAccount(account);
                                    accountForm.setValues({
                                      name: account.name,
                                      institution: account.institution || '',
                                      currency: account.currency || 'USD',
                                      account_type: account.account_type || 'checking',
                                      account_classification: account.account_classification || 'operating',
                                      account_number_masked: account.account_number_masked || '',
                                      routing_number: account.routing_number || '',
                                      swift_code: '',
                                      iban: '',
                                      daily_limit: (account as any).daily_limit?.toString() || '',
                                      transaction_limit: (account as any).transaction_limit?.toString() || '',
                                      status: account.status || 'active',
                                    });
                                    setAccountModalOpened(true);
                                  }}
                                >
                                  <IconEdit size={16} />
                                </ActionIcon>
                              )}
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={4}>Recent Transactions</Title>
                  {canManage && (
                    <Button
                      size="xs"
                      variant="subtle"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => {
                    transactionForm.reset();
                        transactionForm.setValues({
                          transaction_date: new Date(),
                          currency: 'USD',
                        });
                        setTransactionModalOpened(true);
                      }}
                    >
                      New Transaction
                    </Button>
                  )}
                </Group>
                {transactions.length === 0 ? (
                  <Alert color="blue">No transactions found</Alert>
                ) : (
                  <Stack gap="sm">
                    {transactions.slice(0, 10).map((tx) => (
                      <Paper key={tx.id} p="sm" withBorder>
                        <Group justify="space-between">
                          <Box>
                            <Text fw={600} size="sm">{tx.transaction_number}</Text>
                            <Text size="xs" c="dimmed">{tx.description}</Text>
                          </Box>
                          <Box style={{ textAlign: 'right' }}>
                            <Text
                              fw={600}
                              c={tx.transaction_type.includes('deposit') || tx.transaction_type.includes('in') ? 'green' : 'red'}
                            >
                              {tx.transaction_type.includes('deposit') || tx.transaction_type.includes('in') ? '+' : '-'}
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: tx.currency || 'USD' }).format(tx.amount)}
                            </Text>
                            <Badge size="xs" variant="light" mt={4}>
                              {tx.status}
                            </Badge>
                          </Box>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={4}>Pending Approvals</Title>
                </Group>
                <Stack gap="sm">
                  {wireTransfers.filter(w => w.status === 'pending_approval' || w.status === 'approved').slice(0, 5).map((wire) => (
                    <Paper key={wire.id} p="sm" withBorder>
                      <Group justify="space-between">
                        <Box>
                          <Text fw={600} size="sm">Wire: {wire.wire_number}</Text>
                          <Text size="xs" c="dimmed">To: {wire.beneficiary_name}</Text>
                        </Box>
                        <Box style={{ textAlign: 'right' }}>
                          <Text fw={600} c="red">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: wire.currency || 'USD' }).format(wire.amount)}
                          </Text>
                          {canManage && wire.status === 'pending_approval' && (
                            <Button
                              size="xs"
                              mt={4}
                              onClick={() => handleApproveWire(wire.id)}
                            >
                              Approve
                            </Button>
                          )}
                          {canManage && wire.status === 'approved' && (
                            <Button
                              size="xs"
                              mt={4}
                              color="green"
                              onClick={() => handleExecuteWire(wire.id)}
                            >
                              Execute
                            </Button>
                          )}
                        </Box>
                      </Group>
                    </Paper>
                  ))}
                  {wireTransfers.filter(w => w.status === 'pending_approval' || w.status === 'approved').length === 0 && (
                    <Text size="sm" c="dimmed">No pending approvals</Text>
                  )}
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="accounts" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Bank Accounts</Title>
              {canManage && (
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    setEditingAccount(null);
                    accountForm.reset();
                    setAccountModalOpened(true);
                  }}
                >
                  Add Bank Account
                </Button>
              )}
            </Group>
            {bankAccounts.length === 0 ? (
              <Alert color="blue">No bank accounts configured. Add your first bank account to get started.</Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Account Name</Table.Th>
                    <Table.Th>Institution</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Classification</Table.Th>
                    <Table.Th>Account Number</Table.Th>
                    <Table.Th>Currency</Table.Th>
                    <Table.Th>Current Balance</Table.Th>
                    <Table.Th>Available Balance</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {bankAccounts.map((account) => (
                    <Table.Tr key={account.id}>
                      <Table.Td>
                        <Text fw={600}>{account.name}</Text>
                      </Table.Td>
                      <Table.Td>{account.institution || 'N/A'}</Table.Td>
                      <Table.Td>
                        <Badge variant="light">{account.account_type || 'checking'}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="blue">{account.account_classification || 'operating'}</Badge>
                      </Table.Td>
                      <Table.Td>
                        {account.account_number_masked ? (
                          <Text ff="monospace" size="sm">{account.account_number_masked}</Text>
                        ) : (
                          <Text size="sm" c="dimmed">N/A</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" leftSection={<IconWorld size={12} />}>
                          {account.currency || 'USD'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency || 'USD' }).format(account.current_balance || 0)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text c="blue">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency || 'USD' }).format(account.available_balance || 0)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            account.status === 'active'
                              ? 'green'
                              : account.status === 'frozen'
                              ? 'red'
                              : account.status === 'closed'
                              ? 'gray'
                              : 'yellow'
                          }
                          variant="light"
                        >
                          {account.status?.toUpperCase() || 'ACTIVE'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {canManage && (
                            <ActionIcon
                              variant="light"
                              onClick={() => {
                                setEditingAccount(account);
                                accountForm.setValues({
                                  name: account.name,
                                  institution: account.institution || '',
                                  currency: account.currency || 'USD',
                                  account_type: account.account_type || 'checking',
                                  account_classification: account.account_classification || 'operating',
                                  account_number_masked: account.account_number_masked || '',
                                  routing_number: account.routing_number || '',
                                  swift_code: '',
                                  iban: '',
                                  daily_limit: (account as any).daily_limit?.toString() || '',
                                  transaction_limit: (account as any).transaction_limit?.toString() || '',
                                  status: account.status || 'active',
                                });
                                setAccountModalOpened(true);
                              }}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="transactions" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Banking Transactions</Title>
              {canManage && (
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    transactionForm.reset();
                    transactionForm.setValues({
                      transaction_date: new Date(),
                      currency: 'USD',
                    });
                    setTransactionModalOpened(true);
                  }}
                >
                  New Transaction
                </Button>
              )}
            </Group>
            {transactions.length === 0 ? (
              <Alert color="blue">No transactions found</Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Transaction #</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Reconciled</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {transactions.map((tx) => (
                    <Table.Tr key={tx.id}>
                      <Table.Td>
                        <Text ff="monospace" size="sm">{tx.transaction_number}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{dayjs(tx.transaction_date).format('MM/DD/YYYY')}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{tx.transaction_type}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{tx.description}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text
                          fw={600}
                          c={tx.transaction_type.includes('deposit') || tx.transaction_type.includes('in') ? 'green' : 'red'}
                        >
                          {tx.transaction_type.includes('deposit') || tx.transaction_type.includes('in') ? '+' : '-'}
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: tx.currency || 'USD' }).format(tx.amount)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            tx.status === 'posted'
                              ? 'green'
                              : tx.status === 'pending'
                              ? 'yellow'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {tx.status.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {tx.reconciled ? (
                          <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
                            Yes
                          </Badge>
                        ) : (
                          <Badge color="gray" variant="light">No</Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="wires" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Wire Transfers</Title>
              {canManage && (
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    wireForm.reset();
                    wireForm.setValues({
                      requested_date: new Date(),
                      currency: 'USD',
                      direction: 'outgoing',
                    });
                    setWireModalOpened(true);
                  }}
                >
                  New Wire Transfer
                </Button>
              )}
            </Group>
            {wireTransfers.length === 0 ? (
              <Alert color="blue">No wire transfers found</Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Wire #</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Direction</Table.Th>
                    <Table.Th>Beneficiary</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Requested Date</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {wireTransfers.map((wire) => (
                    <Table.Tr key={wire.id}>
                      <Table.Td>
                        <Text ff="monospace" size="sm" fw={600}>{wire.wire_number}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{wire.transfer_type}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={wire.direction === 'outgoing' ? 'red' : 'green'}
                          variant="light"
                        >
                          {wire.direction.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{wire.beneficiary_name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} c={wire.direction === 'outgoing' ? 'red' : 'green'}>
                          {wire.direction === 'outgoing' ? '-' : '+'}
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: wire.currency || 'USD' }).format(wire.amount)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{dayjs(wire.requested_date).format('MM/DD/YYYY')}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            wire.status === 'completed'
                              ? 'green'
                              : wire.status === 'approved'
                              ? 'blue'
                              : wire.status === 'pending_approval'
                              ? 'yellow'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {wire.status.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {canManage && wire.status === 'pending_approval' && (
                            <Button
                              size="xs"
                              onClick={() => handleApproveWire(wire.id)}
                            >
                              Approve
                            </Button>
                          )}
                          {canManage && wire.status === 'approved' && (
                            <Button
                              size="xs"
                              color="green"
                              onClick={() => handleExecuteWire(wire.id)}
                            >
                              Execute
                            </Button>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="ach" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>ACH Transfers</Title>
              {canManage && (
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    achForm.reset();
                    achForm.setValues({
                      effective_date: new Date(),
                      receiver_account_type: 'checking',
                      company_name: 'Crave\'n, Inc.',
                    });
                    setACHModalOpened(true);
                  }}
                >
                  New ACH Transfer
                </Button>
              )}
            </Group>
            {achTransfers.length === 0 ? (
              <Alert color="blue">No ACH transfers found</Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ACH #</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Receiver</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Effective Date</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {achTransfers.map((ach) => (
                    <Table.Tr key={ach.id}>
                      <Table.Td>
                        <Text ff="monospace" size="sm" fw={600}>{ach.ach_number}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{ach.ach_type.toUpperCase()}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{ach.receiver_name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} c={ach.ach_type === 'credit' ? 'red' : 'green'}>
                          {ach.ach_type === 'credit' ? '-' : '+'}
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ach.amount)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{dayjs(ach.effective_date).format('MM/DD/YYYY')}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            ach.status === 'settled'
                              ? 'green'
                              : ach.status === 'approved'
                              ? 'blue'
                              : ach.status === 'pending_approval'
                              ? 'yellow'
                              : ach.status === 'returned'
                              ? 'red'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {ach.status.toUpperCase()}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="reconciliation" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Bank Reconciliations</Title>
              {canManage && (
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    reconciliationForm.reset();
                    reconciliationForm.setValues({
                      reconciliation_date: new Date(),
                      statement_start_date: dayjs().startOf('month').toDate(),
                      statement_end_date: new Date(),
                    });
                    setReconciliationModalOpened(true);
                  }}
                >
                  New Reconciliation
                </Button>
              )}
            </Group>
            {reconciliations.length === 0 ? (
              <Alert color="blue">No reconciliations found</Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Reconciliation #</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Statement Balance</Table.Th>
                    <Table.Th>Ledger Balance</Table.Th>
                    <Table.Th>Difference</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {reconciliations.map((rec) => (
                    <Table.Tr key={rec.id}>
                      <Table.Td>
                        <Text ff="monospace" size="sm" fw={600}>{rec.reconciliation_number}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{dayjs(rec.reconciliation_date).format('MM/DD/YYYY')}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rec.statement_ending_balance)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rec.ledger_ending_balance)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text
                          fw={600}
                          c={rec.difference === 0 ? 'green' : 'red'}
                        >
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rec.difference)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            rec.status === 'reconciled'
                              ? 'green'
                              : rec.status === 'discrepancy'
                              ? 'red'
                              : 'yellow'
                          }
                          variant="light"
                        >
                          {rec.status.toUpperCase()}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="forecasts" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Cash Forecasts</Title>
              {canManage && (
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    forecastForm.reset();
                    forecastForm.setValues({
                      forecast_date: new Date(),
                      forecast_start_date: new Date(),
                      forecast_end_date: dayjs().add(1, 'month').toDate(),
                      forecast_type: 'monthly',
                      opening_cash_balance: totalCash,
                    });
                    setForecastModalOpened(true);
                  }}
                >
                  New Cash Forecast
                </Button>
              )}
            </Group>
            {cashForecasts.length === 0 ? (
              <Alert color="blue">No cash forecasts found</Alert>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Forecast #</Table.Th>
                    <Table.Th>Period</Table.Th>
                    <Table.Th>Opening Balance</Table.Th>
                    <Table.Th>Projected Inflows</Table.Th>
                    <Table.Th>Projected Outflows</Table.Th>
                    <Table.Th>Ending Balance</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {cashForecasts.map((forecast) => (
                    <Table.Tr key={forecast.id}>
                      <Table.Td>
                        <Text ff="monospace" size="sm" fw={600}>{forecast.forecast_number}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {dayjs(forecast.forecast_start_date).format('MM/DD/YYYY')} - {dayjs(forecast.forecast_end_date).format('MM/DD/YYYY')}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(forecast.opening_cash_balance)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text c="green" fw={600}>
                          +{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(forecast.projected_inflows)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text c="red" fw={600}>
                          -{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(forecast.projected_outflows)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={700} c={forecast.projected_ending_balance >= 0 ? 'green' : 'red'}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(forecast.projected_ending_balance)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            forecast.status === 'approved'
                              ? 'green'
                              : forecast.status === 'active'
                              ? 'blue'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {forecast.status.toUpperCase()}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Bank Account Modal */}
      <Modal
        opened={accountModalOpened}
        onClose={() => {
          setAccountModalOpened(false);
          setEditingAccount(null);
          accountForm.reset();
        }}
        title={editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
        size="lg"
      >
        <form onSubmit={accountForm.onSubmit(handleCreateOrUpdateAccount)}>
          <Stack gap="md">
            <TextInput
              label="Account Name"
              required
              placeholder="e.g., Operating Account - Chase"
              {...accountForm.getInputProps('name')}
            />
            <TextInput
              label="Institution"
              required
              placeholder="e.g., Chase Bank, Bank of America"
              {...accountForm.getInputProps('institution')}
            />
            <Group grow>
              <Select
                label="Account Type"
                required
                data={[
                  { value: 'checking', label: 'Checking' },
                  { value: 'savings', label: 'Savings' },
                  { value: 'money_market', label: 'Money Market' },
                  { value: 'sweep', label: 'Sweep' },
                  { value: 'investment', label: 'Investment' },
                  { value: 'credit_line', label: 'Credit Line' },
                  { value: 'payroll', label: 'Payroll' },
                  { value: 'operating', label: 'Operating' },
                ]}
                {...accountForm.getInputProps('account_type')}
              />
              <Select
                label="Classification"
                required
                data={[
                  { value: 'operating', label: 'Operating' },
                  { value: 'reserve', label: 'Reserve' },
                  { value: 'payroll', label: 'Payroll' },
                  { value: 'tax', label: 'Tax' },
                  { value: 'investment', label: 'Investment' },
                  { value: 'sweep', label: 'Sweep' },
                  { value: 'lockbox', label: 'Lockbox' },
                ]}
                {...accountForm.getInputProps('account_classification')}
              />
            </Group>
            <Group grow>
              <TextInput
                label="Account Number (Masked)"
                placeholder="****1234"
                {...accountForm.getInputProps('account_number_masked')}
              />
              <TextInput
                label="Routing Number"
                placeholder="123456789"
                {...accountForm.getInputProps('routing_number')}
              />
            </Group>
            <Group grow>
              <TextInput
                label="SWIFT Code (International)"
                placeholder="CHASUS33"
                {...accountForm.getInputProps('swift_code')}
              />
              <TextInput
                label="IBAN (International)"
                placeholder="US64SVBKUS6S3300958879"
                {...accountForm.getInputProps('iban')}
              />
            </Group>
            <Group grow>
              <Select
                label="Currency"
                required
                data={[
                  { value: 'USD', label: 'USD - US Dollar' },
                  { value: 'EUR', label: 'EUR - Euro' },
                  { value: 'GBP', label: 'GBP - British Pound' },
                  { value: 'CAD', label: 'CAD - Canadian Dollar' },
                ]}
                {...accountForm.getInputProps('currency')}
              />
              <Select
                label="Status"
                required
                data={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'frozen', label: 'Frozen' },
                  { value: 'closed', label: 'Closed' },
                ]}
                {...accountForm.getInputProps('status')}
              />
            </Group>
            <Group grow>
              <NumberInput
                label="Daily Limit"
                placeholder="0.00"
                min={0}
                decimalScale={2}
                {...accountForm.getInputProps('daily_limit')}
              />
              <NumberInput
                label="Transaction Limit"
                placeholder="0.00"
                min={0}
                decimalScale={2}
                {...accountForm.getInputProps('transaction_limit')}
              />
            </Group>
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setAccountModalOpened(false);
                  setEditingAccount(null);
                  accountForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">{editingAccount ? 'Update' : 'Create'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Transaction Modal */}
      <Modal
        opened={transactionModalOpened}
        onClose={() => {
          setTransactionModalOpened(false);
          transactionForm.reset();
        }}
        title="New Banking Transaction"
        size="lg"
      >
        <form onSubmit={transactionForm.onSubmit(handleCreateTransaction)}>
          <Stack gap="md">
            <Select
              label="Bank Account"
              required
              data={bankAccounts.map(acc => ({ value: acc.id, label: `${acc.name} - ${acc.institution}` }))}
              {...transactionForm.getInputProps('bank_account_id')}
            />
            <Group grow>
              <Select
                label="Transaction Type"
                required
                data={[
                  { value: 'deposit', label: 'Deposit' },
                  { value: 'withdrawal', label: 'Withdrawal' },
                  { value: 'transfer_in', label: 'Transfer In' },
                  { value: 'transfer_out', label: 'Transfer Out' },
                  { value: 'fee', label: 'Fee' },
                  { value: 'interest', label: 'Interest' },
                  { value: 'adjustment', label: 'Adjustment' },
                ]}
                {...transactionForm.getInputProps('transaction_type')}
              />
              <Select
                label="Currency"
                required
                data={[
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GBP', label: 'GBP' },
                ]}
                {...transactionForm.getInputProps('currency')}
              />
            </Group>
            <Group grow>
              <NumberInput
                label="Amount"
                required
                min={0}
                decimalScale={2}
                {...transactionForm.getInputProps('amount')}
              />
              <DatePickerInput
                label="Transaction Date"
                required
                {...transactionForm.getInputProps('transaction_date')}
              />
            </Group>
            <Textarea
              label="Description"
              required
              {...transactionForm.getInputProps('description')}
            />
            <Group grow>
              <TextInput
                label="Reference Number"
                {...transactionForm.getInputProps('reference_number')}
              />
              <TextInput
                label="Counterparty Name"
                {...transactionForm.getInputProps('counterparty_name')}
              />
            </Group>
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setTransactionModalOpened(false);
                  transactionForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create Transaction</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Wire Transfer Modal */}
      <Modal
        opened={wireModalOpened}
        onClose={() => {
          setWireModalOpened(false);
          wireForm.reset();
        }}
        title="New Wire Transfer"
        size="lg"
      >
        <form onSubmit={wireForm.onSubmit(handleCreateWireTransfer)}>
          <Stack gap="md">
            <Select
              label="Bank Account"
              required
              data={bankAccounts.map(acc => ({ value: acc.id, label: `${acc.name} - ${acc.institution}` }))}
              {...wireForm.getInputProps('bank_account_id')}
            />
            <Group grow>
              <Select
                label="Transfer Type"
                required
                data={[
                  { value: 'domestic', label: 'Domestic' },
                  { value: 'international', label: 'International' },
                  { value: 'fedwire', label: 'Fedwire' },
                  { value: 'swift', label: 'SWIFT' },
                ]}
                {...wireForm.getInputProps('transfer_type')}
              />
              <Select
                label="Direction"
                required
                data={[
                  { value: 'outgoing', label: 'Outgoing' },
                  { value: 'incoming', label: 'Incoming' },
                ]}
                {...wireForm.getInputProps('direction')}
              />
            </Group>
            <Group grow>
              <NumberInput
                label="Amount"
                required
                min={0}
                decimalScale={2}
                {...wireForm.getInputProps('amount')}
              />
              <Select
                label="Currency"
                required
                data={[
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GBP', label: 'GBP' },
                ]}
                {...wireForm.getInputProps('currency')}
              />
            </Group>
            <TextInput
              label="Beneficiary Name"
              required
              {...wireForm.getInputProps('beneficiary_name')}
            />
            <TextInput
              label="Beneficiary Account Number"
              required
              {...wireForm.getInputProps('beneficiary_account')}
            />
            <TextInput
              label="Beneficiary Bank Name"
              required
              {...wireForm.getInputProps('beneficiary_bank_name')}
            />
            <Group grow>
              <TextInput
                label="Routing Number (Domestic)"
                {...wireForm.getInputProps('beneficiary_bank_routing')}
              />
              <TextInput
                label="SWIFT Code (International)"
                {...wireForm.getInputProps('beneficiary_bank_swift')}
              />
            </Group>
            <Textarea
              label="Payment Instructions"
              {...wireForm.getInputProps('payment_instructions')}
            />
            <DatePickerInput
              label="Requested Date"
              required
              {...wireForm.getInputProps('requested_date')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setWireModalOpened(false);
                  wireForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create Wire Transfer</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* ACH Transfer Modal */}
      <Modal
        opened={achModalOpened}
        onClose={() => {
          setACHModalOpened(false);
          achForm.reset();
        }}
        title="New ACH Transfer"
        size="lg"
      >
        <form onSubmit={achForm.onSubmit(handleCreateACHTransfer)}>
          <Stack gap="md">
            <Select
              label="Bank Account"
              required
              data={bankAccounts.map(acc => ({ value: acc.id, label: `${acc.name} - ${acc.institution}` }))}
              {...achForm.getInputProps('bank_account_id')}
            />
            <Group grow>
              <Select
                label="ACH Type"
                required
                data={[
                  { value: 'credit', label: 'Credit (Payment)' },
                  { value: 'debit', label: 'Debit (Collection)' },
                  { value: 'prenote', label: 'Prenote' },
                ]}
                {...achForm.getInputProps('ach_type')}
              />
              <Select
                label="Receiver Account Type"
                required
                data={[
                  { value: 'checking', label: 'Checking' },
                  { value: 'savings', label: 'Savings' },
                ]}
                {...achForm.getInputProps('receiver_account_type')}
              />
            </Group>
            <Group grow>
              <NumberInput
                label="Amount"
                required
                min={0}
                decimalScale={2}
                {...achForm.getInputProps('amount')}
              />
              <DatePickerInput
                label="Effective Date"
                required
                {...achForm.getInputProps('effective_date')}
              />
            </Group>
            <TextInput
              label="Receiver Name"
              required
              {...achForm.getInputProps('receiver_name')}
            />
            <TextInput
              label="Receiver Account Number"
              required
              {...achForm.getInputProps('receiver_account')}
            />
            <TextInput
              label="Receiver Routing Number"
              required
              {...achForm.getInputProps('receiver_routing')}
            />
            <TextInput
              label="Company Name"
              required
              {...achForm.getInputProps('company_name')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setACHModalOpened(false);
                  achForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create ACH Transfer</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Reconciliation Modal */}
      <Modal
        opened={reconciliationModalOpened}
        onClose={() => {
          setReconciliationModalOpened(false);
          reconciliationForm.reset();
        }}
        title="New Bank Reconciliation"
        size="lg"
      >
        <form onSubmit={reconciliationForm.onSubmit(handleCreateReconciliation)}>
          <Stack gap="md">
            <Select
              label="Bank Account"
              required
              data={bankAccounts.map(acc => ({ value: acc.id, label: `${acc.name} - ${acc.institution}` }))}
              {...reconciliationForm.getInputProps('bank_account_id')}
            />
            <DatePickerInput
              label="Reconciliation Date"
              required
              {...reconciliationForm.getInputProps('reconciliation_date')}
            />
            <Group grow>
              <DatePickerInput
                label="Statement Start Date"
                required
                {...reconciliationForm.getInputProps('statement_start_date')}
              />
              <DatePickerInput
                label="Statement End Date"
                required
                {...reconciliationForm.getInputProps('statement_end_date')}
              />
            </Group>
            <Group grow>
              <NumberInput
                label="Statement Ending Balance"
                required
                decimalScale={2}
                {...reconciliationForm.getInputProps('statement_ending_balance')}
              />
              <NumberInput
                label="Ledger Ending Balance"
                required
                decimalScale={2}
                {...reconciliationForm.getInputProps('ledger_ending_balance')}
              />
            </Group>
            {reconciliationForm.values.statement_ending_balance && reconciliationForm.values.ledger_ending_balance && (
              <Alert
                color={Math.abs(reconciliationForm.values.statement_ending_balance - reconciliationForm.values.ledger_ending_balance) < 0.01 ? 'green' : 'red'}
                title={Math.abs(reconciliationForm.values.statement_ending_balance - reconciliationForm.values.ledger_ending_balance) < 0.01 ? 'Balances Match' : 'Discrepancy Found'}
              >
                Difference: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(reconciliationForm.values.statement_ending_balance - reconciliationForm.values.ledger_ending_balance)}
              </Alert>
            )}
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setReconciliationModalOpened(false);
                  reconciliationForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create Reconciliation</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Cash Forecast Modal */}
      <Modal
        opened={forecastModalOpened}
        onClose={() => {
          setForecastModalOpened(false);
          forecastForm.reset();
        }}
        title="New Cash Forecast"
        size="lg"
      >
        <form onSubmit={forecastForm.onSubmit(handleCreateCashForecast)}>
          <Stack gap="md">
            <Group grow>
              <DatePickerInput
                label="Forecast Date"
                required
                {...forecastForm.getInputProps('forecast_date')}
              />
              <Select
                label="Forecast Type"
                required
                data={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'annual', label: 'Annual' },
                ]}
                {...forecastForm.getInputProps('forecast_type')}
              />
            </Group>
            <Group grow>
              <DatePickerInput
                label="Forecast Start Date"
                required
                {...forecastForm.getInputProps('forecast_start_date')}
              />
              <DatePickerInput
                label="Forecast End Date"
                required
                {...forecastForm.getInputProps('forecast_end_date')}
              />
            </Group>
            <NumberInput
              label="Opening Cash Balance"
              required
              decimalScale={2}
              {...forecastForm.getInputProps('opening_cash_balance')}
            />
            <Group grow>
              <NumberInput
                label="Projected Inflows"
                required
                min={0}
                decimalScale={2}
                {...forecastForm.getInputProps('projected_inflows')}
              />
              <NumberInput
                label="Projected Outflows"
                required
                min={0}
                decimalScale={2}
                {...forecastForm.getInputProps('projected_outflows')}
              />
            </Group>
            {forecastForm.values.opening_cash_balance && forecastForm.values.projected_inflows && forecastForm.values.projected_outflows && (
              <Alert
                color={forecastForm.values.opening_cash_balance + forecastForm.values.projected_inflows - forecastForm.values.projected_outflows >= 0 ? 'green' : 'red'}
                title="Projected Ending Balance"
              >
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(forecastForm.values.opening_cash_balance + forecastForm.values.projected_inflows - forecastForm.values.projected_outflows)}
              </Alert>
            )}
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setForecastModalOpened(false);
                  forecastForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create Forecast</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};
