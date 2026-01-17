import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  Select,
  DatePicker,
  InputNumber,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Descriptions,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Vendor {
  id: string;
  vendor_name: string;
  vendor_type: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  default_currency?: string;
  relationship_start?: string;
  status: string;
  performance_rating?: number;
  contract_value?: number;
  metadata?: any;
  created_at: string;
}

interface VendorStats {
  totalVendors: number;
  activeVendors: number;
  totalContractValue: number;
  avgPerformanceRating: number;
}

export const VendorManagement: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState<VendorStats>({
    totalVendors: 0,
    activeVendors: 0,
    totalContractValue: 0,
    avgPerformanceRating: 0,
  });
  const [form] = Form.useForm();

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchText, statusFilter, vendors]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('partner_vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVendors(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      message.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (vendorList: Vendor[]) => {
    const active = vendorList.filter(v => v.status === 'active');
    const totalContractValue = vendorList.reduce((sum, v) => sum + (v.contract_value || 0), 0);
    const ratings = vendorList.filter(v => v.performance_rating).map(v => v.performance_rating!);
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

    setStats({
      totalVendors: vendorList.length,
      activeVendors: active.length,
      totalContractValue,
      avgPerformanceRating: avgRating,
    });
  };

  const applyFilters = () => {
    let filtered = [...vendors];

    if (searchText) {
      filtered = filtered.filter(v =>
        v.vendor_name.toLowerCase().includes(searchText.toLowerCase()) ||
        v.contact_email?.toLowerCase().includes(searchText.toLowerCase()) ||
        v.contact_name?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    setFilteredVendors(filtered);
  };

  const handleCreate = () => {
    setEditingVendor(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'active',
      country: 'USA',
      payment_terms: 'Net 30',
      default_currency: 'USD',
    });
    setModalVisible(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    form.setFieldsValue({
      ...vendor,
      relationship_start: vendor.relationship_start ? dayjs(vendor.relationship_start) : null,
    });
    setModalVisible(true);
  };

  const handleView = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setDetailModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // Check if vendor has invoices or POs
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('vendor_id', id)
        .limit(1);

      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('vendor_id', id)
        .limit(1);

      if ((invoices && invoices.length > 0) || (pos && pos.length > 0)) {
        message.warning('Cannot delete vendor with existing invoices or purchase orders. Deactivate instead.');
        return;
      }

      const { error } = await supabase
        .from('partner_vendors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      message.success('Vendor deleted successfully');
      fetchVendors();
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      message.error(error.message || 'Failed to delete vendor');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const vendorData = {
        ...values,
        relationship_start: values.relationship_start?.format('YYYY-MM-DD') || null,
      };

      if (editingVendor) {
        const { error } = await supabase
          .from('partner_vendors')
          .update(vendorData)
          .eq('id', editingVendor.id);

        if (error) throw error;
        message.success('Vendor updated successfully');
      } else {
        const { error } = await supabase
          .from('partner_vendors')
          .insert(vendorData);

        if (error) throw error;
        message.success('Vendor created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchVendors();
    } catch (error: any) {
      console.error('Error saving vendor:', error);
      message.error(error.message || 'Failed to save vendor');
    }
  };

  const columns: ColumnsType<Vendor> = [
    {
      title: 'Vendor Name',
      dataIndex: 'vendor_name',
      key: 'vendor_name',
      sorter: (a, b) => a.vendor_name.localeCompare(b.vendor_name),
      render: (text, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => handleView(record)}
            style={{ padding: 0 }}
          >
            {text}
          </Button>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'vendor_type',
      key: 'vendor_type',
      filters: [
        { text: 'Logistics', value: 'logistics' },
        { text: 'Supplies', value: 'supplies' },
        { text: 'Services', value: 'services' },
        { text: 'Technology', value: 'technology' },
      ],
      onFilter: (value, record) => record.vendor_type === value,
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div>{record.contact_name || '-'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.contact_email || '-'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => (
        <Badge
          status={status === 'active' ? 'success' : 'default'}
          text={status}
        />
      ),
    },
    {
      title: 'Payment Terms',
      dataIndex: 'payment_terms',
      key: 'payment_terms',
      render: (terms) => terms || 'Net 30',
    },
    {
      title: 'Performance',
      dataIndex: 'performance_rating',
      key: 'performance_rating',
      sorter: (a, b) => (a.performance_rating || 0) - (b.performance_rating || 0),
      render: (rating) => rating ? `${rating.toFixed(1)}/5.0` : '-',
    },
    {
      title: 'Contract Value',
      dataIndex: 'contract_value',
      key: 'contract_value',
      sorter: (a, b) => (a.contract_value || 0) - (b.contract_value || 0),
      render: (value) => value ? `$${value.toLocaleString()}` : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this vendor?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Card
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #001529 0%, #002140 100%)',
          border: 'none',
        }}
        bodyStyle={{ padding: '32px' }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ color: '#fff', margin: 0 }}>
              Vendor Management
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, display: 'block', marginTop: 8 }}>
              Centralized vendor database for procurement and accounts payable
            </Text>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              Add Vendor
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Vendors"
              value={stats.totalVendors}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Vendors"
              value={stats.activeVendors}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Contract Value"
              value={stats.totalContractValue}
              prefix={<DollarOutlined />}
              precision={0}
              formatter={(value) => `$${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Avg Performance"
              value={stats.avgPerformanceRating}
              precision={1}
              suffix="/ 5.0"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search vendors..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Vendors Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredVendors}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} vendors`,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingVendor ? 'Edit Vendor' : 'Create New Vendor'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="vendor_name"
                label="Vendor Name"
                rules={[{ required: true, message: 'Please enter vendor name' }]}
              >
                <Input placeholder="Company name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="vendor_type"
                label="Vendor Type"
                rules={[{ required: true, message: 'Please select vendor type' }]}
              >
                <Select placeholder="Select type">
                  <Option value="logistics">Logistics</Option>
                  <Option value="supplies">Supplies</Option>
                  <Option value="services">Services</Option>
                  <Option value="technology">Technology</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contact_name" label="Contact Name">
                <Input placeholder="Primary contact" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contact_email"
                label="Contact Email"
                rules={[{ type: 'email', message: 'Please enter a valid email' }]}
              >
                <Input placeholder="contact@vendor.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contact_phone" label="Contact Phone">
                <Input placeholder="(555) 123-4567" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tax_id" label="Tax ID / EIN">
                <Input placeholder="12-3456789" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="Address">
            <Input placeholder="Street address" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="city" label="City">
                <Input placeholder="City" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="state" label="State">
                <Input placeholder="State" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="zip_code" label="Zip Code">
                <Input placeholder="12345" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="country" label="Country">
                <Input placeholder="Country" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status">
                <Select>
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="payment_terms" label="Payment Terms">
                <Select>
                  <Option value="Net 15">Net 15</Option>
                  <Option value="Net 30">Net 30</Option>
                  <Option value="Net 45">Net 45</Option>
                  <Option value="Net 60">Net 60</Option>
                  <Option value="Due on Receipt">Due on Receipt</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="default_currency" label="Default Currency">
                <Select>
                  <Option value="USD">USD</Option>
                  <Option value="EUR">EUR</Option>
                  <Option value="GBP">GBP</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="relationship_start" label="Relationship Start Date">
                <DatePicker style={{ width: '100%' }} format="MM/DD/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="performance_rating" label="Performance Rating (1-5)">
                <InputNumber
                  min={1}
                  max={5}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="4.5"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="contract_value" label="Contract Value">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as unknown as number}
              placeholder="0.00"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title="Vendor Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
          selectedVendor && (
            <Button
              key="edit"
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                setDetailModalVisible(false);
                handleEdit(selectedVendor);
              }}
            >
              Edit
            </Button>
          ),
        ]}
        width={700}
      >
        {selectedVendor && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Vendor Name" span={2}>
              {selectedVendor.vendor_name}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color="blue">{selectedVendor.vendor_type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge
                status={selectedVendor.status === 'active' ? 'success' : 'default'}
                text={selectedVendor.status}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Contact Name">
              {selectedVendor.contact_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Contact Email">
              {selectedVendor.contact_email || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Contact Phone">
              {selectedVendor.contact_phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Tax ID">
              {selectedVendor.tax_id || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Address" span={2}>
              {[
                selectedVendor.address,
                selectedVendor.city,
                selectedVendor.state,
                selectedVendor.zip_code,
              ].filter(Boolean).join(', ') || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Terms">
              {selectedVendor.payment_terms || 'Net 30'}
            </Descriptions.Item>
            <Descriptions.Item label="Default Currency">
              {selectedVendor.default_currency || 'USD'}
            </Descriptions.Item>
            <Descriptions.Item label="Performance Rating">
              {selectedVendor.performance_rating ? `${selectedVendor.performance_rating.toFixed(1)}/5.0` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Contract Value">
              {selectedVendor.contract_value ? `$${selectedVendor.contract_value.toLocaleString()}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Relationship Start">
              {selectedVendor.relationship_start || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {dayjs(selectedVendor.created_at).format('MM/DD/YYYY')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};



