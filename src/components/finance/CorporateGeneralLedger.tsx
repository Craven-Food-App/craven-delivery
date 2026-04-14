import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Typography,
  Space,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Statistic,
  Divider,
  Tooltip,
  message,
  Spin,
  Tabs,
  Badge,
  Descriptions,
  Modal,
  Form,
  InputNumber,
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  FilterOutlined,
  ReloadOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
  ExportOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface GLTransaction {
  id: string;
  transaction_date: string;
  journal_entry_number: string;
  account_code: string;
  account_name: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference_number: string;
  status: string;
  posted_by: string;
  posted_at: string;
  entity_code: string;
  period: string;
}

interface GLMetrics {
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
  transactionCount: number;
  accountsActive: number;
  periodBalance: number;
}

export const CorporateGeneralLedger: React.FC = () => {
  const [transactions, setTransactions] = useState<GLTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<GLTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<GLMetrics>({
    totalDebits: 0,
    totalCredits: 0,
    netBalance: 0,
    transactionCount: 0,
    accountsActive: 0,
    periodBalance: 0,
  });
  const [selectedPeriod, setSelectedPeriod] = useState<[Dayjs, Dayjs] | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<GLTransaction | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  
  // Journal Entry Management
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [entryForm] = Form.useForm();
  const [entryLines, setEntryLines] = useState<Array<{ account_id: string; account_code: string; account_name: string; description: string; debit: number; credit: number }>>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<Array<{ id: string; account_code: string; account_name: string; account_type: string }>>([]);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    fetchGLData();
    checkAccess();
    fetchChartOfAccounts();
  }, [selectedPeriod, statusFilter, accountFilter]);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchText, statusFilter, accountFilter]);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const userEmail = user.email?.toLowerCase() || '';
      const isTorrance = userEmail === 'tstroman.ceo@cravenusa.com' || 
                        userEmail.includes('torrance') || 
                        userEmail.includes('tstroman');
      
      if (isTorrance) {
        setCanManage(true);
        return;
      }
      
      // Check if CFO
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
      
      // Check if Finance employee with permissions
      // First get employee_id from employees table
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (employee) {
        const { data: financeEmp } = await supabase
          .from('finance_employees')
          .select('can_view_all_financials')
          .eq('employee_id', employee.id)
          .maybeSingle();
        
        if (financeEmp?.can_view_all_financials) {
          setCanManage(true);
          return;
        }
      }
      
      setCanManage(false);
    } catch (error) {
      console.error('Error checking access:', error);
      setCanManage(false);
    }
  };

  const fetchChartOfAccounts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .eq('is_active', true)
        .order('account_code');
      
      if (error) throw error;
      setChartOfAccounts((data || []) as any);
    } catch (error) {
      console.error('Error fetching chart of accounts:', error);
      // Don't show error if table doesn't exist yet
    }
  };

  const fetchGLData = async () => {
    setLoading(true);
    try {
      // Fetch from expense_requests and invoices to build GL transactions
      const [expensesResult, invoicesResult] = await Promise.all([
        supabase
          .from('expense_requests')
          .select('id, request_number, expense_date, amount, currency, status, created_at')
          .order('expense_date', { ascending: false })
          .limit(500),
        supabase
          .from('invoices')
          .select('id, invoice_number, invoice_date, total_amount, currency, status, created_at')
          .order('invoice_date', { ascending: false })
          .limit(500),
      ]);

      const glTransactions: GLTransaction[] = [];

      // Transform expense requests to GL transactions
      if (expensesResult.data) {
        expensesResult.data.forEach((expense: any) => {
          glTransactions.push({
            id: `exp-${expense.id}`,
            transaction_date: expense.expense_date || expense.created_at,
            journal_entry_number: expense.request_number || `EXP-${expense.id.substring(0, 8).toUpperCase()}`,
            account_code: 'EXP',
            account_name: 'Expenses',
            description: `Expense Request: ${expense.request_number || expense.id}`,
            debit: Number(expense.amount || 0),
            credit: 0,
            balance: Number(expense.amount || 0),
            reference_number: expense.request_number || expense.id.substring(0, 8).toUpperCase(),
            status: expense.status === 'approved' || expense.status === 'paid' ? 'posted' : 'pending',
            posted_by: 'System',
            posted_at: expense.created_at,
            entity_code: 'HQ',
            period: dayjs(expense.expense_date || expense.created_at).format('YYYY-MM'),
          });
        });
      }

      // Transform invoices to GL transactions
      if (invoicesResult.data) {
        invoicesResult.data.forEach((invoice: any) => {
          glTransactions.push({
            id: `inv-${invoice.id}`,
            transaction_date: invoice.invoice_date || invoice.created_at,
            journal_entry_number: invoice.invoice_number || `INV-${invoice.id.substring(0, 8).toUpperCase()}`,
            account_code: 'AP',
            account_name: 'Accounts Payable',
            description: `Invoice: ${invoice.invoice_number || invoice.id}`,
            debit: 0,
            credit: Number(invoice.total_amount || 0),
            balance: -Number(invoice.total_amount || 0),
            reference_number: invoice.invoice_number || invoice.id.substring(0, 8).toUpperCase(),
            status: invoice.status === 'paid' ? 'posted' : 'pending',
            posted_by: 'System',
            posted_at: invoice.created_at,
            entity_code: 'HQ',
            period: dayjs(invoice.invoice_date || invoice.created_at).format('YYYY-MM'),
          });
        });
      }

      // Sort by date descending
      glTransactions.sort((a, b) => 
        dayjs(b.transaction_date).unix() - dayjs(a.transaction_date).unix()
      );

      setTransactions(glTransactions);
      calculateMetrics(glTransactions);
    } catch (error: any) {
      console.error('Error fetching GL data:', error);
      // Don't show error if tables don't exist - just show empty state
      if (error.code !== '42P01') {
        message.error('Failed to load General Ledger data');
      }
      setTransactions([]);
      calculateMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (data: GLTransaction[]) => {
    const totalDebits = data.reduce((sum, t) => sum + (t.debit || 0), 0);
    const totalCredits = data.reduce((sum, t) => sum + (t.credit || 0), 0);
    const netBalance = totalDebits - totalCredits;
    const uniqueAccounts = new Set(data.map(t => t.account_code)).size;

    setMetrics({
      totalDebits,
      totalCredits,
      netBalance,
      transactionCount: data.length,
      accountsActive: uniqueAccounts,
      periodBalance: netBalance,
    });
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchText) {
      filtered = filtered.filter(
        t =>
          t.journal_entry_number?.toLowerCase().includes(searchText.toLowerCase()) ||
          t.account_code?.toLowerCase().includes(searchText.toLowerCase()) ||
          t.account_name?.toLowerCase().includes(searchText.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchText.toLowerCase()) ||
          t.reference_number?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Account filter
    if (accountFilter !== 'all') {
      filtered = filtered.filter(t => t.account_code === accountFilter);
    }

    // Period filter
    if (selectedPeriod) {
      const [start, end] = selectedPeriod;
      filtered = filtered.filter(t => {
        const date = dayjs(t.transaction_date);
        return date.isAfter(start.subtract(1, 'day')) && date.isBefore(end.add(1, 'day'));
      });
    }

    setFilteredTransactions(filtered);
    setPagination(prev => ({ ...prev, total: filtered.length }));
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'Journal Entry', 'Account Code', 'Account Name', 'Description', 'Debit', 'Credit', 'Balance', 'Status', 'Reference'].join(','),
      ...filteredTransactions.map(t =>
        [
          t.transaction_date,
          t.journal_entry_number,
          t.account_code,
          `"${t.account_name}"`,
          `"${t.description}"`,
          t.debit,
          t.credit,
          t.balance,
          t.status,
          t.reference_number,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `general-ledger-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success('General Ledger exported successfully');
  };

  const handleDeleteEntry = (record: GLTransaction) => {
    Modal.confirm({
      title: 'Delete General Ledger Entry',
      content: `Are you sure you want to delete entry "${record.journal_entry_number}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const realId = record.id.replace(/^(exp-|inv-)/, '');
          if (record.id.startsWith('exp-')) {
            const { error } = await supabase.from('expense_requests').delete().eq('id', realId);
            if (error) throw error;
          } else if (record.id.startsWith('inv-')) {
            const { error } = await supabase.from('invoices').delete().eq('id', realId);
            if (error) throw error;
          }
          message.success('Entry deleted successfully');
          fetchGLData();
        } catch (error: any) {
          console.error('Error deleting entry:', error);
          message.error(error.message || 'Failed to delete entry');
        }
      },
    });
  };

  const columns: ColumnsType<GLTransaction> = [
    {
      title: 'Date',
      dataIndex: 'transaction_date',
      key: 'transaction_date',
      width: 110,
      sorter: (a, b) => dayjs(a.transaction_date).unix() - dayjs(b.transaction_date).unix(),
      render: (date: string) => dayjs(date).format('MM/DD/YYYY'),
    },
    {
      title: 'Journal Entry',
      dataIndex: 'journal_entry_number',
      key: 'journal_entry_number',
      width: 140,
      render: (text: string) => <Text strong style={{ fontFamily: 'monospace' }}>{text}</Text>,
    },
    {
      title: 'Account Code',
      dataIndex: 'account_code',
      key: 'account_code',
      width: 120,
      render: (code: string) => <Text code>{code}</Text>,
    },
    {
      title: 'Account Name',
      dataIndex: 'account_name',
      key: 'account_name',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 250,
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.debit - b.debit,
      render: (amount: number) =>
        amount > 0 ? (
          <Text strong style={{ color: '#1890ff' }}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      key: 'credit',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.credit - b.credit,
      render: (amount: number) =>
        amount > 0 ? (
          <Text strong style={{ color: '#52c41a' }}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.balance - b.balance,
      render: (balance: number) => {
        const color = balance > 0 ? '#1890ff' : balance < 0 ? '#ff4d4f' : '#595959';
        return (
          <Text strong style={{ color, fontFamily: 'monospace' }}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balance)}
          </Text>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: 'Posted', value: 'posted' },
        { text: 'Pending', value: 'pending' },
        { text: 'Reversed', value: 'reversed' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          posted: { color: 'success', text: 'Posted' },
          pending: { color: 'warning', text: 'Pending' },
          reversed: { color: 'error', text: 'Reversed' },
          draft: { color: 'default', text: 'Draft' },
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Entity',
      dataIndex: 'entity_code',
      key: 'entity_code',
      width: 80,
      render: (code: string) => <Badge color="blue" text={code} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_: any, record: GLTransaction) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedTransaction(record);
                setDetailModalVisible(true);
              }}
            />
          </Tooltip>
          {canManage && (
            <Tooltip title="Delete Entry">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => handleDeleteEntry(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const uniqueAccounts = useMemo(() => {
    const accounts = new Set(transactions.map(t => t.account_code));
    return Array.from(accounts).map(code => {
      const transaction = transactions.find(t => t.account_code === code);
      return { code, name: transaction?.account_name || 'Unknown' };
    });
  }, [transactions]);

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header Section */}
      <Card
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #001529 0%, #002140 100%)',
          border: 'none',
          borderRadius: 8,
        }}
        bodyStyle={{ padding: '32px' }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 600 }}>
              <FileTextOutlined style={{ marginRight: 12, fontSize: 28 }} />
              General Ledger
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, display: 'block', marginTop: 8 }}>
              Complete chart of accounts and transaction history | US GAAP Compliant
            </Text>
          </Col>
          <Col>
            <Space>
              {canManage && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingEntry(null);
                    setEntryLines([{ account_id: '', account_code: '', account_name: '', description: '', debit: 0, credit: 0 }]);
                    entryForm.resetFields();
                    entryForm.setFieldsValue({ entry_date: dayjs() });
                    setEntryModalVisible(true);
                  }}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  Create Journal Entry
                </Button>
              )}
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchGLData}
                style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<ExportOutlined />}
                onClick={handleExport}
                style={{ background: '#1890ff', borderColor: '#1890ff' }}
              >
                Export CSV
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* KPI Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Debits"
              value={metrics.totalDebits}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#1890ff', fontSize: 24, fontWeight: 700 }}
              formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Credits"
              value={metrics.totalCredits}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }}
              formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Net Balance"
              value={metrics.netBalance}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{
                color: metrics.netBalance === 0 ? '#595959' : metrics.netBalance > 0 ? '#1890ff' : '#ff4d4f',
                fontSize: 24,
                fontWeight: 700,
              }}
              formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Transactions"
              value={metrics.transactionCount}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#722ed1', fontSize: 24, fontWeight: 700 }}
              suffix={`across ${metrics.accountsActive} accounts`}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters Section */}
      <Card style={{ marginBottom: 24 }} title={<Text strong>Filters & Search</Text>}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by entry #, account, description..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="all">All Statuses</Option>
              <Option value="posted">Posted</Option>
              <Option value="pending">Pending</Option>
              <Option value="reversed">Reversed</Option>
              <Option value="draft">Draft</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Account"
              style={{ width: '100%' }}
              value={accountFilter}
              onChange={setAccountFilter}
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              <Option value="all">All Accounts</Option>
              {uniqueAccounts.map(acc => (
                <Option key={acc.code} value={acc.code}>
                  {acc.code} - {acc.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <RangePicker
              style={{ width: '100%' }}
              value={selectedPeriod}
              onChange={(dates) => setSelectedPeriod(dates as [Dayjs, Dayjs] | null)}
              format="MM/DD/YYYY"
            />
          </Col>
        </Row>
      </Card>

      {/* Transactions Table */}
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <Text strong>General Ledger Transactions</Text>
            <Badge count={filteredTransactions.length} showZero style={{ backgroundColor: '#1890ff' }} />
          </Space>
        }
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            Last updated: {dayjs().format('MM/DD/YYYY HH:mm:ss')}
          </Text>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredTransactions}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} transactions`,
            pageSizeOptions: ['25', '50', '100', '200'],
            onChange: (page, pageSize) => setPagination({ current: page, pageSize, total: pagination.total }),
          }}
          size="small"
          bordered
        />
      </Card>

      {/* Transaction Detail Modal - Fortune 500 Format */}
      <Modal
        title=""
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedTransaction(null);
        }}
        footer={null}
        width="90%"
        styles={{
          body: { padding: 0 },
          content: { maxHeight: '90vh' },
        }}
      >
        {selectedTransaction && (
          <div style={{ 
            fontFamily: 'Georgia, "Times New Roman", serif',
            padding: '60px 80px',
            background: '#ffffff',
            color: '#1a1a1a',
            lineHeight: 1.6,
          }}>
            {/* Header */}
            <div style={{ 
              borderBottom: '3px solid #1a1a1a',
              paddingBottom: '20px',
              marginBottom: '40px',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <Text style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '2px', marginBottom: '10px', display: 'block' }}>
                  CRAVE'N, INC.
                </Text>
                <Text style={{ fontSize: '18px', color: '#666', letterSpacing: '1px', display: 'block' }}>
                  GENERAL LEDGER TRANSACTION REPORT
                </Text>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#666',
                marginTop: '20px',
              }}>
                <div>
                  <Text strong>Transaction Date:</Text>{' '}
                  {dayjs(selectedTransaction.transaction_date).format('MMMM D, YYYY')}
                </div>
                <div>
                  <Text strong>Generated:</Text>{' '}
                  {dayjs().format('MMMM D, YYYY [at] h:mm A')}
                </div>
                <div>
                  <Text strong>Status:</Text>{' '}
                  <Tag color={selectedTransaction.status === 'posted' ? 'green' : selectedTransaction.status === 'pending' ? 'yellow' : 'gray'}>
                    {selectedTransaction.status.toUpperCase()}
                  </Tag>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div style={{ marginBottom: '50px' }}>
              <Title level={2} style={{ 
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '20px',
                borderBottom: '2px solid #e0e0e0',
                paddingBottom: '10px',
              }}>
                TRANSACTION SUMMARY
              </Title>
              <div style={{ 
                background: '#f8f9fa',
                padding: '25px',
                borderRadius: '4px',
                marginBottom: '20px',
              }}>
                <Text style={{ fontSize: '14px', lineHeight: 1.8 }}>
                  This report provides a detailed analysis of General Ledger transaction{' '}
                  <Text strong style={{ fontFamily: 'monospace' }}>
                    {selectedTransaction.journal_entry_number}
                  </Text>. The transaction was recorded in account{' '}
                  <Text strong style={{ fontFamily: 'monospace' }}>
                    {selectedTransaction.account_code}
                  </Text> ({selectedTransaction.account_name}) with a{' '}
                  {selectedTransaction.debit > 0 ? (
                    <>
                      debit amount of{' '}
                      <Text strong style={{ color: '#1890ff' }}>
                        ${selectedTransaction.debit.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    </>
                  ) : (
                    <>
                      credit amount of{' '}
                      <Text strong style={{ color: '#52c41a' }}>
                        ${selectedTransaction.credit.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    </>
                  )}. This transaction is part of the{' '}
                  <Text strong>{selectedTransaction.period}</Text> accounting period.
                </Text>
              </div>
            </div>

            {/* Transaction Details Table */}
            <div style={{ marginBottom: '50px' }}>
              <Title level={2} style={{ 
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '20px',
                borderBottom: '2px solid #e0e0e0',
                paddingBottom: '10px',
              }}>
                TRANSACTION DETAILS
              </Title>
              <Table
                bordered
                pagination={false}
                style={{
                  fontSize: '14px',
                }}
                dataSource={[
                  {
                    key: '1',
                    field: 'Journal Entry Number',
                    value: selectedTransaction.journal_entry_number,
                    style: { fontFamily: 'monospace', fontWeight: 700 },
                  },
                  {
                    key: '2',
                    field: 'Transaction Date',
                    value: dayjs(selectedTransaction.transaction_date).format('MMMM D, YYYY'),
                  },
                  {
                    key: '3',
                    field: 'Reference Number',
                    value: selectedTransaction.reference_number || 'N/A',
                  },
                  {
                    key: '4',
                    field: 'Account Code',
                    value: `${selectedTransaction.account_code} - ${selectedTransaction.account_name}`,
                    style: { fontFamily: 'monospace' },
                  },
                  {
                    key: '5',
                    field: 'Description',
                    value: selectedTransaction.description,
                  },
                  {
                    key: '6',
                    field: 'Debit Amount',
                    value: selectedTransaction.debit > 0
                      ? `$${selectedTransaction.debit.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : '—',
                    style: { 
                      color: selectedTransaction.debit > 0 ? '#1890ff' : '#666',
                      fontWeight: selectedTransaction.debit > 0 ? 700 : 400,
                      fontFamily: 'monospace',
                    },
                  },
                  {
                    key: '7',
                    field: 'Credit Amount',
                    value: selectedTransaction.credit > 0
                      ? `$${selectedTransaction.credit.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : '—',
                    style: { 
                      color: selectedTransaction.credit > 0 ? '#52c41a' : '#666',
                      fontWeight: selectedTransaction.credit > 0 ? 700 : 400,
                      fontFamily: 'monospace',
                    },
                  },
                  {
                    key: '8',
                    field: 'Net Balance',
                    value: `$${selectedTransaction.balance.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
                    style: { 
                      fontWeight: 700,
                      fontSize: '16px',
                      fontFamily: 'monospace',
                      color: selectedTransaction.balance > 0 ? '#1890ff' : selectedTransaction.balance < 0 ? '#ff4d4f' : '#595959',
                    },
                  },
                  {
                    key: '9',
                    field: 'Status',
                    value: selectedTransaction.status.toUpperCase(),
                  },
                  {
                    key: '10',
                    field: 'Entity Code',
                    value: selectedTransaction.entity_code,
                  },
                  {
                    key: '11',
                    field: 'Accounting Period',
                    value: selectedTransaction.period,
                  },
                  {
                    key: '12',
                    field: 'Posted By',
                    value: selectedTransaction.posted_by,
                  },
                  {
                    key: '13',
                    field: 'Posted At',
                    value: dayjs(selectedTransaction.posted_at).format('MMMM D, YYYY [at] h:mm A'),
                  },
                ]}
                columns={[
                  {
                    title: 'Field',
                    dataIndex: 'field',
                    key: 'field',
                    width: '30%',
                    render: (text: string) => (
                      <Text strong style={{ fontSize: '14px' }}>{text}</Text>
                    ),
                  },
                  {
                    title: 'Value',
                    dataIndex: 'value',
                    key: 'value',
                    render: (value: string, record: any) => (
                      <Text style={record.style || {}}>{value}</Text>
                    ),
                  },
                ]}
              />
            </div>

            {/* Accounting Impact */}
            <div style={{ marginBottom: '50px' }}>
              <Title level={2} style={{ 
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '20px',
                borderBottom: '2px solid #e0e0e0',
                paddingBottom: '10px',
              }}>
                ACCOUNTING IMPACT
              </Title>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card style={{ 
                    background: selectedTransaction.debit > 0 ? '#e6f7ff' : '#f0f0f0',
                    border: `2px solid ${selectedTransaction.debit > 0 ? '#1890ff' : '#d9d9d9'}`,
                  }}>
                    <Statistic
                      title="Debit Impact"
                      value={selectedTransaction.debit}
                      prefix={<DollarOutlined />}
                      precision={2}
                      valueStyle={{ 
                        color: selectedTransaction.debit > 0 ? '#1890ff' : '#999',
                        fontSize: 24,
                        fontWeight: 700,
                      }}
                      formatter={(value) => 
                        selectedTransaction.debit > 0
                          ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : 'No Debit'
                      }
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card style={{ 
                    background: selectedTransaction.credit > 0 ? '#f6ffed' : '#f0f0f0',
                    border: `2px solid ${selectedTransaction.credit > 0 ? '#52c41a' : '#d9d9d9'}`,
                  }}>
                    <Statistic
                      title="Credit Impact"
                      value={selectedTransaction.credit}
                      prefix={<DollarOutlined />}
                      precision={2}
                      valueStyle={{ 
                        color: selectedTransaction.credit > 0 ? '#52c41a' : '#999',
                        fontSize: 24,
                        fontWeight: 700,
                      }}
                      formatter={(value) => 
                        selectedTransaction.credit > 0
                          ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : 'No Credit'
                      }
                    />
                  </Card>
                </Col>
              </Row>
            </div>

            {/* Footer */}
            <div style={{ 
              marginTop: '60px',
              paddingTop: '30px',
              borderTop: '2px solid #e0e0e0',
              fontSize: '11px',
              color: '#666',
              textAlign: 'center',
            }}>
              <Text style={{ marginBottom: '10px', display: 'block' }}>
                <Text strong>CRAVE'N, INC.</Text> | General Ledger Transaction Report | 
                Generated {dayjs().format('MMMM D, YYYY [at] h:mm A')}
              </Text>
              <Text style={{ fontStyle: 'italic', lineHeight: 1.6, display: 'block' }}>
                This report is prepared for internal use and accounting purposes. 
                All transaction data is based on the General Ledger system and reflects actual accounting entries. 
                This report supports financial analysis, audit compliance, and accounting reconciliation activities.
              </Text>
              <Text style={{ marginTop: '15px', fontSize: '10px', display: 'block' }}>
                Transaction ID: {selectedTransaction.id} | Status: {selectedTransaction.status.toUpperCase()} | 
                Journal Entry: {selectedTransaction.journal_entry_number}
              </Text>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              paddingTop: '30px',
              borderTop: '1px solid #e0e0e0',
              background: '#f8f9fa',
              margin: '40px -80px -60px -80px',
              padding: '20px 80px',
              textAlign: 'right',
            }}>
              <Space>
                <Button onClick={() => {
                  setDetailModalVisible(false);
                  setSelectedTransaction(null);
                }}>
                  Close
                </Button>
                <Button
                  type="primary"
                  icon={<ExportOutlined />}
                  onClick={() => {
                    message.info('PDF export functionality coming soon');
                  }}
                >
                  Download PDF
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>

      {/* Journal Entry Create/Edit Modal */}
      {canManage && (
        <Modal
          title={
            <Space>
              <FileTextOutlined />
              <Text strong>{editingEntry ? 'Edit Journal Entry' : 'Create Journal Entry'}</Text>
            </Space>
          }
          open={entryModalVisible}
          onCancel={() => {
            setEntryModalVisible(false);
            setEditingEntry(null);
            setEntryLines([]);
            entryForm.resetFields();
          }}
          width={1000}
          footer={null}
        >
          <Form
            form={entryForm}
            layout="vertical"
            onFinish={async (values) => {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                  message.error('You must be logged in to create journal entries');
                  return;
                }

                // Validate entry lines balance
                const totalDebits = entryLines.reduce((sum, line) => sum + (line.debit || 0), 0);
                const totalCredits = entryLines.reduce((sum, line) => sum + (line.credit || 0), 0);

                if (totalDebits !== totalCredits) {
                  message.error(`Entry is not balanced. Debits: $${totalDebits.toFixed(2)}, Credits: $${totalCredits.toFixed(2)}`);
                  return;
                }

                if (entryLines.length < 2) {
                  message.error('Journal entry must have at least 2 lines');
                  return;
                }

                if (editingEntry) {
                  // Update existing entry
                  if (editingEntry.status === 'posted') {
                    message.error('Posted entries cannot be edited');
                    return;
                  }

                  const { error: updateError } = await (supabase as any)
                    .from('journal_entries')
                    .update({
                      entry_date: values.entry_date.format('YYYY-MM-DD'),
                      description: values.description,
                      reference_number: values.reference_number,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', editingEntry.id);

                  if (updateError) throw updateError;

                  // Delete old lines
                  await (supabase as any)
                    .from('journal_entry_lines')
                    .delete()
                    .eq('journal_entry_id', editingEntry.id);

                  // Insert new lines
                  const linesToInsert = entryLines.map((line, index) => ({
                    journal_entry_id: editingEntry.id,
                    account_id: line.account_id,
                    line_number: index + 1,
                    description: line.description,
                    debit_amount: line.debit || 0,
                    credit_amount: line.credit || 0,
                  }));

                  const { error: linesError } = await (supabase as any)
                    .from('journal_entry_lines')
                    .insert(linesToInsert);

                  if (linesError) throw linesError;

                  message.success('Journal entry updated successfully');
                } else {
                  // Create new entry
                  const { data: newEntry, error: insertError } = await (supabase as any)
                    .from('journal_entries')
                    .insert({
                      entry_date: values.entry_date.format('YYYY-MM-DD'),
                      description: values.description,
                      reference_number: values.reference_number,
                      created_by: user.id,
                    })
                    .select()
                    .single();

                  if (insertError) throw insertError;

                  // Insert lines
                  const linesToInsert = entryLines.map((line, index) => ({
                    journal_entry_id: newEntry.id,
                    account_id: line.account_id,
                    line_number: index + 1,
                    description: line.description,
                    debit_amount: line.debit || 0,
                    credit_amount: line.credit || 0,
                  }));

                  const { error: linesError } = await (supabase as any)
                    .from('journal_entry_lines')
                    .insert(linesToInsert);

                  if (linesError) throw linesError;

                  message.success('Journal entry created successfully');
                }

                setEntryModalVisible(false);
                setEditingEntry(null);
                setEntryLines([]);
                entryForm.resetFields();
                fetchGLData();
              } catch (error: any) {
                console.error('Error saving journal entry:', error);
                message.error(error.message || 'Failed to save journal entry');
              }
            }}
          >
            <Form.Item
              name="entry_date"
              label="Entry Date"
              rules={[{ required: true, message: 'Please select entry date' }]}
              initialValue={dayjs()}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: 'Please enter description' }]}
            >
              <Input placeholder="Journal entry description" />
            </Form.Item>

            <Form.Item
              name="reference_number"
              label="Reference Number"
            >
              <Input placeholder="Optional reference number" />
            </Form.Item>

            <Divider>Entry Lines</Divider>

            <div style={{ marginBottom: 16 }}>
              {entryLines.map((line, index) => (
                <Card key={index} style={{ marginBottom: 12 }} size="small">
                  <Row gutter={16} align="middle">
                    <Col span={6}>
                      <Select
                        placeholder="Account"
                        style={{ width: '100%' }}
                        showSearch
                        value={line.account_id}
                        onChange={(value) => {
                          const account = chartOfAccounts.find(a => a.id === value);
                          const newLines = [...entryLines];
                          newLines[index] = {
                            ...newLines[index],
                            account_id: value,
                            account_code: account?.account_code || '',
                            account_name: account?.account_name || '',
                          };
                          setEntryLines(newLines);
                        }}
                        filterOption={(input, option) =>
                          (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                        options={chartOfAccounts.map(acc => ({
                          value: acc.id,
                          label: `${acc.account_code} - ${acc.account_name}`,
                        }))}
                      />
                    </Col>
                    <Col span={8}>
                      <Input
                        placeholder="Description"
                        value={line.description}
                        onChange={(e) => {
                          const newLines = [...entryLines];
                          newLines[index].description = e.target.value;
                          setEntryLines(newLines);
                        }}
                      />
                    </Col>
                    <Col span={4}>
                      <InputNumber
                        placeholder="Debit"
                        style={{ width: '100%' }}
                        min={0}
                        precision={2}
                        value={line.debit}
                        onChange={(value) => {
                          const newLines = [...entryLines];
                          newLines[index].debit = value || 0;
                          newLines[index].credit = 0;
                          setEntryLines(newLines);
                        }}
                      />
                    </Col>
                    <Col span={4}>
                      <InputNumber
                        placeholder="Credit"
                        style={{ width: '100%' }}
                        min={0}
                        precision={2}
                        value={line.credit}
                        onChange={(value) => {
                          const newLines = [...entryLines];
                          newLines[index].credit = value || 0;
                          newLines[index].debit = 0;
                          setEntryLines(newLines);
                        }}
                      />
                    </Col>
                    <Col span={2}>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          const newLines = entryLines.filter((_, i) => i !== index);
                          setEntryLines(newLines);
                        }}
                      />
                    </Col>
                  </Row>
                </Card>
              ))}
            </div>

            <Space style={{ marginBottom: 16 }}>
              <Button
                icon={<PlusOutlined />}
                onClick={() => {
                  setEntryLines([...entryLines, { account_id: '', account_code: '', account_name: '', description: '', debit: 0, credit: 0 }]);
                }}
              >
                Add Line
              </Button>
              <Text type="secondary">
                Total Debits: ${entryLines.reduce((sum, line) => sum + (line.debit || 0), 0).toFixed(2)} | 
                Total Credits: ${entryLines.reduce((sum, line) => sum + (line.credit || 0), 0).toFixed(2)}
              </Text>
            </Space>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<CheckOutlined />}>
                  {editingEntry ? 'Update Entry' : 'Create Entry'}
                </Button>
                <Button onClick={() => {
                  setEntryModalVisible(false);
                  setEditingEntry(null);
                  setEntryLines([]);
                  entryForm.resetFields();
                }}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
};

