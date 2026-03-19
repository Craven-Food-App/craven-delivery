// @ts-nocheck
import React, { useState } from 'react';
import AdminAccessGuard from '@/components/AdminAccessGuard';
import RefundManagement from '@/components/admin/RefundManagement';
import DisputeResolution from '@/components/admin/DisputeResolution';
import SupportTickets from '@/components/admin/SupportTickets';
import AuditLogs from '@/components/admin/AuditLogs';
import {
  IconCurrencyDollar,
  IconAlertTriangle,
  IconLifebuoy,
  IconFileText,
} from '@tabler/icons-react';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { UnifiedPortalShell, PortalTab } from '@/components/portal/UnifiedPortalShell';

const TABS: PortalTab[] = [
  { id: 'refunds', label: 'Refund Management', description: 'Process and track customer refund requests.', section: 'Operations', icon: IconCurrencyDollar },
  { id: 'disputes', label: 'Dispute Resolution', description: 'Manage payment disputes and chargebacks.', section: 'Operations', icon: IconAlertTriangle },
  { id: 'support-tickets', label: 'Support Tickets', description: 'Customer support ticket queue and triage.', section: 'Operations', icon: IconLifebuoy },
  { id: 'audit-logs', label: 'Audit Logs', description: 'Activity and compliance audit trail.', section: 'Compliance', icon: IconFileText },
];

const SECTIONS = ['Operations', 'Compliance'];

const SupportOperationsPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('refunds');
  useActivityTracking('support-operations');
  useAutoLogout('support-operations');

  const renderContent = () => {
    switch (activeTab) {
      case 'refunds': return <RefundManagement />;
      case 'disputes': return <DisputeResolution />;
      case 'support-tickets': return <SupportTickets />;
      case 'audit-logs': return <AuditLogs />;
      default: return <RefundManagement />;
    }
  };

  return (
    <AdminAccessGuard>
      <UnifiedPortalShell
        portalName="Support Operations"
        portalSubtitle="Customer support and dispute resolution"
        sectionLabel="Operations Center"
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

export default SupportOperationsPortal;
