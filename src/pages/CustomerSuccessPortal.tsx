// @ts-nocheck
import React, { useState } from 'react';
import AdminAccessGuard from '@/components/AdminAccessGuard';
import CustomerManagement from '@/components/admin/CustomerManagement';
import { PromoCodeManager } from '@/components/admin/PromoCodeManager';
import ChatPortal from '@/components/admin/ChatPortal';
import CraveMoreAdminDashboard from '@/pages/admin/CraveMoreAdminDashboard';
import {
  IconUsers,
  IconTag,
  IconMessageCircle,
  IconTrendingUp,
} from '@tabler/icons-react';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { UnifiedPortalShell, PortalTab } from '@/components/portal/UnifiedPortalShell';

const TABS: PortalTab[] = [
  { id: 'management', label: 'Customer Accounts', description: 'Manage customer profiles and account data.', section: 'Customers', icon: IconUsers },
  { id: 'promo-codes', label: 'Promo Codes', description: 'Create and manage promotional discount codes.', section: 'Engagement', icon: IconTag },
  { id: 'support-chat', label: 'Support Chat', description: 'Live customer support chat interface.', section: 'Engagement', icon: IconMessageCircle },
  { id: 'cravemore', label: 'CraveMore Dashboard', description: 'Loyalty program analytics and management.', section: 'Engagement', icon: IconTrendingUp },
];

const SECTIONS = ['Customers', 'Engagement'];

const CustomerSuccessPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('management');
  useActivityTracking('customer-success');
  useAutoLogout('customer-success');

  const renderContent = () => {
    switch (activeTab) {
      case 'management': return <CustomerManagement />;
      case 'promo-codes': return <PromoCodeManager />;
      case 'support-chat': return <ChatPortal />;
      case 'cravemore': return <CraveMoreAdminDashboard />;
      default: return <CustomerManagement />;
    }
  };

  return (
    <AdminAccessGuard>
      <UnifiedPortalShell
        portalName="Customer Success"
        portalSubtitle="Customer management and engagement"
        sectionLabel="Success Center"
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

export default CustomerSuccessPortal;
