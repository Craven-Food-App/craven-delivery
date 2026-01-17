// @ts-nocheck
import React from 'react';
import { Settings, Plus } from 'lucide-react';
import { Card, Table, Tag, Button, Tabs } from 'antd';
import PositionManagement from './PositionManagement';
import PermissionsManagement from './PermissionsManagement';

interface Policy {
  name: string;
  lastUpdated: string;
  status: 'Current' | 'Drafting' | 'Under Review';
}

interface Department {
  name: string;
  employees: number;
  budget: number;
  head: string;
}

const mockPolicies: Policy[] = [
  { name: 'Paid Time Off (PTO) Policy', lastUpdated: '2024-01-01', status: 'Current' },
  { name: 'Remote Work Eligibility', lastUpdated: '2023-08-15', status: 'Under Review' },
  { name: 'Expense Reimbursement Guide', lastUpdated: '2024-05-20', status: 'Current' },
  { name: 'Code of Conduct', lastUpdated: '2024-06-01', status: 'Current' },
  { name: 'Data Security Protocol', lastUpdated: '2023-11-10', status: 'Drafting' },
];

const mockDepartments: Department[] = [
  { name: 'Development', employees: 110, budget: 15000000, head: 'Alice Johnson' },
  { name: 'Sales', employees: 65, budget: 10000000, head: 'Bob Smith' },
  { name: 'Marketing', employees: 30, budget: 5000000, head: 'Charlie Brown' },
  { name: 'Support', employees: 25, budget: 3000000, head: 'Eve Torres' },
  { name: 'Finance', employees: 15, budget: 2000000, head: 'Jane Doe' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
};

const SystemAdminView: React.FC = () => {
  const getPolicyStatusStyle = (status: Policy['status']) => {
    switch (status) {
      case 'Current': return 'success';
      case 'Under Review': return 'warning';
      case 'Drafting': return 'default';
      default: return 'default';
    }
  };

  const policyColumns = [
    {
      title: 'Policy Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Last Updated',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Policy['status']) => (
        <Tag color={getPolicyStatusStyle(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right' as const,
      render: () => (
        <Button type="link" size="small">
          Edit
        </Button>
      ),
    },
  ];

  const departmentColumns = [
    {
      title: 'Department',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Employees',
      dataIndex: 'employees',
      key: 'employees',
      render: (employees: number) => (
        <span style={{ color: '#1890ff', fontWeight: 600 }}>{employees}</span>
      ),
    },
    {
      title: 'Department Head',
      dataIndex: 'head',
      key: 'head',
    },
    {
      title: 'Annual Budget',
      dataIndex: 'budget',
      key: 'budget',
      align: 'right' as const,
      render: (budget: number) => (
        <span style={{ color: '#52c41a', fontWeight: 600 }}>{formatCurrency(budget)}</span>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'positions',
      label: 'Positions & Roles',
      children: <PositionManagement />,
    },
    {
      key: 'permissions',
      label: 'Permissions',
      children: <PermissionsManagement />,
    },
    {
      key: 'policies',
      label: 'Policies',
      children: (
        <Card
          title={
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '20px' }}>
                <Settings style={{ width: '24px', height: '24px', marginRight: '8px', color: '#ff7a45' }} />
                Policy Management
              </span>
              <Button
                type="link"
                icon={<Plus style={{ width: '16px', height: '16px' }} />}
                style={{ color: '#ff7a45' }}
              >
                Create Policy
              </Button>
            </span>
          }
        >
          <Table
            columns={policyColumns}
            dataSource={mockPolicies}
            rowKey={(record, index) => `${record.name}-${index}`}
            pagination={false}
          />
        </Card>
      ),
    },
    {
      key: 'departments',
      label: 'Departments',
      children: (
        <Card
          title={
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '20px' }}>
              <Settings style={{ width: '24px', height: '24px', marginRight: '8px', color: '#ff7a45' }} />
              Department & Cost Center Configuration
            </span>
          }
        >
          <Table
            columns={departmentColumns}
            dataSource={mockDepartments}
            rowKey="name"
            pagination={false}
          />
        </Card>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <Tabs
        items={tabItems}
        defaultActiveKey="positions"
        style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}
      />
    </div>
  );
};

export default SystemAdminView;

