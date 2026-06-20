// @ts-nocheck
import React, { useState, useEffect, Suspense } from 'react';
import { Center, Loader, Stack, Title, Text, Button, Tabs } from '@mantine/core';
import {
  IconHeartHandshake,
  IconLayoutDashboard,
  IconLine,
  IconFileText,
  IconChartBar,
  IconUsers,
  IconTimeline,
  IconChecklist,
  IconCalendar,
  IconTargetArrow,
  IconBuildingStore,
  IconMessage,
  IconPackage,
  IconPhoneCall,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { hasFullAccess } from '@/utils/torranceAccess';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { UnifiedPortalShell, PortalTab, PortalLoadingState, PortalAccessDenied } from '@/components/portal/UnifiedPortalShell';
import CPODashboard from './tabs/CPODashboard';
import PartnerPipeline from './tabs/PartnerPipeline';
import ContractManagement from './tabs/ContractManagement';
import PartnershipAnalytics from './tabs/PartnershipAnalytics';
import PartnerDirectory from './tabs/PartnerDirectory';
import ActivityLog from './tabs/ActivityLog';
import PartnerOnboarding from './tabs/PartnerOnboarding';
import RenewalCalendar from './tabs/RenewalCalendar';
import PartnerScorecards from './tabs/PartnerScorecards';
import MerchantMetrics from './tabs/MerchantMetrics';
import VendorRecords from './tabs/VendorRecords';
import ProspectQueue from '@/components/ceo/ProspectQueue';
import CXApplications from './tabs/CXApplications';

const EmbeddedCComms = React.lazy(() => import('@/portals/internal-comms/EmbeddedCComms'));

const TABS: PortalTab[] = [
  { id: 'pipeline', label: 'Pipeline', description: 'Deal pipeline and strategic partners.', section: 'Operations', icon: IconLine },
  { id: 'prospects', label: 'Prospect Queue', description: 'Receive CEO pushes, execute outreach, and convert to pipeline.', section: 'Operations', icon: IconPhoneCall },
  { id: 'cx-applications', label: 'CX Applications', description: "Crave'N Express courier company applications submitted from /cx/signup.", section: 'Operations', icon: IconTruckDelivery },
  {
    id: 'vendors',
    label: 'Vendors',
    description: 'Vendor directory: names, points of contact, terms, renewals — not the deal pipeline.',
    section: 'Operations',
    icon: IconPackage,
  },
  { id: 'dashboard', label: 'Dashboard', description: 'Partnership metrics and executive overview.', section: 'Operations', icon: IconLayoutDashboard },
  { id: 'contracts', label: 'Contracts', description: 'Contract management and secure uploads.', section: 'Operations', icon: IconFileText },
  { id: 'activity', label: 'Activity Log', description: 'Partnership activity and session tracking.', section: 'Operations', icon: IconTimeline },
  { id: 'onboarding', label: 'Onboarding', description: 'Partner onboarding checklists.', section: 'Management', icon: IconChecklist },
  { id: 'calendar', label: 'Renewals & calendar', description: 'Partnership renewal deadlines plus the shared executive schedule (CPO-only combined view).', section: 'Management', icon: IconCalendar },
  { id: 'scorecards', label: 'Scorecards', description: 'Partner performance scorecards.', section: 'Management', icon: IconTargetArrow },
  { id: 'merchants', label: 'Merchants', description: 'Merchant ecosystem overview.', section: 'Management', icon: IconBuildingStore },
  { id: 'analytics', label: 'Analytics', description: 'Partnership analytics and reporting.', section: 'Insights', icon: IconChartBar },
  { id: 'directory', label: 'Directory', description: 'Partner contact directory.', section: 'Insights', icon: IconUsers },
  { id: 'c-comms', label: 'C-Suite Comms', description: 'Cross-executive communication workspace.', section: 'Insights', icon: IconMessage },
];

const SECTIONS = ['Operations', 'Management', 'Insights'];

const VALID_TABS = new Set(TABS.map((t) => t.id));

const CPOPortal: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && VALID_TABS.has(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useActivityTracking('cpo');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth?hq=true&redirect=/cpo-portal');
        return;
      }
      setUserEmail(user.email || '');

      if (hasFullAccess(user.email)) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      const { data: execUser } = await supabase
        .from('exec_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const execRole = execUser?.role?.toLowerCase() || '';
      const hasAdminRole = roles?.some(r => r.role === 'admin');
      const hasCPORole = execRole === 'cpo' || execRole === 'ceo';

      if (hasCPORole || hasAdminRole) {
        setAuthorized(true);
      }
    } catch (err) {
      console.error('CPO auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      sessionStorage.removeItem('hub_employee_info');
      navigate('/auth?hq=true');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) return <PortalLoadingState />;
  if (!authorized) return <PortalAccessDenied portalName="CPO Partnership Portal" email={userEmail} onSignOut={handleSignOut} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <CPODashboard />;
      case 'pipeline': return <PartnerPipeline />;
      case 'prospects': return <ProspectQueue mode="cpo" />;
      case 'cx-applications': return <CXApplications />;
      case 'vendors': return <VendorRecords />;
      case 'contracts': return <ContractManagement />;
      case 'activity': return <ActivityLog />;
      case 'onboarding': return <PartnerOnboarding />;
      case 'calendar': return <RenewalCalendar />;
      case 'scorecards': return <PartnerScorecards />;
      case 'analytics': return <PartnershipAnalytics />;
      case 'merchants': return <MerchantMetrics />;
      case 'directory': return <PartnerDirectory />;
      case 'c-comms': return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 40 }}>Loading C Comms...</div>}>
          <EmbeddedCComms />
        </Suspense>
      );
      default: return <CPODashboard />;
    }
  };

  return (
    <UnifiedPortalShell
      portalName="CPO Partnership Portal"
      portalSubtitle="Partnership ecosystem and merchant management"
      sectionLabel="Chief Partnership Officer"
      tabs={TABS}
      sections={SECTIONS}
      activeTab={activeTab}
      onTabChange={(id) => {
        setActiveTab(id);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (id === 'pipeline') next.delete('tab');
          else next.set('tab', id);
          return next;
        });
      }}
      lastUpdated={new Date()}
      userTitle="Chief Partnership Officer"
      onBack={() => navigate('/hub')}
      onSignOut={handleSignOut}
    >
      {renderContent()}
    </UnifiedPortalShell>
  );
};

export default CPOPortal;
