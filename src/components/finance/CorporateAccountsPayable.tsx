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
  Tooltip,
  message,
  Spin,
  Tabs,
  Badge,
  Descriptions,
  Modal,
  Progress,
  Alert,
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  ReloadOutlined,
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
  ExportOutlined,
  WarningOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name: string;
  vendor_email: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  payment_status: string;
  department: string;
  expense_category: string;
  days_overdue: number;
  payment_terms: string;
  created_at: string;
}

interface APMetrics {
  totalOutstanding: number;
  totalOverdue: number;
  invoicesCount: number;
  overdueCount: number;
  avgDaysToPay: number;
  cashFlowImpact: number;
}

export const CorporateAccountsPayable: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<APMetrics>({
    totalOutstanding: 0,
    totalOverdue: 0,
    invoicesCount: 0,
    overdueCount: 0,
    avgDaysToPay: 0,
    cashFlowImpact: 0,
  });
  const [selectedPeriod, setSelectedPeriod] = useState<[Dayjs, Dayjs] | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  useEffect(() => {
    fetchInvoices();
  }, [activeTab]);

  useEffect(() => {
    applyFilters();
  }, [invoices, searchText, statusFilter, selectedPeriod]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          department:departments(name),
          expense_category:expense_categories(name)
        `)
        .order('invoice_date', { ascending: false })
        .limit(1000);

      if (error) {
        // If table doesn't exist, just show empty state
        if (error.code === '42P01') {
          console.warn('Invoices table not found');
          setInvoices([]);
          calculateMetrics([]);
          return;
        }
        throw error;
      }

      const processedInvoices: Invoice[] = (data || []).map((inv: any) => {
        const dueDate = dayjs(inv.due_date || inv.invoice_date);
        const today = dayjs();
        const daysOverdue = dueDate.isBefore(today) ? today.diff(dueDate, 'days') : 0;

        return {
          id: inv.id,
          invoice_number: inv.invoice_number || `INV-${inv.id.substring(0, 8).toUpperCase()}`,
          vendor_name: inv.vendor_name || 'Unknown Vendor',
          vendor_email: inv.vendor_email || '',
          invoice_date: inv.invoice_date,
          due_date: inv.due_date || inv.invoice_date,
          amount: Number(inv.amount || 0),
          tax_amount: Number(inv.tax_amount || 0),
          total_amount: Number(inv.total_amount || inv.amount || 0),
          status: inv.status || 'pending',
          payment_status: inv.payment_status || inv.status || 'unpaid',
          department: inv.department?.name || 'Unassigned',
          expense_category: inv.expense_category?.name || 'Uncategorized',
          days_overdue: daysOverdue,
          payment_terms: inv.payment_terms || 'Net 30',
          created_at: inv.created_at,
        };
      });

      setInvoices(processedInvoices);
      calculateMetrics(processedInvoices);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      message.error('Failed to load Accounts Payable data');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (data: Invoice[]) => {
    const unpaid = data.filter(inv => inv.payment_status !== 'paid' && inv.status !== 'cancelled');
    const overdue = unpaid.filter(inv => inv.days_overdue > 0);
    
    const totalOutstanding = unpaid.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalOverdue = overdue.reduce((sum, inv) => sum + inv.total_amount, 0);

    setMetrics({
      totalOutstanding,
      totalOverdue,
      invoicesCount: unpaid.length,
      overdueCount: overdue.length,
      avgDaysToPay: 0, // Would need payment history to calculate
      cashFlowImpact: totalOverdue,
    });
  };

  const applyFilters = () => {
    let filtered = [...invoices];

    // Tab filter
    if (activeTab === 'pending') {
      filtered = filtered.filter(inv => inv.payment_status !== 'paid' && inv.status !== 'cancelled');
    } else if (activeTab === 'overdue') {
      filtered = filtered.filter(inv => inv.days_overdue > 0 && inv.payment_status !== 'paid');
    } else if (activeTab === 'paid') {
      filtered = filtered.filter(inv => inv.payment_status === 'paid');
    }

    // Search filter
    if (searchText) {
      filtered = filtered.filter(
        inv =>
          inv.invoice_number?.toLowerCase().includes(searchText.toLowerCase()) ||
          inv.vendor_name?.toLowerCase().includes(searchText.toLowerCase()) ||
          inv.vendor_email?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    // Period filter
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

  const handleExport = () => {
    const csv = [
      ['Invoice #', 'Vendor', 'Date', 'Due Date', 'Amount', 'Tax', 'Total', 'Status', 'Days Overdue', 'Department'].join(','),
      ...filteredInvoices.map(inv =>
        [
          inv.invoice_number,
          `"${inv.vendor_name}"`,
          inv.invoice_date,
          inv.due_date,
          inv.amount,
          inv.tax_amount,
          inv.total_amount,
          inv.status,
          inv.days_overdue,
          inv.department,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts-payable-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success('Accounts Payable data exported successfully');
  };

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 140,
      fixed: 'left',
      render: (text: string) => <Text strong style={{ fontFamily: 'monospace' }}>{text}</Text>,
    },
    {
      title: 'Vendor',
      dataIndex: 'vendor_name',
      key: 'vendor_name',
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
      render: (date: string, record: Invoice) => {
        const isOverdue = record.days_overdue > 0;
        return (
          <Text style={{ color: isOverdue ? '#ff4d4f' : '#595959' }}>
            {dayjs(date).format('MM/DD/YYYY')}
          </Text>
        );
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (amount: number) => (
        <Text strong>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}
        </Text>
      ),
    },
    {
      title: 'Tax',
      dataIndex: 'tax_amount',
      key: 'tax_amount',
      width: 100,
      align: 'right',
      render: (tax: number) =>
        tax > 0 ? (
          <Text type="secondary">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tax)}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.total_amount - b.total_amount,
      render: (total: number) => (
        <Text strong style={{ fontSize: 15, color: '#1890ff' }}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'payment_status',
      key: 'payment_status',
      width: 120,
      filters: [
        { text: 'Unpaid', value: 'unpaid' },
        { text: 'Partial', value: 'partial' },
        { text: 'Paid', value: 'paid' },
      ],
      onFilter: (value, record) => record.payment_status === value,
      render: (status: string, record: Invoice) => {
        if (status === 'paid') {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Paid</Tag>;
        } else if (record.days_overdue > 0) {
          return <Tag color="error" icon={<ExclamationCircleOutlined />}>Overdue</Tag>;
        } else {
          return <Tag color="warning" icon={<ClockCircleOutlined />}>Pending</Tag>;
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
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_: any, record: Invoice) => (
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
        </Space>
      ),
    },
  ];

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
              <DollarOutlined style={{ marginRight: 12, fontSize: 28 }} />
              Accounts Payable
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, display: 'block', marginTop: 8 }}>
              Vendor invoice management and payment processing | Enterprise-grade AP workflow
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchInvoices}
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

      {/* Critical Alerts */}
      {metrics.overdueCount > 0 && (
        <Alert
          message={`${metrics.overdueCount} Overdue Invoice${metrics.overdueCount > 1 ? 's' : ''}`}
          description={`Total overdue amount: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(metrics.totalOverdue)}. Immediate attention required.`}
          type="error"
          icon={<WarningOutlined />}
          showIcon
          closable
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" danger onClick={() => setActiveTab('overdue')}>
              View Overdue
            </Button>
          }
        />
      )}

      {/* KPI Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Outstanding"
              value={metrics.totalOutstanding}
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
              title="Overdue Amount"
              value={metrics.totalOverdue}
              prefix={<ExclamationCircleOutlined />}
              precision={2}
              valueStyle={{ color: '#ff4d4f', fontSize: 24, fontWeight: 700 }}
              formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Invoices"
              value={metrics.invoicesCount}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#722ed1', fontSize: 24, fontWeight: 700 }}
              suffix={`${metrics.overdueCount} overdue`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Cash Flow Impact"
              value={metrics.cashFlowImpact}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#fa541c', fontSize: 24, fontWeight: 700 }}
              formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters Section */}
      <Card style={{ marginBottom: 24 }} title={<Text strong>Filters & Search</Text>}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by invoice #, vendor name..."
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
              <Option value="pending">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="paid">Paid</Option>
              <Option value="cancelled">Cancelled</Option>
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
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <Tabs.TabPane
              tab={
                <span>
                  Pending <Badge count={invoices.filter(inv => inv.payment_status !== 'paid' && inv.status !== 'cancelled').length} />
                </span>
              }
              key="pending"
            />
            <Tabs.TabPane
              tab={
                <span>
                  Overdue <Badge count={invoices.filter(inv => inv.days_overdue > 0 && inv.payment_status !== 'paid').length} style={{ backgroundColor: '#ff4d4f' }} />
                </span>
              }
              key="overdue"
            />
            <Tabs.TabPane
              tab={
                <span>
                  Paid <Badge count={invoices.filter(inv => inv.payment_status === 'paid').length} style={{ backgroundColor: '#52c41a' }} />
                </span>
              }
              key="paid"
            />
          </Tabs>
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
          rowClassName={(record) => {
            if (record.days_overdue > 0) return 'overdue-row';
            if (record.payment_status === 'paid') return 'paid-row';
            return '';
          }}
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
            <Descriptions.Item label="Vendor Name">
              {selectedInvoice.vendor_name}
            </Descriptions.Item>
            <Descriptions.Item label="Vendor Email">
              {selectedInvoice.vendor_email || 'N/A'}
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
            <Descriptions.Item label="Amount">
              <Text strong style={{ fontSize: 16 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.amount)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Tax Amount">
              {selectedInvoice.tax_amount > 0
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.tax_amount)
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Total Amount" span={2}>
              <Text strong style={{ fontSize: 20, color: '#1890ff' }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.total_amount)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Payment Status">
              {selectedInvoice.payment_status === 'paid' ? (
                <Tag color="success" icon={<CheckCircleOutlined />}>Paid</Tag>
              ) : selectedInvoice.days_overdue > 0 ? (
                <Tag color="error" icon={<ExclamationCircleOutlined />}>Overdue</Tag>
              ) : (
                <Tag color="warning" icon={<ClockCircleOutlined />}>Pending</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag>{selectedInvoice.status.toUpperCase()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Department">
              {selectedInvoice.department}
            </Descriptions.Item>
            <Descriptions.Item label="Category">
              {selectedInvoice.expense_category}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Terms">
              {selectedInvoice.payment_terms}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <style>{`
        .overdue-row {
          background-color: #fff1f0 !important;
        }
        .paid-row {
          background-color: #f6ffed !important;
        }
      `}</style>
    </div>
  );
};

