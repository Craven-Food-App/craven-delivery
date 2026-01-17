// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import { DollarOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

interface Approval {
  id: string;
  request_type: string;
  requester_name: string;
  amount: number;
  description: string;
  status: string;
  requested_date: string;
}

export const FinancialDashboard: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFinancials();
  }, []);

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      const [approvalsRes, ordersRes] = await Promise.all([
        supabase.from('ceo_financial_approvals').select('*').order('requested_date', { ascending: false }),
        supabase.from('orders').select('total_amount, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      setApprovals(approvalsRes.data || []);
    } catch (error) {
      console.error('Error fetching financials:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const approvedAmount = approvals.filter(a => a.status === 'approved').reduce((sum, a) => sum + a.amount, 0);
  const pendingAmount = pendingApprovals.reduce((sum, a) => sum + a.amount, 0);

  const columns = [
    {
      title: 'Type',
      dataIndex: 'request_type',
      key: 'request_type',
      render: (type: string) => <Tag color="blue">{type.toUpperCase()}</Tag>,
    },
    {
      title: 'Requester',
      dataIndex: 'requester_name',
      key: 'requester_name',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span className="font-bold text-green-600">${amount.toLocaleString()}</span>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          pending: 'gold',
          approved: 'green',
          denied: 'red',
        };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Date',
      dataIndex: 'requested_date',
      key: 'requested_date',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Financial Dashboard</h2>
        <p className="text-slate-600">Company financial overview and approvals</p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card className="shadow-lg">
            <Statistic
              title="Pending Approvals"
              value={pendingAmount}
              prefix={<DollarOutlined />}
              precision={0}
              valueStyle={{ color: '#faad14' }}
              suffix={
                <span className="text-sm text-slate-500 ml-2">
                  ({pendingApprovals.length} requests)
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="shadow-lg">
            <Statistic
              title="Approved This Month"
              value={approvedAmount}
              prefix={<DollarOutlined />}
              precision={0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="shadow-lg">
            <Statistic
              title="Total Requests"
              value={approvals.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Recent Financial Requests</h3>
        <Table
          columns={columns}
          dataSource={approvals}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

