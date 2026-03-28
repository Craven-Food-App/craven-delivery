// @ts-nocheck
import React, { useState, useMemo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import CxoAuthGuard from '@/components/cxo/CxoAuthGuard';
import {
  IconLayoutDashboard,
  IconTicket,
  IconUsers,
  IconShoppingCart,
  IconBuildingStore,
  IconHeadset,
  IconChartBar,
  IconTarget,
  IconAlertTriangle,
  IconFileText,
  IconSchool,
  IconBook,
  IconMessageCircle,
  IconCalendar,
} from '@tabler/icons-react';

import CxoDashboard from '@/components/cxo/pages/CxoDashboard';
import CxoTickets from '@/components/cxo/pages/CxoTickets';
import CxoDrivers from '@/components/cxo/pages/CxoDrivers';
import CxoCustomers from '@/components/cxo/pages/CxoCustomers';
import CxoMerchants from '@/components/cxo/pages/CxoMerchants';
import CxoSupport from '@/components/cxo/pages/CxoSupport';
import CxoAnalytics from '@/components/cxo/pages/CxoAnalytics';
import CxoInitiatives from '@/components/cxo/pages/CxoInitiatives';
import CxoIncidents from '@/components/cxo/pages/CxoIncidents';
import CxoReports from '@/components/cxo/pages/CxoReports';
import CXOOnboardingGovernance from '@/components/cxo/CXOOnboardingGovernance';
import CxoTrainingHome from '@/components/cxo/training/CxoTrainingHome';
import { UnifiedPortalShell, PortalTab } from '@/components/portal/UnifiedPortalShell';
import { ExecutiveCalendarTabContent } from '@/components/calendar/ExecutiveCalendarTabContent';

const EmbeddedCComms = React.lazy(() => import('@/portals/internal-comms/EmbeddedCComms'));

const TABS: PortalTab[] = [
  { id: 'onboarding', label: 'Onboarding', description: 'CXO onboarding and governance framework.', section: 'Governance', icon: IconBook },
  { id: 'training', label: 'Training', description: 'CXO training modules and progress.', section: 'Governance', icon: IconSchool },
  { id: 'dashboard', label: 'Dashboard', description: 'Experience metrics and executive overview.', section: 'Operations', icon: IconLayoutDashboard },
  { id: 'calendar', label: 'Executive Calendar', description: 'Shared leadership schedule (same as Company Portal).', section: 'Operations', icon: IconCalendar },
  { id: 'tickets', label: 'Tickets', description: 'Customer experience ticket management.', section: 'Operations', icon: IconTicket },
  { id: 'drivers', label: 'Drivers', description: 'Driver experience and satisfaction.', section: 'Operations', icon: IconUsers },
  { id: 'customers', label: 'Customers', description: 'Customer experience and feedback.', section: 'Operations', icon: IconShoppingCart },
  { id: 'merchants', label: 'Merchants', description: 'Merchant experience and engagement.', section: 'Operations', icon: IconBuildingStore },
  { id: 'support', label: 'Support', description: 'Support operations and quality.', section: 'Operations', icon: IconHeadset },
  { id: 'analytics', label: 'Analytics', description: 'Experience analytics and NPS tracking.', section: 'Insights', icon: IconChartBar },
  { id: 'initiatives', label: 'Initiatives', description: 'Strategic CX improvement initiatives.', section: 'Insights', icon: IconTarget },
  { id: 'incidents', label: 'Incidents', description: 'Experience incidents and escalations.', section: 'Insights', icon: IconAlertTriangle },
  { id: 'reports', label: 'Reports', description: 'Experience reports and dashboards.', section: 'Insights', icon: IconFileText },
  { id: 'c-comms', label: 'C-Suite Comms', description: 'Cross-executive communication workspace.', section: 'Insights', icon: IconMessageCircle },
];

const SECTIONS = ['Governance', 'Operations', 'Insights'];

const CXOPortal: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      sessionStorage.removeItem('hub_employee_info');
      navigate('/auth?hq=true');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'onboarding': return <CXOOnboardingGovernance />;
      case 'training': return <CxoTrainingHome />;
      case 'dashboard': return <CxoDashboard />;
      case 'calendar': return <ExecutiveCalendarTabContent />;
      case 'tickets': return <CxoTickets />;
      case 'drivers': return <CxoDrivers />;
      case 'customers': return <CxoCustomers />;
      case 'merchants': return <CxoMerchants />;
      case 'support': return <CxoSupport />;
      case 'analytics': return <CxoAnalytics />;
      case 'initiatives': return <CxoInitiatives />;
      case 'incidents': return <CxoIncidents />;
      case 'reports': return <CxoReports />;
      case 'c-comms': return <Suspense fallback={null}><EmbeddedCComms /></Suspense>;
      default: return <CxoDashboard />;
    }
  };

  return (
    <CxoAuthGuard>
      <UnifiedPortalShell
        portalName="CXO Portal"
        portalSubtitle="Experience command center and CX operations"
        sectionLabel="Chief Experience Officer"
        tabs={TABS}
        sections={SECTIONS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lastUpdated={new Date()}
        userTitle="Chief Experience Officer"
        onBack={() => navigate('/hub')}
        onSignOut={handleSignOut}
      >
        {renderContent()}
      </UnifiedPortalShell>
    </CxoAuthGuard>
  );
};

export default CXOPortal;
