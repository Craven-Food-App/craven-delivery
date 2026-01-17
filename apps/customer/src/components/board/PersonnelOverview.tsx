// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Statistic, Row, Col, Input } from 'antd';
import { TeamOutlined, UserAddOutlined, RiseOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

const { Search } = Input;

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department?: { name: string };
  employment_status: string;
  salary: number;
  hire_date: string;
  employee_number: string;
}

export const PersonnelOverview: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`*, department:departments(name)`)
        .order('hire_date', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    searchText === '' ||
    emp.first_name.toLowerCase().includes(searchText.toLowerCase()) ||
    emp.last_name.toLowerCase().includes(searchText.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeEmployees = employees.filter(e => e.employment_status === 'active');
  const totalPayroll = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
  const recentHires = employees.filter(e => 
    dayjs(e.hire_date).isAfter(dayjs().subtract(30, 'days'))
  );

  const columns = [
    {
      title: 'Employee #',
      dataIndex: 'employee_number',
      key: 'employee_number',
      width: 120,
    },
    {
      title: 'Name',
      key: 'name',
      render: (_: any, record: Employee) => `${record.first_name} ${record.last_name}`,
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Department',
      key: 'department',
      render: (_: any, record: Employee) => record.department?.name || 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'employment_status',
      key: 'employment_status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          active: 'green',
          'on-leave': 'orange',
          terminated: 'red',
        };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Salary',
      dataIndex: 'salary',
      key: 'salary',
      render: (salary: number) => salary ? `$${salary.toLocaleString()}` : 'N/A',
    },
    {
      title: 'Hire Date',
      dataIndex: 'hire_date',
      key: 'hire_date',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Personnel Overview</h2>
          <p className="text-slate-600">Company-wide employee tracking and metrics</p>
        </div>
        <Search
          placeholder="Search employees..."
          allowClear
          onSearch={setSearchText}
          style={{ width: 300 }}
        />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Employees"
              value={employees.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active"
              value={activeEmployees.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Annual Payroll"
              value={totalPayroll}
              prefix="$"
              precision={0}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="New Hires (30d)"
              value={recentHires.length}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filteredEmployees}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        className="shadow-lg"
        scroll={{ x: 1000 }}
      />
    </div>
  );
};

