// @ts-nocheck
import React, { useState } from 'react';
import MerchantOpsAccessGuard from '@/components/MerchantOpsAccessGuard';
import { EnhancedRestaurantOnboarding } from '@/components/admin/restaurant-onboarding/EnhancedRestaurantOnboarding';
import { EnhancedRestaurantVerificationDashboard } from '@/components/admin/EnhancedRestaurantVerificationDashboard';
import { TabletShippingManagement } from '@/components/admin/TabletShippingManagement';
import { EnhancedCommissionDashboard } from '@/components/admin/commission/EnhancedCommissionDashboard';
import {
  IconSchool,
  IconFileCheck,
  IconPackage,
  IconShield,
} from '@tabler/icons-react';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { UnifiedPortalShell, PortalTab } from '@/components/portal/UnifiedPortalShell';

const TABS: PortalTab[] = [
  { id: 'onboarding', label: 'Onboarding', description: 'Restaurant onboarding pipeline and setup.', section: 'Pipeline', icon: IconSchool },
  { id: 'verification', label: 'Document Verification', description: 'Review and verify merchant documentation.', section: 'Pipeline', icon: IconFileCheck },
  { id: 'tablet-shipping', label: 'Tablet Shipping', description: 'Track and manage tablet device shipments.', section: 'Logistics', icon: IconPackage },
  { id: 'commission-settings', label: 'Commission Settings', description: 'Configure merchant commission structures.', section: 'Logistics', icon: IconShield },
];

const SECTIONS = ['Pipeline', 'Logistics'];

const MerchantOperationsPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('onboarding');
  useActivityTracking('merchant-operations');
  useAutoLogout('merchant-operations');

  const renderContent = () => {
    switch (activeTab) {
      case 'onboarding': return <EnhancedRestaurantOnboarding />;
      case 'verification': return <EnhancedRestaurantVerificationDashboard />;
      case 'tablet-shipping': return <TabletShippingManagement />;
      case 'commission-settings': return <EnhancedCommissionDashboard />;
      default: return <EnhancedRestaurantOnboarding />;
    }
  };

  return (
    <MerchantOpsAccessGuard>
      <UnifiedPortalShell
        portalName="Merchant Operations"
        portalSubtitle="Restaurant onboarding and management"
        sectionLabel="Operations Center"
        tabs={TABS}
        sections={SECTIONS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lastUpdated={new Date()}
      >
        {renderContent()}
      </UnifiedPortalShell>
    </MerchantOpsAccessGuard>
  );
};

export default MerchantOperationsPortal;
