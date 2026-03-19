// @ts-nocheck
import React, { useState, useCallback, useEffect } from 'react';
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

const DriverOperationsPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('applications');
  useActivityTracking('driver-operations');
  useAutoLogout('driver-operations');

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
        lastUpdated={new Date()}
      >
        {renderContent()}
      </UnifiedPortalShell>
    </AdminAccessGuard>
  );
};

export default DriverOperationsPortal;
