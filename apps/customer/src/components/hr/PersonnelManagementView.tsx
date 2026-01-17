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
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
  Statistic,
  Card,
  Row,
  Col,
  Avatar,
  Dropdown,
  Typography,
  Divider,
  Badge,
} from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  TeamOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  BankOutlined,
  RiseOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import type { MenuProps } from 'antd';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department_id: string;
  department?: { name: string };
  employment_type: string;
  employment_status: string;
  salary: number;
  hourly_rate: number;
  hire_date: string;
  employee_number: string;
  phone?: string;
}

interface Department {
  id: string;
  name: string;
  description: string;
}

const PersonnelManagementView: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      const { data: dbPositions, error } = await supabase
        .from('positions')
        .select('id, title, code, is_executive')
        .eq('is_active', true)
        .order('is_executive', { ascending: false })
        .order('title', { ascending: true });

      if (!error && dbPositions && dbPositions.length > 0) {
        setPositions(dbPositions);
      } else {
        // Fallback: positions will be empty, allowing custom entry
        setPositions([]);
      }
    } catch (err) {
      console.error('Error fetching positions:', err);
      setPositions([]);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Fetch regular employees (active only)
      const { data: regularEmployees, error: employeesError } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          position,
          department_id,
          department:departments(name),
          employment_type,
          employment_status,
          salary,
          hourly_rate,
          hire_date,
          employee_number,
          phone,
          user_id
        `)
        .eq('employment_status', 'active')
        .order('last_name');

      if (employeesError) throw employeesError;

      // Fetch C-suite executives
      const { data: executives, error: execError } = await supabase
        .from('exec_users')
        .select('id, user_id, role, title, department, name, email')
        .not('user_id', 'is', null);

      if (execError) {
        console.error('Error fetching executives:', execError);
        // Continue with just regular employees if exec fetch fails
      }

      // Combine both lists
      const allEmployees: any[] = [];

      // Add regular employees
      if (regularEmployees) {
        allEmployees.push(...regularEmployees);
      }

      // Add C-suite executives that don't already exist as employees
      if (executives) {
        for (const exec of executives) {
          const existsAsEmployee = regularEmployees?.some(
            (emp: any) => emp.user_id === exec.user_id
          );

          if (!existsAsEmployee && exec.user_id && exec.name) {
            // Parse name
            const nameParts = exec.name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Try to find employee number
            let employeeNumber = '';
            if (exec.user_id) {
              const { data: empData } = await supabase
                .from('employees')
                .select('employee_number')
                .eq('user_id', exec.user_id)
                .single();
              employeeNumber = empData?.employee_number || '';
            }

            allEmployees.push({
              id: exec.id,
              first_name: firstName,
              last_name: lastName,
              email: exec.email || '',
              position: exec.title || exec.role.toUpperCase(),
              department_id: null,
              department: { name: exec.department || 'Executive' },
              employment_type: 'full-time',
              employment_status: 'active',
              salary: null,
              hourly_rate: null,
              hire_date: new Date().toISOString().split('T')[0],
              employee_number: employeeNumber,
              phone: null,
              user_id: exec.user_id,
              is_executive: true,
            });
          }
        }
      }

      // Sort by last name
      allEmployees.sort((a, b) => a.last_name.localeCompare(b.last_name));

      setEmployees(allEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      message.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        searchText === '' ||
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchText.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchText.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchText.toLowerCase()) ||
        emp.employee_number.includes(searchText);
      
      const matchesDepartment = filterDepartment === 'all' || emp.department_id === filterDepartment;
      const matchesStatus = filterStatus === 'all' || emp.employment_status === filterStatus;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchText, filterDepartment, filterStatus]);

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.employment_status === 'active').length;
    const onLeave = employees.filter((e) => e.employment_status === 'on_leave').length;
    const terminated = employees.filter((e) => e.employment_status === 'terminated').length;
    
    const departmentsCount = new Set(employees.map((e) => e.department_id)).size;

    return { total, active, onLeave, terminated, departmentsCount };
  }, [employees]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'on_leave':
        return 'warning';
      case 'terminated':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleOutlined />;
      case 'on_leave':
        return <ClockCircleOutlined />;
      case 'terminated':
        return <CloseCircleOutlined />;
      default:
        return <UserOutlined />;
    }
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    form.setFieldsValue({
      ...employee,
      hire_date: employee.hire_date ? dayjs(employee.hire_date) : null,
    });
    setIsEditModalVisible(true);
  };

  const handleDelete = async (employeeId: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ employment_status: 'terminated' })
        .eq('id', employeeId);

      if (error) throw error;
      message.success('Employee status updated');
      fetchEmployees();
    } catch (error: any) {
      message.error('Failed to update employee');
      console.error(error);
    }
  };

  const handleEditSubmit = async (values: any) => {
    try {
      // Get the current employee data before update
      const { data: currentEmployee } = await supabase
        .from('employees')
        .select('position, department_id')
        .eq('id', selectedEmployee?.id)
        .single();

      // Update employee
      const updateData = {
        ...values,
        hire_date: values.hire_date ? values.hire_date.format('YYYY-MM-DD') : null,
      };
      
      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', selectedEmployee?.id);

      if (error) throw error;

      // Track position change in employee_history if position changed
      if (currentEmployee && values.position && currentEmployee.position !== values.position) {
        const { data: userData } = await supabase.auth.getUser();
        
        await supabase
          .from('employee_history')
          .insert({
            employee_id: selectedEmployee?.id,
            change_type: 'position_change',
            old_value: currentEmployee.position,
            new_value: values.position,
            changed_by: userData?.user?.id || null,
            effective_date: new Date().toISOString().split('T')[0],
            notes: `Position changed from "${currentEmployee.position}" to "${values.position}"`,
          });
      }

      message.success('Employee updated successfully');
      setIsEditModalVisible(false);
      form.resetFields();
      fetchEmployees();
    } catch (error: any) {
      message.error('Failed to update employee');
      console.error(error);
    }
  };

  const handleAddSubmit = async (values: any) => {
    try {
      const employeeNumber = `EMP${String(employees.length + 1).padStart(6, '0')}`;
      
      const { error } = await supabase
        .from('employees')
        .insert({
          ...values,
          employee_number: employeeNumber,
          hire_date: values.hire_date ? values.hire_date.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
          employment_status: 'active',
        });

      if (error) throw error;
      message.success('Employee added successfully');
      setIsAddModalVisible(false);
      addForm.resetFields();
      fetchEmployees();
    } catch (error: any) {
      message.error('Failed to add employee');
      console.error(error);
    }
  };

  const getActionMenu = (employee: Employee): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit Employee',
      icon: <EditOutlined />,
      onClick: () => handleEdit(employee),
    },
    {
      key: 'email',
      label: 'Send Email',
      icon: <MailOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'terminate',
      label: 'Terminate',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: 'Terminate Employee',
          content: `Are you sure you want to terminate ${employee.first_name} ${employee.last_name}?`,
          onOk: () => handleDelete(employee.id),
        });
      },
    },
  ];

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      width: 250,
      render: (record: Employee) => (
        <Space>
          <Avatar style={{ backgroundColor: '#ff7a45' }}>
            {record.first_name[0]}{record.last_name[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>
              {record.first_name} {record.last_name}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.employee_number}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      width: 200,
      render: (position: string) => (
        <Tag color="blue">{position}</Tag>
      ),
    },
    {
      title: 'Department',
      key: 'department',
      width: 150,
      render: (record: Employee) => (
        <Text>{record.department?.name || 'N/A'}</Text>
      ),
    },
    {
      title: 'Employment Type',
      dataIndex: 'employment_type',
      key: 'employment_type',
      width: 130,
      render: (type: string) => (
        <Tag>{type || 'N/A'}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'employment_status',
      key: 'employment_status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Hire Date',
      dataIndex: 'hire_date',
      key: 'hire_date',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('MMM DD, YYYY') : 'N/A'),
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 180,
      render: (record: Employee) => (
        <Space direction="vertical" size={0}>
          <Space size={4}>
            <MailOutlined style={{ color: '#1890ff' }} />
            <Text copyable={{ text: record.email }} style={{ fontSize: '12px' }}>
              {record.email}
            </Text>
          </Space>
          {record.phone && (
            <Space size={4}>
              <PhoneOutlined style={{ color: '#52c41a' }} />
              <Text style={{ fontSize: '12px' }}>{record.phone}</Text>
            </Space>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (record: Employee) => (
        <Dropdown menu={{ items: getActionMenu(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Employees"
              value={stats.total}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active"
              value={stats.active}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="On Leave"
              value={stats.onLeave}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Departments"
              value={stats.departmentsCount}
              prefix={<BankOutlined style={{ color: '#ff7a45' }} />}
              valueStyle={{ color: '#ff7a45' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Search and Filter Bar */}
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Search by name, email, position, or ID"
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="All Departments"
              size="large"
              style={{ width: '100%' }}
              value={filterDepartment}
              onChange={setFilterDepartment}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">All Departments</Option>
              {departments.map((dept) => (
                <Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="All Statuses"
              size="large"
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={setFilterStatus}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">All Statuses</Option>
              <Option value="active">Active</Option>
              <Option value="on_leave">On Leave</Option>
              <Option value="terminated">Terminated</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={4}>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              size="large"
              block
              onClick={() => setIsAddModalVisible(true)}
              style={{ backgroundColor: '#ff7a45', borderColor: '#ff7a45' }}
            >
              Add Employee
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Employee Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredEmployees}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} employees`,
          }}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        title="Edit Employee"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="position" label="Position" rules={[{ required: true }]}>
            <Select 
              showSearch
              placeholder="Select position"
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {/* Group executives first */}
              {positions.filter(p => p.is_executive).map(p => (
                <Option key={p.id || p.code} value={p.title || p.label}>
                  {p.title || p.label}
                </Option>
              ))}
              {/* Then regular positions */}
              {positions.filter(p => !p.is_executive).map(p => (
                <Option key={p.id || p.code} value={p.title || p.label}>
                  {p.title || p.label}
                </Option>
              ))}
              {/* Allow custom entry if not found */}
              <Option value="__CUSTOM__">+ Enter Custom Position</Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="department_id" label="Department">
                <Select placeholder="Select department">
                  {departments.map((dept) => (
                    <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="employment_type" label="Employment Type">
                <Select>
                  <Option value="full-time">Full-Time</Option>
                  <Option value="part-time">Part-Time</Option>
                  <Option value="contract">Contract</Option>
                  <Option value="intern">Intern</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="salary" label="Salary">
                <InputNumber style={{ width: '100%' }} prefix="$" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hourly_rate" label="Hourly Rate">
                <InputNumber style={{ width: '100%' }} prefix="$" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="hire_date" label="Hire Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Employee Modal */}
      <Modal
        title="Add New Employee"
        open={isAddModalVisible}
        onCancel={() => {
          setIsAddModalVisible(false);
          addForm.resetFields();
        }}
        onOk={() => addForm.submit()}
        width={600}
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={handleAddSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="position" label="Position" rules={[{ required: true }]}>
            <Select 
              showSearch
              placeholder="Select position"
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {/* Group executives first */}
              {positions.filter(p => p.is_executive).map(p => (
                <Option key={p.id || p.code} value={p.title || p.label}>
                  {p.title || p.label}
                </Option>
              ))}
              {/* Then regular positions */}
              {positions.filter(p => !p.is_executive).map(p => (
                <Option key={p.id || p.code} value={p.title || p.label}>
                  {p.title || p.label}
                </Option>
              ))}
              {/* Allow custom entry if not found */}
              <Option value="__CUSTOM__">+ Enter Custom Position</Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="department_id" label="Department">
                <Select placeholder="Select department">
                  {departments.map((dept) => (
                    <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="employment_type" label="Employment Type">
                <Select>
                  <Option value="full-time">Full-Time</Option>
                  <Option value="part-time">Part-Time</Option>
                  <Option value="contract">Contract</Option>
                  <Option value="intern">Intern</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="salary" label="Salary">
                <InputNumber style={{ width: '100%' }} prefix="$" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hourly_rate" label="Hourly Rate">
                <InputNumber style={{ width: '100%' }} prefix="$" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="hire_date" label="Hire Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PersonnelManagementView;

