// @ts-nocheck
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Layout, Typography, Row, Col, Statistic, Tabs, Table, Badge, Card, Button, Space, Divider, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Spin } from 'antd';
import { DashboardOutlined, CarOutlined, ShopOutlined, FileProtectOutlined, AlertOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, MailOutlined, FileTextOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useExecAuth } from '@/hooks/useExecAuth';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ExecutiveInboxIMessage } from '@/components/executive/ExecutiveInboxIMessage';
import cravenCLogo from '@/assets/craven-c-new.png';

// Lazy load heavy components
const BusinessEmailSystem = lazy(() => import('@/components/executive/BusinessEmailSystem'));
const ExecutiveWordProcessor = lazy(() => import('@/components/executive/ExecutiveWordProcessor'));
const PurchaseOrderManagement = lazy(() => import('@/components/coo/PurchaseOrderManagement').then(m => ({ default: m.PurchaseOrderManagement })));
const EmbeddedCComms = lazy(() => import('@/portals/internal-comms/EmbeddedCComms'));

const { Header, Content } = Layout;
const { TabPane } = Tabs;

export default function COOPortal() {
  const { loading, user, execUser, isAuthorized, signOut } = useExecAuth();
  const navigate = useNavigate();
  
  // Track user activity
  useActivityTracking('coo');
  
  // Auto-logout after 30 minutes of inactivity
  useAutoLogout('coo');
  
  const [metrics, setMetrics] = useState({
    activeOrders: 0,
    driversOnRoad: 0,
    avgDeliveryTime: 0,
    zonesCovered: 0,
    vendorScore: 95,
    complianceStatus: 'compliant',
    vehiclesInService: 0,
    pendingCompliance: 0
  });
  const [isChatCollapsed, setIsChatCollapsed] = useState(true);

  useEffect(() => {
    if (isAuthorized) {
      fetchMetrics();
    }
  }, [isAuthorized]);

  const fetchMetrics = async () => {
    try {
      const [ordersRes, driversRes, vehiclesRes, complianceRes] = await Promise.all([
        supabase.from('orders').select('id').eq('order_status', 'active'),
        supabase.from('driver_profiles').select('id').eq('is_available', true),
        supabase.from('fleet_vehicles').select('id').eq('status', 'active'),
        supabase.from('compliance_records').select('id').eq('status', 'valid')
      ]);

      setMetrics({
        activeOrders: ordersRes.data?.length || 0,
        driversOnRoad: driversRes.data?.length || 0,
        avgDeliveryTime: 25,
        zonesCovered: 8,
        vendorScore: 95,
        complianceStatus: 'compliant',
        vehiclesInService: vehiclesRes.data?.length || 0,
        pendingCompliance: complianceRes.data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching COO metrics:', error);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!isAuthorized) return <div className="flex items-center justify-center h-screen">Access Denied - COO Portal</div>;

  return (
    <Layout className="min-h-screen">
      <Header className="bg-white border-b flex items-center justify-between px-6">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hub')}>Back to Hub</Button>
          <Typography.Title level={3} className="m-0">COO Operations Command</Typography.Title>
        </Space>
        <Space>
          <Button onClick={() => navigate('/ceo')}>CEO Portal</Button>
          <Button onClick={() => navigate('/cfo')}>CFO Portal</Button>
          <Button onClick={signOut}>Sign Out</Button>
        </Space>
      </Header>
      
      <Content className="p-6 bg-gray-50">
        {/* Executive Chat - Collapsible */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Typography.Title level={5} className="m-0">Executive Chat</Typography.Title>
            <Button size="small" onClick={() => setIsChatCollapsed((prev) => !prev)}>
              {isChatCollapsed ? 'Expand' : 'Collapse'}
            </Button>
          </div>
          {!isChatCollapsed && (
            <ExecutiveInboxIMessage role="coo" deviceId={`coo-portal-${window.location.hostname}`} />
          )}
        </div>
        <Divider style={{ margin: '16px 0' }} />

        <Row gutter={16} className="mb-6">
          <Col xs={12} md={6}>
            <Card>
              <Statistic title="Active Orders" value={metrics.activeOrders} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic title="Drivers Active" value={metrics.driversOnRoad} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic title="Avg Delivery Time" value={metrics.avgDeliveryTime} suffix="min" />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic title="Zones Covered" value={metrics.zonesCovered} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} className="mb-6">
          <Col xs={12} md={6}>
            <Card>
              <Statistic title="Vehicles Active" value={metrics.vehiclesInService} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic title="Vendor Score" value={metrics.vendorScore} suffix="%" />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic title="Compliance Records" value={metrics.pendingCompliance} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className={metrics.complianceStatus === 'compliant' ? 'bg-green-50' : 'bg-red-50'}>
              <Statistic title="Compliance" value={metrics.complianceStatus} />
            </Card>
          </Col>
        </Row>

        <Tabs defaultActiveKey="fleet">
          <TabPane tab={<><CarOutlined /> Fleet Management</>} key="fleet">
            <FleetDashboard />
          </TabPane>
          <TabPane tab={<><ShopOutlined /> Partners & Vendors</>} key="partners">
            <PartnerManagement />
          </TabPane>
          <TabPane tab={<><ShoppingCartOutlined /> Purchase Orders</>} key="purchase-orders">
            <PurchaseOrderManagement />
          </TabPane>
          <TabPane tab={<><FileProtectOutlined /> Compliance</>} key="compliance">
            <ComplianceDashboard />
          </TabPane>
          <TabPane tab={<><MailOutlined /> Executive Communications</>} key="communications">
            <BusinessEmailSystem />
          </TabPane>
          <TabPane tab={<><DashboardOutlined /> Operations Analytics</>} key="analytics">
            <OperationsAnalytics />
          </TabPane>
          <TabPane tab={<><FileTextOutlined /> Word Processor</>} key="word">
            <ExecutiveWordProcessor storageKey="coo" />
          </TabPane>
          <TabPane tab={<><img src={cravenCLogo} alt="C" style={{ height: 16, width: 'auto', marginRight: 4 }} />C Comms</>} key="c-comms">
            <EmbeddedCComms />
          </TabPane>
        </Tabs>
      </Content>
    </Layout>
  );
}

function FleetDashboard() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('fleet_vehicles').select('*').order('created_at', { ascending: false }).limit(100);
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      message.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingVehicle(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingVehicle(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const vehicle = vehicles.find(v => v.id === id);
      const { error } = await supabase.from('fleet_vehicles').delete().eq('id', id);
      if (error) throw error;
      message.success('Vehicle deleted successfully');
      // Log audit trail
      await supabase.rpc('log_ceo_action', {
        p_action_type: 'delete_vehicle',
        p_action_category: 'system',
        p_target_type: 'fleet_vehicles',
        p_target_id: id,
        p_target_name: vehicle?.license_plate || 'Vehicle',
        p_description: `Deleted vehicle ${vehicle?.license_plate}`,
        p_severity: 'normal'
      }).catch(() => {});
      fetchVehicles();
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      message.error(error.message || 'Failed to delete vehicle');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingVehicle) {
        const { error } = await supabase.from('fleet_vehicles').update(values).eq('id', editingVehicle.id);
        if (error) throw error;
        message.success('Vehicle updated successfully');
        // Log audit trail
        await supabase.rpc('log_ceo_action', {
          p_action_type: 'update_vehicle',
          p_action_category: 'system',
          p_target_type: 'fleet_vehicles',
          p_target_id: editingVehicle.id,
          p_target_name: values.license_plate || 'Vehicle',
          p_description: `Updated vehicle ${values.license_plate}: ${JSON.stringify(values)}`,
          p_severity: 'normal'
        }).catch(() => {});
      } else {
        const { error } = await supabase.from('fleet_vehicles').insert(values);
        if (error) throw error;
        message.success('Vehicle created successfully');
        // Log audit trail
        await supabase.rpc('log_ceo_action', {
          p_action_type: 'create_vehicle',
          p_action_category: 'system',
          p_target_type: 'fleet_vehicles',
          p_target_id: null,
          p_target_name: values.license_plate || 'Vehicle',
          p_description: `Created new vehicle: ${values.license_plate}`,
          p_severity: 'normal'
        }).catch(() => {});
      }
      setModalVisible(false);
      form.resetFields();
      fetchVehicles();
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      message.error(error.message || 'Failed to save vehicle');
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <Typography.Title level={4} className="m-0">Fleet Vehicles</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Vehicle
        </Button>
      </div>

      <Table 
        loading={loading}
        dataSource={vehicles}
        rowKey="id"
        columns={[
          { title: 'Vehicle Type', dataIndex: 'vehicle_type', key: 'vehicle_type' },
          { title: 'License Plate', dataIndex: 'license_plate', key: 'license_plate' },
          { title: 'Status', dataIndex: 'status', key: 'status', render: (status) => <Badge status={status === 'active' ? 'success' : 'default'} text={status} /> },
          { title: 'Registration Expires', dataIndex: 'registration_expiry', key: 'registration_expiry' },
          { title: 'Insurance Expires', dataIndex: 'insurance_expiry', key: 'insurance_expiry' },
          {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, record) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                <Popconfirm title="Delete this vehicle?" onConfirm={() => handleDelete(record.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />

      <Modal
        title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="vehicle_type" label="Vehicle Type" rules={[{ required: true }]}>
            <Select placeholder="Select type">
              <Select.Option value="car">Car</Select.Option>
              <Select.Option value="truck">Truck</Select.Option>
              <Select.Option value="van">Van</Select.Option>
              <Select.Option value="motorcycle">Motorcycle</Select.Option>
              <Select.Option value="bicycle">Bicycle</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="license_plate" label="License Plate" rules={[{ required: true }]}>
            <Input placeholder="ABC-123" />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="maintenance">Maintenance</Select.Option>
              <Select.Option value="retired">Retired</Select.Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="registration_expiry" label="Registration Expiry" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="insurance_expiry" label="Insurance Expiry" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

function PartnerManagement() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('partner_vendors').select('*').order('created_at', { ascending: false }).limit(100);
      setPartners(data || []);
    } catch (error) {
      console.error('Error fetching partners:', error);
      message.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPartner(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingPartner(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('partner_vendors').delete().eq('id', id);
      if (error) throw error;
      message.success('Partner deleted successfully');
      fetchPartners();
    } catch (error: any) {
      console.error('Error deleting partner:', error);
      message.error(error.message || 'Failed to delete partner');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingPartner) {
        const { error } = await supabase.from('partner_vendors').update(values).eq('id', editingPartner.id);
        if (error) throw error;
        message.success('Partner updated successfully');
      } else {
        const { error } = await supabase.from('partner_vendors').insert(values);
        if (error) throw error;
        message.success('Partner created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      fetchPartners();
    } catch (error: any) {
      console.error('Error saving partner:', error);
      message.error(error.message || 'Failed to save partner');
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <Typography.Title level={4} className="m-0">Partners & Vendors</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Partner
        </Button>
      </div>

      <Table 
        loading={loading}
        dataSource={partners}
        rowKey="id"
        columns={[
          { title: 'Vendor Name', dataIndex: 'vendor_name', key: 'vendor_name' },
          { title: 'Type', dataIndex: 'vendor_type', key: 'vendor_type' },
          { title: 'Status', dataIndex: 'status', key: 'status' },
          { title: 'Performance Rating', dataIndex: 'performance_rating', key: 'performance_rating' },
          { title: 'Contact Email', dataIndex: 'contact_email', key: 'contact_email' },
          {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, record) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                <Popconfirm title="Delete this partner?" onConfirm={() => handleDelete(record.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />

      <Modal
        title={editingPartner ? 'Edit Partner' : 'Add Partner'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="vendor_name" label="Vendor Name" rules={[{ required: true }]}>
            <Input placeholder="Acme Supplies Inc" />
          </Form.Item>
          <Form.Item name="vendor_type" label="Type" rules={[{ required: true }]}>
            <Select placeholder="Select type">
              <Select.Option value="supplier">Supplier</Select.Option>
              <Select.Option value="logistics">Logistics</Select.Option>
              <Select.Option value="maintenance">Maintenance</Select.Option>
              <Select.Option value="technology">Technology</Select.Option>
              <Select.Option value="services">Services</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="contact_email" label="Contact Email" rules={[{ required: true, type: 'email' }]}>
            <Input type="email" placeholder="contact@vendor.com" />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="on-hold">On Hold</Select.Option>
              <Select.Option value="terminated">Terminated</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="performance_rating" label="Performance Rating">
            <InputNumber min={0} max={100} placeholder="0-100" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function ComplianceDashboard() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCompliance();
  }, []);

  const fetchCompliance = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('compliance_records').select('*').order('created_at', { ascending: false }).limit(100);
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching compliance:', error);
      message.error('Failed to load compliance records');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('compliance_records').delete().eq('id', id);
      if (error) throw error;
      message.success('Compliance record deleted successfully');
      fetchCompliance();
    } catch (error: any) {
      console.error('Error deleting record:', error);
      message.error(error.message || 'Failed to delete record');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingRecord) {
        const { error } = await supabase.from('compliance_records').update(values).eq('id', editingRecord.id);
        if (error) throw error;
        message.success('Compliance record updated successfully');
      } else {
        const { error } = await supabase.from('compliance_records').insert(values);
        if (error) throw error;
        message.success('Compliance record created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      fetchCompliance();
    } catch (error: any) {
      console.error('Error saving record:', error);
      message.error(error.message || 'Failed to save record');
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <Typography.Title level={4} className="m-0">Compliance Records</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Record
        </Button>
      </div>

      <Table 
        loading={loading}
        dataSource={records}
        rowKey="id"
        columns={[
          { title: 'Type', dataIndex: 'record_type', key: 'record_type' },
          { title: 'Entity Type', dataIndex: 'entity_type', key: 'entity_type' },
          { title: 'Status', dataIndex: 'status', key: 'status' },
          { title: 'Expiry Date', dataIndex: 'expiry_date', key: 'expiry_date' },
          { title: 'Issued By', dataIndex: 'issued_by', key: 'issued_by' },
          {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, record) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                <Popconfirm title="Delete this record?" onConfirm={() => handleDelete(record.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />

      <Modal
        title={editingRecord ? 'Edit Compliance Record' : 'Add Compliance Record'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="record_type" label="Record Type" rules={[{ required: true }]}>
            <Select placeholder="Select type">
              <Select.Option value="license">License</Select.Option>
              <Select.Option value="permit">Permit</Select.Option>
              <Select.Option value="certification">Certification</Select.Option>
              <Select.Option value="insurance">Insurance</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="entity_type" label="Entity Type" rules={[{ required: true }]}>
            <Select placeholder="Select entity">
              <Select.Option value="business">Business</Select.Option>
              <Select.Option value="vehicle">Vehicle</Select.Option>
              <Select.Option value="employee">Employee</Select.Option>
              <Select.Option value="facility">Facility</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="valid">Valid</Select.Option>
              <Select.Option value="expired">Expired</Select.Option>
              <Select.Option value="pending">Pending</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="expiry_date" label="Expiry Date" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="issued_by" label="Issued By">
            <Input placeholder="State DMV" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function OperationsAnalytics() {
  return (
    <div className="text-center p-12 text-gray-500">
      Operations analytics dashboard coming soon...
    </div>
  );
}

