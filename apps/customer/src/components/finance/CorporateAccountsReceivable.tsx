import React, { useState, useEffect } from 'react';
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
  Tooltip,
  message,
  Tabs,
  Badge,
  Descriptions,
  Modal,
  Alert,
  Progress,
  Form,
  InputNumber,
  Popconfirm,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  ExportOutlined,
  WarningOutlined,
  LineChartOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CreditCardOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { hasFullAccess } from '@/utils/torranceAccess';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface ARInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: string;
  days_overdue: number;
  payment_terms: string;
  created_at: string;
}

interface ARMetrics {
  totalReceivables: number;
  totalOverdue: number;
  invoicesCount: number;
  overdueCount: number;
  collectionRate: number;
  avgDaysOutstanding: number;
}

export const CorporateAccountsReceivable: React.FC = () => {
  const [invoices, setInvoices] = useState<ARInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<ARInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<ARMetrics>({
    totalReceivables: 0,
    totalOverdue: 0,
    invoicesCount: 0,
    overdueCount: 0,
    collectionRate: 0,
    avgDaysOutstanding: 0,
  });
  const [selectedPeriod, setSelectedPeriod] = useState<[Dayjs, Dayjs] | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<ARInvoice | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('outstanding');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  
  // Operational modals
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ARInvoice | null>(null);
  const [invoiceForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    fetchReceivables();
    checkAccess();
  }, [activeTab]);

  useEffect(() => {
    applyFilters();
  }, [invoices, searchText, statusFilter, selectedPeriod]);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts_receivable')
        .select('*')
        .order('due_date', { ascending: true })
        .limit(1000);

      if (error) {
        // If table doesn't exist, just show empty state
        if (error.code === '42P01') {
          console.warn('Accounts receivable table not found');
          setInvoices([]);
          calculateMetrics([]);
          return;
        }
        throw error;
      }

      const processedInvoices: ARInvoice[] = (data || []).map((inv: any) => {
        const dueDate = dayjs(inv.due_date || inv.invoice_date);
        const today = dayjs();
        const daysOverdue = dueDate.isBefore(today) && inv.outstanding_amount > 0 ? today.diff(dueDate, 'days') : 0;

        return {
          id: inv.id,
          invoice_number: inv.invoice_number || `AR-${inv.id.substring(0, 8).toUpperCase()}`,
          customer_name: inv.customer_name || 'Unknown Customer',
          customer_email: inv.customer_email || '',
          invoice_date: inv.invoice_date,
          due_date: inv.due_date || inv.invoice_date,
          total_amount: Number(inv.total_amount || 0),
          paid_amount: Number(inv.paid_amount || 0),
          outstanding_amount: Number(inv.outstanding_amount || inv.total_amount || 0),
          status: inv.status || 'outstanding',
          days_overdue: daysOverdue,
          payment_terms: inv.payment_terms || 'Net 30',
          created_at: inv.created_at,
        };
      });

      setInvoices(processedInvoices);
      calculateMetrics(processedInvoices);
    } catch (error: any) {
      console.error('Error fetching receivables:', error);
      message.error('Failed to load Accounts Receivable data');
    } finally {
      setLoading(false);
    }
  };

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

      // Check if user is CFO or has finance permissions
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

  const calculateMetrics = (data: ARInvoice[]) => {
    const outstanding = data.filter(inv => inv.outstanding_amount > 0 && inv.status !== 'paid');
    const overdue = outstanding.filter(inv => inv.days_overdue > 0);
    
    const totalReceivables = outstanding.reduce((sum, inv) => sum + inv.outstanding_amount, 0);
    const totalOverdue = overdue.reduce((sum, inv) => sum + inv.outstanding_amount, 0);
    const totalInvoiced = data.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPaid = data.reduce((sum, inv) => sum + inv.paid_amount, 0);
    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    setMetrics({
      totalReceivables,
      totalOverdue,
      invoicesCount: outstanding.length,
      overdueCount: overdue.length,
      collectionRate,
      avgDaysOutstanding: 0,
    });
  };

  const applyFilters = () => {
    let filtered = [...invoices];

    if (activeTab === 'outstanding') {
      filtered = filtered.filter(inv => inv.outstanding_amount > 0 && inv.status !== 'paid');
    } else if (activeTab === 'overdue') {
      filtered = filtered.filter(inv => inv.days_overdue > 0 && inv.outstanding_amount > 0);
    } else if (activeTab === 'paid') {
      filtered = filtered.filter(inv => inv.status === 'paid' || inv.outstanding_amount === 0);
    }

    if (searchText) {
      filtered = filtered.filter(
        inv =>
          inv.invoice_number?.toLowerCase().includes(searchText.toLowerCase()) ||
          inv.customer_name?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    if (selectedPeriod) {
      const [start, end] = selectedPeriod;
      filtered = filtered.filter(inv => {
        const date = dayjs(inv.invoice_date);
        return date.isAfter(start.subtract(1, 'day')) && date.isBefore(end.add(1, 'day'));
      });
    }

    setFilteredInvoices(filtered);
    setPagination(prev => ({ ...prev, total: filtered.length }));
  };

  const handleCreateOrUpdateInvoice = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to create invoices');
        return;
      }

      const invoiceData = {
        customer_name: values.customer_name,
        customer_email: values.customer_email,
        invoice_date: values.invoice_date.format('YYYY-MM-DD'),
        due_date: values.due_date.format('YYYY-MM-DD'),
        amount: values.amount,
        tax_amount: values.tax_amount || 0,
        payment_terms: values.payment_terms || 'Net 30',
        status: 'pending',
        paid_amount: 0,
        updated_at: new Date().toISOString(),
      };

      if (editingInvoice) {
        // Update existing invoice
        const { error } = await supabase
          .from('accounts_receivable')
          .update(invoiceData)
          .eq('id', editingInvoice.id);

        if (error) throw error;
        message.success('Invoice updated successfully');
      } else {
        // Generate invoice number
        const year = new Date().getFullYear();
        const { count } = await supabase
          .from('accounts_receivable')
          .select('*', { count: 'exact', head: true })
          .like('invoice_number', `AR-${year}-%`);

        const invoiceNumber = `AR-${year}-${String((count || 0) + 1).padStart(6, '0')}`;

        const { error } = await supabase
          .from('accounts_receivable')
          .insert({
            ...invoiceData,
            invoice_number: invoiceNumber,
          });

        if (error) throw error;
        message.success('Invoice created successfully');
      }

      setInvoiceModalVisible(false);
      setEditingInvoice(null);
      invoiceForm.resetFields();
      fetchReceivables();
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      message.error(error?.message || 'Failed to save invoice');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('accounts_receivable')
        .update({ status: 'written_off' })
        .eq('id', invoiceId);

      if (error) throw error;
      message.success('Invoice written off successfully');
      fetchReceivables();
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      message.error(error?.message || 'Failed to write off invoice');
    }
  };

  const handleRecordPayment = async (values: any) => {
    if (!selectedInvoice) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('You must be logged in to record payments');
        return;
      }

      const paymentAmount = values.payment_amount;
      const newPaidAmount = selectedInvoice.paid_amount + paymentAmount;
      const newOutstandingAmount = selectedInvoice.total_amount - newPaidAmount;
      const newStatus = newOutstandingAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';

      // Get existing payments array
      const { data: invoiceData } = await supabase
        .from('accounts_receivable')
        .select('payments')
        .eq('id', selectedInvoice.id)
        .single();

      const existingPayments = Array.isArray(invoiceData?.payments) ? invoiceData.payments : [];
      const newPayment = {
        date: values.payment_date.format('YYYY-MM-DD'),
        amount: paymentAmount,
        method: values.payment_method,
        reference: values.payment_reference || '',
        recorded_by: user.id,
        recorded_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('accounts_receivable')
        .update({
          paid_amount: newPaidAmount,
          outstanding_amount: newOutstandingAmount,
          status: newStatus,
          payments: [...existingPayments, newPayment],
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedInvoice.id);

      if (error) throw error;
      message.success('Payment recorded successfully');
      setPaymentModalVisible(false);
      paymentForm.resetFields();
      setSelectedInvoice(null);
      fetchReceivables();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      message.error(error?.message || 'Failed to record payment');
    }
  };

  const handleExport = () => {
    const csv = [
      ['Invoice #', 'Customer', 'Date', 'Due Date', 'Total', 'Paid', 'Outstanding', 'Status', 'Days Overdue'].join(','),
      ...filteredInvoices.map(inv =>
        [
          inv.invoice_number,
          `"${inv.customer_name}"`,
          inv.invoice_date,
          inv.due_date,
          inv.total_amount,
          inv.paid_amount,
          inv.outstanding_amount,
          inv.status,
          inv.days_overdue,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts-receivable-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success('Accounts Receivable data exported successfully');
  };

  const columns: ColumnsType<ARInvoice> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 140,
      fixed: 'left',
      render: (text: string) => <Text strong style={{ fontFamily: 'monospace' }}>{text}</Text>,
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Invoice Date',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      width: 120,
      sorter: (a, b) => dayjs(a.invoice_date).unix() - dayjs(b.invoice_date).unix(),
      render: (date: string) => dayjs(date).format('MM/DD/YYYY'),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      sorter: (a, b) => dayjs(a.due_date).unix() - dayjs(b.due_date).unix(),
      render: (date: string, record: ARInvoice) => {
        const isOverdue = record.days_overdue > 0;
        return (
          <Text style={{ color: isOverdue ? '#ff4d4f' : '#595959' }}>
            {dayjs(date).format('MM/DD/YYYY')}
          </Text>
        );
      },
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.total_amount - b.total_amount,
      render: (amount: number) => (
        <Text strong>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}
        </Text>
      ),
    },
    {
      title: 'Paid',
      dataIndex: 'paid_amount',
      key: 'paid_amount',
      width: 120,
      align: 'right',
      render: (paid: number, record: ARInvoice) => {
        const percent = record.total_amount > 0 ? (paid / record.total_amount) * 100 : 0;
        return (
          <div>
            <Text>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paid)}</Text>
            <Progress percent={percent} size="small" showInfo={false} style={{ marginTop: 4 }} />
          </div>
        );
      },
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstanding_amount',
      key: 'outstanding_amount',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.outstanding_amount - b.outstanding_amount,
      render: (outstanding: number) => (
        <Text strong style={{ fontSize: 15, color: outstanding > 0 ? '#ff4d4f' : '#52c41a' }}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(outstanding)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: ARInvoice) => {
        if (status === 'paid' || record.outstanding_amount === 0) {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Paid</Tag>;
        } else if (record.days_overdue > 0) {
          return <Tag color="error" icon={<ExclamationCircleOutlined />}>Overdue</Tag>;
        } else if (record.paid_amount > 0) {
          return <Tag color="warning" icon={<ClockCircleOutlined />}>Partial</Tag>;
        } else {
          return <Tag color="processing" icon={<ClockCircleOutlined />}>Outstanding</Tag>;
        }
      },
    },
    {
      title: 'Days Overdue',
      dataIndex: 'days_overdue',
      key: 'days_overdue',
      width: 120,
      sorter: (a, b) => a.days_overdue - b.days_overdue,
      render: (days: number) => {
        if (days <= 0) return <Text type="secondary">—</Text>;
        return (
          <Text strong style={{ color: '#ff4d4f' }}>
            {days} {days === 1 ? 'day' : 'days'}
          </Text>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_: any, record: ARInvoice) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedInvoice(record);
                setDetailModalVisible(true);
              }}
            />
          </Tooltip>
          {record.outstanding_amount > 0 && (
            <>
              <Tooltip title={canManage ? "Edit Invoice" : "Edit Invoice (Requires Finance Access)"}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  disabled={!canManage}
                  onClick={() => {
                    if (!canManage) {
                      message.warning('You need Finance Department access to edit invoices');
                      return;
                    }
                    setEditingInvoice(record);
                    invoiceForm.setFieldsValue({
                      customer_name: record.customer_name,
                      customer_email: record.customer_email,
                      invoice_date: dayjs(record.invoice_date),
                      due_date: dayjs(record.due_date),
                      amount: record.total_amount,
                      tax_amount: 0,
                      payment_terms: record.payment_terms,
                    });
                    setInvoiceModalVisible(true);
                  }}
                />
              </Tooltip>
              <Tooltip title={canManage ? "Record Payment" : "Record Payment (Requires Finance Access)"}>
                <Button
                  type="text"
                  icon={<CreditCardOutlined />}
                  size="small"
                  disabled={!canManage}
                  onClick={() => {
                    if (!canManage) {
                      message.warning('You need Finance Department access to record payments');
                      return;
                    }
                    setSelectedInvoice(record);
                    paymentForm.setFieldsValue({
                      payment_amount: record.outstanding_amount,
                      payment_date: dayjs(),
                    });
                    setPaymentModalVisible(true);
                  }}
                />
              </Tooltip>
              <Popconfirm
                title="Write Off Invoice"
                description="Are you sure you want to write off this invoice?"
                onConfirm={() => {
                  if (!canManage) {
                    message.warning('You need Finance Department access to write off invoices');
                    return;
                  }
                  handleDeleteInvoice(record.id);
                }}
                okText="Yes"
                cancelText="No"
              >
                <Tooltip title={canManage ? "Write Off" : "Write Off (Requires Finance Access)"}>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    disabled={!canManage}
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '12px', background: '#f5f5f5', minHeight: '100vh' }}>

      {/* Access Notice */}
      {!canManage && (
        <Alert
          message="View-Only Mode"
          description="You are viewing Accounts Receivable in read-only mode. To create invoices, record payments, or edit records, you need Finance Department access (CFO or Finance Employee with permissions)."
          type="info"
          closable
          style={{ marginBottom: 12 }}
        />
      )}

      {/* Critical Alerts */}
      {metrics.overdueCount > 0 && (
        <Alert
          message={`${metrics.overdueCount} Overdue Invoice${metrics.overdueCount > 1 ? 's' : ''}`}
          description={`Total overdue amount: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(metrics.totalOverdue)}. Collection action required.`}
          type="error"
          icon={<WarningOutlined />}
          showIcon
          closable
          style={{ marginBottom: 12 }}
          action={
            <Button size="small" danger onClick={() => setActiveTab('overdue')}>
              View Overdue
            </Button>
          }
        />
      )}

      {/* KPI Metrics */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Receivables"
              value={metrics.totalReceivables}
              precision={2}
              valueStyle={{ color: '#1890ff', fontSize: 24, fontWeight: 700 }}
              formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Overdue Amount"
              value={metrics.totalOverdue}
              precision={2}
              valueStyle={{ color: '#ff4d4f', fontSize: 24, fontWeight: 700 }}
              formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Outstanding Invoices"
              value={metrics.invoicesCount}
              valueStyle={{ color: '#722ed1', fontSize: 24, fontWeight: 700 }}
              suffix={metrics.overdueCount > 0 ? `${metrics.overdueCount} overdue` : 'overdue'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Collection Rate"
              value={metrics.collectionRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters Section */}
      <Card style={{ marginBottom: 12 }} title={<Text strong>Filters & Search</Text>}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by invoice #, customer name..."
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
              <Option value="outstanding">Outstanding</Option>
              <Option value="partial">Partial</Option>
              <Option value="paid">Paid</Option>
              <Option value="overdue">Overdue</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={selectedPeriod}
              onChange={(dates) => setSelectedPeriod(dates as [Dayjs, Dayjs] | null)}
              format="MM/DD/YYYY"
            />
          </Col>
        </Row>
      </Card>

      {/* Invoices Table */}
      <Card
        title={
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={[
              {
                key: 'outstanding',
                label: (
                  <span>
                    Outstanding <Badge count={invoices.filter(inv => inv.outstanding_amount > 0 && inv.status !== 'paid').length} />
                  </span>
                ),
              },
              {
                key: 'overdue',
                label: (
                  <span>
                    Overdue <Badge count={invoices.filter(inv => inv.days_overdue > 0 && inv.outstanding_amount > 0).length} style={{ backgroundColor: '#ff4d4f' }} />
                  </span>
                ),
              },
              {
                key: 'paid',
                label: (
                  <span>
                    Paid <Badge count={invoices.filter(inv => inv.status === 'paid' || inv.outstanding_amount === 0).length} style={{ backgroundColor: '#52c41a' }} />
                  </span>
                ),
              },
            ]}
          />
        }
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            Last updated: {dayjs().format('MM/DD/YYYY HH:mm:ss')}
          </Text>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredInvoices}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`,
            pageSizeOptions: ['25', '50', '100', '200'],
            onChange: (page, pageSize) => setPagination({ current: page, pageSize, total: pagination.total }),
          }}
          size="small"
          bordered
        />
      </Card>

      {/* Invoice Detail Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <Text strong>Invoice Details</Text>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedInvoice && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Invoice Number" span={2}>
              <Text strong style={{ fontFamily: 'monospace', fontSize: 16 }}>
                {selectedInvoice.invoice_number}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Customer Name">
              {selectedInvoice.customer_name}
            </Descriptions.Item>
            <Descriptions.Item label="Customer Email">
              {selectedInvoice.customer_email || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Invoice Date">
              {dayjs(selectedInvoice.invoice_date).format('MM/DD/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Due Date">
              <Text style={{ color: selectedInvoice.days_overdue > 0 ? '#ff4d4f' : '#595959' }}>
                {dayjs(selectedInvoice.due_date).format('MM/DD/YYYY')}
                {selectedInvoice.days_overdue > 0 && (
                  <Tag color="error" style={{ marginLeft: 8 }}>
                    {selectedInvoice.days_overdue} days overdue
                  </Tag>
                )}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Total Amount" span={2}>
              <Text strong style={{ fontSize: 20, color: '#1890ff' }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.total_amount)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Paid Amount">
              <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.paid_amount)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Outstanding Amount">
              <Text strong style={{ fontSize: 16, color: '#ff4d4f' }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.outstanding_amount)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Payment Status">
              {selectedInvoice.status === 'paid' || selectedInvoice.outstanding_amount === 0 ? (
                <Tag color="success" icon={<CheckCircleOutlined />}>Paid</Tag>
              ) : selectedInvoice.days_overdue > 0 ? (
                <Tag color="error" icon={<ExclamationCircleOutlined />}>Overdue</Tag>
              ) : (
                <Tag color="processing" icon={<ClockCircleOutlined />}>Outstanding</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Terms">
              {selectedInvoice.payment_terms}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Create/Edit Invoice Modal */}
      <Modal
        title={editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
        open={invoiceModalVisible}
        onCancel={() => {
          setInvoiceModalVisible(false);
          setEditingInvoice(null);
          invoiceForm.resetFields();
        }}
        onOk={() => invoiceForm.submit()}
        width={800}
      >
        <Form
          form={invoiceForm}
          layout="vertical"
          onFinish={handleCreateOrUpdateInvoice}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customer_name"
                label="Customer Name"
                rules={[{ required: true, message: 'Please enter customer name' }]}
              >
                <Input placeholder="Customer name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="customer_email"
                label="Customer Email"
                rules={[{ type: 'email', message: 'Please enter a valid email' }]}
              >
                <Input placeholder="customer@example.com" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="invoice_date"
                label="Invoice Date"
                rules={[{ required: true, message: 'Please select invoice date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="MM/DD/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="due_date"
                label="Due Date"
                rules={[{ required: true, message: 'Please select due date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="MM/DD/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/\$\s?|(,*)/g, '') as unknown as 0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tax_amount"
                label="Tax Amount"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/\$\s?|(,*)/g, '') as unknown as 0}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="payment_terms"
            label="Payment Terms"
          >
            <Select placeholder="Select payment terms">
              <Option value="Net 15">Net 15</Option>
              <Option value="Net 30">Net 30</Option>
              <Option value="Net 45">Net 45</Option>
              <Option value="Net 60">Net 60</Option>
              <Option value="Due on Receipt">Due on Receipt</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        title="Record Payment"
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          paymentForm.resetFields();
          setSelectedInvoice(null);
        }}
        onOk={() => paymentForm.submit()}
        width={600}
      >
        {selectedInvoice && (
          <Form
            form={paymentForm}
            layout="vertical"
            onFinish={handleRecordPayment}
          >
            <Alert
              message={`Recording payment for ${selectedInvoice.invoice_number}`}
              description={
                <div>
                  <div>Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.total_amount)}</div>
                  <div>Paid: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.paid_amount)}</div>
                  <div>Outstanding: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.outstanding_amount)}</div>
                </div>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Form.Item
              name="payment_amount"
              label="Payment Amount"
              rules={[
                { required: true, message: 'Please enter payment amount' },
                {
                  validator: (_, value) => {
                    if (value > selectedInvoice.outstanding_amount) {
                      return Promise.reject('Payment amount cannot exceed outstanding amount');
                    }
                    if (value <= 0) {
                      return Promise.reject('Payment amount must be greater than 0');
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={selectedInvoice.outstanding_amount}
                precision={2}
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
              />
            </Form.Item>
            <Form.Item
              name="payment_date"
              label="Payment Date"
              rules={[{ required: true, message: 'Please select payment date' }]}
            >
              <DatePicker style={{ width: '100%' }} format="MM/DD/YYYY" />
            </Form.Item>
            <Form.Item
              name="payment_method"
              label="Payment Method"
              rules={[{ required: true, message: 'Please select payment method' }]}
            >
              <Select placeholder="Select payment method">
                <Option value="Cash">Cash</Option>
                <Option value="Check">Check</Option>
                <Option value="Credit Card">Credit Card</Option>
                <Option value="ACH">ACH Transfer</Option>
                <Option value="Wire">Wire Transfer</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="payment_reference"
              label="Payment Reference"
            >
              <Input placeholder="Check number, transaction ID, etc." />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

