// @ts-nocheck
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminAccessGuard from '@/components/AdminAccessGuard';
import ApplicationReview from '@/components/admin/ApplicationReview';
import { AdminDriverOnboardingDashboard } from '@/components/admin/driver-onboarding/AdminDriverOnboardingDashboard';
import { DriverWaitlistDashboard } from '@/components/admin/DriverWaitlistDashboard';
import BackgroundCheckDashboard from '@/components/admin/BackgroundCheckDashboard';
import { BackgroundCheckSettings } from '@/components/admin/BackgroundCheckSettings';
import { DriverQuizManagement } from '@/components/admin/DriverQuizManagement';
import { DriverRatingManagement } from '@/components/admin/DriverRatingManagement';
import { DriverPromoManagement } from '@/components/admin/DriverPromoManagement';
import { DriverSupportDashboard } from '@/components/admin/DriverSupportDashboard';
import DriverPayoutSettingsCompact from '@/components/admin/DriverPayoutSettingsCompact';
import { ResendWaitlistEmail } from '@/pages/admin/ResendWaitlistEmail';
import {
  IconUsers,
  IconClock,
  IconMail,
  IconFileCheck,
  IconSettings,
  IconSchool,
  IconFileText,
  IconTrendingUp,
  IconTag,
  IconMessageCircle,
  IconCurrencyDollar,
} from '@tabler/icons-react';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { UnifiedPortalShell, PortalTab } from '@/components/portal/UnifiedPortalShell';
import ReadOnlyOperationsWrapper from '@/components/access/ReadOnlyOperationsWrapper';
import { supabase } from '@/integrations/supabase/client';
import {
  subscribeToDriverOperationsChanges,
} from '@/lib/driverOperationsEvents';
import { useDriverOperationsCounts } from '@/hooks/useDriverOperationsCounts';

const TABS: PortalTab[] = [
  { id: 'applications', label: 'Applications', description: 'Review and process driver applications.', section: 'Pipeline', icon: IconUsers },
  { id: 'waitlist', label: 'Waitlist Management', description: 'Manage driver waitlist queue and capacity.', section: 'Pipeline', icon: IconClock },
  { id: 'resend-waitlist-email', label: 'Resend Waitlist Email', description: 'Resend activation emails to waitlisted drivers.', section: 'Pipeline', icon: IconMail },
  { id: 'background-checks', label: 'Background Checks', description: 'Track and manage driver background clearances.', section: 'Compliance', icon: IconFileCheck },
  { id: 'background-settings', label: 'BG Check Settings', description: 'Configure background check provider settings.', section: 'Compliance', icon: IconSettings },
  { id: 'onboarding', label: 'Onboarding', description: 'Driver onboarding task tracking and checklists.', section: 'Training', icon: IconSchool },
  { id: 'quiz', label: 'Quiz Management', description: 'Manage driver qualification quizzes.', section: 'Training', icon: IconFileText },
  { id: 'ratings', label: 'Ratings & Performance', description: 'Driver rating tiers and performance metrics.', section: 'Performance', icon: IconTrendingUp },
  { id: 'promos', label: 'Promos & Challenges', description: 'Driver incentive programs and challenges.', section: 'Performance', icon: IconTag },
  { id: 'support', label: 'Support Chat', description: 'Driver support communication channel.', section: 'Operations', icon: IconMessageCircle },
  { id: 'payouts', label: 'Payout Configuration', description: 'Configure driver payout rules and schedules.', section: 'Operations', icon: IconCurrencyDollar },
];

const SECTIONS = ['Pipeline', 'Compliance', 'Training', 'Performance', 'Operations'];
const VALID_TAB_IDS = new Set(TABS.map(tab => tab.id));

const DriverOperationsPortal: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab && VALID_TAB_IDS.has(requestedTab)
    ? requestedTab
    : 'applications';
  const [isReadOnlyCfo, setIsReadOnlyCfo] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const { counts, loading: countsLoading, error: countsError } = useDriverOperationsCounts();
  useActivityTracking('driver-operations');
  useAutoLogout('driver-operations');

  const setActiveTab = useCallback((tabId: string) => {
    if (!VALID_TAB_IDS.has(tabId)) return;
    setSearchParams(
      previous => {
        const next = new URLSearchParams(previous);
        next.set('tab', tabId);
        return next;
      },
      { replace: false },
    );
  }, [setSearchParams]);

  useEffect(() => {
    const detectReadOnlyMode = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const userEmail = (user.email || '').toLowerCase();
        const isJustinSweet = userEmail === 'jsweet.cfo@cravenusa.com';

        const { data: execUser } = await (supabase as any)
          .from('exec_users')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        const isCfoExec = execUser?.role?.toLowerCase() === 'cfo';
        setIsReadOnlyCfo(isCfoExec || isJustinSweet);
      } finally {
        setPermissionsLoading(false);
      }
    };
    detectReadOnlyMode();
  }, []);

  useEffect(() => subscribeToDriverOperationsChanges(() => {
    setLastUpdated(new Date());
  }), []);

  const getBadgeValue = useCallback((tabId: string) => {
    switch (tabId) {
      case 'applications':
        return counts.applied + counts.screening;
      case 'background-checks':
        return counts.awaitingBackground + counts.screening;
      case 'waitlist':
        return counts.readyToActivate;
      case 'onboarding':
        return counts.onboarding;
      case 'support':
        return counts.unclaimedSupportChats || counts.openSupportChats;
      default:
        return 0;
    }
  }, [counts]);

  const kpis = useMemo(() => ([
    {
      id: 'applied',
      label: 'New Applications',
      value: String(counts.applied),
      delta: countsLoading ? 'Loading…' : 'Awaiting review',
      up: counts.applied > 0,
      onClick: () => setActiveTab('applications'),
    },
    {
      id: 'screening',
      label: 'In Screening',
      value: String(counts.screening + counts.awaitingBackground),
      delta: countsLoading ? 'Loading…' : 'Background pending',
      up: (counts.screening + counts.awaitingBackground) > 0,
      onClick: () => setActiveTab('background-checks'),
    },
    {
      id: 'onboarding',
      label: 'In Onboarding',
      value: String(counts.onboarding),
      delta: countsLoading ? 'Loading…' : 'Background cleared',
      up: counts.onboarding > 0,
      onClick: () => setActiveTab('onboarding'),
    },
    {
      id: 'ready',
      label: 'Ready to Activate',
      value: String(counts.readyToActivate),
      delta: countsLoading ? 'Loading…' : `${counts.waitlistTotal} on waitlist`,
      up: counts.readyToActivate > 0,
      onClick: () => setActiveTab('waitlist'),
    },
    {
      id: 'active',
      label: 'Active Drivers',
      value: String(counts.active),
      delta: countsLoading ? 'Loading…' : 'Approved & live',
      up: true,
      onClick: () => setActiveTab('waitlist'),
    },
    {
      id: 'support',
      label: 'Open Support',
      value: String(counts.openSupportChats),
      delta: countsLoading
        ? 'Loading…'
        : `${counts.unclaimedSupportChats} unclaimed`,
      up: counts.unclaimedSupportChats === 0,
      onClick: () => setActiveTab('support'),
    },
  ]), [counts, countsLoading, setActiveTab]);

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case 'applications': return <ApplicationReview />;
      case 'waitlist': return <DriverWaitlistDashboard />;
      case 'resend-waitlist-email': return <ResendWaitlistEmail />;
      case 'background-checks': return <BackgroundCheckDashboard />;
      case 'background-settings': return <BackgroundCheckSettings />;
      case 'onboarding': return <AdminDriverOnboardingDashboard />;
      case 'quiz': return <DriverQuizManagement />;
      case 'ratings': return <DriverRatingManagement />;
      case 'promos': return <DriverPromoManagement />;
      case 'support': return <DriverSupportDashboard />;
      case 'payouts': return <DriverPayoutSettingsCompact />;
      default: return <ApplicationReview />;
    }
  }, [activeTab]);

  return (
    <AdminAccessGuard>
      <UnifiedPortalShell
        portalName="Driver Operations"
        portalSubtitle="Driver lifecycle and fleet management"
        sectionLabel="Admin Portal"
        tabs={TABS}
        sections={SECTIONS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lastUpdated={lastUpdated}
        kpis={kpis}
        kpiLabel={countsError ? `Pipeline — ${countsError}` : 'Pipeline — Live'}
        getBadgeValue={getBadgeValue}
      >
        {permissionsLoading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Verifying Driver Operations permissions…
          </div>
        ) : (
          <ReadOnlyOperationsWrapper
            enabled={isReadOnlyCfo}
            title="CFO read-only mode"
            description="Driver Operations is available for visibility only. Edit, delete, and configuration actions are disabled."
          >
            {renderContent()}
          </ReadOnlyOperationsWrapper>
        )}
      </UnifiedPortalShell>
    </AdminAccessGuard>
  );
};

export default DriverOperationsPortal;
