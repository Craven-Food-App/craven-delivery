// @ts-nocheck
import React, { useEffect, useState, useCallback, useMemo, Suspense } from "react";
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
import { MantineTable } from '@/components/cfo/MantineTable';
import { EmbeddedToastProvider } from '@/components/cfo/EmbeddedToast';
import { useToast } from '@/hooks/useEmbeddedToast';
import { hasFullAccess, hasCFOPortalAccess } from '@/utils/torranceAccess';
import {
  IconCurrencyDollar,
  IconFileText,
  IconBuildingBank,
  IconUsers,
  IconChartBar,
  IconShield,
  IconChecklist,
  IconReport,
  IconWallet,
  IconTrendingUp,
  IconMail,
  IconMessageCircle,
  IconSettings,
  IconCalendar,
} from '@tabler/icons-react';
import { UnifiedPortalShell, PortalTab, PortalKPI, PortalLoadingState, PortalAccessDenied } from '@/components/portal/UnifiedPortalShell';
import { ExecutiveCalendarTabContent } from '@/components/calendar/ExecutiveCalendarTabContent';
import { useExecAuth } from '@/hooks/useExecAuth';
import { ExecutiveInboxIMessage } from '@/components/executive/ExecutiveInboxIMessage';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// LAZY LOAD all heavy modules
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

const CorporateGeneralLedger = React.lazy(() => import('@/components/finance/CorporateGeneralLedger').then(m => ({ default: m.CorporateGeneralLedger })));
const CorporateAccountsPayable = React.lazy(() => import('@/components/finance/CorporateAccountsPayable').then(m => ({ default: m.CorporateAccountsPayable })));
const CorporateAccountsReceivable = React.lazy(() => import('@/components/finance/CorporateAccountsReceivable').then(m => ({ default: m.CorporateAccountsReceivable })));
const VendorManagement = React.lazy(() => import('@/components/finance/VendorManagement').then(m => ({ default: m.VendorManagement })));
const FinancialReportsDashboard = React.lazy(() => import('@/components/finance/FinancialReportsDashboard').then(m => ({ default: m.FinancialReportsDashboard })));
const BudgetManagement = React.lazy(() => import('@/components/finance/BudgetManagement').then(m => ({ default: m.BudgetManagement })));
const FinanceAuditComponent = React.lazy(() => import('@/components/finance/audit/FinanceAuditComponent').then(m => ({ default: m.FinanceAuditComponent })));
const DriverCompensationDashboard = React.lazy(() => import('@/components/finance/driver-compensation/DriverCompensationDashboard').then(m => ({ default: m.DriverCompensationDashboard })));
const CFOInvoices = React.lazy(() => import('@/components/cfo/Invoices').then(m => ({ default: m.Invoices })));
const CFOExpenses = React.lazy(() => import('@/components/cfo/Expenses').then(m => ({ default: m.Expenses })));
const EmbeddedCComms = React.lazy(() => import('@/portals/internal-comms/EmbeddedCComms'));

const ModuleLoader = () => (
  <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-border bg-muted/20">
    <div className="text-center">
      <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <p className="text-xs text-muted-foreground">Loading module...</p>
    </div>
  </div>
);

const TABS: PortalTab[] = [
  // Core Executive
  { id: 'onboarding', label: 'Onboarding & Governance', description: 'CFO onboarding and governance framework.', section: 'Executive', icon: IconChecklist },
  { id: 'overview', label: 'CFO Command Center', description: 'Executive financial dashboard and KPIs.', section: 'Executive', icon: IconChartBar },
  { id: 'calendar', label: 'Executive Calendar', description: 'Shared leadership schedule (same as Company Portal).', section: 'Executive', icon: IconCalendar },
  // Core Accounting
  { id: 'general-ledger', label: 'General Ledger', description: 'Chart of accounts and journal entries.', section: 'Accounting', icon: IconBuildingBank },
  { id: 'ap', label: 'Accounts Payable', description: 'Vendor invoices and payment processing.', section: 'Accounting', icon: IconCurrencyDollar },
  { id: 'ar', label: 'Accounts Receivable', description: 'Customer invoices and collections.', section: 'Accounting', icon: IconWallet },
  { id: 'invoices-expenses', label: 'Invoices & Expenses', description: 'Invoice management and expense tracking.', section: 'Accounting', icon: IconFileText },
  { id: 'vendors', label: 'Vendor Management', description: 'Vendor onboarding and performance.', section: 'Accounting', icon: IconUsers },
  // Banking & Treasury
  { id: 'treasury', label: 'Treasury & Banking', description: 'Cash management and banking operations.', section: 'Treasury', icon: IconBuildingBank },
  // Team & Payroll
  { id: 'team', label: 'Team & Payroll', description: 'Team management, payroll, and driver comp.', section: 'Operations', icon: IconUsers },
  // Planning & Analysis
  { id: 'fpa', label: 'FP&A & Planning', description: 'Financial planning, analysis, and forecasting.', section: 'Planning', icon: IconTrendingUp },
  // Tax & Compliance
  { id: 'tax-compliance', label: 'Tax & Compliance', description: 'Tax planning and financial controls.', section: 'Planning', icon: IconShield },
  // Audit & Risk
  { id: 'audit-risk', label: 'Audit & Risk', description: 'Audit management and risk assessment.', section: 'Planning', icon: IconReport },
  // Reporting
  { id: 'reporting', label: 'Stakeholder Reporting', description: 'Board, investor, and financial reports.', section: 'Reporting', icon: IconReport },
  // Period Close
  { id: 'close', label: 'Close Checklist', description: 'Period close tasks and reconciliations.', section: 'Reporting', icon: IconChecklist },
  // Communications
  { id: 'comms', label: 'Communications', description: 'Email, documents, and knowledge base.', section: 'Communications', icon: IconMail },
  { id: 'c-comms', label: 'C-Suite Comms', description: 'Cross-executive communication workspace.', section: 'Communications', icon: IconMessageCircle },
];

const SECTIONS = ['Executive', 'Accounting', 'Treasury', 'Operations', 'Planning', 'Reporting', 'Communications'];

function CFOPortalContent() {
  const [loading, setLoading] = useState(false);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('evaluation');
  const [isMobile, setIsMobile] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [user, setUser] = useState<any>(null);
  const [kpis, setKpis] = useState<PortalKPI[]>([]);
  const toast = useToast();
  const { loading: authLoading, user: authUser, execUser, isAuthorized, signOut } = useExecAuth('cfo');

  useActivityTracking('cfo');
  useAutoLogout('cfo');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const isTorrance = user ? hasCFOPortalAccess(user.email) : false;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: orders } = await supabase.from("orders").select("total_amount, created_at").limit(200);
      setPayouts([]);
      setTransactions(orders || []);
      setLastUpdated(new Date());

      // Calculate KPIs
      const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const [apRes, arRes, approvalsRes] = await Promise.all([
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('accounts_receivable').select('id', { count: 'exact', head: true }).neq('status', 'paid'),
        supabase.from('ceo_financial_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setKpis([
        { id: 'revenue', label: 'Revenue MTD', value: `$${totalRevenue.toLocaleString()}`, delta: 'From orders', up: totalRevenue > 0 },
        { id: 'transactions', label: 'Transactions', value: String((orders || []).length), delta: 'This period', up: true },
        { id: 'ap-pending', label: 'AP Pending', value: String(apRes.count || 0), delta: 'Invoices', up: (apRes.count || 0) === 0 },
        { id: 'ar-open', label: 'AR Open', value: String(arRes.count || 0), delta: 'Outstanding', up: (arRes.count || 0) === 0 },
        { id: 'approvals', label: 'Approvals', value: String(approvalsRes.count || 0), delta: 'Pending', up: (approvalsRes.count || 0) === 0, onClick: () => setActiveSection('tax-compliance') },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized && !isTorrance) return;
    fetchData();
    const interval = setInterval(fetchData, 60000);
    const ordersChannel = supabase
      .channel('cfo_orders_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .subscribe();
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      clearInterval(interval);
      ordersChannel.unsubscribe();
      window.removeEventListener('resize', checkMobile);
    };
  }, [fetchData, isAuthorized, isTorrance]);

  if (authLoading) return <PortalLoadingState />;
  if (!isAuthorized && !isTorrance) return <PortalAccessDenied portalName="CFO Portal" email={authUser?.email} onSignOut={signOut} />;

  const renderContent = () => {
    switch (activeSection) {
      case 'onboarding':
        return <Suspense fallback={<ModuleLoader />}><CFOOnboardingGovernance /></Suspense>;
      case 'overview':
        return <Suspense fallback={<ModuleLoader />}><EnhancedCFODashboard /></Suspense>;
      case 'calendar':
        return <ExecutiveCalendarTabContent />;
      case 'general-ledger':
        return <Suspense fallback={<ModuleLoader />}><CorporateGeneralLedger /></Suspense>;
      case 'ap':
        return <Suspense fallback={<ModuleLoader />}><CorporateAccountsPayable /></Suspense>;
      case 'ar':
        return <Suspense fallback={<ModuleLoader />}><CorporateAccountsReceivable /></Suspense>;
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
        return <Suspense fallback={<ModuleLoader />}><VendorManagement /></Suspense>;
      case 'treasury':
        return (
          <Tabs defaultValue="treasury" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="treasury">Treasury & Banking</Tabs.Tab>
              <Tabs.Tab value="transactions">Transactions {transactions.length > 0 && <Badge size="xs" ml={4}>{transactions.length}</Badge>}</Tabs.Tab>
              <Tabs.Tab value="payouts">Payouts</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="treasury"><Suspense fallback={<ModuleLoader />}><AdvancedTreasuryManagement /></Suspense></Tabs.Panel>
            <Tabs.Panel value="transactions">
              <MantineTable data={transactions} loading={loading} rowKey={(r: any) => r.id || r.created_at} size={isMobile ? 'small' : 'default'} scroll={{ x: isMobile ? 600 : 'auto' }} pagination={{ pageSize: isMobile ? 5 : 10, showSizeChanger: !isMobile }} columns={[
                { title: 'Date', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString(), width: 200 },
                { title: 'Amount', dataIndex: 'total_amount', render: (v: number) => `$${(v || 0).toLocaleString()}` },
              ]} />
            </Tabs.Panel>
            <Tabs.Panel value="payouts">
              <MantineTable data={payouts} loading={loading} rowKey={(r: any) => r.id} size={isMobile ? 'small' : 'default'} scroll={{ x: isMobile ? 600 : 'auto' }} pagination={{ pageSize: isMobile ? 5 : 10, showSizeChanger: !isMobile }} columns={[
                { title: 'Payout ID', dataIndex: 'id' },
                { title: 'Amount', dataIndex: 'amount', render: (v: number) => `$${(v || 0).toLocaleString()}` },
                { title: 'Status', dataIndex: 'status' },
                { title: 'Created', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
              ]} />
            </Tabs.Panel>
          </Tabs>
        );
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
      case 'close':
        return <CloseManagement />;
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
      case 'c-comms':
        return <Suspense fallback={<ModuleLoader />}><EmbeddedCComms /></Suspense>;
      default:
        return <Suspense fallback={<ModuleLoader />}><EnhancedCFODashboard /></Suspense>;
    }
  };

  return (
    <UnifiedPortalShell
      portalName="CFO Portal"
      portalSubtitle="Financial command center and treasury management"
      sectionLabel="Executive Finance"
      tabs={TABS}
      sections={SECTIONS}
      activeTab={activeSection}
      onTabChange={setActiveSection}
      kpis={kpis}
      kpiLabel="Financial Health — Live"
      lastUpdated={lastUpdated}
      userTitle={execUser?.title || 'Chief Financial Officer'}
      onBack={() => navigate('/hub')}
      onSignOut={async () => { await signOut(); navigate('/auth?hq=true'); }}
      headerActions={
        <>
          <button onClick={() => navigate('/ceo')} className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">CEO</button>
          <button onClick={() => navigate('/finance')} className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">Finance</button>
        </>
      }
    >
      {renderContent()}
    </UnifiedPortalShell>
  );
}

// ── Sub-components preserved from original ──

function ManagerConsole() {
  const [metrics, setMetrics] = useState<any>({ apPending:0, apOverdue:0, arPastDue:0, closeOpen:0, recsOpen:0 });
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const form = useForm({ initialValues: { user_id: '', role: '' }, validate: { role: (value) => (!value ? 'Role is required' : null) } });
  const [isMobile, setIsMobile] = useState(false);
  const toast = useToast();
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
          toast.error('Failed to remove role', 'Error');
        } finally { setLoading(false); }
      },
    });
  }, [refreshRoles, toast]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [inv, rec, tasks, recon, fr] = await Promise.all([
          supabase.from('invoices').select('id, amount, due_date, status'),
          supabase.from('receivables').select('id, amount, due_date, status'),
          supabase.from('close_tasks').select('id, status').then(result => {
            if (result.error && (result.error.code === 'PGRST205' || result.error.message?.includes('Could not find'))) return { data: [], error: null };
            return result;
          }),
          supabase.from('reconciliations').select('id, status').then(result => {
            if (result.error && (result.error.code === 'PGRST205' || result.error.message?.includes('Could not find'))) return { data: [], error: null };
            return result;
          }),
          supabase.from('finance_roles').select('user_id, role')
        ]);
        const now = Date.now();
        const apPending = (inv.data || []).filter(i=> i.status==='pending' || i.status==='approved').length;
        const apOverdue = (inv.data || []).filter(i=> new Date(i.due_date).getTime() < now && i.status!=='paid').length;
        const arPastDueAmt = (rec.data || []).filter(r=> new Date(r.due_date).getTime() < now && r.status!=='paid').reduce((s,r)=> s + (r.amount || 0), 0);
        const closeOpen = (tasks.data || []).filter(t=> t.status!=='done').length;
        const recsOpen = (recon.data || []).filter(r=> r.status!=='tied').length;
        setMetrics({ apPending, apOverdue, arPastDue: arPastDueAmt, closeOpen, recsOpen });
        setRoles((fr.data || []).map((r:any, idx:number)=> ({ key: `${r.user_id}-${r.role}-${idx}`, ...r })));
      } finally { setLoading(false); }
    })();
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div>
      {(metrics.apOverdue > 0 || metrics.arPastDue > 0 || metrics.closeOpen > 5) && (
        <div className="mb-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
          {metrics.apOverdue > 0 && <p className="text-xs text-foreground">AP overdue invoices: <strong>{metrics.apOverdue}</strong></p>}
          {metrics.arPastDue > 0 && <p className="text-xs text-foreground">AR past due: <strong>${metrics.arPastDue.toLocaleString()}</strong></p>}
          {metrics.closeOpen > 5 && <p className="text-xs text-foreground">Close tasks open: <strong>{metrics.closeOpen}</strong></p>}
        </div>
      )}
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded-md border border-border bg-background p-3"><p className="text-[10px] font-semibold uppercase text-muted-foreground">AP Queue</p><p className="text-lg font-bold text-foreground">{metrics.apPending}</p></div>
        <div className="rounded-md border border-border bg-background p-3"><p className="text-[10px] font-semibold uppercase text-muted-foreground">AP Overdue</p><p className="text-lg font-bold text-foreground">{metrics.apOverdue}</p></div>
        <div className="rounded-md border border-border bg-background p-3"><p className="text-[10px] font-semibold uppercase text-muted-foreground">AR Past Due</p><p className="text-lg font-bold text-foreground">${metrics.arPastDue.toLocaleString()}</p></div>
        <div className="rounded-md border border-border bg-background p-3"><p className="text-[10px] font-semibold uppercase text-muted-foreground">Close Tasks</p><p className="text-lg font-bold text-foreground">{metrics.closeOpen}</p></div>
      </div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team Workload</h4>
      <div className="mb-3 grid grid-cols-3 gap-2 md:grid-cols-6">
        {['CFO','Controller','AP','AR','Treasury','Auditor'].map((r) => {
          const count = roles.filter(x => x.role === r).length;
          return <div key={r} className="rounded-md border border-border bg-background p-2"><p className="text-[10px] text-muted-foreground">{r}</p><p className="text-sm font-bold text-foreground">{count}</p></div>;
        })}
      </div>
      <div className="mb-2 flex items-center gap-2">
        <button onClick={() => setRoleModal(true)} className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15">Assign Role</button>
      </div>
      <MantineTable data={roles} loading={loading} size={isMobile ? 'small' : 'default'} scroll={{ x: isMobile ? 600 : 'auto' }} columns={[
        { title: 'User ID', dataIndex: 'user_id' },
        { title: 'Role', dataIndex: 'role' },
        { title: 'Actions', key: 'actions', width: 160, render: (_: any, record: any) => (
          <Group gap="xs">
            <Button size="sm" onClick={() => { form.setValues({ user_id: record.user_id, role: record.role }); setRoleModal(true); }}>Reassign</Button>
            <Button size="sm" color="red" onClick={() => handleRemoveRole(record)}>Remove</Button>
          </Group>
        )},
      ]} />
      <Modal title="Assign Finance Role" opened={roleModal} onClose={() => setRoleModal(false)} size={isMobile ? '90%' : 600}>
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
            <TextInput label="User ID" {...form.getInputProps('user_id')} description="Enter user UUID or leave blank to generate one" />
            <Select label="Role" {...form.getInputProps('role')} required data={[{value:'CFO',label:'CFO'},{value:'Controller',label:'Controller'},{value:'AP',label:'AP'},{value:'AR',label:'AR'},{value:'Treasury',label:'Treasury'},{value:'Auditor',label:'Auditor'}]} />
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
    let lastActualRevenue = sortedPeriods.length ? revenueByMonth[sortedPeriods[sortedPeriods.length - 1]] : 0;
    const forecast: Array<{ period: string; cash: number; revenue: number; expenses: number }> = [];
    let cash = 0;
    for (let i = -3; i < months; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
      const period = d.toISOString().slice(0, 7);
      let revenue = revenueByMonth[period];
      if (typeof revenue === 'number') { lastActualRevenue = revenue; }
      else if (i >= 0) { revenue = Math.max(0, lastActualRevenue * (1 + growthRate)); lastActualRevenue = revenue; }
      else { revenue = 0; }
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
        const { data: orders } = await supabase.from('orders').select('total_amount, created_at').gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());
        const revenueMap: Record<string, number> = (orders || []).reduce((m: Record<string, number>, o: any) => { const key = new Date(o.created_at).toISOString().slice(0, 7); m[key] = (m[key] || 0) + (o.total_amount || 0); return m; }, {});
        setRevenueByMonth(revenueMap);
      } finally { setLoading(false); }
    })();
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => { setSeries(buildForecast()); }, [buildForecast]);

  const scenarioCash = useMemo(() => (series.length ? series[series.length - 1].cash : 0), [series]);

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">Adjust expense ratio and forward revenue growth to model cash runway in real time.</p>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <Text fw={600} mb={4}>Expense Ratio</Text>
          <Slider min={30} max={90} step={1} value={Math.round(expenseRatio * 100)} onChange={(val) => setExpenseRatio((Array.isArray(val) ? val[0] : val) / 100)} mb={4} />
          <Text size="sm" c="dimmed">{Math.round(expenseRatio * 100)}%</Text>
        </div>
        <div>
          <Text fw={600} mb={4}>Forward Growth Rate</Text>
          <Slider min={-20} max={40} step={1} value={Math.round(growthRate * 100)} onChange={(val) => setGrowthRate((Array.isArray(val) ? val[0] : val) / 100)} mb={4} />
          <Text size="sm" c="dimmed">{Math.round(growthRate * 100)}%</Text>
        </div>
        <div>
          <Text fw={600} mb={4}>Cash After Scenario</Text>
          <p className="text-lg font-bold text-foreground">${Math.round(scenarioCash).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">6-month cumulative outlook</p>
        </div>
        <div className="flex items-end">
          <button onClick={() => { setExpenseRatio(0.65); setGrowthRate(0.05); }} disabled={expenseRatio === 0.65 && growthRate === 0.05} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50">Reset Scenario</button>
        </div>
      </div>
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
      <MantineTable data={series.map((s) => ({ key: s.period, ...s }))} loading={loading} pagination={false} size={isMobile ? 'small' : 'default'} columns={[
        { title: 'Period', dataIndex: 'period' },
        { title: 'Revenue', dataIndex: 'revenue', render: (v: number) => `$${(v || 0).toLocaleString()}` },
        { title: 'Expenses', dataIndex: 'expenses', render: (v: number) => `$${(v || 0).toLocaleString()}` },
        { title: 'Projected Cash', dataIndex: 'cash', render: (v: number) => `$${(v || 0).toLocaleString()}` },
      ]} />
    </div>
  );
}

function ApprovalsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const toast = useToast();

  const loadApprovals = useCallback(async (statusFilter: string) => {
    const { data } = await supabase.from('ceo_financial_approvals').select('id, requester, description, amount, status, created_at').eq('status', statusFilter).order('created_at', { ascending: false });
    setRows((data || []).map((d: any) => ({ key: d.id, ...d })));
  }, []);

  const handleApprovalAction = useCallback(async (record: any, nextStatus: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase.from('ceo_financial_approvals').update({ status: nextStatus }).eq('id', record.id);
      if (error) throw error;
      toast.success(`Request ${nextStatus}`, 'Success');
      await loadApprovals(status);
    } catch (err) {
      toast.error('Unable to update approval', 'Error');
    } finally { setLoading(false); }
  }, [loadApprovals, status, toast]);

  useEffect(() => {
    (async () => { setLoading(true); try { await loadApprovals(status); } finally { setLoading(false); } })();
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [status, loadApprovals]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {['pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-md border px-3 py-1.5 text-xs font-semibold capitalize ${status === s ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}>{s}</button>
        ))}
      </div>
      <MantineTable data={rows} loading={loading} size={isMobile ? 'small' : 'default'} scroll={{ x: isMobile ? 800 : 'auto' }} pagination={{ pageSize: isMobile ? 5 : 10, showSizeChanger: !isMobile }} columns={[
        { title: 'ID', dataIndex: 'id', width: 90 },
        { title: 'Requester', dataIndex: 'requester' },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Amount', dataIndex: 'amount', render: (v: number) => `$${(v||0).toLocaleString()}` },
        { title: 'Status', dataIndex: 'status', render: (value: string) => <Badge color={value === 'approved' ? 'green' : value === 'rejected' ? 'red' : 'yellow'} style={{ textTransform: 'capitalize' }}>{value}</Badge> },
        { title: 'Created', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString(), width: 180 },
        { title: 'Actions', key: 'actions', width: 220, render: (_: any, record: any) => (
          <Group gap="xs">
            <Button size="sm" variant="filled" onClick={() => handleApprovalAction(record, 'approved')}>Approve</Button>
            <Button size="sm" color="red" onClick={() => modals.openConfirmModal({ title: 'Reject request?', children: <Text>This will mark the request as rejected.</Text>, labels: { confirm: 'Reject', cancel: 'Cancel' }, confirmProps: { color: 'red' }, onConfirm: () => handleApprovalAction(record, 'rejected') })}>Reject</Button>
          </Group>
        )},
      ]} />
    </div>
  );
}

function CloseManagement() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const toast = useToast();

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
      const { error } = await supabase.from('close_tasks').update({ status: statusToSet }).eq('id', record.id);
      if (error) throw error;
      toast.success(`Task marked ${statusToSet}`, 'Success');
      await loadCloseData();
    } catch (err) { toast.error('Unable to update task', 'Error'); } finally { setLoading(false); }
  }, [loadCloseData, toast]);

  const handleReconStatusChange = useCallback(async (record: any, nextStatus?: string) => {
    setLoading(true);
    try {
      const statusToSet = nextStatus || (record.status === 'tied' ? 'open' : 'tied');
      const { error } = await supabase.from('reconciliations').update({ status: statusToSet }).eq('id', record.id);
      if (error) throw error;
      toast.success(`Reconciliation ${statusToSet}`, 'Success');
      await loadCloseData();
    } catch (err) { toast.error('Unable to update reconciliation', 'Error'); } finally { setLoading(false); }
  }, [loadCloseData, toast]);

  useEffect(() => {
    (async () => { setLoading(true); try { await loadCloseData(); } finally { setLoading(false); } })();
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Close Checklist</h4>
        <div className="mb-2">
          <Button onClick={async () => {
            setRolling(true);
            try {
              const now = new Date();
              const currentPeriod = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0,7);
              const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-1, 1)).toISOString().slice(0,7);
              const { data: prevTasks } = await supabase.from('close_tasks').select('*').eq('period', prev);
              if (prevTasks && prevTasks.length) {
                const inserts = prevTasks.map((t: any) => ({ period: currentPeriod, name: t.name, owner: t.owner, status: 'todo', due_day: t.due_day }));
                await supabase.from('close_tasks').insert(inserts);
                toast.success('Rolled close tasks forward', 'Success');
                await loadCloseData();
              } else { toast.info('No previous tasks to roll', 'Info'); }
            } finally { setRolling(false); }
          }} loading={rolling} size="sm">Roll Previous Month</Button>
        </div>
        <MantineTable data={tasks} loading={loading} pagination={false} size={isMobile ? 'small' : 'default'} scroll={{ x: isMobile ? 600 : 'auto' }} columns={[
          { title: 'Period', dataIndex: 'period', width: 110 },
          { title: 'Task', dataIndex: 'name' },
          { title: 'Owner', dataIndex: 'owner', width: 140 },
          { title: 'Due', dataIndex: 'due_day', width: 80 },
          { title: 'Done', dataIndex: 'status', width: 60, render: (_: any, record: any) => <Checkbox checked={record.status === 'done'} onChange={() => handleTaskStatusChange(record)} /> },
          { title: 'Actions', key: 'actions', width: 160, render: (_: any, record: any) => (
            <Group gap="xs"><Button size="sm" onClick={() => handleTaskStatusChange(record, 'in_progress')}>Start</Button><Button size="sm" variant="filled" onClick={() => handleTaskStatusChange(record, 'done')}>Done</Button></Group>
          )},
        ]} />
      </div>
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reconciliations</h4>
        <MantineTable data={recs} loading={loading} pagination={false} size={isMobile ? 'small' : 'default'} scroll={{ x: isMobile ? 600 : 'auto' }} columns={[
          { title: 'Period', dataIndex: 'period', width: 110 },
          { title: 'Type', dataIndex: 'type', width: 140 },
          { title: 'Status', dataIndex: 'status', width: 100 },
          { title: 'Actions', key: 'actions', width: 160, render: (_: any, record: any) => (
            <Group gap="xs"><Button size="sm" onClick={() => handleReconStatusChange(record, 'in_progress')}>Work</Button><Button size="sm" variant="filled" onClick={() => handleReconStatusChange(record, 'tied')}>Tie Out</Button></Group>
          )},
          { title: 'Notes', dataIndex: 'notes' },
        ]} />
      </div>
    </div>
  );
}

export default function CFOPortal() {
  return <EmbeddedToastProvider><CFOPortalContent /></EmbeddedToastProvider>;
}
