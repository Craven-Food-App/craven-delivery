import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OrdersTable from './OrdersTable';
import ConnectedAccountsTable from './ConnectedAccountsTable';
import NeedsAttentionQueue from './NeedsAttentionQueue';

export default function PaymentsPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/hub')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Payments Portal</h1>
              <p className="text-sm text-slate-600">Stripe marketplace operations & monitoring</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="connected-accounts">Connected Accounts</TabsTrigger>
            <TabsTrigger value="needs-attention">Needs Attention</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <OrdersTable />
          </TabsContent>

          <TabsContent value="connected-accounts" className="mt-6">
            <ConnectedAccountsTable />
          </TabsContent>

          <TabsContent value="needs-attention" className="mt-6">
            <NeedsAttentionQueue />
          </TabsContent>

          <TabsContent value="payouts" className="mt-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <p className="text-sm text-slate-600">Payout monitoring coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

