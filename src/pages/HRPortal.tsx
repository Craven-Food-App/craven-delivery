// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { Tabs, Typography, Button, Space, Layout, Divider, message, Card, Row, Col } from 'antd';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  FileTextOutlined,
  TeamOutlined,
  FileSearchOutlined,
  ArrowLeftOutlined,
  DashboardOutlined,
  UserOutlined,
  CalendarOutlined,
  BriefcaseOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  HeartOutlined,
  BarChartOutlined,
  SafetyOutlined,
  SettingOutlined,
  TrophyOutlined,
  MailOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import PersonnelManagementView from '@/components/hr/PersonnelManagementView';
import { AuditTrail } from '@/components/ceo/AuditTrail';
import DocumentGeneratorView from '@/components/hr/DocumentGeneratorView';
import DocumentDashboard from '@/components/hr/DocumentDashboard';
import PerformanceManagement from '@/components/hr/PerformanceManagement';
import CompensationView from '@/components/hr/CompensationView';
import TimePtoView from '@/components/hr/TimePtoView';
import AnalyticsView from '@/components/hr/AnalyticsView';
import ComplianceView from '@/components/hr/ComplianceView';
import EmployeeRelationsView from '@/components/hr/EmployeeRelationsView';
import SystemAdminView from '@/components/hr/SystemAdminView';
import EquityManagement from '@/components/hr/EquityManagement';
import InternCandidateManagement from '@/components/hr/InternCandidateManagement';
import { useExecAuth } from '@/hooks/useExecAuth';
import BusinessEmailSystem from '@/components/executive/BusinessEmailSystem';
import ExecutiveWordProcessor from '@/components/executive/ExecutiveWordProcessor';

const { Header, Content, Sider } = Layout;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

// Mock data for dashboard
const mockMonthlyHrData = [
  { month: 'Jan', Headcount: 200, Voluntary_Turnover: 2.5, Engagement_Score: 7.2 },
  { month: 'Feb', Headcount: 205, Voluntary_Turnover: 2.0, Engagement_Score: 7.5 },
  { month: 'Mar', Headcount: 215, Voluntary_Turnover: 3.1, Engagement_Score: 7.0 },
  { month: 'Apr', Headcount: 220, Voluntary_Turnover: 1.8, Engagement_Score: 7.8 },
  { month: 'May', Headcount: 225, Voluntary_Turnover: 1.5, Engagement_Score: 8.1 },
  { month: 'Jun', Headcount: 230, Voluntary_Turnover: 2.2, Engagement_Score: 7.9 },
];

const mockDepartmentData = [
  { name: 'Engineering', headcount: 85, color: '#1890ff' },
  { name: 'Sales', headcount: 45, color: '#52c41a' },
  { name: 'Marketing', headcount: 35, color: '#faad14' },
  { name: 'Operations', headcount: 30, color: '#722ed1' },
  { name: 'HR', headcount: 15, color: '#eb2f96' },
  { name: 'Finance', headcount: 10, color: '#13c2c2' },
  { name: 'Legal', headcount: 10, color: '#f5222d' },
];

interface HrKpiData {
  title: string;
  value: string;
  change: number;
  changeUnit: string;
  icon: React.ElementType;
  color: string;
  isPositiveGood: boolean;
}

const calculateChange = (current: number, previous: number) => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        padding: '12px',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: '13px',
      }}>
        <p style={{ fontWeight: 600, marginBottom: '8px', color: '#111' }}>{label}</p>
        {payload.map((p: any, index: number) => (
          <p key={index} style={{ color: p.color, margin: '4px 0' }}>
            {p.name}: <span style={{ fontWeight: 600 }}>{typeof p.value === 'number' ? (p.name === 'Headcount' ? p.value : `${p.value.toFixed(1)}%`) : p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const MetricCard: React.FC<HrKpiData> = ({ title, value, change, changeUnit, icon: Icon, color, isPositiveGood }) => {
  const isFavorable = isPositiveGood ? change >= 0 : change <= 0;
  const changeColor = isFavorable ? '#52c41a' : '#ff4d4f';
  const ChangeIcon = isFavorable ? '↑' : '↓';

  return (
    <Card style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Text type="secondary" style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase' }}>{title}</Text>
        <Icon style={{ fontSize: '24px', color }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Title level={2} style={{ margin: 0, fontSize: '32px', fontWeight: 700 }}>{value}</Title>
        <div style={{ textAlign: 'right' }}>
          <Text style={{ color: changeColor, fontSize: '12px', fontWeight: 600 }}>
            {ChangeIcon} {Math.abs(change).toFixed(1)}{changeUnit.includes('pp') ? '' : '%'}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>vs Last Month</Text>
        </div>
      </div>
    </Card>
  );
};

const DashboardView: React.FC = () => {
  const currentMonthData = mockMonthlyHrData[mockMonthlyHrData.length - 1];
  const previousMonthData = mockMonthlyHrData[mockMonthlyHrData.length - 2];

  const kpiData: HrKpiData[] = useMemo(() => {
    const currentTTH = 45;
    const previousTTH = 50;
    const changeTTH = calculateChange(currentTTH, previousTTH);

    return [
      {
        title: 'Employee Headcount',
        value: `${currentMonthData.Headcount}`,
        change: calculateChange(currentMonthData.Headcount, previousMonthData.Headcount),
        changeUnit: '%',
        icon: UserOutlined,
        color: '#1890ff',
        isPositiveGood: true,
      },
      {
        title: 'Voluntary Turnover',
        value: `${currentMonthData.Voluntary_Turnover.toFixed(1)}%`,
        change: calculateChange(currentMonthData.Voluntary_Turnover, previousMonthData.Voluntary_Turnover),
        changeUnit: 'pp',
        icon: UserOutlined,
        color: '#ff4d4f',
        isPositiveGood: false,
      },
      {
        title: 'Engagement Score',
        value: `${currentMonthData.Engagement_Score.toFixed(1)}/10`,
        change: currentMonthData.Engagement_Score - previousMonthData.Engagement_Score,
        changeUnit: 'pts',
        icon: HeartOutlined,
        color: '#52c41a',
        isPositiveGood: true,
      },
      {
        title: 'Avg. Time to Hire',
        value: `${currentTTH} Days`,
        change: changeTTH,
        changeUnit: '%',
        icon: CalendarOutlined,
        color: '#722ed1',
        isPositiveGood: false,
      },
    ];
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <Row gutter={[16, 16]}>
        {kpiData.map((kpi) => (
          <Col xs={24} sm={12} lg={6} key={kpi.title}>
            <MetricCard {...kpi} />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Title level={4} style={{ marginBottom: '24px' }}>Headcount & Turnover Trend</Title>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockMonthlyHrData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#777" />
                <YAxis yAxisId="left" stroke="#777" label={{ value: 'Headcount', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#777" label={{ value: 'Turnover %', angle: 90, position: 'insideRight' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="Headcount" 
                  stroke="#1890ff" 
                  strokeWidth={2} 
                  dot={{ fill: '#1890ff', r: 4 }}
                  name="Headcount"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="Voluntary_Turnover" 
                  stroke="#ff4d4f" 
                  strokeWidth={2} 
                  dot={{ fill: '#ff4d4f', r: 4 }}
                  name="Voluntary Turnover (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Title level={4} style={{ marginBottom: '24px' }}>Headcount by Department</Title>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockDepartmentData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#777" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  style={{ fontSize: '11px' }}
                />
                <YAxis stroke="#777" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="headcount" radius={[8, 8, 0, 0]}>
                  {mockDepartmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const HRPortal: React.FC = () => {
  const navigate = useNavigate();
  const { loading, user, execUser, isAuthorized, signOut } = useExecAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ marginBottom: 16 }}>Access Denied</div>
        <Button onClick={() => navigate('/hub')}>Back to Hub</Button>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#ffffff' }}>
      <Header style={{ 
        background: '#ffffff', 
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space>
          <Button
            type="default"
            size="middle"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/hub')}
          >
            Back to Hub
          </Button>
          <Title level={3} style={{ margin: 0, marginLeft: 16 }}>
            HR Portal
          </Title>
        </Space>
        <Space>
          <Button onClick={() => navigate('/ceo')}>CEO Portal</Button>
          <Button onClick={signOut}>Sign Out</Button>
        </Space>
      </Header>

      <Layout>
        <Sider
          collapsible
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          width={256}
          style={{
            background: '#fff',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
          theme="light"
        >
          <div style={{ padding: '16px' }}>
            <Title level={5} style={{ margin: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SafetyOutlined style={{ color: '#ff7a45' }} />
              {!sidebarCollapsed && 'HR Canvas'}
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Button
                type={activeTab === 'dashboard' ? 'primary' : 'text'}
                icon={<DashboardOutlined />}
                block
                style={{
                  textAlign: 'left',
                  height: '40px',
                  marginBottom: '4px',
                  background: activeTab === 'dashboard' ? '#ff7a45' : 'transparent',
                  color: activeTab === 'dashboard' ? '#fff' : '#666',
                  border: 'none',
                }}
                onClick={() => setActiveTab('dashboard')}
              >
                {!sidebarCollapsed && 'Dashboard'}
              </Button>
              <Button
                type={activeTab === 'documents' ? 'primary' : 'text'}
                icon={<FileTextOutlined />}
                block
                style={{
                  textAlign: 'left',
                  height: '40px',
                  marginBottom: '4px',
                  background: activeTab === 'documents' ? '#ff7a45' : 'transparent',
                  color: activeTab === 'documents' ? '#fff' : '#666',
                  border: 'none',
                }}
                onClick={() => setActiveTab('documents')}
              >
                {!sidebarCollapsed && 'Document Generator'}
              </Button>
              <Button
                type={activeTab === 'documents_dashboard' ? 'primary' : 'text'}
                icon={<FileSearchOutlined />}
                block
                style={{
                  textAlign: 'left',
                  height: '40px',
                  marginBottom: '4px',
                  background: activeTab === 'documents_dashboard' ? '#ff7a45' : 'transparent',
                  color: activeTab === 'documents_dashboard' ? '#fff' : '#666',
                  border: 'none',
                }}
                onClick={() => setActiveTab('documents_dashboard')}
              >
                {!sidebarCollapsed && 'Document Dashboard'}
              </Button>
              <Button
                type={activeTab === 'personnel' ? 'primary' : 'text'}
                icon={<TeamOutlined />}
                block
                style={{
                  textAlign: 'left',
                  height: '40px',
                  marginBottom: '4px',
                  background: activeTab === 'personnel' ? '#ff7a45' : 'transparent',
                  color: activeTab === 'personnel' ? '#fff' : '#666',
                  border: 'none',
                }}
                onClick={() => setActiveTab('personnel')}
              >
                {!sidebarCollapsed && 'Personnel Management'}
              </Button>
              <Button
                type={activeTab === 'intern_candidates' ? 'primary' : 'text'}
                icon={<UserAddOutlined />}
                block
                style={{
                  textAlign: 'left',
                  height: '40px',
                  marginBottom: '4px',
                  background: activeTab === 'intern_candidates' ? '#ff7a45' : 'transparent',
                  color: activeTab === 'intern_candidates' ? '#fff' : '#666',
                  border: 'none',
                }}
                onClick={() => setActiveTab('intern_candidates')}
              >
                {!sidebarCollapsed && 'Intern Candidates'}
              </Button>
              <Divider style={{ margin: '8px 0' }} />
              <Button
                type={activeTab === 'time_pto' ? 'primary' : 'text'}
                icon={<CalendarOutlined />}
                block
                style={{
                  textAlign: 'left',
                  height: '40px',
                  marginBottom: '4px',
                  background: activeTab === 'time_pto' ? '#ff7a45' : 'transparent',
                  color: activeTab === 'time_pto' ? '#fff' : '#666',
                  border: 'none',
                }}
                onClick={() => setActiveTab('time_pto')}
              >
                {!sidebarCollapsed && 'Time & PTO'}
              </Button>
              <Button
                type={activeTab === 'performance' ? 'primary' : 'text'}
                icon={<ThunderboltOutlined />}
                block
                style={{
                  textAlign: 'left',
                  height: '40px',
                  marginBottom: '4px',
                  background: activeTab === 'performance' ? '#ff7a45' : 'transparent',
                  color: activeTab === 'performance' ? '#fff' : '#666',
                  border: 'none',
                }}
                onClick={() => setActiveTab('performance')}
              >
                {!sidebarCollapsed && 'Performance'}
              </Button>
              <Button
                type={activeTab === 'compensation' ? 'primary' : 'text'}
                icon={<DollarOutlined />}
                block
                style={{
                  textAlign: 'left',
                  height: '40px',
                  marginBottom: '4px',
                  background: activeTab === 'compensation' ? '#ff7a45' : 'transparent',
                  color: activeTab === 'compensation' ? '#fff' : '#666',
                  border: 'none',
                }}
                onClick={() => setActiveTab('compensation')}
              >
                {!sidebarCollapsed && 'Compensation'}
              </Button>
              <Button
                type={activeTab === 'wellness' ? 'primary' : 'text'}
                icon={<HeartOutlined />}
                block
                style={{
                  textAlign: 'left',
                  height: '40px',
                  marginBottom: '4px',
                  background: activeTab === 'wellness' ? '#ff7a45' : 'transparent',
                  color: activeTab === 'wellness' ? '#fff' : '#666',
                  border: 'none',
                }}
                onClick={() => setActiveTab('wellness')}
              >
                {!sidebarCollapsed && 'Wellness'}
              </Button>
              <Button
                type={activeTab === 'analytics' ? 'primary' : 'text'}
                icon={<BarChartOutlined />}
                block
                style={{
                  textAlign: 'left',
                  height: '40px',
                  marginBottom: '4px',
                  background: activeTab === 'analytics' ? '#ff7a45' : 'transparent',
                  color: activeTab === 'analytics' ? '#fff' : '#666',
                  border: 'none',
                }}
                onClick={() => setActiveTab('analytics')}
              >
                {!sidebarCollapsed && 'Analytics'}
              </Button>
              <Button
                type={activeTab === 'compliance' ? 'primary' : 'text'}
                icon={<SafetyOutlined />}
                block
                style={{
                  textAlign: 'left',
                  height: '40px',
                  marginBottom: '4px',
                  background: activeTab === 'compliance' ? '#ff7a45' : 'transparent',
                  color: activeTab === 'compliance' ? '#fff' : '#666',
                  border: 'none',
                }}
                onClick={() => setActiveTab('compliance')}
              >
                {!sidebarCollapsed && 'Compliance'}
              </Button>
              <Divider style={{ margin: '8px 0' }} />
              <Button
                type={activeTab === 'audit' ? 'primary' : 'text'}
                icon={<FileSearchOutlined />}
                block
                style={{
                  textAlign: 'left',
                  height: '40px',
                  marginBottom: '4px',
                  background: activeTab === 'audit' ? '#ff7a45' : 'transparent',
                  color: activeTab === 'audit' ? '#fff' : '#666',
                  border: 'none',
                }}
                onClick={() => setActiveTab('audit')}
              >
                {!sidebarCollapsed && 'Audit Trail'}
              </Button>
              <Divider style={{ margin: '8px 0' }} />
              <Button
                type={activeTab === 'system_admin' ? 'primary' : 'text'}
                icon={<SettingOutlined />}
                block
                style={{
                  textAlign: 'left',
                  height: '40px',
                  marginBottom: '4px',
                  background: activeTab === 'system_admin' ? '#ff7a45' : 'transparent',
                  color: activeTab === 'system_admin' ? '#fff' : '#666',
                  border: 'none',
                }}
                onClick={() => setActiveTab('system_admin')}
              >
                {!sidebarCollapsed && 'System Admin (Permissions)'}
              </Button>
            </div>
          </div>
        </Sider>

        <Content style={{ padding: 24 }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            tabBarStyle={{ borderBottom: '2px solid #e2e8f0' }}
            renderTabBar={(props, DefaultTabBar) => <DefaultTabBar {...props} />}
          >
          <TabPane
            tab={
              <span>
                <DashboardOutlined />
                Dashboard
              </span>
            }
            key="dashboard"
          >
            <DashboardView />
          </TabPane>

          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                Document Generator
              </span>
            }
            key="documents"
          >
            <DocumentGeneratorView />
          </TabPane>

          <TabPane
            tab={
              <span>
                <FileSearchOutlined />
                Document Dashboard
              </span>
            }
            key="documents_dashboard"
          >
            <DocumentDashboard />
          </TabPane>

          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                Word Processor
              </span>
            }
            key="word_processor"
          >
            <ExecutiveWordProcessor storageKey="hr" />
          </TabPane>

          <TabPane
            tab={
              <span>
                <MailOutlined />
                Executive Communications
              </span>
            }
            key="communications"
          >
            <BusinessEmailSystem />
          </TabPane>

          <TabPane
            tab={
              <span>
                <TeamOutlined />
                Personnel Management
              </span>
            }
            key="personnel"
          >
            <PersonnelManagementView />
          </TabPane>

          <TabPane
            tab={
              <span>
                <UserAddOutlined />
                Intern Candidates
              </span>
            }
            key="intern_candidates"
          >
            <InternCandidateManagement />
          </TabPane>

          <TabPane
            tab={
              <span>
                <CalendarOutlined />
                Time & PTO
              </span>
            }
            key="time_pto"
          >
            <TimePtoView />
          </TabPane>

          <TabPane
            tab={
              <span>
                <ThunderboltOutlined />
                Performance
              </span>
            }
            key="performance"
          >
            <PerformanceManagement />
          </TabPane>

          <TabPane
            tab={
              <span>
                <DollarOutlined />
                Compensation
              </span>
            }
            key="compensation"
          >
            <CompensationView />
          </TabPane>

          <TabPane
            tab={
              <span>
                <HeartOutlined />
                Wellness
              </span>
            }
            key="wellness"
          >
            <EmployeeRelationsView />
          </TabPane>

          <TabPane
            tab={
              <span>
                <BarChartOutlined />
                Analytics
              </span>
            }
            key="analytics"
          >
            <AnalyticsView />
          </TabPane>

          <TabPane
            tab={
              <span>
                <SafetyOutlined />
                Compliance
              </span>
            }
            key="compliance"
          >
            <ComplianceView />
          </TabPane>

          <TabPane
            tab={
              <span>
                <TrophyOutlined />
                Equity Management
              </span>
            }
            key="equity"
          >
            {/** Minimal equity editor to keep data in sync */}
            <EquityManagement />
          </TabPane>

          <TabPane
            tab={
              <span>
                <FileSearchOutlined />
                Audit Trail
              </span>
            }
            key="audit"
          >
            <AuditTrail />
          </TabPane>

          <TabPane
            tab={
              <span>
                <SettingOutlined />
                System Admin
              </span>
            }
            key="system_admin"
          >
            <SystemAdminView />
          </TabPane>
        </Tabs>
        </Content>
      </Layout>
    </Layout>
  );
};

export default HRPortal;
