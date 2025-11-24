import React, { useEffect, useState, useMemo } from 'react';
import {
  Grid,
  Badge,
  Button as MantineButton,
  Group,
  Stack as MantineStack,
  Alert as MantineAlert,
  Title,
  Text,
  Divider as MantineDivider,
  Card as MantineCard,
  Paper as MantinePaper,
  Loader,
  Box as MantineBox,
  Progress,
  ActionIcon,
  Container as MantineContainer,
  Select,
  TextInput,
  Menu,
  Avatar,
  UnstyledButton,
  Tabs,
} from '@mantine/core';
// @ts-ignore - MUI optional dependency
import {
  Box as MuiBox,
  Card as MuiCard,
  CardContent,
  Typography,
  Button as MuiButton,
  Alert as MuiAlert,
  AlertTitle,
  Chip,
  LinearProgress,
  Container as MuiContainer,
  Stack as MuiStack,
  Paper as MuiPaper,
  IconButton,
  Divider as MuiDivider,
  // @ts-ignore - MUI optional dependency
  Grid2,
} from '@mui/material';


// Use MUI components as default since file uses MUI syntax
const Box = MuiBox;
const Card = MuiCard;
const Button = MuiButton;
const Alert = MuiAlert;
const Container = MuiContainer;
const Stack = MuiStack;
const Paper = MuiPaper;
const Divider = MuiDivider;
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import {
  IconAlertTriangle,
  IconChartBar,
  IconUsers,
  IconCurrencyDollar,
  IconTrophy,
  IconRocket,
  IconBulb,
  IconShield,
  IconFileText,
  IconMail,
  IconPencil,
} from '@tabler/icons-react';
import {
  TrendingUp,
  Search,
  Bell,
  Settings,
  LogOut,
  DollarSign,
  Users,
  Globe,
  ChevronDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { PersonnelManager } from '@/components/ceo/PersonnelManager';
import { FinancialApprovals } from '@/components/ceo/FinancialApprovals';
import { EmergencyControls } from '@/components/ceo/EmergencyControls';
import { StrategicPlanning } from '@/components/ceo/StrategicPlanning';
import { StrategicMindMap } from '@/components/ceo/StrategicMindMap';
import { AuditTrail } from '@/components/ceo/AuditTrail';
import { QuickActions } from '@/components/ceo/QuickActions';
import { EquityDashboard } from '@/components/ceo/EquityDashboard';
import ExecutiveCommunicationsCenter from '@/components/executive/ExecutiveCommunicationsCenter';
import ExecutivePortalLayout, { ExecutiveNavItem } from '@/components/executive/ExecutivePortalLayout';
import { useExecAuth } from '@/hooks/useExecAuth';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import CEOSignatureManager from '@/components/ceo/CEOSignatureManager';
import ExecutiveWordProcessor from '@/components/executive/ExecutiveWordProcessor';
import ActiveUsersMonitor from '@/components/ceo/ActiveUsersMonitor';

interface CEOMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  cashFlow: number;
  burnRate: number;
  runway: number;
  totalEmployees: number;
  admins: number;
  feeders: number;
  merchants: number;
  pendingApprovals: number;
  criticalAlerts: number;
}

const revenueData = [
  { month: 'Jul 23', revenue: 8.2, ebitda: 2.1, projection: 8.0 },
  { month: 'Aug 23', revenue: 8.5, ebitda: 2.3, projection: 8.3 },
  { month: 'Sep 23', revenue: 8.9, ebitda: 2.5, projection: 8.6 },
  { month: 'Oct 23', revenue: 9.2, ebitda: 2.6, projection: 8.9 },
  { month: 'Nov 23', revenue: 9.6, ebitda: 2.8, projection: 9.2 },
  { month: 'Dec 23', revenue: 10.1, ebitda: 3.0, projection: 9.5 },
  { month: 'Jan 24', revenue: 9.8, ebitda: 2.9, projection: 9.8 },
  { month: 'Feb 24', revenue: 10.3, ebitda: 3.1, projection: 10.1 },
  { month: 'Mar 24', revenue: 10.8, ebitda: 3.3, projection: 10.4 },
  { month: 'Apr 24', revenue: 11.2, ebitda: 3.5, projection: 10.7 },
  { month: 'May 24', revenue: 11.6, ebitda: 3.7, projection: 11.0 },
  { month: 'Jun 24', revenue: 12.1, ebitda: 3.9, projection: 11.3 },
];

const segmentData = [
  { segment: 'Enterprise SaaS', revenue: 4200, growth: 24.3, margin: 68, share: 35, momentum: 'accelerating' },
  { segment: 'Cloud Infrastructure', revenue: 3800, growth: 31.7, margin: 45, share: 28, momentum: 'strong' },
  { segment: 'AI & Analytics', revenue: 2100, growth: 52.4, margin: 72, share: 18, momentum: 'hypergrowth' },
  { segment: 'Professional Services', revenue: 1500, growth: 8.9, margin: 22, share: 12, momentum: 'stable' },
  { segment: 'Hardware & Devices', revenue: 900, growth: -3.2, margin: 15, share: 7, momentum: 'declining' },
];

const regionalData = [
  { region: 'Americas', revenue: 5.8, growth: 18.2, yoy: 22.1, headcount: 12400, deals: 847 },
  { region: 'EMEA', revenue: 4.1, growth: 14.7, yoy: 16.8, headcount: 8900, deals: 623 },
  { region: 'APAC', revenue: 2.2, growth: 28.9, yoy: 35.4, headcount: 5200, deals: 412 },
];

const kpiData = [
  { name: 'ARR Growth', value: 127, target: 120, unit: '%', status: 'exceeds' },
  { name: 'Net Revenue Retention', value: 118, target: 115, unit: '%', status: 'exceeds' },
  { name: 'Rule of 40', value: 52, target: 40, unit: '', status: 'exceeds' },
  { name: 'Magic Number', value: 1.3, target: 1.0, unit: '', status: 'exceeds' },
  { name: 'CAC Payback', value: 8, target: 12, unit: 'mo', status: 'exceeds' },
  { name: 'Gross Margin', value: 78.4, target: 75, unit: '%', status: 'exceeds' },
];

const strategicInitiatives = [
  { name: 'Project Titan - AI Platform Launch', status: 'on-track', completion: 78, priority: 'critical', owner: 'Product', dueDate: 'Q3 2024' },
  { name: 'European Expansion (3 Markets)', status: 'on-track', completion: 62, priority: 'high', owner: 'Intl', dueDate: 'Q4 2024' },
  { name: 'M&A - DataCore Acquisition', status: 'at-risk', completion: 45, priority: 'critical', owner: 'Corp Dev', dueDate: 'Q3 2024' },
  { name: 'Enterprise Security Certification', status: 'on-track', completion: 91, priority: 'high', owner: 'Security', dueDate: 'Q2 2024' },
  { name: 'Cost Optimization Initiative', status: 'delayed', completion: 34, priority: 'medium', owner: 'Finance', dueDate: 'Q3 2024' },
];

const alerts = [
  { type: 'critical', message: 'APAC revenue forecast revised down 8% due to macro headwinds', time: '2h ago' },
  { type: 'warning', message: 'Customer churn increased to 4.2% (target: 3.5%)', time: '5h ago' },
  { type: 'positive', message: 'Enterprise pipeline increased 34% QoQ to $284M', time: '1d ago' },
];

const CEOPortal: React.FC = () => {
  const navigate = useNavigate();
  const { loading, user, execUser, isAuthorized, signOut } = useExecAuth('ceo');
  const [metrics, setMetrics] = useState<CEOMetrics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('TTM');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('overview');
  
  // Track user activity
  useActivityTracking('ceo');

  const navItems = useMemo<ExecutiveNavItem[]>(() => {
    const totalEmployees = metrics?.totalEmployees ?? 0;
    const pendingApprovals = metrics?.pendingApprovals ?? 0;

    return [
      { id: 'overview', label: 'Command Center', icon: IconChartBar as any },
      {
        id: 'personnel',
        label: `Manage People (${totalEmployees})`,
        icon: IconUsers as any,
      },
      {
        id: 'financial',
        label:
          pendingApprovals > 0
            ? `Approve Spend (${pendingApprovals})`
            : 'Approve Spend',
        icon: IconCurrencyDollar as any,
      },
      { id: 'equity', label: 'Review Equity', icon: IconTrophy as any },
      { id: 'strategic', label: 'Drive Strategy', icon: IconRocket as any },
      { id: 'mindmap', label: 'Map Decisions', icon: IconBulb as any },
      { id: 'emergency', label: 'Run Emergency Playbooks', icon: IconShield as any },
      { id: 'audit', label: 'Audit Activity', icon: IconFileText as any },
      { id: 'signature', label: 'Sign Documents', icon: IconPencil as any },
      { id: 'communications', label: 'Direct Communications', icon: IconMail as any },
      { id: 'word', label: 'Draft Briefings', icon: IconFileText as any },
      { id: 'active-users', label: 'Active Users', icon: IconUsers as any },
    ];
  }, [metrics?.totalEmployees, metrics?.pendingApprovals]);

  const handleNavigateToCFO = () => {
    const host = window.location.hostname;
    if (/^ceo\./i.test(host)) {
      const target = host.replace(/^ceo\./i, 'cfo.');
      window.location.href = `${window.location.protocol}//${target}`;
      return;
    }
    navigate('/cfo');
  };

  const actionButtons = (
    <Group wrap="wrap">
      <MuiButton
        color="error"
        startIcon={<IconAlertTriangle size={16} />}
        onClick={() => setActiveTab('emergency')}
      >
        Emergency
      </MuiButton>
      <MuiButton variant="outlined" onClick={handleNavigateToCFO}>CFO Portal</MuiButton>
      <MuiButton variant="contained" onClick={() => navigate('/admin')}>
        Admin Portal
      </MuiButton>
      <MuiButton variant="outlined" onClick={() => navigate('/board')}>Board Portal</MuiButton>
    </Group>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderExecutiveDashboard();
      case 'personnel':
        return <PersonnelManager />;
      case 'financial':
        return <FinancialApprovals />;
      case 'equity':
        return <EquityDashboard />;
      case 'strategic':
        return <StrategicPlanning />;
      case 'mindmap':
        return <StrategicMindMap />;
      case 'emergency':
        return <EmergencyControls />;
      case 'audit':
        return <AuditTrail />;
      case 'signature':
        return <CEOSignatureManager />;
      case 'communications':
        return <ExecutiveCommunicationsCenter defaultTab="messages" />;
      case 'word':
        return <ExecutiveWordProcessor storageKey="ceo" />;
      case 'active-users':
        return <ActiveUsersMonitor />;
      default:
        return renderExecutiveDashboard();
    }
  };

  const renderExecutiveDashboard = () => {
    return (
      <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh', margin: '-16px', padding: 0 }}>
        {/* Premium Alert Banner */}
        <Paper
          sx={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fff7ed 50%, #f0fdf4 100%)',
            borderBottom: '2px solid #fecaca',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            padding: 2,
            borderRadius: 0,
          }}
        >
          <Container maxWidth="xl">
            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" flexWrap="wrap">
              <Stack direction="row" spacing={3} flexWrap="wrap">
                {alerts.map((alert, idx) => (
                  <Stack key={idx} direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
                    {alert.type === 'critical' && <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />}
                    {alert.type === 'warning' && <Clock size={18} color="#ea580c" style={{ flexShrink: 0 }} />}
                    {alert.type === 'positive' && <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0 }} />}
                    <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap', color: '#1e293b' }}>
                      {alert.message}
                    </Typography>
                    <Chip 
                      size="small"
                      label={alert.time}
                      color={alert.type === 'critical' ? 'error' : alert.type === 'warning' ? 'warning' : 'success'}
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: '20px' }}
                    />
                  </Stack>
                ))}
              </Stack>
              <Button 
                variant="text" 
                size="small" 
                endIcon={<ArrowUpRight size={14} />}
                sx={{ 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  fontWeight: 700,
                  color: '#334155',
                }}
              >
                View All Alerts
              </Button>
            </Stack>
          </Container>
        </Paper>

        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Premium Top Metrics Bar */}
          <Grid2 container spacing={3} sx={{ mb: 4 }}>
            {[
              { 
                label: 'Market Cap', 
                value: '$124.8B', 
                change: '+8.2% YTD', 
                icon: TrendingUp, 
                color: 'success',
                gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
              },
              { 
                label: 'Stock Price', 
                value: '$418.32', 
                change: '+2.4% Today', 
                icon: TrendingUp, 
                color: 'success',
                gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
              },
              { 
                label: 'TTM Revenue', 
                value: '$48.6B', 
                change: '+22.3% YoY', 
                icon: DollarSign, 
                color: 'primary',
                gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
              },
              { 
                label: 'EBITDA', 
                value: '$14.2B', 
                change: '29.2% Margin', 
                icon: Target, 
                color: 'secondary',
                gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                bgGradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
              },
              { 
                label: 'Free Cash Flow', 
                value: '$12.8B', 
                change: '26.3% Margin', 
                icon: Zap, 
                color: 'warning',
                gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
              },
              { 
                label: 'Headcount', 
                value: '26,500', 
                change: '+12.8% YoY', 
                icon: Users, 
                color: 'info',
                gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                bgGradient: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)'
              },
            ].map((stat, idx) => (
              // @ts-ignore - MUI Grid2 optional
              <Grid2 key={idx} xs={12} sm={6} md={4} lg={2}>
                <Card
                  sx={{ 
                    background: stat.bgGradient,
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    padding: 2,
                    borderRadius: 2,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    },
                  }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Typography 
                        variant="caption" 
                        fontWeight={800} 
                        sx={{ 
                          letterSpacing: '1px',
                          fontSize: '10px',
                          lineHeight: 1.2,
                          color: '#475569',
                          textTransform: 'uppercase',
                        }}
                      >
                        {stat.label}
                      </Typography>
                      <Box
                        sx={{
                          background: stat.gradient,
                          padding: '8px',
                          borderRadius: '10px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }}
                      >
                        <stat.icon size={18} color="white" strokeWidth={2.5} />
                      </Box>
                    </Stack>
                    <Typography 
                      variant="h4" 
                      fontWeight={900} 
                      sx={{ 
                        lineHeight: 1.1,
                        marginBottom: 1,
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        color: '#0f172a',
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Chip
                      size="small"
                      label={stat.change}
                      color={stat.color as any}
                      variant="outlined"
                      sx={{
                        fontWeight: 700,
                        fontSize: '11px',
                        height: '24px',
                      }}
                    />
                  </CardContent>
                </Card>
              </Grid2>
            ))}
          </Grid2>

          <Grid2 container spacing={3} sx={{ mb: 4 }}>
            {/* Premium Financial Performance Chart */}
            {/* @ts-ignore - MUI Grid2 optional */}
            <Grid2 xs={12} lg={8}>
              <Card 
                sx={{ 
                  backgroundColor: 'white',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  borderRadius: 2,
                }}
              >
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                    padding: 3.5,
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.5px', marginBottom: '4px', color: '#0f172a' }}>
                        Revenue & EBITDA Performance
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                        Rolling 12-month view with forward projections
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={2}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                          }}
                        />
                        <Typography variant="body2" fontWeight={600} sx={{ color: '#334155' }}>
                          Revenue
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
                          }}
                        />
                        <Typography variant="body2" fontWeight={600} sx={{ color: '#334155' }}>
                          EBITDA
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 14,
                            height: 3,
                            borderRadius: '2px',
                            backgroundColor: '#94a3b8',
                          }}
                        />
                        <Typography variant="body2" fontWeight={600} sx={{ color: '#334155' }}>
                          Target
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>
                <Box sx={{ height: 380, padding: 3 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={revenueData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="ebitdaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} strokeOpacity={0.5} />
                      <XAxis 
                        dataKey="month" 
                        stroke="#64748b" 
                        style={{ fontSize: '11px', fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        style={{ fontSize: '11px', fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: 'none',
                          borderRadius: '12px',
                          color: 'white',
                          padding: '12px 16px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                        }}
                        labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}
                        itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                        cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fill="url(#revGradient)"
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                      />
                      <Bar 
                        dataKey="ebitda" 
                        fill="url(#ebitdaGradient)" 
                        radius={[6, 6, 0, 0]}
                        stroke="#8b5cf6"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="projection"
                        stroke="#94a3b8"
                        strokeWidth={2.5}
                        strokeDasharray="6 4"
                        dot={false}
                        strokeOpacity={0.7}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid2>

            {/* Premium Executive KPIs Panel */}
            {/* @ts-ignore - MUI Grid2 optional */}
            <Grid2 xs={12} lg={4}>
              <Card 
                sx={{ 
                  backgroundColor: 'white',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  borderRadius: 2,
                }}
              >
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                    padding: 3.5,
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.5px', marginBottom: '4px', color: '#0f172a' }}>
                      Executive KPIs
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                      Critical business metrics
                    </Typography>
                  </Box>
                </Box>
                <Stack spacing={2} sx={{ p: 3 }}>
                  {kpiData.map((kpi, idx) => {
                    const percentage = Math.min((kpi.value / kpi.target) * 100, 100);
                    const exceeds = percentage > 100;
                    return (
                      <Card
                        key={idx}
                        sx={{
                          backgroundColor: exceeds ? '#f0fdf4' : '#fafafa',
                          borderColor: exceeds ? '#bbf7d0' : '#e5e7eb',
                          border: '1px solid',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          padding: 2,
                          borderRadius: 1,
                          '&:hover': {
                            transform: 'translateX(4px)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          },
                        }}
                      >
                        <CardContent sx={{ p: '0 !important' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: '0.2px', color: '#1e293b' }}>
                              {kpi.name}
                            </Typography>
                            <Box
                              sx={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                borderRadius: '50%',
                                padding: '4px',
                                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                              }}
                            >
                              <CheckCircle size={14} color="white" strokeWidth={3} />
                            </Box>
                          </Stack>
                          <Stack direction="row" alignItems="flex-end" spacing={1} sx={{ mb: 2 }}>
                            <Typography 
                              variant="h4" 
                              fontWeight={900} 
                              sx={{ 
                                lineHeight: 1,
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                color: '#0f172a',
                              }}
                            >
                              {kpi.value}
                              {kpi.unit}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 0.5, fontWeight: 500 }}>
                              / {kpi.target}
                              {kpi.unit}
                            </Typography>
                            {exceeds && (
                              <Chip 
                                size="small"
                                label={`+${Math.round(percentage - 100)}%`}
                                color="success"
                                variant="outlined"
                                sx={{ 
                                  marginBottom: '4px',
                                  fontSize: '0.7rem',
                                  height: '20px',
                                }}
                              />
                            )}
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            color={exceeds ? 'success' : 'primary'}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                            }}
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </Card>
            </Grid2>
          </Grid2>

          <Grid2 container spacing={3} sx={{ mb: 4 }}>
            {/* Premium Business Segment Analysis */}
            {/* @ts-ignore - MUI Grid2 optional */}
            <Grid2 xs={12} lg={6}>
              <Card 
                sx={{ 
                  backgroundColor: 'white',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  borderRadius: 2,
                }}
              >
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                    padding: 3.5,
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.5px', marginBottom: '4px', color: '#0f172a' }}>
                        Business Segment Analysis
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                        Revenue mix and growth trajectories
                      </Typography>
                    </Box>
                    <IconButton 
                      sx={{
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        color: '#64748b',
                      }}
                    >
                      <Download size={20} />
                    </IconButton>
                  </Stack>
                </Box>
                <Stack spacing={2} sx={{ p: 3 }}>
                  {segmentData.map((seg, idx) => {
                    const momentumColors: Record<string, { color: string; gradient: string; bg: string }> = {
                      hypergrowth: { 
                        color: 'green', 
                        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                      },
                      accelerating: { 
                        color: 'blue', 
                        gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                      },
                      strong: { 
                        color: 'cyan', 
                        gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                        bg: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)'
                      },
                      stable: { 
                        color: 'yellow', 
                        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                      },
                      declining: { 
                        color: 'red', 
                        gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                      },
                    };
                    const momentum = momentumColors[seg.momentum];
                    const chipColorMap: Record<string, 'success' | 'primary' | 'info' | 'warning' | 'error'> = {
                      green: 'success',
                      blue: 'primary',
                      cyan: 'info',
                      yellow: 'warning',
                      red: 'error',
                    };
                    return (
                      <Card
                        key={idx}
                        sx={{
                          background: momentum.bg,
                          borderColor: seg.growth > 0 ? '#bbf7d0' : '#fecaca',
                          border: '1px solid',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          padding: 2,
                          borderRadius: 1,
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          },
                        }}
                      >
                        <CardContent sx={{ p: '0 !important' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                            <Stack direction="row" spacing={2} sx={{ flex: 1 }}>
                              <Box
                                sx={{
                                  width: 6,
                                  height: 56,
                                  borderRadius: '6px',
                                  background: momentum.gradient,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                }}
                              />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" fontWeight={800} sx={{ marginBottom: '4px', color: '#0f172a' }}>
                                  {seg.segment}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={seg.momentum}
                                  color={chipColorMap[momentum.color] || 'default'}
                                  variant="outlined"
                                  sx={{
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    fontSize: '10px',
                                    letterSpacing: '1px',
                                    height: '22px',
                                  }}
                                />
                              </Box>
                            </Stack>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1.1, color: '#0f172a' }}>
                                ${(seg.revenue / 1000).toFixed(1)}B
                              </Typography>
                              <Chip
                                size="small"
                                label={`${seg.growth > 0 ? '+' : ''}${seg.growth}%`}
                                color={seg.growth > 0 ? 'success' : 'error'}
                                variant="outlined"
                                sx={{
                                  fontWeight: 700,
                                  marginTop: '4px',
                                  fontSize: '12px',
                                }}
                              />
                            </Box>
                          </Stack>
                          <Divider sx={{ mb: 2, borderColor: 'rgba(0,0,0,0.08)' }} />
                          <Grid2 container spacing={2}>
                            {/* @ts-ignore - MUI Grid2 optional */}
                            <Grid2 xs={4}>
                              <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: '0.5px', marginBottom: '4px', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                                Margin
                              </Typography>
                              <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>
                                {seg.margin}%
                              </Typography>
                            </Grid2>
                            {/* @ts-ignore - MUI Grid2 optional */}
                            <Grid2 xs={4}>
                              <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: '0.5px', marginBottom: '4px', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                                Market Share
                              </Typography>
                              <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>
                                {seg.share}%
                              </Typography>
                            </Grid2>
                            {/* @ts-ignore - MUI Grid2 optional */}
                            <Grid2 xs={4}>
                              <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: '0.5px', marginBottom: '4px', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                                Of Total
                              </Typography>
                              <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>
                                {Math.round((seg.revenue / 12500) * 100)}%
                              </Typography>
                            </Grid2>
                          </Grid2>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </Card>
            </Grid2>

            {/* Premium Strategic Initiatives */}
            {/* @ts-ignore - MUI Grid2 optional */}
            <Grid2 xs={12} lg={6}>
              <Card 
                sx={{ 
                  backgroundColor: 'white',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  borderRadius: 2,
                }}
              >
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                    padding: 3.5,
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.5px', marginBottom: '4px', color: '#0f172a' }}>
                        Strategic Initiatives
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                        Board-level priority tracking
                      </Typography>
                    </Box>
                    <Button 
                      size="small" 
                      endIcon={<ArrowUpRight size={14} />}
                      sx={{ 
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        color: 'white',
                        fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                        },
                      }}
                    >
                      View Roadmap
                    </Button>
                  </Stack>
                </Box>
                <Stack spacing={2} sx={{ p: 3 }}>
                  {strategicInitiatives.map((init, idx) => {
                    const statusColors: Record<string, { dot: string; progress: 'success' | 'warning' | 'error'; gradient: string; bg: string }> = {
                      'on-track': { 
                        dot: 'green', 
                        progress: 'success',
                        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                      },
                      'at-risk': { 
                        dot: 'yellow', 
                        progress: 'warning',
                        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                      },
                      delayed: { 
                        dot: 'red', 
                        progress: 'error',
                        gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                      },
                    };
                    const priorityColors: Record<string, { color: string; gradient: string }> = {
                      critical: { color: 'red', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
                      high: { color: 'orange', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
                      medium: { color: 'gray', gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' },
                    };
                    const status = statusColors[init.status];
                    const priority = priorityColors[init.priority];
                    return (
                      <Card
                        key={idx}
                        sx={{
                          background: status.bg,
                          borderColor: status.dot === 'green' ? '#bbf7d0' : status.dot === 'yellow' ? '#fde68a' : '#fecaca',
                          border: '1px solid',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          padding: 2,
                          borderRadius: 1,
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          },
                        }}
                      >
                        <CardContent sx={{ p: '0 !important' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <Box
                                  sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    background: status.gradient,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                  }}
                                />
                                <Typography variant="body2" fontWeight={800} sx={{ flex: 1, color: '#0f172a' }}>
                                  {init.name}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 3, flexWrap: 'wrap' }}>
                                <Chip size="small" label={init.owner} variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem', height: '20px' }} />
                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>•</Typography>
                                <Chip size="small" label={init.dueDate} color="primary" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem', height: '20px' }} />
                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>•</Typography>
                                <Chip
                                  size="small"
                                  label={init.priority}
                                  sx={{
                                    background: priority.gradient,
                                    color: 'white',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    fontSize: '0.7rem',
                                    height: '20px',
                                  }}
                                />
                              </Stack>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1, color: '#0f172a' }}>
                                {init.completion}%
                              </Typography>
                            </Box>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={init.completion}
                            color={status.progress}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                            }}
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </Card>
            </Grid2>
          </Grid2>

          {/* Premium Global Operations Dashboard */}
                      <Card
            sx={{ 
              backgroundColor: 'white',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              borderRadius: 2,
            }}
          >
                            <Box
              sx={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                padding: 3.5,
                borderBottom: '1px solid #e2e8f0',
              }}
            >
                    <Box>
                <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.5px', marginBottom: '4px', color: '#0f172a' }}>
                  Global Operations Dashboard
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                  Regional performance and operational metrics
                </Typography>
                            </Box>
                            </Box>
                          <Stack spacing={3} sx={{ p: 3 }}>
              <Grid2 container spacing={3}>
                {regionalData.map((region, idx) => {
                  const regionGradients = [
                    'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  ];
                  const regionIcons = ['#3b82f6', '#10b981', '#f59e0b'];
                  const progressColors: ('primary' | 'success' | 'warning')[] = ['primary', 'success', 'warning'];
                  return (
                    // @ts-ignore - MUI Grid2 optional
                    <Grid2 key={idx} xs={12} md={4}>
                      <Card
                        sx={{
                          background: regionGradients[idx],
                          borderColor: '#e5e7eb',
                          border: '1px solid',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          height: '100%',
                          padding: 3,
                          borderRadius: 2,
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                          },
                        }}
                      >
                        <CardContent sx={{ p: '0 !important' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.3px', color: '#0f172a' }}>
                              {region.region}
                            </Typography>
                            <Box
                              sx={{
                                background: `linear-gradient(135deg, ${regionIcons[idx]} 0%, ${regionIcons[idx]}dd 100%)`,
                                padding: '12px',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              }}
                            >
                              <Globe size={28} color="white" strokeWidth={2.5} />
                            </Box>
                          </Stack>
                          <Stack spacing={3}>
                            <Box>
                              <Typography variant="caption" fontWeight={600} sx={{ letterSpacing: '0.5px', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                                Revenue (TTM)
                              </Typography>
                              <Typography variant="h3" fontWeight={900} sx={{ lineHeight: 1, marginBottom: 1, fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
                                ${region.revenue}B
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                <Box
                                  sx={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                                  }}
                                >
                                  <ArrowUpRight size={14} color="white" strokeWidth={3} />
                                </Box>
                                <Typography variant="body2" fontWeight={700} sx={{ color: '#059669' }}>
                                  +{region.yoy}% YoY
                                </Typography>
                              </Stack>
                            </Box>
                          <Divider sx={{ borderColor: 'rgba(0,0,0,0.08)' }} />
                          <Grid2 container spacing={2}>
                            {/* @ts-ignore - MUI Grid2 optional */}
                            <Grid2 xs={6}>
                              <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: '0.5px', marginBottom: '6px', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                                QoQ Growth
                              </Typography>
                              <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1, color: '#0f172a' }}>
                                {region.growth}%
                              </Typography>
                            </Grid2>
                            {/* @ts-ignore - MUI Grid2 optional */}
                            <Grid2 xs={6}>
                              <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: '0.5px', marginBottom: '6px', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                                Headcount
                              </Typography>
                              <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1, color: '#0f172a' }}>
                                {region.headcount.toLocaleString()}
                              </Typography>
                            </Grid2>
                          </Grid2>
                            <Divider sx={{ borderColor: 'rgba(0,0,0,0.08)' }} />
                            <Box>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: '0.5px', color: '#94a3b8', textTransform: 'uppercase' }}>
                                  Active Deals
                                </Typography>
                                <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a' }}>
                                  {region.deals}
                                </Typography>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={(region.deals / 1000) * 100}
                                color={progressColors[idx]}
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                }}
                              />
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid2>
                  );
                })}
              </Grid2>
                          </Stack>
          </Card>
        </Container>
      </Box>
    );
  };

  const handleBackToHub = () => navigate('/hub');

  const handleSignOut = async () => {
    try {
      await signOut();
      sessionStorage.removeItem('hub_employee_info');
      navigate('/auth?hq=true');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      Number.isFinite(value) ? value : 0,
    );

  useEffect(() => {
    if (isAuthorized) {
      fetchCEOMetrics();
      
      // Set up auto-refresh every 60 seconds
      const interval = setInterval(() => {
        fetchCEOMetrics();
      }, 60000);
      
      // Set up real-time subscription for orders
      const ordersChannel = supabase
        .channel('ceo_orders_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
          },
          () => {
            fetchCEOMetrics();
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
            fetchCEOMetrics();
          }
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        ordersChannel.unsubscribe();
      };
    }
  }, [isAuthorized]);

  const fetchCEOMetrics = async () => {
    try {
      // Fetch real metrics from database
      const [employeesRes, approvalsRes, ordersRes] = await Promise.all([
        supabase.from('employees').select('id, employment_status, salary'),
        supabase.from('ceo_financial_approvals').select('id, status, amount'),
        supabase.from('orders').select('id, total_amount, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const employees = employeesRes.data || [];
      const activeEmployees = employees.filter(e => e.employment_status === 'active');
      const totalPayroll = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
      
      const approvals = approvalsRes.data || [];
      const pendingApprovals = approvals.filter(a => a.status === 'pending');
      
      const orders = ordersRes.data || [];
      const monthlyRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      setMetrics({
        totalRevenue: monthlyRevenue,
        revenueGrowth: 15.2, // Calculate from historical data
        cashFlow: monthlyRevenue * 0.35, // Estimated
        burnRate: totalPayroll / 12,
        runway: monthlyRevenue > 0 ? Math.floor((monthlyRevenue * 0.35) / (totalPayroll / 12)) : 0,
        totalEmployees: employees.length,
        admins: activeEmployees.length,
        feeders: 0, // From feeders table when available
        merchants: 0, // From merchants table when available
        pendingApprovals: pendingApprovals.length,
        criticalAlerts: 0,
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching CEO metrics:', error);
      // Fallback to defaults if error
      setMetrics({
        totalRevenue: 0,
        revenueGrowth: 0,
        cashFlow: 0,
        burnRate: 0,
        runway: 0,
        totalEmployees: 0,
        admins: 0,
        feeders: 0,
        merchants: 0,
        pendingApprovals: 0,
        criticalAlerts: 0,
      });
    }
  };

  if (loading) {
    return (
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, #0f172a, #1e293b)',
        }}
      >
        <MantineStack align="center" gap="md">
          <Loader size="xl" color="blue" />
          <Text c="white" size="lg">Verifying access...</Text>
        </MantineStack>
      </Box>
    );
  }

  if (!isAuthorized) {
    return (
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, #0f172a, #1e293b)',
          padding: '1rem',
        }}
      >
        <MantineCard w="100%" maw={500} p="xl">
          <MantineStack gap="md" align="center">
            <Title order={2} c="red" ta="center" fw={700}>
              Access Denied
            </Title>
            <Text size="lg" ta="center">You don't have CEO access to this portal.</Text>
            <Text size="sm" c="dimmed" ta="center">
              This portal is restricted to the Chief Executive Officer only.
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              Logged in as: <Text component="span" fw={600}>{user?.email}</Text>
            </Text>
            <Group gap="md" mt="md" w="100%">
              <MantineButton variant="default" onClick={() => navigate('/')} style={{ flex: 1 }}>
                Go Home
              </MantineButton>
              <MantineButton color="red" onClick={signOut} style={{ flex: 1 }}>
                Sign Out
              </MantineButton>
            </Group>
          </MantineStack>
        </MantineCard>
      </Box>
    );
  }

  return (
    <ExecutivePortalLayout
      title="CEO Portal"
      subtitle="Executive leadership command center"
      navItems={navItems}
      activeItemId={activeTab}
      onSelect={setActiveTab}
      onBack={handleBackToHub}
      onSignOut={handleSignOut}
      actionButtons={actionButtons}
      userInfo={{
        initials: 'CE',
        name: execUser?.title || 'Chief Executive Officer',
        role: 'Executive Leadership',
      }}
    >
      <MantineStack gap="md">
        {(metrics?.criticalAlerts ?? 0) > 0 && (
          <MantineAlert
            title={`${metrics.criticalAlerts} Critical Alert${metrics.criticalAlerts! > 1 ? 's' : ''}`}
            color="red"
            icon={<IconAlertTriangle size={16} />}
            styles={{
              root: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            }}
          >
            <Group justify="space-between" align="center" w="100%">
              <Text>Immediate action required. Click to view details.</Text>
              <MantineButton size="sm" color="red" onClick={() => setActiveTab('emergency')}>
                View Now
              </MantineButton>
            </Group>
          </MantineAlert>
        )}

        {renderContent()}
      </MantineStack>
    </ExecutivePortalLayout>
  );
};
 
export default CEOPortal;

