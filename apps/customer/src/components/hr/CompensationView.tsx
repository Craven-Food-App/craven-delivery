// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  Banknote, Plus, CheckCircle, XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, Table, Tag, Button, Space, Modal, Form, InputNumber, message } from 'antd';

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
  department?: { name: string };
}

interface BenefitEnrollment {
  id: number;
  employeeName: string;
  plan: 'Gold' | 'Silver' | 'Bronze' | 'Waived';
  status: 'Enrolled' | 'Pending' | 'Canceled';
}

interface SalaryBand {
  level: string;
  min: number;
  mid: number;
  max: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
};

const mockSalaryBands: SalaryBand[] = [
  { level: 'Associate', min: 60000, mid: 75000, max: 90000 },
  { level: 'Mid-Level', min: 90000, mid: 110000, max: 130000 },
  { level: 'Senior', min: 130000, mid: 160000, max: 190000 },
  { level: 'Principal', min: 180000, mid: 210000, max: 240000 },
];

const mockEnrollments: BenefitEnrollment[] = [
  { id: 1, employeeName: 'Alice Johnson', plan: 'Gold', status: 'Enrolled' },
  { id: 2, employeeName: 'Bob Smith', plan: 'Silver', status: 'Enrolled' },
  { id: 3, employeeName: 'Charlie Brown', plan: 'Bronze', status: 'Pending' },
  { id: 4, employeeName: 'Dana Scully', plan: 'Waived', status: 'Canceled' },
  { id: 5, employeeName: 'Eve Torres', plan: 'Gold', status: 'Enrolled' },
];

const CompensationView: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
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
          department:departments(name)
        `)
        .eq('employment_status', 'active')
        .order('last_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      message.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalSalary = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
    const avgSalary = employees.length > 0 ? totalSalary / employees.length : 0;
    const fullTimeEmployees = employees.filter(emp => emp.employment_type === 'full-time').length;
    
    // Calculate tax and benefits (mock calculations)
    const taxWithheld = totalSalary * 0.28;
    const benefitsCost = employees.length * 5000; // Mock $5k per employee
    const netPay = totalSalary - taxWithheld - benefitsCost;

    return {
      totalGrossPay: totalSalary,
      taxWithheld,
      benefitsCost,
      netPay,
      averageSalary: avgSalary,
      fullTimeCount: fullTimeEmployees,
      payrollDate: new Date().toISOString().split('T')[0],
    };
  };

  const stats = calculateStats();
  const enrollmentSummary = mockEnrollments.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<BenefitEnrollment['status'], number>);

  const getEnrollmentStatusStyle = (status: BenefitEnrollment['status']) => {
    switch (status) {
      case 'Enrolled': return 'success';
      case 'Pending': return 'warning';
      case 'Canceled': return 'error';
      default: return 'default';
    }
  };

  const salaryBandColumns = [
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
    },
    {
      title: 'Minimum',
      key: 'min',
      render: (record: SalaryBand) => formatCurrency(record.min),
    },
    {
      title: 'Midpoint',
      key: 'mid',
      render: (record: SalaryBand) => formatCurrency(record.mid),
    },
    {
      title: 'Maximum',
      key: 'max',
      render: (record: SalaryBand) => formatCurrency(record.max),
    },
    {
      title: 'Comp Ratio Avg.',
      key: 'ratio',
      align: 'right' as const,
      render: () => <span style={{ color: '#52c41a', fontWeight: 600 }}>~102%</span>,
    },
  ];

  const enrollmentColumns = [
    {
      title: 'Employee',
      dataIndex: 'employeeName',
      key: 'employeeName',
    },
    {
      title: 'Health Plan',
      dataIndex: 'plan',
      key: 'plan',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: BenefitEnrollment['status']) => (
        <Tag color={getEnrollmentStatusStyle(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right' as const,
      render: () => (
        <Button type="link" size="small">
          Manage
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Payroll Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <Card
          style={{
            background: 'linear-gradient(135deg, #ff7a45 0%, #ff9d6e 100%)',
            color: '#fff',
            border: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <Banknote style={{ width: '24px', height: '24px', marginRight: '8px' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Total Gross Payroll</h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0' }}>
            {formatCurrency(stats.totalGrossPay)}
          </p>
          <p style={{ fontSize: '12px', opacity: 0.9, margin: 0 }}>
            For period ending: {stats.payrollDate}
          </p>
        </Card>

        <Card>
          <h3 style={{ fontSize: '12px', fontWeight: 500, color: '#666', margin: 0, marginBottom: '8px' }}>
            Tax Withheld
          </h3>
          <p style={{ fontSize: '24px', fontWeight: 700, color: '#ff4d4f', margin: 0 }}>
            {formatCurrency(stats.taxWithheld)}
          </p>
        </Card>

        <Card>
          <h3 style={{ fontSize: '12px', fontWeight: 500, color: '#666', margin: 0, marginBottom: '8px' }}>
            Total Benefits Cost
          </h3>
          <p style={{ fontSize: '24px', fontWeight: 700, color: '#1890ff', margin: 0 }}>
            {formatCurrency(stats.benefitsCost)}
          </p>
        </Card>

        <Card>
          <h3 style={{ fontSize: '12px', fontWeight: 500, color: '#666', margin: 0, marginBottom: '8px' }}>
            Net Pay Distribution
          </h3>
          <p style={{ fontSize: '24px', fontWeight: 700, color: '#52c41a', margin: 0 }}>
            {formatCurrency(stats.netPay)}
          </p>
        </Card>
      </div>

      {/* Salary Bands */}
      <Card
        title="Salary Bands & Pay Grades"
        extra={
          <Button type="link" icon={<Plus style={{ width: '16px', height: '16px' }} />}>
            Add Band
          </Button>
        }
      >
        <Table
          columns={salaryBandColumns}
          dataSource={mockSalaryBands}
          rowKey="level"
          pagination={false}
        />
      </Card>

      {/* Benefits Enrollment */}
      <Card
        title={`Benefits Enrollment (${enrollmentSummary.Enrolled || 0} Enrolled)`}
      >
        <Table
          columns={enrollmentColumns}
          dataSource={mockEnrollments}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default CompensationView;

