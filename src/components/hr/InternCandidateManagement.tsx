// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Input,
  Modal,
  Form,
  Select,
  DatePicker,
  message,
  Popconfirm,
  Statistic,
  Card,
  Row,
  Col,
  Typography,
  Divider,
  Badge,
  Alert,
  Tooltip,
} from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface InternCandidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  location?: string;
  phone?: string;
  track: 'Technology' | 'Strategy/Ops' | 'Operations' | 'Marketing';
  start_date: string;
  manager_id?: string;
  sponsor_id?: string;
  hr_status: string;
  handoff_status: 'Pending' | 'Enrolled' | 'Failed' | 'Blocked';
  handoff_error?: string;
  handoff_enrolled_at?: string;
  created_at: string;
  updated_at: string;
  manager?: { first_name: string; last_name: string };
  sponsor?: { first_name: string; last_name: string };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const InternCandidateManagement: React.FC = () => {
  const [candidates, setCandidates] = useState<InternCandidate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterHandoffStatus, setFilterHandoffStatus] = useState<string>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<InternCandidate | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isHandoffModalVisible, setIsHandoffModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCandidates();
    fetchEmployees();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_intern_candidates')
        .select(`
          *,
          manager:employees!manager_id(id, first_name, last_name),
          sponsor:employees!sponsor_id(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
    } catch (error: any) {
      message.error(`Failed to fetch candidates: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('employment_status', 'active')
        .order('first_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        person: {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          location: values.location,
          phone: values.phone,
        },
        employment: {
          role_type: 'INTERN' as const,
          track: values.track,
          start_date: values.start_date.format('YYYY-MM-DD'),
          manager_id: values.manager_id || undefined,
          sponsor_id: values.sponsor_id || undefined,
        },
        program: {
          initial_role_state: 'INTERN_ACTIVE' as const,
          source: 'HR_HANDOFF' as const,
        },
      };

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        message.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase.functions.invoke('hr-intern-handoff', {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        message.success('Intern candidate enrolled successfully!');
        setIsModalVisible(false);
        form.resetFields();
        fetchCandidates();
      } else {
        message.error(data.error || 'Enrollment failed');
      }
    } catch (error: any) {
      message.error(`Failed to submit candidate: ${error.message}`);
    }
  };

  const handleManualHandoff = async (candidateId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        message.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase.rpc('manual_hr_handoff', {
        p_candidate_id: candidateId,
      });

      if (error) throw error;

      if (data && data[0]?.success) {
        message.success('Handoff completed successfully!');
        fetchCandidates();
      } else {
        message.error(data?.[0]?.error_message || 'Handoff failed');
      }
    } catch (error: any) {
      message.error(`Failed to trigger handoff: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Draft': 'default',
      'Interviewed': 'processing',
      'Offered': 'warning',
      'Pending Acceptance': 'warning',
      'Background Check': 'processing',
      'Accepted': 'success',
      'Withdrawn': 'error',
      'Terminated (Pre-start)': 'error',
    };
    return colors[status] || 'default';
  };

  const getHandoffStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Pending': 'processing',
      'Enrolled': 'success',
      'Failed': 'error',
      'Blocked': 'warning',
    };
    return colors[status] || 'default';
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const matchesSearch = !searchText || 
        `${candidate.first_name} ${candidate.last_name}`.toLowerCase().includes(searchText.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchText.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || candidate.hr_status === filterStatus;
      const matchesHandoffStatus = filterHandoffStatus === 'all' || candidate.handoff_status === filterHandoffStatus;

      return matchesSearch && matchesStatus && matchesHandoffStatus;
    });
  }, [candidates, searchText, filterStatus, filterHandoffStatus]);

  const stats = useMemo(() => {
    const total = candidates.length;
    const accepted = candidates.filter(c => c.hr_status === 'Accepted').length;
    const enrolled = candidates.filter(c => c.handoff_status === 'Enrolled').length;
    const pending = candidates.filter(c => c.handoff_status === 'Pending').length;
    const failed = candidates.filter(c => c.handoff_status === 'Failed').length;

    return { total, accepted, enrolled, pending, failed };
  }, [candidates]);

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (record: InternCandidate) => (
        <Space>
          <Text strong>{record.first_name} {record.last_name}</Text>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Track',
      dataIndex: 'track',
      key: 'track',
      render: (track: string) => <Tag color="blue">{track}</Tag>,
    },
    {
      title: 'Start Date',
      dataIndex: 'start_date',
      key: 'start_date',
      render: (date: string) => date ? dayjs(date).format('MMM DD, YYYY') : '-',
    },
    {
      title: 'HR Status',
      dataIndex: 'hr_status',
      key: 'hr_status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Handoff Status',
      dataIndex: 'handoff_status',
      key: 'handoff_status',
      render: (status: string, record: InternCandidate) => (
        <Space direction="vertical" size="small">
          <Tag color={getHandoffStatusColor(status)}>{status}</Tag>
          {record.handoff_error && (
            <Tooltip title={record.handoff_error}>
              <ExclamationCircleOutlined style={{ color: 'red' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Enrolled At',
      dataIndex: 'handoff_enrolled_at',
      key: 'handoff_enrolled_at',
      render: (date: string) => date ? dayjs(date).format('MMM DD, YYYY HH:mm') : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: InternCandidate) => (
        <Space>
          {record.hr_status === 'Accepted' && record.start_date && record.handoff_status !== 'Enrolled' && (
            <Popconfirm
              title="Trigger manual handoff?"
              description="This will attempt to enroll the intern into the program."
              onConfirm={() => handleManualHandoff(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button size="small" icon={<SendOutlined />} type="primary">
                Retry Handoff
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Candidates"
              value={stats.total}
              prefix={<UserAddOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Accepted"
              value={stats.accepted}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Enrolled"
              value={stats.enrolled}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending/Failed"
              value={stats.pending + stats.failed}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="HR → Intern Program Handoff"
            description="Only candidates with HR Status = 'Accepted' and a Start Date will automatically enroll into the Intern Program. All enrollments are auditable and immutable."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Search
                placeholder="Search by name or email"
                allowClear
                style={{ width: 300 }}
                onSearch={setSearchText}
                onChange={(e) => !e.target.value && setSearchText('')}
              />
              <Select
                placeholder="Filter by HR Status"
                style={{ width: 200 }}
                value={filterStatus}
                onChange={setFilterStatus}
              >
                <Option value="all">All Statuses</Option>
                <Option value="Draft">Draft</Option>
                <Option value="Interviewed">Interviewed</Option>
                <Option value="Offered">Offered</Option>
                <Option value="Pending Acceptance">Pending Acceptance</Option>
                <Option value="Background Check">Background Check</Option>
                <Option value="Accepted">Accepted</Option>
                <Option value="Withdrawn">Withdrawn</Option>
                <Option value="Terminated (Pre-start)">Terminated (Pre-start)</Option>
              </Select>
              <Select
                placeholder="Filter by Handoff Status"
                style={{ width: 200 }}
                value={filterHandoffStatus}
                onChange={setFilterHandoffStatus}
              >
                <Option value="all">All Handoff Statuses</Option>
                <Option value="Pending">Pending</Option>
                <Option value="Enrolled">Enrolled</Option>
                <Option value="Failed">Failed</Option>
                <Option value="Blocked">Blocked</Option>
              </Select>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchCandidates}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => {
                  setSelectedCandidate(null);
                  form.resetFields();
                  setIsModalVisible(true);
                }}
              >
                Add Candidate
              </Button>
            </Space>
          </Space>

          <Table
            columns={columns}
            dataSource={filteredCandidates}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20 }}
          />
        </Space>
      </Card>

      <Modal
        title={selectedCandidate ? 'Edit Candidate' : 'Add Intern Candidate'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            track: 'Technology',
          }}
        >
          <Form.Item
            label="First Name"
            name="first_name"
            rules={[{ required: true, message: 'Please enter first name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Last Name"
            name="last_name"
            rules={[{ required: true, message: 'Please enter last name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Location"
            name="location"
          >
            <Input placeholder="City, State" />
          </Form.Item>

          <Form.Item
            label="Phone"
            name="phone"
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Track"
            name="track"
            rules={[{ required: true, message: 'Please select a track' }]}
          >
            <Select>
              <Option value="Technology">Technology</Option>
              <Option value="Strategy/Ops">Strategy/Ops</Option>
              <Option value="Operations">Operations</Option>
              <Option value="Marketing">Marketing</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Start Date"
            name="start_date"
            rules={[{ required: true, message: 'Please select start date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Manager (Optional)"
            name="manager_id"
          >
            <Select
              showSearch
              placeholder="Select manager"
              optionFilterProp="children"
              filterOption={(input, option) =>
                `${option?.label}`.toLowerCase().includes(input.toLowerCase())
              }
            >
              {employees.map((emp) => (
                <Option key={emp.id} value={emp.id} label={`${emp.first_name} ${emp.last_name}`}>
                  {emp.first_name} {emp.last_name} ({emp.email})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Sponsor (Optional)"
            name="sponsor_id"
          >
            <Select
              showSearch
              placeholder="Select sponsor"
              optionFilterProp="children"
              filterOption={(input, option) =>
                `${option?.label}`.toLowerCase().includes(input.toLowerCase())
              }
            >
              {employees.map((emp) => (
                <Option key={emp.id} value={emp.id} label={`${emp.first_name} ${emp.last_name}`}>
                  {emp.first_name} {emp.last_name} ({emp.email})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Alert
            message="Automatic Enrollment"
            description="Setting HR Status to 'Accepted' with a Start Date will automatically trigger enrollment into the Intern Program."
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Form>
      </Modal>
    </div>
  );
};

export default InternCandidateManagement;

