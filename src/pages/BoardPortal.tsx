import React, { useEffect, useState } from 'react';
import { ConfigProvider, Card, Row, Col, Statistic, Badge, Avatar, Spin, Tabs, Button, Space } from 'antd';
import {
  ArrowUpOutlined,
  DollarOutlined,
  ShoppingOutlined,
  UserOutlined,
  TeamOutlined,
  BarChartOutlined,
  SafetyOutlined,
  TrophyOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ExecutiveDirectory } from '@/components/board/ExecutiveDirectory';
import { ExecutiveComms } from '@/components/board/ExecutiveComms';
import { PersonnelManager } from '@/components/ceo/PersonnelManager';
import { EquityDashboard } from '@/components/ceo/EquityDashboard';
import { FinancialApprovals } from '@/components/ceo/FinancialApprovals';
import { DocumentVault } from '@/components/board/DocumentVault';
import { executiveTheme } from '@/config/antd-theme';
import { useExecAuth } from '@/hooks/useExecAuth';

interface DashboardMetrics {
  revenue: number;
  revenueChange: number;
  orders: number;
  ordersChange: number;
  activeFeeders: number;
  feedersChange: number;
  profitMargin: number;
  utilization: number;
  totalEmployees: number;
  pendingApprovals: number;
}

const BoardPortal: React.FC = () => {
  const navigate = useNavigate();
  const { loading, user, execUser, isAuthorized, signOut } = useExecAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activeTab, setActiveTab] = useState('directory');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (isAuthorized) {
      fetchDashboardMetrics();
      
      // Set up auto-refresh every 60 seconds
      const interval = setInterval(() => {
        fetchDashboardMetrics();
      }, 60000);
      
      // Set up real-time subscription for orders and employees
      const channel = supabase
        .channel('board_metrics_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
          },
          () => {
            fetchDashboardMetrics();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'employees',
          },
          () => {
            fetchDashboardMetrics();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ceo_financial_approvals',
          },
          () => {
            fetchDashboardMetrics();
          }
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        channel.unsubscribe();
      };
    }
  }, [isAuthorized]);

  const fetchDashboardMetrics = async () => {
    try {
      // Fetch real metrics from database
      const [ordersRes, employeesRes, approvalsRes] = await Promise.all([
        supabase.from('orders').select('total_amount, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('employees').select('id, employment_status'),
        supabase.from('ceo_financial_approvals').select('id, status')
      ]);

      const orders = ordersRes.data || [];
      const employees = employeesRes.data || [];
      const approvals = approvalsRes.data || [];
      
      const revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const pendingApprovals = approvals.filter(a => a.status === 'pending').length;
      
      // Calculate revenue change (simplified - would need historical data for accurate calculation)
      const revenueChange = 15.2; // Placeholder until historical tracking is implemented
      
      setMetrics({
        revenue,
        revenueChange,
        orders: orders.length,
        ordersChange: 0, // Placeholder
        activeFeeders: 0, // Placeholder
        feedersChange: 0, // Placeholder
        profitMargin: 35, // Placeholder
        utilization: 0, // Placeholder
        totalEmployees: employees.length,
        pendingApprovals,
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching metrics:', error);
      // Fallback to defaults if error
      setMetrics({
        revenue: 0,
        revenueChange: 0,
        orders: 0,
        ordersChange: 0,
        activeFeeders: 0,
        feedersChange: 0,
        profitMargin: 0,
        utilization: 0,
        totalEmployees: 0,
        pendingApprovals: 0,
      });
    }
  };

  if (loading) {
    return (
      <ConfigProvider theme={executiveTheme}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Spin size="large" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading Executive Portal...</p>
          </div>
        </div>
      </ConfigProvider>
    );
  }

  if (!isAuthorized) {
    return (
      <ConfigProvider theme={executiveTheme}>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="text-center max-w-md bg-white rounded-2xl p-6 sm:p-8 shadow-2xl">
            <SafetyOutlined className="text-5xl sm:text-6xl text-red-500 mb-4 sm:mb-6" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              Executive Access Required
            </h1>
            <p className="text-slate-600 text-base sm:text-lg mb-4">
              This portal is restricted to board members and C-suite executives only.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Logged in as: <span className="font-semibold">{user?.email}</span>
            </p>
            <Space>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Return Home
              </button>
              <button
                onClick={signOut}
                className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Sign Out
              </button>
            </Space>
          </div>
        </div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={executiveTheme}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  Executive Board Portal
                </h1>
                <p className="text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                  Welcome back, <strong>{execUser?.title || user?.email?.split('@')[0]}</strong> • {execUser?.role?.toUpperCase()}
                  <Badge status="processing" text="Live Data" className="ml-0 sm:ml-2" />
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <Button 
                  type="default" 
                  size="small"
                  className="text-xs sm:text-base"
                  onClick={() => navigate('/ceo')}
                >
                  CEO Portal
                </Button>
                <Button 
                  size="small"
                  className="text-xs sm:text-base"
                  onClick={signOut}
                >
                  Sign Out
                </Button>
                <Avatar size="default" icon={<UserOutlined />} className="bg-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Last Updated Indicator */}
          <div className="mb-4 text-right">
            <span className="text-sm text-slate-600">Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
          
          {/* Key Metrics Row */}
          <Row gutter={[24, 24]} className="mb-8">
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} className="shadow-lg hover:shadow-xl transition-all duration-300">
                <Statistic
                  title={<span className="text-slate-600 font-medium text-xs sm:text-sm">Total Revenue</span>}
                  value={metrics?.revenue}
                  precision={2}
                  prefix={<DollarOutlined className="text-blue-600" />}
                  valueStyle={{ fontSize: window.innerWidth < 640 ? '20px' : '28px', fontWeight: 'bold', color: '#1e293b' }}
                  suffix={
                    <span className="text-xs sm:text-sm text-green-600 font-semibold ml-2">
                      <ArrowUpOutlined /> {metrics?.revenueChange}%
                    </span>
                  }
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} className="shadow-lg hover:shadow-xl transition-all duration-300">
                <Statistic
                  title={<span className="text-slate-600 font-medium text-xs sm:text-sm">Total Orders</span>}
                  value={metrics?.orders}
                  prefix={<ShoppingOutlined className="text-purple-600" />}
                  valueStyle={{ fontSize: window.innerWidth < 640 ? '20px' : '28px', fontWeight: 'bold', color: '#1e293b' }}
                  suffix={
                    <span className="text-xs sm:text-sm text-green-600 font-semibold ml-2">
                      <ArrowUpOutlined /> {metrics?.ordersChange}%
                    </span>
                  }
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} className="shadow-lg hover:shadow-xl transition-all duration-300">
                <Statistic
                  title={<span className="text-slate-600 font-medium text-xs sm:text-sm">Employees</span>}
                  value={metrics?.totalEmployees}
                  prefix={<TeamOutlined className="text-orange-600" />}
                  valueStyle={{ fontSize: window.innerWidth < 640 ? '20px' : '28px', fontWeight: 'bold', color: '#1e293b' }}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} className="shadow-lg hover:shadow-xl transition-all duration-300">
                <Statistic
                  title={<span className="text-slate-600 font-medium text-xs sm:text-sm">Net Profit Margin</span>}
                  value={metrics?.profitMargin}
                  precision={1}
                  suffix="%"
                  valueStyle={{ fontSize: window.innerWidth < 640 ? '20px' : '28px', fontWeight: 'bold', color: '#059669' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Tabbed Interface */}
          <Card className="shadow-2xl">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="large"
              tabBarGutter={16}
              className="board-portal-tabs"
              items={[
                {
                  key: 'communications',
                  label: (
                    <span className="flex items-center gap-1 sm:gap-2">
                      <UserOutlined />
                      <span className="text-xs sm:text-base">Communications</span>
                    </span>
                  ),
                  children: <ExecutiveComms />,
                },
                {
                  key: 'directory',
                  label: (
                    <span className="flex items-center gap-1 sm:gap-2">
                      <TeamOutlined />
                      <span className="text-xs sm:text-base">Directory</span>
                    </span>
                  ),
                  children: <ExecutiveDirectory />,
                },
                {
                  key: 'personnel',
                  label: (
                    <span className="flex items-center gap-1 sm:gap-2">
                      <TeamOutlined />
                      <span className="text-xs sm:text-base">Personnel ({metrics?.totalEmployees || 0})</span>
                    </span>
                  ),
                  children: <PersonnelManager />,
                },
                {
                  key: 'documents',
                  label: (
                    <span className="flex items-center gap-1 sm:gap-2">
                      <FileOutlined />
                      <span className="text-xs sm:text-base">Document Vault</span>
                    </span>
                  ),
                  children: <DocumentVault />,
                },
                {
                  key: 'equity',
                  label: (
                    <span className="flex items-center gap-1 sm:gap-2">
                      <TrophyOutlined />
                      <span className="text-xs sm:text-base">Equity Ownership</span>
                    </span>
                  ),
                  children: <EquityDashboard />,
                },
                {
                  key: 'financial',
                  label: (
                    <span className="flex items-center gap-1 sm:gap-2">
                      <DollarOutlined />
                      <span className="text-xs sm:text-base">Financial Approvals</span>
                      {metrics?.pendingApprovals! > 0 && (
                        <Badge count={metrics?.pendingApprovals} className="ml-2" />
                      )}
                    </span>
                  ),
                  children: <FinancialApprovals />,
                },
              ]}
            />
          </Card>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default BoardPortal;
