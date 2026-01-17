// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Alert, Statistic, Row, Col, Spin, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, ReloadOutlined } from '@ant-design/icons';
import { verifyCLevelEmployees, getRoleSyncSummary, syncEmployeeManually } from '@/utils/verifyRoleSync';
import type { CLevelEmployeeStatus } from '@/utils/verifyRoleSync';
import { CreateAuthAccounts } from './CreateAuthAccounts';

export const RoleSyncVerification: React.FC = () => {
  const [statuses, setStatuses] = useState<CLevelEmployeeStatus[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [statusData, summaryData] = await Promise.all([
        verifyCLevelEmployees(),
        getRoleSyncSummary(),
      ]);
      setStatuses(statusData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching status:', error);
      message.error('Failed to load role sync status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSyncEmployee = async (employeeId: string) => {
    try {
      await syncEmployeeManually(employeeId);
      message.success('Employee synced successfully');
      fetchStatus();
    } catch (error: any) {
      message.error(error.message || 'Failed to sync employee');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fully_synced':
        return 'green';
      case 'missing_user_id':
        return 'red';
      case 'missing_exec_users':
        return 'orange';
      case 'missing_role':
        return 'orange';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fully_synced':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'missing_user_id':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <WarningOutlined style={{ color: '#faad14' }} />;
    }
  };

  const columns = [
    {
      title: 'Status',
      dataIndex: 'sync_status',
      key: 'sync_status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status.replace(/_/g, ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'employee_name',
      key: 'employee_name',
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Exec Role',
      dataIndex: 'exec_role',
      key: 'exec_role',
      render: (role: string | null) => role ? <Tag>{role.toUpperCase()}</Tag> : '-',
    },
    {
      title: 'Department',
      dataIndex: 'exec_department',
      key: 'exec_department',
    },
    {
      title: 'Action Needed',
      dataIndex: 'action_needed',
      key: 'action_needed',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: CLevelEmployeeStatus) => (
        <Space>
          {record.sync_status !== 'fully_synced' && record.user_id && (
            <Button
              size="small"
              type="primary"
              onClick={() => handleSyncEmployee(record.employee_id)}
            >
              Sync Now
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <Spin size="large" />
          <p className="mt-4">Loading role sync status...</p>
        </div>
      </Card>
    );
  }

  const fullySynced = statuses.filter(s => s.sync_status === 'fully_synced').length;
  const needsAttention = statuses.filter(s => s.sync_status !== 'fully_synced').length;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Role Synchronization Status</h2>
          <Button icon={<ReloadOutlined />} onClick={fetchStatus}>
            Refresh
          </Button>
        </div>

        {summary && (
          <Row gutter={16} className="mb-6">
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Total C-Level"
                value={summary.totalCLevel}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Fully Synced"
                value={fullySynced}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Needs Attention"
                value={needsAttention}
                valueStyle={{ color: needsAttention > 0 ? '#faad14' : '#52c41a' }}
                prefix={<WarningOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Missing user_id"
                value={summary.missingUserId}
                valueStyle={{ color: summary.missingUserId > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
          </Row>
        )}

        {needsAttention > 0 && (
          <Alert
            message="Some C-level employees need attention"
            description={`${needsAttention} employee(s) are not fully synced. Review the table below and take action.`}
            type="warning"
            showIcon
            className="mb-4"
          />
        )}

        {fullySynced === statuses.length && statuses.length > 0 && (
          <Alert
            message="All C-level employees are properly synced!"
            description="All employees are recognized in exec_users and have the correct roles."
            type="success"
            showIcon
            className="mb-4"
          />
        )}

        <Table
          columns={columns}
          dataSource={statuses}
          rowKey="employee_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create Auth Accounts Section */}
      {needsAttention > 0 && statuses.some(s => s.sync_status === 'missing_user_id') && (
        <div className="mb-4">
          <CreateAuthAccounts />
        </div>
      )}

      <Card>
        <h3 className="text-lg font-semibold mb-4">What to do if employees are not synced:</h3>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Missing user_id:</strong> Create an auth account for the employee, then update the employees table with the user_id.
          </li>
          <li>
            <strong>Missing exec_users record:</strong> Click "Sync Now" button or wait for the automatic trigger to create it.
          </li>
          <li>
            <strong>Missing role:</strong> Click "Sync Now" button or wait for the automatic trigger to add the executive role.
          </li>
          <li>
            <strong>Run verification SQL:</strong> Use VERIFY_ROLE_SYNC_SYSTEM.sql in Supabase Dashboard for comprehensive checks and auto-fixes.
          </li>
        </ul>
      </Card>
    </div>
  );
};

