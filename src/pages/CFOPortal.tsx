// @ts-nocheck
import React, { useEffect, useState, useRef, useCallback, useMemo, Suspense } from "react";
import {
  Grid,
  Group,
  Stack,
  Button,
  Text,
  Title,
  Card,
  Paper,
  Badge,
  Alert,
  Divider,
  Modal,
  TextInput,
  Select,
  Checkbox,
  Slider,
  Tooltip,
  Popover,
  Loader,
  Box,
  Table,
  ActionIcon,
  Tabs,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Bar, Pie } from "recharts";
import { Scale } from 'lucide-react';
import { FuturisticChart } from '@/components/cfo/FuturisticChart';
import { CFOPortalLayout, CFONavItem } from '@/components/cfo/CFOPortalLayout';
import { MantineTable } from '@/components/cfo/MantineTable';
import { EmbeddedToastProvider } from '@/components/cfo/EmbeddedToast';
import { useToast } from '@/hooks/useEmbeddedToast';
import { hasFullAccess } from '@/utils/torranceAccess';

// LAZY LOAD all heavy modules for performance - only load when tab is selected
const BusinessEmailSystem = React.lazy(() => import('@/components/executive/BusinessEmailSystem'));
const ExecutiveWordProcessor = React.lazy(() => import('@/components/executive/ExecutiveWordProcessor'));
const EnhancedCFODashboard = React.lazy(() => import('@/components/cfo/EnhancedCFODashboard').then(m => ({ default: m.EnhancedCFODashboard })));
const AdvancedTreasuryManagement = React.lazy(() => import('@/components/cfo/AdvancedTreasuryManagement').then(m => ({ default: m.AdvancedTreasuryManagement })));
const EnhancedFPandA = React.lazy(() => import('@/components/cfo/EnhancedFPandA').then(m => ({ default: m.EnhancedFPandA })));
const CFOKnowledgeBase = React.lazy(() => import('@/components/cfo/CFOKnowledgeBase').then(m => ({ default: m.CFOKnowledgeBase })));
const EnhancedPayroll = React.lazy(() => import('@/components/cfo/EnhancedPayroll').then(m => ({ default: m.EnhancedPayroll })));
const EnhancedTaxPlanning = React.lazy(() => import('@/components/cfo/EnhancedTaxPlanning').then(m => ({ default: m.EnhancedTaxPlanning })));
const EnhancedFinancialControls = React.lazy(() => import('@/components/cfo/EnhancedFinancialControls').then(m => ({ default: m.EnhancedFinancialControls })));
const EnhancedBoardReporting = React.lazy(() => import('@/components/cfo/EnhancedBoardReporting').then(m => ({ default: m.EnhancedBoardReporting })));
const EnhancedInvestorRelations = React.lazy(() => import('@/components/cfo/EnhancedInvestorRelations').then(m => ({ default: m.EnhancedInvestorRelations })));
const EnhancedRiskManagement = React.lazy(() => import('@/components/cfo/EnhancedRiskManagement').then(m => ({ default: m.EnhancedRiskManagement })));
const EnhancedCapitalStructure = React.lazy(() => import('@/components/cfo/EnhancedCapitalStructure').then(m => ({ default: m.EnhancedCapitalStructure })));
const EnhancedScenarioPlanning = React.lazy(() => import('@/components/cfo/EnhancedScenarioPlanning').then(m => ({ default: m.EnhancedScenarioPlanning })));
const CFOOnboardingGovernance = React.lazy(() => import('@/components/cfo/CFOOnboardingGovernance').then(m => ({ default: m.CFOOnboardingGovernance })));
const CfoEvaluationGatePanel = React.lazy(() => import('@/components/cfo/CfoEvaluationGatePanel'));
// Enterprise Finance Modules - Lazy loaded
const CorporateGeneralLedger = React.lazy(() => import('@/components/finance/CorporateGeneralLedger').then(m => ({ default: m.CorporateGeneralLedger })));
const CorporateAccountsPayable = React.lazy(() => import('@/components/finance/CorporateAccountsPayable').then(m => ({ default: m.CorporateAccountsPayable })));
const CorporateAccountsReceivable = React.lazy(() => import('@/components/finance/CorporateAccountsReceivable').then(m => ({ default: m.CorporateAccountsReceivable })));
const VendorManagement = React.lazy(() => import('@/components/finance/VendorManagement').then(m => ({ default: m.VendorManagement })));
const FinancialReportsDashboard = React.lazy(() => import('@/components/finance/FinancialReportsDashboard').then(m => ({ default: m.FinancialReportsDashboard })));
const BudgetManagement = React.lazy(() => import('@/components/finance/BudgetManagement').then(m => ({ default: m.BudgetManagement })));
const FinanceAuditComponent = React.lazy(() => import('@/components/finance/audit/FinanceAuditComponent').then(m => ({ default: m.FinanceAuditComponent })));
const DriverCompensationDashboard = React.lazy(() => import('@/components/finance/driver-compensation/DriverCompensationDashboard').then(m => ({ default: m.DriverCompensationDashboard })));
// Invoices & Expenses Modules
const CFOInvoices = React.lazy(() => import('@/components/cfo/Invoices').then(m => ({ default: m.Invoices })));
const CFOExpenses = React.lazy(() => import('@/components/cfo/Expenses').then(m => ({ default: m.Expenses })));

// Loading fallback component
const ModuleLoader = () => (
  <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
    <Stack align="center" gap="md">
      <Loader size="lg" />
      <Text c="dimmed">Loading module...</Text>
    </Stack>
  </Box>
);

// Reusable InfoIcon component with Popover
function InfoIcon({ content, title }: { content: string; title?: string }) {
  return (
    <Popover width={300} withArrow>
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          color="blue"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 10,
          }}
        >
          <IconInfoCircle size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          {title && <Text fw={600}>{title}</Text>}
          <Text size="sm">{content}</Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function BigNavButton({ color, hover, title, subtitle, onClick, infoContent }: { color: string; hover: string; title: string; subtitle: string; onClick: () => void; infoContent?: string }) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {infoContent && <InfoIcon content={infoContent} title={title} />}
      <button
        onClick={onClick}
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${hover} 100%)`,
          color: '#fff',
          borderRadius: 16,
          padding: isMobile ? '10px 12px' : '12px 16px',
          textAlign: 'left',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          width: '100%',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
          minHeight: isMobile ? 80 : 90,
        }}
      >
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '120px',
          height: '120px',
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '50%',
          filter: 'blur(0px)',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 700 }}>{title}</h3>
          <p style={{ margin: '6px 0 0 0', fontSize: isMobile ? 12 : 13, color: 'rgba(255, 255, 255, 0.85)' }}>{subtitle}</p>
        </div>
      </button>
    </div>
  );
}

// KPI Metric Card Component
interface KpiData {
  title: string;
  value: string;
  change: number;
  changeUnit: string;
  icon: React.ElementType;
  color: string;
}

const SectionCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <Card
    shadow="sm"
    padding="lg"
    radius="md"
    withBorder
    style={style}
  >
    {children}
  </Card>
);

const MetricCard: React.FC<KpiData> = ({ title, value, change, changeUnit, icon: Icon, color }) => {
  const isPositiveMetric = title !== 'Operating Expenses' && title !== 'COGS';
  const isPositive = isPositiveMetric ? change >= 0 : change <= 0;
  
  const getGradient = () => {
    if (title === 'Monthly Revenue') return 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)';
    if (title === 'Gross Margin %') return 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.1) 100%)';
    if (title === 'Net Cash Flow (Burn $)') return 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)';
    if (title === 'COGS') return 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)';
    if (title === 'Operating Expenses') return 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)';
    return 'rgba(255, 255, 255, 0.1)';
  };

  const getIconColor = () => {
    if (title === 'Monthly Revenue') return '#3b82f6';
    if (title === 'Gross Margin %') return '#8b5cf6';
    if (title === 'Net Cash Flow (Burn $)') return '#10b981';
    if (title === 'COGS') return '#f59e0b';
    if (title === 'Operating Expenses') return '#ef4444';
    return '#64748b';
  };

  return (
    <SectionCard style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b', fontWeight: 600 }}>{title}</p>
          <p style={{ margin: '8px 0 0 0', fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{value}</p>
          <span
            style={{
              marginTop: 8,
              display: 'inline-flex',
              alignItems: 'center',
              background: isPositive ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: isPositive ? '#16a34a' : '#dc2626',
              borderRadius: 9999,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {isPositive ? '+' : '-'}
            {Math.abs(change)}{changeUnit} vs last period
          </span>
        </div>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: getGradient(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: getIconColor(),
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
          }}
        >
          <Icon size={28} />
        </div>
      </div>
    </SectionCard>
  );
};

// Revenue & Profit Trend Chart with Glassmorphism
const RevenueProfitChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div style={{ position: 'relative' }}>
      <InfoIcon content="This chart shows the monthly revenue and net cash flow trends over the last 6 months. Revenue represents total order value, while Net Cash Flow shows the profit or burn rate after all expenses." title="Financial Trend Chart" />
      <FuturisticChart
        data={data}
        type="area"
        title="Financial Performance Trend"
        height={400}
        colors={['#3b82f6', '#10b981', '#f59e0b']}
        dataKeys={{ revenue: 'Revenue', profit: 'Profit' }}
      />
    </div>
  );
};

// Expense Breakdown Pie Chart with Glassmorphism
const ExpensesPieChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div style={{ position: 'relative' }}>
      <InfoIcon content="This pie chart displays how operating expenses are distributed across different categories. Use this to identify where the majority of your operational costs are allocated." title="Expense Breakdown" />
      <FuturisticChart
        data={data}
        type="pie"
        title="Expense Distribution"
        height={400}
        colors={data.map(d => d.color)}
      />
    </div>
  );
};

// Key Financial Ratios Table with Glassmorphism
interface RatioData {
  ratio: string;
  value: string;
  interpretation: 'Strong' | 'Average' | 'Needs Attention';
}

const KeyRatiosTable: React.FC<{ data: RatioData[] }> = ({ data }) => {
  const getInterpretationStyles = (interpretation: RatioData['interpretation']) => {
    switch (interpretation) {
      case 'Strong':
        return { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)' };
      case 'Average':
        return { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' };
      case 'Needs Attention':
        return { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' };
      default:
        return { background: 'rgba(148, 163, 184, 0.2)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.4)' };
    }
  };

  return (
    <SectionCard style={{ position: 'relative' }}>
      <InfoIcon content="Key financial ratios help assess the company's financial health. Current Ratio measures liquidity, Debt-to-Equity shows leverage, Gross Margin indicates profitability, Quick Ratio tests short-term solvency, and Inventory Turnover measures efficiency." title="Key Financial Ratios" />
      <h2 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: '#0f172a',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <Scale style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
        Key Financial Ratios
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Ratio
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Value
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Health
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => {
              const styles = getInterpretationStyles(item.interpretation);
              return (
                <tr 
                  key={item.ratio} 
                  style={{ 
                    borderBottom: index < data.length - 1 ? '1px solid #e2e8f0' : 'none',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ 
                    padding: '16px', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#0f172a',
                  }}>
                    {item.ratio}
                  </td>
                  <td style={{ 
                    padding: '16px', 
                    fontSize: '14px', 
                    color: '#475569',
                  }}>
                    {item.value}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        ...styles,
                      }}
                    >
                      {item.interpretation}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
};


function CFOPortalContent() {
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<[Date | null, Date | null]>([null, null]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('evaluation');
  const [isMobile, setIsMobile] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isChatCollapsed, setIsChatCollapsed] = useState(true);
  const [user, setUser] = useState<any>(null);
  const toast = useToast();
  
  // Track user activity
  useActivityTracking('cfo');
  
  // Auto-logout after 30 minutes of inactivity
  useAutoLogout('cfo');

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const isTorrance = user ? hasFullAccess(user.email) : false;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch orders for transactions tab
      const { data: orders } = await supabase.from("orders").select("total_amount, created_at").limit(200);
      setPayouts([]);
      setTransactions(orders || []);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh every 60 seconds - COMPONENT-LEVEL DATA REFRESH ONLY
    // This only updates component state, NEVER causes page reloads
    const interval = setInterval(() => {
      // Wrap in try-catch to prevent any errors from causing issues
      try {
        fetchData();
      } catch (error) {
        console.error('Error in auto-refresh interval:', error);
        // Silently handle - don't cause page reload or navigation
      }
    }, 60000);
    
    // Set up real-time subscription for orders - COMPONENT-LEVEL DATA REFRESH ONLY
    const ordersChannel = supabase
      .channel('cfo_orders_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          // Only update state, never navigate or reload
          try {
            fetchData();
          } catch (error) {
            console.error('Error in real-time subscription callback:', error);
          }
        }
      )
      .subscribe();
    
    // Check screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      clearInterval(interval);
      ordersChannel.unsubscribe();
      window.removeEventListener('resize', checkMobile);
    };
  }, [fetchData]);

  const navItems = useMemo<CFONavItem[]>(() => [
    // Core Executive
    { id: 'evaluation', label: 'CFO Evaluation Gate' },
    { id: 'onboarding', label: 'CFO Onboarding & Governance' },
    { id: 'overview', label: 'CFO Command Center' },
    // Core Accounting
    { id: 'general-ledger', label: 'General Ledger' },
    { id: 'ap', label: 'Accounts Payable' },
    { id: 'ar', label: 'Accounts Receivable' },
    { id: 'invoices-expenses', label: 'Invoices & Expenses' },
    { id: 'vendors', label: 'Vendor Management' },
    // Banking & Treasury (consolidated — includes transactions & payouts)
    { id: 'treasury', label: 'Treasury & Banking', badge: transactions.length > 0 ? transactions.length : undefined },
    // Team & Operations (consolidated — manager, payroll, driver comp)
    { id: 'team', label: 'Team & Payroll' },
    // Planning & Analysis (consolidated — FP&A, budget, forecast, scenario)
    { id: 'fpa', label: 'FP&A & Planning' },
    // Compliance & Controls (consolidated — tax, controls, approvals)
    { id: 'tax-compliance', label: 'Tax & Compliance' },
    // Audit & Risk (consolidated)
    { id: 'audit-risk', label: 'Audit & Risk' },
    // Reporting (consolidated — reports, board, investor, capital)
    { id: 'reporting', label: 'Stakeholder Reporting' },
    // Period Close
    { id: 'close', label: 'Close Checklist' },
    // Communications (consolidated — email, docs, knowledge base)
    { id: 'comms', label: 'Communications' },
    { id: 'c-comms', label: 'C Comms' },
  ], [transactions.length]);

  const openPortal = (path: string, subdomain?: string) => {
    const host = window.location.hostname;
    if (subdomain && /^cfo\./i.test(host)) {
      const target = host.replace(/^cfo\./i, `${subdomain}.`);
      window.location.href = `${window.location.protocol}//${target}`;
      return;
    }
    navigate(path);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      navigate('/auth?hq=true');
    }
  };


  const renderContent = () => {
    switch (activeSection) {
      // ── Core Executive ──
      case 'evaluation':
        return (
          <Stack gap="md">
            <CfoEvaluationGatePanel mode={isTorrance ? 'ceo' : 'cfo'} />
          </Stack>
        );
      case 'onboarding':
        return <CFOOnboardingGovernance />;
      case 'overview':
        return <EnhancedCFODashboard />;

      // ── Core Accounting ──
      case 'general-ledger':
        return <CorporateGeneralLedger />;
      case 'ap':
        return <CorporateAccountsPayable />;
      case 'ar':
        return <CorporateAccountsReceivable />;

      // ── Invoices & Expenses (consolidated: invoices + expenses + PDF import) ──
      case 'invoices-expenses':
        return (
          <Tabs defaultValue="invoices" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="invoices">Invoices</Tabs.Tab>
              <Tabs.Tab value="expenses">Expenses</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="invoices"><Suspense fallback={<ModuleLoader />}><CFOInvoices /></Suspense></Tabs.Panel>
            <Tabs.Panel value="expenses"><Suspense fallback={<ModuleLoader />}><CFOExpenses /></Suspense></Tabs.Panel>
          </Tabs>
        );

      case 'vendors':
        return <VendorManagement />;

      // ── Treasury & Banking (consolidated: treasury + transactions + payouts) ──
      case 'treasury':
        return (
          <Tabs defaultValue="treasury" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="treasury">Treasury & Banking</Tabs.Tab>
              <Tabs.Tab value="transactions">
                Transactions {transactions.length > 0 && <Badge size="xs" ml={4}>{transactions.length}</Badge>}
              </Tabs.Tab>
              <Tabs.Tab value="payouts">Payouts</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="treasury">
              <Suspense fallback={<ModuleLoader />}><AdvancedTreasuryManagement /></Suspense>
            </Tabs.Panel>
            <Tabs.Panel value="transactions">
              <Box style={{ overflow: 'hidden' }}>
                <MantineTable
                  data={transactions}
                  loading={loading}
                  rowKey={(r: any) => r.id || r.created_at}
                  size={isMobile ? 'small' : 'default'}
                  scroll={{ x: isMobile ? 600 : 'auto' }}
                  pagination={{ pageSize: isMobile ? 5 : 10, showSizeChanger: !isMobile }}
                  columns={[
                    { title: 'Date', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString(), width: 200 },
                    { title: 'Amount', dataIndex: 'total_amount', render: (v: number) => `$${(v || 0).toLocaleString()}` },
                  ]}
                />
              </Box>
            </Tabs.Panel>
            <Tabs.Panel value="payouts">
              <Box style={{ overflow: 'hidden' }}>
                <MantineTable
                  data={payouts}
                  loading={loading}
                  rowKey={(r: any) => r.id}
                  size={isMobile ? 'small' : 'default'}
                  scroll={{ x: isMobile ? 600 : 'auto' }}
                  pagination={{ pageSize: isMobile ? 5 : 10, showSizeChanger: !isMobile }}
                  columns={[
                    { title: 'Payout ID', dataIndex: 'id' },
                    { title: 'Amount', dataIndex: 'amount', render: (v: number) => `$${(v || 0).toLocaleString()}` },
                    { title: 'Status', dataIndex: 'status' },
                    { title: 'Created', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
                  ]}
                />
              </Box>
            </Tabs.Panel>
          </Tabs>
        );

      // ── Team & Payroll (consolidated: manager + payroll + driver comp) ──
      case 'team':
        return (
          <Tabs defaultValue="manager" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="manager">Manage Team</Tabs.Tab>
              <Tabs.Tab value="payroll">Payroll</Tabs.Tab>
              <Tabs.Tab value="driver-comp">Driver Compensation</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="manager"><ManagerConsole /></Tabs.Panel>
            <Tabs.Panel value="payroll"><Suspense fallback={<ModuleLoader />}><EnhancedPayroll /></Suspense></Tabs.Panel>
            <Tabs.Panel value="driver-comp"><Suspense fallback={<ModuleLoader />}><DriverCompensationDashboard /></Suspense></Tabs.Panel>
          </Tabs>
        );

      // ── FP&A & Planning (consolidated: FP&A + budget + forecast + scenario) ──
      case 'fpa':
        return (
          <Tabs defaultValue="fpa" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="fpa">FP&A & Forecasting</Tabs.Tab>
              <Tabs.Tab value="budget">Budget Tracker</Tabs.Tab>
              <Tabs.Tab value="forecast">Cash Flow Runway</Tabs.Tab>
              <Tabs.Tab value="scenario">Scenario Models</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="fpa"><Suspense fallback={<ModuleLoader />}><EnhancedFPandA /></Suspense></Tabs.Panel>
            <Tabs.Panel value="budget"><Suspense fallback={<ModuleLoader />}><BudgetManagement /></Suspense></Tabs.Panel>
            <Tabs.Panel value="forecast"><CashFlowForecast /></Tabs.Panel>
            <Tabs.Panel value="scenario"><Suspense fallback={<ModuleLoader />}><EnhancedScenarioPlanning /></Suspense></Tabs.Panel>
          </Tabs>
        );

      // ── Tax & Compliance (consolidated: tax + controls + approvals) ──
      case 'tax-compliance':
        return (
          <Tabs defaultValue="tax" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="tax">Tax Planning</Tabs.Tab>
              <Tabs.Tab value="controls">Financial Controls</Tabs.Tab>
              <Tabs.Tab value="approvals">Approve Spend</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="tax"><Suspense fallback={<ModuleLoader />}><EnhancedTaxPlanning /></Suspense></Tabs.Panel>
            <Tabs.Panel value="controls"><Suspense fallback={<ModuleLoader />}><EnhancedFinancialControls /></Suspense></Tabs.Panel>
            <Tabs.Panel value="approvals"><ApprovalsPanel /></Tabs.Panel>
          </Tabs>
        );

      // ── Audit & Risk (consolidated) ──
      case 'audit-risk':
        return (
          <Tabs defaultValue="audit" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="audit">Audit & Compliance</Tabs.Tab>
              <Tabs.Tab value="risk">Risk Management</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="audit"><Suspense fallback={<ModuleLoader />}><FinanceAuditComponent /></Suspense></Tabs.Panel>
            <Tabs.Panel value="risk"><Suspense fallback={<ModuleLoader />}><EnhancedRiskManagement /></Suspense></Tabs.Panel>
          </Tabs>
        );

      // ── Stakeholder Reporting (consolidated: reports + board + investor + capital) ──
      case 'reporting':
        return (
          <Tabs defaultValue="reports" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="reports">Financial Reports</Tabs.Tab>
              <Tabs.Tab value="board">Board Packages</Tabs.Tab>
              <Tabs.Tab value="investor">Investor Relations</Tabs.Tab>
              <Tabs.Tab value="capital">Capital Structure</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="reports"><Suspense fallback={<ModuleLoader />}><FinancialReportsDashboard /></Suspense></Tabs.Panel>
            <Tabs.Panel value="board"><Suspense fallback={<ModuleLoader />}><EnhancedBoardReporting /></Suspense></Tabs.Panel>
            <Tabs.Panel value="investor"><Suspense fallback={<ModuleLoader />}><EnhancedInvestorRelations /></Suspense></Tabs.Panel>
            <Tabs.Panel value="capital"><Suspense fallback={<ModuleLoader />}><EnhancedCapitalStructure /></Suspense></Tabs.Panel>
          </Tabs>
        );

      // ── Period Close ──
      case 'close':
        return <CloseManagement />;

      // ── Communications (consolidated: email + documents + knowledge base) ──
      case 'comms':
        return (
          <Tabs defaultValue="email" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="email">Email & Messaging</Tabs.Tab>
              <Tabs.Tab value="docs">Draft Documents</Tabs.Tab>
              <Tabs.Tab value="knowledge">Knowledge Base</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="email"><Suspense fallback={<ModuleLoader />}><BusinessEmailSystem /></Suspense></Tabs.Panel>
            <Tabs.Panel value="docs"><Suspense fallback={<ModuleLoader />}><ExecutiveWordProcessor storageKey="cfo" supabaseTable="cfo_documents" /></Suspense></Tabs.Panel>
            <Tabs.Panel value="knowledge"><Suspense fallback={<ModuleLoader />}><CFOKnowledgeBase onNavigateToTab={setActiveSection} /></Suspense></Tabs.Panel>
          </Tabs>
        );

      default:
        return <EnhancedCFODashboard />;
    }
  };

  const content = renderContent();
  const shouldWrapContent = activeSection !== 'overview';

  return (
    <CFOPortalLayout
      activeSection={activeSection}
      onNavigate={setActiveSection}
      navItems={navItems}
    >
      <div className="space-y-6">
        <Alert color="green" style={{ padding: 16 }}>
          <Group justify="space-between" wrap="wrap" gap={12}>
            <Group gap={8}>
              <IconCircleCheck size={16} color="#059669" />
              <Text size="sm" fw={600} c="green.7">Finance systems operational</Text>
            </Group>
            <Text size="xs" c="green.6">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          </Group>
        </Alert>

        <SectionCard style={{ padding: 20 }}>
          <Group justify="space-between" mb={isChatCollapsed ? 0 : 16}>
            <Title order={4} style={{ margin: 0 }}>Executive Chat</Title>
            <Button
              size="sm"
              variant="default"
              onClick={() => setIsChatCollapsed((prev) => !prev)}
            >
              {isChatCollapsed ? 'Expand' : 'Collapse'}
            </Button>
          </Group>
          {!isChatCollapsed && (
            <ExecutiveInboxIMessage role="cfo" deviceId={`cfo-portal-${window.location.hostname}`} />
          )}
        </SectionCard>

        <Suspense fallback={<ModuleLoader />}>
          {shouldWrapContent ? (
            <SectionCard style={{ padding: isMobile ? 16 : 24, overflow: 'hidden' }}>
              {content}
            </SectionCard>
          ) : (
            content
          )}
        </Suspense>
      </div>
    </CFOPortalLayout>
  );
}

function ManagerConsole() {
  const [metrics, setMetrics] = useState<any>({ apPending:0, apOverdue:0, arPastDue:0, closeOpen:0, recsOpen:0 });
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const form = useForm({
    initialValues: {
      user_id: '',
      role: '',
    },
    validate: {
      role: (value) => (!value ? 'Role is required' : null),
    },
  });
  const [isMobile, setIsMobile] = useState(false);
  const refreshRoles = useCallback(async () => {
    const { data } = await supabase.from('finance_roles').select('user_id, role');
    setRoles((data || []).map((r:any, idx:number)=> ({ key: `${r.user_id}-${r.role}-${idx}`, ...r })));
  }, []);

  const handleRemoveRole = useCallback((record: any) => {
    modals.openConfirmModal({
      title: `Remove ${record.role} role`,
      children: <Text>Remove user {record.user_id ? record.user_id.slice(0, 8) + '...' : 'this user'} from {record.role}?</Text>,
      labels: { confirm: 'Remove', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        setLoading(true);
        try {
          const base = supabase.from('finance_roles').delete().eq('role', record.role);
          const query = record.user_id ? base.eq('user_id', record.user_id) : base.is('user_id', null);
          const { error } = await query;
          if (error) throw error;
          toast.success('Role removed', 'Success');
          await refreshRoles();
        } catch (err) {
          console.error('Error removing role', err);
          toast.error('Failed to remove role', 'Error');
        } finally {
          setLoading(false);
        }
      },
    });
  }, [refreshRoles]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [inv, rec, tasks, recon, fr] = await Promise.all([
          supabase.from('invoices').select('id, amount, due_date, status'),
          supabase.from('receivables').select('id, amount, due_date, status'),
          supabase.from('close_tasks').select('id, status').then(result => {
            if (result.error && (result.error.code === 'PGRST205' || result.error.message?.includes('Could not find'))) {
              return { data: [], error: null };
            }
            return result;
          }),
          supabase.from('reconciliations').select('id, status').then(result => {
            if (result.error && (result.error.code === 'PGRST205' || result.error.message?.includes('Could not find'))) {
              return { data: [], error: null };
            }
            return result;
          }),
          supabase.from('finance_roles').select('user_id, role')
        ]);
        const now = Date.now();
        const apPending = (inv.data || []).filter(i=> i.status==='pending' || i.status==='approved').length;
        const apOverdue = (inv.data || []).filter(i=> new Date(i.due_date).getTime() < now && i.status!=='paid').length;
        const arPastDueAmt = (rec.data || [])
          .filter(r=> new Date(r.due_date).getTime() < now && r.status!=='paid')
          .reduce((s,r)=> s + (r.amount || 0), 0);
        const closeOpen = (tasks.data || []).filter(t=> t.status!=='done').length;
        const recsOpen = (recon.data || []).filter(r=> r.status!=='tied').length;
        setMetrics({ apPending, apOverdue, arPastDue: arPastDueAmt, closeOpen, recsOpen });
        setRoles((fr.data || []).map((r:any, idx:number)=> ({ key: `${r.user_id}-${r.role}-${idx}`, ...r })));
      } finally { setLoading(false); }
    })();
    
    // Check screen size
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return (
    <div style={{ position: 'relative' }}>
      <InfoIcon content="The Manager Console provides an overview of team KPIs, workload distribution, and financial metrics. Use this to monitor AP/AR status, assign team roles, and track team performance." title="Manager Console" />
      {(metrics.apOverdue > 0 || metrics.arPastDue > 0 || metrics.closeOpen > 5) && (
        <Alert color="yellow" mb={12}>
          <Stack gap={4}>
            {metrics.apOverdue > 0 && <Text size="sm">AP overdue invoices: <strong>{metrics.apOverdue}</strong></Text>}
            {metrics.arPastDue > 0 && <Text size="sm">AR past due: <strong>$ {metrics.arPastDue.toLocaleString()}</strong></Text>}
            {metrics.closeOpen > 5 && <Text size="sm">Close tasks open: <strong>{metrics.closeOpen}</strong></Text>}
          </Stack>
        </Alert>
      )}
      <Grid gutter="md" mb={12}>
        <Grid.Col span={{ base: 12, sm: 12, lg: 6 }}>
          <Paper p={isMobile ? 12 : 16} radius="md" bg="gray.0">
            <Text size={isMobile ? 'xs' : 'sm'} c="gray.6">AP Queue (pending/approved)</Text>
            <Text fw={700} size={isMobile ? 'lg' : 'xl'}>{metrics.apPending}</Text>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 12, lg: 6 }}>
          <Paper p={isMobile ? 12 : 16} radius="md" bg="orange.0">
            <Text size={isMobile ? 'xs' : 'sm'} c="orange.9">AP Overdue</Text>
            <Text fw={700} size={isMobile ? 'lg' : 'xl'}>{metrics.apOverdue}</Text>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 12, lg: 6 }}>
          <Paper p={isMobile ? 12 : 16} radius="md" bg="red.0">
            <Text size={isMobile ? 'xs' : 'sm'} c="red.9">AR Past Due $</Text>
            <Text fw={700} size={isMobile ? 'lg' : 'xl'}>$ {metrics.arPastDue.toLocaleString()}</Text>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 12, lg: 6 }}>
          <Paper p={isMobile ? 12 : 16} radius="md" bg="blue.0">
            <Text size={isMobile ? 'xs' : 'sm'} c="blue.9">Close Tasks Open</Text>
            <Text fw={700} size={isMobile ? 'lg' : 'xl'}>{metrics.closeOpen}</Text>
          </Paper>
        </Grid.Col>
      </Grid>
      <Title order={5}>Team Workload</Title>
      <Grid gutter="md" mb={12}>
        {['CFO','Controller','AP','AR','Treasury','Auditor'].map((r) => {
          const count = roles.filter(x => x.role === r).length;
          return (
            <Grid.Col key={r} span={{ base: 12, md: 8, lg: 4 }}>
              <Paper p={isMobile ? 10 : 12} radius="md" bg="gray.0">
                <Text size={isMobile ? 'xs' : 'sm'} c="gray.7">{r}</Text>
                <Text fw={700} size={isMobile ? 'sm' : 'md'}>{count} member(s)</Text>
              </Paper>
            </Grid.Col>
          );
        })}
      </Grid>
      <Divider label="Team Roles" />
      <Group mb={8}>
        <Button onClick={() => setRoleModal(true)} size={isMobile ? 'sm' : 'md'}>Assign Role</Button>
      </Group>
      <Box style={{ overflow: 'hidden' }}>
        <MantineTable
          data={roles}
          loading={loading}
          size={isMobile ? 'small' : 'default'}
          scroll={{ x: isMobile ? 600 : 'auto' }}
          columns={[
            { title: 'User ID', dataIndex: 'user_id' },
            { title: 'Role', dataIndex: 'role' },
            {
              title: 'Actions',
              key: 'actions',
              width: 160,
              render: (_: any, record: any) => (
                <Group gap="xs">
                  <Button
                    size="sm"
                    onClick={() => {
                      form.setValues({
                        user_id: record.user_id,
                        role: record.role,
                      });
                      setRoleModal(true);
                    }}
                  >
                    Reassign
                  </Button>
                  <Button size="sm" color="red" onClick={() => handleRemoveRole(record)}>
                    Remove
                  </Button>
                </Group>
              ),
            },
          ]}
        />
      </Box>
      <Modal
        title="Assign Finance Role"
        opened={roleModal}
        onClose={() => setRoleModal(false)}
        size={isMobile ? '90%' : 600}
      >
        <form onSubmit={form.onSubmit(async (vals) => {
          setLoading(true);
          try {
            const { error } = await supabase.from('finance_roles').insert({ user_id: vals.user_id || crypto.randomUUID(), role: vals.role });
            if (error) throw error;
            await refreshRoles();
            setRoleModal(false);
            form.reset();
            toast.success('Role assigned', 'Success');
          } finally { setLoading(false); }
        })}>
          <Stack>
            <TextInput
              label="User ID"
              {...form.getInputProps('user_id')}
              description="Enter user UUID or leave blank to generate one"
            />
            <Select
              label="Role"
              {...form.getInputProps('role')}
              required
              data={[
                {value:'CFO',label:'CFO'},
                {value:'Controller',label:'Controller'},
                {value:'AP',label:'AP'},
                {value:'AR',label:'AR'},
                {value:'Treasury',label:'Treasury'},
                {value:'Auditor',label:'Auditor'}
              ]}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setRoleModal(false)}>Cancel</Button>
              <Button type="submit" loading={loading}>Assign</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </div>
  );
}

function CashFlowForecast() {
  const [series, setSeries] = useState<Array<{ period: string; cash: number; revenue: number; expenses: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expenseRatio, setExpenseRatio] = useState(0.65);
  const [growthRate, setGrowthRate] = useState(0.05);
  const [revenueByMonth, setRevenueByMonth] = useState<Record<string, number>>({});

  const buildForecast = useCallback(() => {
    const months = 6;
    const now = new Date();
    const sortedPeriods = Object.keys(revenueByMonth).sort();
    let lastActualRevenue = sortedPeriods.length
      ? revenueByMonth[sortedPeriods[sortedPeriods.length - 1]]
      : 0;
    const forecast: Array<{ period: string; cash: number; revenue: number; expenses: number }> = [];
    let cash = 0;

    for (let i = -3; i < months; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
      const period = d.toISOString().slice(0, 7);
      let revenue = revenueByMonth[period];
      if (typeof revenue === 'number') {
        lastActualRevenue = revenue;
      } else if (i >= 0) {
        revenue = Math.max(0, lastActualRevenue * (1 + growthRate));
        lastActualRevenue = revenue;
      } else {
        revenue = 0;
      }
      const expenses = Math.round(revenue * expenseRatio);
      cash += revenue - expenses;
      forecast.push({ period, cash, revenue, expenses });
    }
    return forecast;
  }, [revenueByMonth, expenseRatio, growthRate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: orders } = await supabase
          .from('orders')
          .select('total_amount, created_at')
          .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());
        const revenueMap: Record<string, number> = (orders || []).reduce(
          (m: Record<string, number>, o: any) => {
            const key = new Date(o.created_at).toISOString().slice(0, 7);
            m[key] = (m[key] || 0) + (o.total_amount || 0);
            return m;
          },
          {}
        );
        setRevenueByMonth(revenueMap);
      } finally {
        setLoading(false);
      }
    })();

    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setSeries(buildForecast());
  }, [buildForecast]);

  const scenarioCash = useMemo(
    () => (series.length ? series[series.length - 1].cash : 0),
    [series]
  );

  return (
    <div>
      <Text c="gray.7" mb="md">
        Adjust expense ratio and forward revenue growth to model cash runway in real time.
      </Text>
      <Stack
        gap={isMobile ? 12 : 20}
        mb={16}
      >
        <Box style={{ minWidth: isMobile ? '100%' : 240 }}>
          <Text fw={600} mb={4}>Expense Ratio</Text>
          <Slider
            min={30}
            max={90}
            step={1}
            value={Math.round(expenseRatio * 100)}
            onChange={(val) => setExpenseRatio((Array.isArray(val) ? val[0] : val) / 100)}
            mb={4}
          />
          <Text size="sm" c="dimmed">{Math.round(expenseRatio * 100)}%</Text>
        </Box>
        <Box style={{ minWidth: isMobile ? '100%' : 240 }}>
          <Text fw={600} mb={4}>Forward Growth Rate</Text>
          <Slider
            min={-20}
            max={40}
            step={1}
            value={Math.round(growthRate * 100)}
            onChange={(val) => setGrowthRate((Array.isArray(val) ? val[0] : val) / 100)}
            mb={4}
          />
          <Text size="sm" c="dimmed">{Math.round(growthRate * 100)}%</Text>
        </Box>
        <Box style={{ minWidth: isMobile ? '100%' : 220 }}>
          <Text fw={600} mb={4}>Cash After Scenario</Text>
          <Text size={isMobile ? 'lg' : 'xl'} fw={700} c="green.7">
            ${Math.round(scenarioCash).toLocaleString()}
          </Text>
          <Text size="sm" c="dimmed">6-month cumulative outlook</Text>
        </Box>
        <Button 
          onClick={() => { setExpenseRatio(0.65); setGrowthRate(0.05); }} 
          disabled={expenseRatio === 0.65 && growthRate === 0.05}
        >
          Reset Scenario
        </Button>
      </Stack>
      <div style={{ height: 320, marginBottom: 16 }}>
        <ChartContainer config={{ cash: { label: 'Cash', color: '#16a34a' } }}>
          <LineChart data={series} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} width={72} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="cash" stroke="var(--color-cash)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </div>
      <Box style={{ overflow: 'hidden' }}>
        <MantineTable
          data={series.map((s) => ({ key: s.period, ...s }))}
          loading={loading}
          pagination={false}
          size={isMobile ? 'small' : 'default'}
          columns={[
            { title: 'Period', dataIndex: 'period' },
            { title: 'Revenue', dataIndex: 'revenue', render: (v: number) => `$${(v || 0).toLocaleString()}` },
            { title: 'Expenses', dataIndex: 'expenses', render: (v: number) => `$${(v || 0).toLocaleString()}` },
            { title: 'Projected Cash', dataIndex: 'cash', render: (v: number) => `$${(v || 0).toLocaleString()}` },
          ]}
        />
      </Box>
    </div>
  );
}

function ApprovalsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const statusColors = useMemo(() => ({
    pending: 'gold',
    approved: 'green',
    rejected: 'red',
  }), []);

  const loadApprovals = useCallback(async (statusFilter: string) => {
    const { data } = await supabase
      .from('ceo_financial_approvals')
      .select('id, requester, description, amount, status, created_at')
      .eq('status', statusFilter)
      .order('created_at', { ascending: false });
    setRows((data || []).map((d: any) => ({ key: d.id, ...d })));
  }, []);

  const handleApprovalAction = useCallback(async (record: any, nextStatus: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ceo_financial_approvals')
        .update({ status: nextStatus })
        .eq('id', record.id);
      if (error) throw error;
      toast.success(`Request ${nextStatus}`, 'Success');
      await loadApprovals(status);
    } catch (err) {
      console.error('Failed to update approval', err);
      toast.error('Unable to update approval', 'Error');
    } finally {
      setLoading(false);
    }
  }, [loadApprovals, status]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadApprovals(status);
      } finally {
        setLoading(false);
      }
    })();
    
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [status, loadApprovals]);
  return (
    <div style={{ position: 'relative' }}>
      <InfoIcon content="Review and approve pending financial transactions, expense requests, and spending authorizations. Filter by status to view pending, approved, or rejected items." title="Financial Approvals" />
      <Stack gap="xs" mb={12}>
        <Text>Filter:</Text>
        <Group>
          <Button 
            variant={status==='pending'? 'filled':'default'} 
            onClick={() => setStatus('pending')} 
            fullWidth={isMobile}
          >
            Pending
          </Button>
          <Button 
            variant={status==='approved'? 'filled':'default'} 
            onClick={() => setStatus('approved')} 
            fullWidth={isMobile}
          >
            Approved
          </Button>
          <Button 
            variant={status==='rejected'? 'filled':'default'} 
            onClick={() => setStatus('rejected')} 
            fullWidth={isMobile}
          >
            Rejected
          </Button>
        </Group>
      </Stack>
      <Box style={{ overflow: 'hidden' }}>
        <MantineTable
          data={rows}
          loading={loading}
          size={isMobile ? 'small' : 'default'}
          scroll={{ x: isMobile ? 800 : 'auto' }}
          pagination={{ pageSize: isMobile ? 5 : 10, showSizeChanger: !isMobile }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 90 },
            { title: 'Requester', dataIndex: 'requester' },
            { title: 'Description', dataIndex: 'description' },
            { title: 'Amount', dataIndex: 'amount', render: (v: number) => `$${(v||0).toLocaleString()}` },
            { title: 'Status', dataIndex: 'status', render: (value: string) => (
              <Badge color={statusColors[value] || 'gray'} style={{ textTransform: 'capitalize' }}>
                {value}
              </Badge>
            ) },
            { title: 'Created', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString(), width: 180 },
            {
              title: 'Actions',
              key: 'actions',
              width: 220,
              render: (_: any, record: any) => (
                <Group gap="xs" wrap>
                  <Button size="sm" variant="filled" onClick={() => handleApprovalAction(record, 'approved')}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    color="red"
                    onClick={() =>
                      modals.openConfirmModal({
                        title: 'Reject request?',
                        children: <Text>This will mark the request as rejected.</Text>,
                        labels: { confirm: 'Reject', cancel: 'Cancel' },
                        confirmProps: { color: 'red' },
                        onConfirm: () => handleApprovalAction(record, 'rejected'),
                      })
                    }
                  >
                    Reject
                  </Button>
                </Group>
              ),
            },
          ]}
        />
      </Box>
    </div>
  );
}



function CloseManagement() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const loadCloseData = useCallback(async () => {
    const [t, r] = await Promise.all([
      supabase.from('close_tasks').select('id, period, name, owner, status, due_day').order('due_day', { ascending: true }),
      supabase.from('reconciliations').select('id, period, type, status, notes').order('type', { ascending: true }),
    ]);
    setTasks((t.data || []).map((x: any) => ({ key: x.id, ...x })));
    setRecs((r.data || []).map((x: any) => ({ key: x.id, ...x })));
  }, []);

  const handleTaskStatusChange = useCallback(async (record: any, nextStatus?: string) => {
    setLoading(true);
    try {
      const statusToSet = nextStatus || (record.status === 'done' ? 'todo' : 'done');
      const { error } = await supabase
        .from('close_tasks')
        .update({ status: statusToSet })
        .eq('id', record.id);
      if (error) throw error;
      toast.success(`Task marked ${statusToSet}`, 'Success');
      await loadCloseData();
    } catch (err) {
      console.error('Failed to update close task', err);
      toast.error('Unable to update task', 'Error');
    } finally {
      setLoading(false);
    }
  }, [loadCloseData]);

  const handleReconStatusChange = useCallback(async (record: any, nextStatus?: string) => {
    setLoading(true);
    try {
      const statusToSet = nextStatus || (record.status === 'tied' ? 'open' : 'tied');
      const { error } = await supabase
        .from('reconciliations')
        .update({ status: statusToSet })
        .eq('id', record.id);
      if (error) throw error;
      toast.success(`Reconciliation ${statusToSet}`, 'Success');
      await loadCloseData();
    } catch (err) {
      console.error('Failed to update reconciliation', err);
      toast.error('Unable to update reconciliation', 'Error');
    } finally {
      setLoading(false);
    }
  }, [loadCloseData]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadCloseData();
      } finally {
        setLoading(false);
      }
    })();
    
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return (
    <Grid gutter="md">
      <Grid.Col span={{ base: 24, lg: 14 }}>
        <Title order={5}>Close Checklist</Title>
        <Group mb={8}>
          <Button 
            onClick={async () => {
              setRolling(true);
              try {
                const now = new Date();
                const currentPeriod = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0,7);
                const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-1, 1)).toISOString().slice(0,7);
                // Pull previous tasks and clone to current
                const { data: prevTasks } = await supabase.from('close_tasks').select('*').eq('period', prev);
                if (prevTasks && prevTasks.length) {
                  const inserts = prevTasks.map((t: any) => ({ period: currentPeriod, name: t.name, owner: t.owner, status: 'todo', due_day: t.due_day }));
                  await supabase.from('close_tasks').insert(inserts);
                  toast.success('Rolled close tasks forward', 'Success');
                  await loadCloseData();
                } else {
                  toast.info('No previous tasks to roll', 'Info');
                }
              } finally {
                setRolling(false);
              }
            }}
            loading={rolling}
          >
            Roll Previous Month
          </Button>
        </Group>
        <Box style={{ overflow: 'hidden' }}>
          <MantineTable
            data={tasks}
            loading={loading}
            pagination={false}
            size={isMobile ? 'small' : 'default'}
            scroll={{ x: isMobile ? 600 : 'auto' }}
            columns={[
              { title: 'Period', dataIndex: 'period', width: 110 },
              { title: 'Task', dataIndex: 'name' },
              { title: 'Owner', dataIndex: 'owner', width: 140 },
              { title: 'Due (Day)', dataIndex: 'due_day', width: 100 },
              {
                title: 'Done',
                dataIndex: 'status',
                width: 80,
                render: (_: any, record: any) => (
                  <Checkbox
                    checked={record.status === 'done'}
                    onChange={() => handleTaskStatusChange(record)}
                  />
                ),
              },
              { title: 'Status', dataIndex: 'status', width: 120 },
              {
                title: 'Actions',
                key: 'actions',
                width: 160,
                render: (_: any, record: any) => (
                  <Group gap="xs">
                    <Button size="sm" onClick={() => handleTaskStatusChange(record, 'in_progress')}>
                      Start
                    </Button>
                    <Button size="sm" variant="filled" onClick={() => handleTaskStatusChange(record, 'done')}>
                      Complete
                    </Button>
                  </Group>
                ),
              },
            ]}
          />
        </Box>
      </Grid.Col>
      <Grid.Col span={{ base: 24, lg: 10 }}>
        <Title order={5}>Reconciliations</Title>
        <Box style={{ overflow: 'hidden' }}>
          <MantineTable
            data={recs}
            loading={loading}
            pagination={false}
            size={isMobile ? 'small' : 'default'}
            scroll={{ x: isMobile ? 600 : 'auto' }}
            columns={[
              { title: 'Period', dataIndex: 'period', width: 110 },
              { title: 'Type', dataIndex: 'type', width: 140 },
              { title: 'Status', dataIndex: 'status', width: 120 },
              {
                title: 'Actions',
                key: 'actions',
                width: 160,
                render: (_: any, record: any) => (
                  <Group gap="xs">
                    <Button size="sm" onClick={() => handleReconStatusChange(record, 'in_progress')}>
                      Work
                    </Button>
                    <Button
                      size="sm"
                      variant="filled"
                      onClick={() => handleReconStatusChange(record, 'tied')}
                    >
                      Tie Out
                    </Button>
                  </Group>
                ),
              },
              { title: 'Notes', dataIndex: 'notes' },
            ]}
          />
        </Box>
      </Grid.Col>
    </Grid>
  );
}


export default function CFOPortal() {
  return (
    <EmbeddedToastProvider>
      <CFOPortalContent />
    </EmbeddedToastProvider>
  );
}