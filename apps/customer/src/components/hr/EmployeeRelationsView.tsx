// @ts-nocheck
import React from 'react';
import { HeartHandshake, Plus, TrendingUp } from 'lucide-react';
import { Card, Table, Tag, Button } from 'antd';

interface Case {
  id: number;
  subject: string;
  type: 'Grievance' | 'Disciplinary' | 'Investigation' | 'Conflict';
  status: 'Open' | 'Pending Review' | 'Closed';
  assignedTo: string;
  priority: 'High' | 'Medium' | 'Low';
}

const mockWellnessMetrics = {
  eapUsageLastMonth: 12,
  eapUsageChange: 2,
  averageSentimentScore: 7.8,
  sentimentChange: 0.3,
};

const mockCases: Case[] = [
  { id: 1, subject: 'Complaint about shift scheduling', type: 'Grievance', status: 'Open', assignedTo: 'Jane Doe', priority: 'High' },
  { id: 2, subject: 'Attendance Warning - Q2', type: 'Disciplinary', status: 'Pending Review', assignedTo: 'John Smith', priority: 'Medium' },
  { id: 3, subject: 'Conflict between Sales & Marketing', type: 'Conflict', status: 'Open', assignedTo: 'Jane Doe', priority: 'High' },
  { id: 4, subject: 'Unauthorized data access report', type: 'Investigation', status: 'Closed', assignedTo: 'John Smith', priority: 'Low' },
];

const EmployeeRelationsView: React.FC = () => {
  const openCases = mockCases.filter(c => c.status === 'Open').length;

  const getCaseStatusStyle = (status: Case['status']) => {
    switch (status) {
      case 'Open': return 'error';
      case 'Pending Review': return 'warning';
      case 'Closed': return 'default';
      default: return 'default';
    }
  };

  const getPriorityStyle = (priority: Case['priority']) => {
    switch (priority) {
      case 'High': return { color: '#ff4d4f', fontWeight: 700 };
      case 'Medium': return { color: '#faad14' };
      case 'Low': return { color: '#52c41a' };
      default: return {};
    }
  };

  const columns = [
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: Case['priority']) => (
        <span style={getPriorityStyle(priority)}>{priority}</span>
      ),
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Case['status']) => (
        <Tag color={getCaseStatusStyle(status)}>{status}</Tag>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Wellness Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <Card>
          <h3 style={{ fontSize: '12px', fontWeight: 500, color: '#666', margin: 0, marginBottom: '8px' }}>
            EAP Usage (Last Month)
          </h3>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#1890ff', margin: 0 }}>
            {mockWellnessMetrics.eapUsageLastMonth} Sessions
          </p>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
            <TrendingUp style={{ width: '16px', height: '16px', marginRight: '4px', color: '#52c41a' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#52c41a' }}>
              {mockWellnessMetrics.eapUsageChange} Sessions vs. Prev. Month
            </span>
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: '12px', fontWeight: 500, color: '#666', margin: 0, marginBottom: '8px' }}>
            Average Sentiment Score
          </h3>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#52c41a', margin: 0 }}>
            {mockWellnessMetrics.averageSentimentScore.toFixed(1)}/10
          </p>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
            <TrendingUp style={{ width: '16px', height: '16px', marginRight: '4px', color: '#52c41a' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#52c41a' }}>
              {mockWellnessMetrics.sentimentChange.toFixed(1)} pts vs. Prev. Survey
            </span>
          </div>
        </Card>
      </div>

      {/* Employee Relations Case Management */}
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '20px' }}>
              <HeartHandshake style={{ width: '24px', height: '24px', marginRight: '8px', color: '#ff7a45' }} />
              Case Management Queue ({openCases} Open)
            </span>
            <Button
              type="link"
              icon={<Plus style={{ width: '16px', height: '16px' }} />}
              style={{ color: '#ff7a45' }}
            >
              New Case
            </Button>
          </span>
        }
      >
        <Table
          columns={columns}
          dataSource={mockCases}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default EmployeeRelationsView;

