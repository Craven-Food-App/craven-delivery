// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, InputNumber, Select, DatePicker, message, Card, Row, Col, Statistic, Tag, Divider, Tabs } from 'antd';
import {
  DollarOutlined,
  EditOutlined,
  PlusOutlined,
  HistoryOutlined,
  TrendingUpOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

const { Option } = Select;
const { TabPane } = Tabs;

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  employment_type: string;
  salary: number;
  hourly_rate: number;
  commission_rate: number;
  hire_date: string;
  department?: { name: string };
}

interface CompensationHistory {
  id: string;
  employee_id: string;
  change_type: string;
  previous_salary: number;
  new_salary: number;
  effective_date: string;
  reason: string;
  approved_by: string;
  created_at: string;
}

const CompensationManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [compensationHistory, setCompensationHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [form] = Form.useForm();

  useEffect(() => {
    fetchEmployees();
  }, []);

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
          employment_type,
          salary,
          hourly_rate,
          commission_rate,
          hire_date,
          department:departments(name),
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
            const nameParts = exec.name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            allEmployees.push({
              id: exec.id,
              first_name: firstName,
              last_name: lastName,
              email: exec.email || '',
              position: exec.title || exec.role.toUpperCase(),
              employment_type: 'full-time',
              salary: null,
              hourly_rate: null,
              commission_rate: 0,
              hire_date: new Date().toISOString().split('T')[0],
              department: { name: exec.department || 'Executive' },
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

  const fetchCompensationHistory = async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from('employee_history')
        .select('*')
        .eq('employee_id', employeeId)
        .in('change_type', ['salary_change', 'promotion', 'raise'])
        .order('effective_date', { ascending: false });

      if (error) throw error;
      setCompensationHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching compensation history:', error);
      message.error('Failed to load compensation history');
    }
  };

  const handleEditCompensation = (employee: Employee) => {
    setSelectedEmployee(employee);
    form.setFieldsValue({
      salary: employee.salary,
      hourly_rate: employee.hourly_rate,
      commission_rate: employee.commission_rate,
    });
    setModalVisible(true);
  };

  const handleViewHistory = async (employee: Employee) => {
    setSelectedEmployee(employee);
    await fetchCompensationHistory(employee.id);
    setHistoryModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    if (!selectedEmployee) return;

    try {
      const updateData: any = {};
      
      // Track changes for history
      const changes: any[] = [];

      if (values.salary !== selectedEmployee.salary) {
        updateData.salary = values.salary;
        changes.push({
          employee_id: selectedEmployee.id,
          change_type: 'salary_change',
          previous_salary: selectedEmployee.salary || 0,
          new_salary: values.salary || 0,
          effective_date: new Date().toISOString().split('T')[0],
          reason: 'Manual compensation update',
        });
      }

      if (values.hourly_rate !== selectedEmployee.hourly_rate) {
        updateData.hourly_rate = values.hourly_rate;
      }

      if (values.commission_rate !== selectedEmployee.commission_rate) {
        updateData.commission_rate = values.commission_rate;
      }

      // Update employee compensation
      const { error: updateError } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', selectedEmployee.id);

      if (updateError) throw updateError;

      // Add to history if salary changed
      if (changes.length > 0) {
        const { error: historyError } = await supabase
          .from('employee_history')
          .insert(changes);

        if (historyError) {
          console.error('Error saving history:', historyError);
          // Don't fail the whole operation if history fails
        }
      }

      message.success('Compensation updated successfully');
      setModalVisible(false);
      form.resetFields();
      fetchEmployees();
    } catch (error: any) {
      console.error('Error updating compensation:', error);
      message.error('Failed to update compensation');
    }
  };

  const calculateStats = () => {
    const totalSalary = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
    const avgSalary = employees.length > 0 ? totalSalary / employees.length : 0;
    const fullTimeEmployees = employees.filter(emp => emp.employment_type === 'full-time').length;

    return {
      totalPayroll: totalSalary,
      averageSalary: avgSalary,
      fullTimeCount: fullTimeEmployees,
    };
  };

  const stats = calculateStats();

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (record: Employee) => `${record.first_name} ${record.last_name}`,
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Employment Type',
      dataIndex: 'employment_type',
      key: 'employment_type',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Salary',
      key: 'salary',
      render: (record: Employee) => {
        if (record.employment_type === 'full-time' || record.employment_type === 'part-time') {
          return record.salary ? `$${Number(record.salary).toLocaleString()}/year` : 'N/A';
        } else if (record.hourly_rate) {
          return `$${Number(record.hourly_rate).toLocaleString()}/hour`;
        }
        return 'N/A';
      },
    },
    {
      title: 'Commission',
      dataIndex: 'commission_rate',
      key: 'commission_rate',
      render: (rate: number) => rate ? `${rate}%` : '0%',
    },
    {
      title: 'Department',
      key: 'department',
      render: (record: Employee) => record.department?.name || 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Employee) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditCompensation(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            icon={<HistoryOutlined />}
            onClick={() => handleViewHistory(record)}
          >
            History
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Annual Payroll"
              value={stats.totalPayroll}
              prefix={<DollarOutlined />}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              formatter={(value) => `$${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Average Salary"
              value={stats.averageSalary}
              prefix={<DollarOutlined />}
              precision={0}
              formatter={(value) => `$${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Full-Time Employees"
              value={stats.fullTimeCount}
              prefix={<TrendingUpOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Employee Compensation">
        <Table
          columns={columns}
          dataSource={employees}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={`Edit Compensation - ${selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ''}`}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {(selectedEmployee?.employment_type === 'full-time' || selectedEmployee?.employment_type === 'part-time') && (
            <Form.Item
              name="salary"
              label="Annual Salary"
            >
              <InputNumber
                style={{ width: '100%' }}
                prefix="$"
                min={0}
                step={1000}
                formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          )}

          {selectedEmployee?.employment_type === 'contract' && (
            <Form.Item
              name="hourly_rate"
              label="Hourly Rate"
            >
              <InputNumber
                style={{ width: '100%' }}
                prefix="$"
                min={0}
                step={1}
                formatter={(value) => `$ ${value}`}
                parser={(value) => value!.replace(/\$\s?/g, '')}
              />
            </Form.Item>
          )}

          <Form.Item
            name="commission_rate"
            label="Commission Rate (%)"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              step={0.1}
              formatter={(value) => `${value}%`}
              parser={(value) => value!.replace('%', '')}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Compensation History - ${selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ''}`}
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setHistoryModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {compensationHistory.length === 0 ? (
          <p>No compensation history available.</p>
        ) : (
          <Table
            columns={[
              {
                title: 'Date',
                dataIndex: 'effective_date',
                key: 'effective_date',
                render: (date: string) => dayjs(date).format('MMMM D, YYYY'),
              },
              {
                title: 'Type',
                dataIndex: 'change_type',
                key: 'change_type',
                render: (type: string) => (
                  <Tag color={type === 'raise' ? 'green' : 'blue'}>
                    {type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Tag>
                ),
              },
              {
                title: 'Previous',
                key: 'previous',
                render: (record: any) => 
                  record.previous_salary ? `$${Number(record.previous_salary).toLocaleString()}` : 'N/A',
              },
              {
                title: 'New',
                key: 'new',
                render: (record: any) => 
                  record.new_salary ? `$${Number(record.new_salary).toLocaleString()}` : 'N/A',
              },
              {
                title: 'Reason',
                dataIndex: 'reason',
                key: 'reason',
              },
            ]}
            dataSource={compensationHistory}
            rowKey="id"
            pagination={false}
          />
        )}
      </Modal>
    </div>
  );
};

export default CompensationManagement;

