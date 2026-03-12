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
  UserDeleteOutlined,
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
import { ExitWorkflowManager } from '@/components/hr/ExitWorkflowManager';
import TalentLensDashboard from '@/components/hr/talent-lens/TalentLensDashboard';

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
    <Layout style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 60,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            flex: '1 1 auto',
          }}
        >
          <div
            style={{
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: '#FF6B35',
              marginRight: 16,
              whiteSpace: 'nowrap',
            }}
          >
            Crave'n
          </div>
          <div
            style={{
              borderLeft: '1px solid #e5e7eb',
              height: 24,
              marginRight: 16,
            }}
          />
          <div
            style={{
              fontSize: 14,
              color: '#6b7280',
              marginRight: 16,
              whiteSpace: 'nowrap',
            }}
          >
            HR Portal
          </div>
          <div
            style={{
              borderLeft: '1px solid #e5e7eb',
              height: 24,
              marginRight: 16,
            }}
          />
          <div
            style={{
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#1f2937',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              {execUser?.full_name || user?.email || 'HR Executive'}
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#6b7280',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              {execUser?.title || 'People & Culture'}
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginLeft: 16,
          }}
        >
          <Button
            type="default"
            size="small"
            onClick={() => navigate('/hub')}
            style={{
              borderColor: '#d1d5db',
              color: '#374151',
              height: 28,
              fontSize: 11,
              padding: '0 12px',
              borderRadius: 4,
              background: '#ffffff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            Back to Hub
          </Button>
          <Button
            onClick={signOut}
            style={{
              borderColor: '#d1d5db',
              color: '#374151',
              height: 32,
              fontSize: 12,
              padding: '0 14px',
              borderRadius: 4,
              background: '#ffffff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            Sign Out
          </Button>
        </div>
      </Header>

      <Content
        style={{
          padding: '20px 24px',
          maxWidth: 1800,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          {/* Left navigation */}
          <div
            style={{
              flex: '0 0 220px',
              maxWidth: 260,
              width: '100%',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#9ca3af',
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                HR Workspace
              </div>
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'career_applications', label: 'Career Applications' },
                { id: 'documents', label: 'Document Generator' },
                { id: 'documents_dashboard', label: 'Document Dashboard' },
                { id: 'word_processor', label: 'Word Processor' },
                { id: 'communications', label: 'Executive Communications' },
                { id: 'personnel', label: 'Personnel Management' },
                { id: 'exit_workflows', label: 'Exit Workflows' },
                { id: 'intern_candidates', label: 'Intern Candidates' },
                { id: 'time_pto', label: 'Time & PTO' },
                { id: 'performance', label: 'Performance' },
                { id: 'compensation', label: 'Compensation' },
                { id: 'wellness', label: 'Wellness' },
                { id: 'analytics', label: 'Analytics' },
                { id: 'compliance', label: 'Compliance' },
                { id: 'equity', label: 'Equity Management' },
                { id: 'audit', label: 'Audit Trail' },
                { id: 'system_admin', label: 'System Admin' },
              ].map((item) => {
                const active = activeTab === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      marginBottom: 4,
                      borderRadius: 3,
                      cursor: 'pointer',
                      backgroundColor: active ? '#eff6ff' : 'transparent',
                      color: active ? '#1d4ed8' : '#374151',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right content */}
          <div
            style={{
              flex: '1 1 0%',
              minWidth: 0,
            }}
          >
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                padding: 16,
              }}
            >
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                tabBarStyle={{ display: 'none' }}
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
                <BriefcaseOutlined />
                Career Applications
              </span>
            }
            key="career_applications"
          >
            <TalentLensDashboard />
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
                <UserDeleteOutlined />
                Exit Workflows
              </span>
            }
            key="exit_workflows"
          >
            <ExitWorkflowManager />
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
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default HRPortal;
