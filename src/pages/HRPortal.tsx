// @ts-nocheck
import React, { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconLayoutDashboard,
  IconUsers,
  IconFileText,
  IconFileSearch,
  IconMail,
  IconUserPlus,
  IconUserMinus,
  IconCalendar,
  IconBolt,
  IconCurrencyDollar,
  IconHeart,
  IconChartBar,
  IconShield,
  IconTrophy,
  IconSearch,
  IconSettings,
  IconSchool,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useExecAuth } from '@/hooks/useExecAuth';
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
import BusinessEmailSystem from '@/components/executive/BusinessEmailSystem';
import ExecutiveWordProcessor from '@/components/executive/ExecutiveWordProcessor';
import { ExitWorkflowManager } from '@/components/hr/ExitWorkflowManager';
import TalentLensDashboard from '@/components/hr/talent-lens/TalentLensDashboard';
import { UnifiedPortalShell, PortalTab, PortalKPI, PortalLoadingState, PortalAccessDenied } from '@/components/portal/UnifiedPortalShell';

const TABS: PortalTab[] = [
  // Dashboard
  { id: 'dashboard', label: 'HR Dashboard', description: 'Workforce KPIs, headcount, and turnover metrics.', section: 'Overview', icon: IconLayoutDashboard },
  // Talent
  { id: 'career_applications', label: 'Career Applications', description: 'Talent pipeline and applicant tracking.', section: 'Talent', icon: IconSchool },
  { id: 'intern_candidates', label: 'Intern Candidates', description: 'Intern program applications and tracking.', section: 'Talent', icon: IconUserPlus },
  // People
  { id: 'personnel', label: 'Personnel Management', description: 'Employee records and org chart.', section: 'People', icon: IconUsers },
  { id: 'exit_workflows', label: 'Exit Workflows', description: 'Offboarding and separation management.', section: 'People', icon: IconUserMinus },
  { id: 'time_pto', label: 'Time & PTO', description: 'Leave management and time tracking.', section: 'People', icon: IconCalendar },
  { id: 'performance', label: 'Performance', description: 'Performance reviews and goals.', section: 'People', icon: IconBolt },
  { id: 'compensation', label: 'Compensation', description: 'Salary, benefits, and total rewards.', section: 'People', icon: IconCurrencyDollar },
  { id: 'wellness', label: 'Wellness', description: 'Employee relations and wellness programs.', section: 'People', icon: IconHeart },
  // Documents
  { id: 'documents', label: 'Document Generator', description: 'Generate HR documents and letters.', section: 'Documents', icon: IconFileText },
  { id: 'documents_dashboard', label: 'Document Dashboard', description: 'Document library and management.', section: 'Documents', icon: IconFileSearch },
  { id: 'word_processor', label: 'Word Processor', description: 'Executive document workspace.', section: 'Documents', icon: IconFileText },
  { id: 'communications', label: 'Communications', description: 'Executive email and messaging.', section: 'Documents', icon: IconMail },
  // Analytics & Compliance
  { id: 'analytics', label: 'Analytics', description: 'HR analytics and workforce insights.', section: 'Analytics', icon: IconChartBar },
  { id: 'compliance', label: 'Compliance', description: 'Employment law and regulatory compliance.', section: 'Analytics', icon: IconShield },
  { id: 'equity', label: 'Equity Management', description: 'Employee equity grants and vesting.', section: 'Analytics', icon: IconTrophy },
  { id: 'audit', label: 'Audit Trail', description: 'HR activity and compliance audit log.', section: 'Analytics', icon: IconSearch },
  { id: 'system_admin', label: 'System Admin', description: 'HR portal configuration and settings.', section: 'Analytics', icon: IconSettings },
];

const SECTIONS = ['Overview', 'Talent', 'People', 'Documents', 'Analytics'];

const HRPortal: React.FC = () => {
  const navigate = useNavigate();
  const { loading, user, execUser, isAuthorized, signOut } = useExecAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) return <PortalLoadingState />;
  if (!isAuthorized) return <PortalAccessDenied portalName="HR Portal" email={user?.email} onSignOut={signOut} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'career_applications': return <TalentLensDashboard />;
      case 'documents': return <DocumentGeneratorView />;
      case 'documents_dashboard': return <DocumentDashboard />;
      case 'word_processor': return <ExecutiveWordProcessor storageKey="hr" />;
      case 'communications': return <BusinessEmailSystem />;
      case 'personnel': return <PersonnelManagementView />;
      case 'exit_workflows': return <ExitWorkflowManager />;
      case 'intern_candidates': return <InternCandidateManagement />;
      case 'time_pto': return <TimePtoView />;
      case 'performance': return <PerformanceManagement />;
      case 'compensation': return <CompensationView />;
      case 'wellness': return <EmployeeRelationsView />;
      case 'analytics': return <AnalyticsView />;
      case 'compliance': return <ComplianceView />;
      case 'equity': return <EquityManagement />;
      case 'audit': return <AuditTrail />;
      case 'system_admin': return <SystemAdminView />;
      default: return <DashboardView />;
    }
  };

  return (
    <UnifiedPortalShell
      portalName="HR Portal"
      portalSubtitle="People management, talent, and workforce analytics"
      sectionLabel="Human Resources"
      tabs={TABS}
      sections={SECTIONS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      lastUpdated={new Date()}
      userTitle={execUser?.title || 'People & Culture'}
      onBack={() => navigate('/hub')}
      onSignOut={async () => { await signOut(); navigate('/auth?hq=true'); }}
    >
      {renderContent()}
    </UnifiedPortalShell>
  );
};

// Dashboard View - converted from Ant Design to semantic Tailwind tokens
function DashboardView() {
  const kpiData = [
    { title: 'Employee Headcount', value: '230', change: '+2.2%', up: true },
    { title: 'Voluntary Turnover', value: '1.5%', change: '-0.3pp', up: true },
    { title: 'Engagement Score', value: '8.1/10', change: '+0.3pts', up: true },
    { title: 'Avg. Time to Hire', value: '45 Days', change: '-10%', up: true },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {kpiData.map(kpi => (
          <div key={kpi.title} className="rounded-md border border-border bg-background p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{kpi.title}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{kpi.value}</p>
            <p className={`mt-0.5 text-[11px] ${kpi.up ? 'text-status-online' : 'text-destructive'}`}>{kpi.change}</p>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">HR analytics charts and workforce insights will render here.</p>
        <p className="mt-1 text-xs text-muted-foreground">Navigate to Analytics tab for detailed workforce data.</p>
      </div>
    </div>
  );
}

export default HRPortal;
