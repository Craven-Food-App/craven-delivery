// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconCloud,
  IconBug,
  IconShield,
  IconDatabase,
  IconMail,
  IconFileText,
  IconRocket,
  IconUsers,
  IconCode,
  IconServer,
  IconAlertTriangle,
  IconInfoCircle,
  IconSettings,
  IconChartBar,
  IconSchool,
  IconMessageCircle,
  IconCalendar,
} from '@tabler/icons-react';
import { useExecAuth } from '@/hooks/useExecAuth';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { supabase } from '@/integrations/supabase/client';
import { EmbeddedToastProvider } from '@/components/cfo/EmbeddedToast';
import { useToast } from '@/hooks/useEmbeddedToast';
import { hasFullAccess } from '@/utils/torranceAccess';
import { UnifiedPortalShell, PortalTab, PortalKPI, PortalLoadingState, PortalAccessDenied } from '@/components/portal/UnifiedPortalShell';
import { ExecutiveCalendarTabContent } from '@/components/calendar/ExecutiveCalendarTabContent';

// Lazy load heavy components
const ExecutiveWordProcessor = React.lazy(() => import('@/components/executive/ExecutiveWordProcessor'));
const EmbeddedCComms = React.lazy(() => import('@/portals/internal-comms/EmbeddedCComms'));
const MorningTechnicalReview = React.lazy(() => import('@/components/cto/MorningTechnicalReview'));
const SprintManagement = React.lazy(() => import('@/components/cto/SprintManagement'));
const CodeReviewQueue = React.lazy(() => import('@/components/cto/CodeReviewQueue'));
const ITHelpDeskDashboard = React.lazy(() => import('@/components/cto/ITHelpDeskDashboard'));
const CodeEditorPortal = React.lazy(() => import('@/components/cto/CodeEditorPortal'));
import DeveloperOnboarding from '@/components/cto/DeveloperOnboarding';
import { EnhancedCTODashboard } from '@/components/cto/EnhancedCTODashboard';
import { AdvancedInfrastructureManagement } from '@/components/cto/AdvancedInfrastructureManagement';
import { DevOpsDashboard } from '@/components/cto/DevOpsDashboard';
import { SecurityComplianceCenter } from '@/components/cto/SecurityComplianceCenter';
import { TeamResourceManagement } from '@/components/cto/TeamResourceManagement';
import { TechnologyRoadmap } from '@/components/cto/TechnologyRoadmap';
import { TechCostManagement } from '@/components/cto/TechCostManagement';
import { CTOPortalInstructionManual } from '@/components/cto/CTOPortalInstructionManual';
import CtoEvaluationGatePanel from '@/components/cto/CtoEvaluationGatePanel';
import { IncidentsDashboard } from '@/components/cto/IncidentsDashboard';
import { AssetManagement } from '@/components/cto/AssetManagement';
import { CTOOnboardingGovernance } from '@/components/cto/CTOOnboardingGovernance';
import CtoTrainingRouter from '@/components/cto/training/CtoTrainingRouter';

const TABS: PortalTab[] = [
  // Command Center
  { id: 'overview', label: 'CTO Dashboard', description: 'Technology executive overview and key metrics.', section: 'Command Center', icon: IconChartBar },
  { id: 'calendar', label: 'Executive Calendar', description: 'Shared leadership schedule (same as Company Portal).', section: 'Command Center', icon: IconCalendar },
  { id: 'morning-review', label: 'Morning Review', description: 'Daily technical review and standup notes.', section: 'Command Center', icon: IconChartBar },
  // Governance
  { id: 'evaluation', label: 'Evaluation Gate', description: 'Board-defensible CTO evaluation workflow.', section: 'Governance', icon: IconShield },
  { id: 'onboarding', label: 'Onboarding & Governance', description: 'CTO onboarding framework and governance.', section: 'Governance', icon: IconSchool },
  { id: 'training', label: 'Training', description: 'Technical training modules and progress.', section: 'Governance', icon: IconSchool },
  // Infrastructure
  { id: 'infra', label: 'Infrastructure', description: 'Cloud infrastructure and service management.', section: 'Infrastructure', icon: IconCloud },
  { id: 'devops', label: 'DevOps & CI/CD', description: 'Deployment pipelines and automation.', section: 'Infrastructure', icon: IconRocket },
  { id: 'security', label: 'Security & Compliance', description: 'Security posture and compliance monitoring.', section: 'Infrastructure', icon: IconShield },
  // Operations
  { id: 'incidents', label: 'Incidents', description: 'Incident management and response tracking.', section: 'Operations', icon: IconBug },
  { id: 'assets', label: 'IT Assets', description: 'IT asset inventory and lifecycle.', section: 'Operations', icon: IconDatabase },
  { id: 'help-desk', label: 'IT Help Desk', description: 'Internal IT support ticket management.', section: 'Operations', icon: IconUsers },
  // Engineering
  { id: 'sprint', label: 'Sprint Management', description: 'Sprint planning and backlog tracking.', section: 'Engineering', icon: IconRocket },
  { id: 'code-review', label: 'Code Reviews', description: 'Code review queue and PR approvals.', section: 'Engineering', icon: IconCode },
  { id: 'code-editor', label: 'Code Editor', description: 'In-portal code editing workspace.', section: 'Engineering', icon: IconCode },
  { id: 'developer-onboarding', label: 'Dev Onboarding', description: 'Developer onboarding checklists.', section: 'Engineering', icon: IconSchool },
  // Management
  { id: 'team', label: 'Team & Resources', description: 'Engineering team and resource allocation.', section: 'Management', icon: IconUsers },
  { id: 'roadmap', label: 'Technology Roadmap', description: 'Strategic technology planning timeline.', section: 'Management', icon: IconRocket },
  { id: 'costs', label: 'Tech Costs', description: 'Technology spend and budget tracking.', section: 'Management', icon: IconChartBar },
  // Business
  { id: 'word', label: 'Documents', description: 'Executive document workspace.', section: 'Business', icon: IconFileText },
  { id: 'c-comms', label: 'C-Suite Comms', description: 'Cross-executive communication workspace.', section: 'Business', icon: IconMessageCircle },
  { id: 'manual', label: 'Help & Manual', description: 'Portal instruction manual and help.', section: 'Business', icon: IconInfoCircle },
];

const SECTIONS = ['Command Center', 'Governance', 'Infrastructure', 'Operations', 'Engineering', 'Management', 'Business'];

function CTOPortalContent() {
  const { loading: authLoading, user, execUser, isAuthorized, signOut } = useExecAuth('cto');
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [kpis, setKpis] = useState<PortalKPI[]>([]);
  const toast = useToast();

  useActivityTracking('cto');
  useAutoLogout('cto');

  // Authoritative authorization comes from useExecAuth (server-side exec_users).
  // Hardcoded email partial-match bypasses removed (security).
  const finalIsAuthorized = isAuthorized;

  useEffect(() => {
    if (!finalIsAuthorized) return;
    const fetchKPIs = async () => {
      const [infraRes, incidentsRes, sprintsRes] = await Promise.all([
        supabase.from('it_infrastructure').select('id, status', { count: 'exact' }),
        supabase.from('it_incidents').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('sprints').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      const services = infraRes.data || [];
      const operational = services.filter(s => s.status === 'operational').length;
      setKpis([
        { id: 'services', label: 'Services', value: String(services.length), delta: `${operational} operational`, up: operational === services.length },
        { id: 'incidents', label: 'Open Incidents', value: String(incidentsRes.count || 0), delta: 'Active', up: (incidentsRes.count || 0) === 0 },
        { id: 'sprints', label: 'Active Sprints', value: String(sprintsRes.count || 0), delta: 'In progress', up: true },
      ]);
    };
    fetchKPIs();
  }, [finalIsAuthorized]);

  if (authLoading) return <PortalLoadingState />;
  if (!finalIsAuthorized) return <PortalAccessDenied portalName="CTO Portal" email={user?.email} onSignOut={signOut} />;

  // Code editor gets standalone rendering
  if (activeSection === 'code-editor') {
    return (
      <Suspense fallback={<PortalLoadingState message="Loading editor..." />}>
        <CodeEditorPortal standalone={true} onBack={() => setActiveSection('overview')} />
      </Suspense>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return <EnhancedCTODashboard />;
      case 'calendar': return <ExecutiveCalendarTabContent />;
      case 'morning-review': return <Suspense fallback={null}><MorningTechnicalReview /></Suspense>;
      case 'evaluation': return <CtoEvaluationGatePanel />;
      case 'onboarding': return <CTOOnboardingGovernance />;
      case 'training': return <CtoTrainingRouter />;
      case 'infra': return <AdvancedInfrastructureManagement />;
      case 'devops': return <DevOpsDashboard />;
      case 'security': return <SecurityComplianceCenter />;
      case 'incidents': return <IncidentsDashboard />;
      case 'assets': return <AssetManagement />;
      case 'help-desk': return <Suspense fallback={null}><ITHelpDeskDashboard /></Suspense>;
      case 'sprint': return <Suspense fallback={null}><SprintManagement /></Suspense>;
      case 'code-review': return <Suspense fallback={null}><CodeReviewQueue /></Suspense>;
      case 'developer-onboarding': return <DeveloperOnboarding />;
      case 'team': return <TeamResourceManagement />;
      case 'roadmap': return <TechnologyRoadmap />;
      case 'costs': return <TechCostManagement />;
      case 'word': return <Suspense fallback={null}><ExecutiveWordProcessor storageKey="cto" supabaseTable="cto_documents" /></Suspense>;
      case 'c-comms': return <Suspense fallback={null}><EmbeddedCComms /></Suspense>;
      case 'manual': return <CTOPortalInstructionManual />;
      default: return <EnhancedCTODashboard />;
    }
  };

  return (
    <UnifiedPortalShell
      portalName="CTO Portal"
      portalSubtitle="Technology executive dashboard and engineering ops"
      sectionLabel="Executive Technology"
      tabs={TABS}
      sections={SECTIONS}
      activeTab={activeSection}
      onTabChange={setActiveSection}
      kpis={kpis}
      kpiLabel="System Health — Live"
      lastUpdated={new Date()}
      userTitle={execUser?.title || 'Chief Technology Officer'}
      onBack={() => navigate('/hub')}
      onSignOut={async () => { await signOut(); navigate('/auth?hq=true'); }}
      headerActions={
        <>
          <button onClick={() => navigate('/ceo')} className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">CEO</button>
          <button onClick={() => navigate('/cfo')} className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">CFO</button>
        </>
      }
    >
      {renderContent()}
    </UnifiedPortalShell>
  );
}

export default function CTOPortal() {
  return <EmbeddedToastProvider><CTOPortalContent /></EmbeddedToastProvider>;
}
