// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconShoppingCart,
  IconUsers,
  IconAlertTriangle,
  IconCurrencyDollar,
} from '@tabler/icons-react';
import OrdersTable from './admin/payments/OrdersTable';
import ConnectedAccountsTable from './admin/payments/ConnectedAccountsTable';
import NeedsAttentionQueue from './admin/payments/NeedsAttentionQueue';
import { UnifiedPortalShell, PortalTab } from '@/components/portal/UnifiedPortalShell';

const TABS: PortalTab[] = [
  { id: 'orders', label: 'Orders', description: 'View and manage all marketplace orders.', section: 'Payments', icon: IconShoppingCart },
  { id: 'connected-accounts', label: 'Connected Accounts', description: 'Stripe connected account management.', section: 'Payments', icon: IconUsers },
  { id: 'needs-attention', label: 'Needs Attention', description: 'Orders requiring manual intervention.', section: 'Payments', icon: IconAlertTriangle },
  { id: 'payouts', label: 'Payouts', description: 'Payout monitoring and reconciliation.', section: 'Payments', icon: IconCurrencyDollar },
];

const SECTIONS = ['Payments'];

export default function PaymentsPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');

  const renderContent = () => {
    switch (activeTab) {
      case 'orders': return <OrdersTable />;
      case 'connected-accounts': return <ConnectedAccountsTable />;
      case 'needs-attention': return <NeedsAttentionQueue />;
      case 'payouts':
        return (
          <div className="rounded-md border border-border bg-muted/20 p-6">
            <p className="text-sm text-muted-foreground">Payout monitoring coming soon</p>
          </div>
        );
      default: return <OrdersTable />;
    }
  };

  return (
    <UnifiedPortalShell
      portalName="Payments Portal"
      portalSubtitle="Stripe marketplace operations & monitoring"
      sectionLabel="Payment Operations"
      tabs={TABS}
      sections={SECTIONS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      lastUpdated={new Date()}
      onBack={() => navigate('/hub')}
    >
      {renderContent()}
    </UnifiedPortalShell>
  );
}
