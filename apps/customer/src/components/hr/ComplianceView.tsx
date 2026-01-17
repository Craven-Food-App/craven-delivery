// @ts-nocheck
import React from 'react';
import { ShieldCheck, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { Card, Table, Tag } from 'antd';

interface Regulation {
  name: string;
  domain: string;
  status: 'In Force' | 'Monitoring' | 'Audited';
  nextReview: string;
  riskLevel: 'High' | 'Medium' | 'Low';
}

interface TrainingCompliance {
  name: string;
  mandatory: number;
  completed: number;
  compliance: number;
}

const mockRegulations: Regulation[] = [
  { name: 'GDPR (EU)', domain: 'Data Privacy', status: 'In Force', nextReview: '2026-06-01', riskLevel: 'High' },
  { name: 'CCPA (US)', domain: 'Data Privacy', status: 'Monitoring', nextReview: '2025-12-01', riskLevel: 'Medium' },
  { name: 'SOX (US)', domain: 'Financial Reporting', status: 'In Force', nextReview: '2026-01-31', riskLevel: 'High' },
  { name: 'UK Modern Slavery Act', domain: 'Supply Chain', status: 'Audited', nextReview: '2025-11-15', riskLevel: 'Medium' },
];

const mockTrainingCompliance: TrainingCompliance[] = [
  { name: 'Data Security 2025', mandatory: 230, completed: 215, compliance: 93.5 },
  { name: 'Code of Conduct', mandatory: 230, completed: 230, compliance: 100 },
  { name: 'Anti-Harassment', mandatory: 230, completed: 200, compliance: 86.9 },
];

const ComplianceView: React.FC = () => {
  const totalMandatoryTraining = mockTrainingCompliance.reduce((acc, curr) => acc + curr.mandatory, 0);
  const totalCompletedTraining = mockTrainingCompliance.reduce((acc, curr) => acc + curr.completed, 0);
  const overallComplianceRate = (totalCompletedTraining / totalMandatoryTraining * 100).toFixed(1);

  const getRiskColor = (risk: Regulation['riskLevel']) => {
    switch (risk) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  const regulationColumns = [
    {
      title: 'Regulation',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Domain',
      dataIndex: 'domain',
      key: 'domain',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Next Review',
      dataIndex: 'nextReview',
      key: 'nextReview',
    },
    {
      title: 'Risk',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (risk: Regulation['riskLevel']) => (
        <Tag color={getRiskColor(risk)}>{risk}</Tag>
      ),
    },
  ];

  const trainingColumns = [
    {
      title: 'Program Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Mandatory',
      dataIndex: 'mandatory',
      key: 'mandatory',
    },
    {
      title: 'Completed',
      dataIndex: 'completed',
      key: 'completed',
    },
    {
      title: 'Compliance Rate',
      key: 'compliance',
      render: (record: TrainingCompliance) => (
        <span style={{ fontWeight: 600 }}>{record.compliance.toFixed(1)}%</span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: TrainingCompliance) =>
        record.compliance >= 95 ? (
          <span style={{ display: 'flex', alignItems: 'center', color: '#52c41a', fontWeight: 600 }}>
            <CheckCircle style={{ width: '16px', height: '16px', marginRight: '4px' }} />
            Complete
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', color: '#ff4d4f', fontWeight: 600 }}>
            <XCircle style={{ width: '16px', height: '16px', marginRight: '4px' }} />
            Action Required
          </span>
        ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Overall Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <Card>
          <h3 style={{ fontSize: '12px', fontWeight: 500, color: '#666', margin: 0, marginBottom: '8px' }}>
            Overall Training Compliance
          </h3>
          <p
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: parseFloat(overallComplianceRate) >= 95 ? '#52c41a' : '#ff7a45',
              margin: 0,
            }}
          >
            {overallComplianceRate}%
          </p>
          <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>Across all mandatory programs.</p>
        </Card>

        <Card>
          <h3 style={{ fontSize: '12px', fontWeight: 500, color: '#666', margin: 0, marginBottom: '8px' }}>
            Required Review Timeline
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '8px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#000', margin: 0 }}>2</p>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>High Risk Active</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#000', margin: 0 }}>2</p>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Medium Risk Active</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#ff4d4f', margin: 0 }}>2</p>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Reviews in Next 90 Days</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Global Regulation Tracker */}
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '20px' }}>
            <ShieldCheck style={{ width: '24px', height: '24px', marginRight: '8px', color: '#ff7a45' }} />
            Global Regulation Tracker
          </span>
        }
      >
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Monitor international legal compliance requirements and review schedules.
        </p>

        <Table
          columns={regulationColumns}
          dataSource={mockRegulations}
          rowKey={(record, index) => `${record.name}-${index}`}
          pagination={false}
        />
      </Card>

      {/* Mandatory Training Compliance */}
      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '20px' }}>
            <BookOpen style={{ width: '24px', height: '24px', marginRight: '8px', color: '#ff7a45' }} />
            Mandatory Training Status
          </span>
        }
      >
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Track mandatory training completion to meet audit requirements.
        </p>

        <Table
          columns={trainingColumns}
          dataSource={mockTrainingCompliance}
          rowKey="name"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default ComplianceView;

