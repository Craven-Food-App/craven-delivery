import React, { useState } from 'react';
import AdminAccessGuard from '@/components/AdminAccessGuard';
import RefundManagement from '@/components/admin/RefundManagement';
import DisputeResolution from '@/components/admin/DisputeResolution';
import SupportTickets from '@/components/admin/SupportTickets';
import AuditLogs from '@/components/admin/AuditLogs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, DollarSign, AlertCircle, LifeBuoy, FileText } from 'lucide-react';
import cravenLogo from "@/assets/craven-logo.png";
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';

const SupportOperationsPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('refunds');
  
  // Track user activity
  useActivityTracking('support-operations');
  
  // Auto-logout after 30 minutes of inactivity
  useAutoLogout('support-operations');

  const navItems = [
    { id: 'refunds', label: 'Refunds', icon: DollarSign },
    { id: 'disputes', label: 'Disputes', icon: AlertCircle },
    { id: 'support-tickets', label: 'Support Tickets', icon: LifeBuoy },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'refunds':
        return <RefundManagement />;
      case 'disputes':
        return <DisputeResolution />;
      case 'support-tickets':
        return <SupportTickets />;
      case 'audit-logs':
        return <AuditLogs />;
      default:
        return <RefundManagement />;
    }
  };

  return (
    <AdminAccessGuard>
      <div className="flex h-screen w-full bg-background">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-4">
              <img src={cravenLogo} alt="Crave'n" className="h-6" />
              <span className="font-bold">Support Operations</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.href = '/hub'}
              className="w-full justify-start"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Hub
            </Button>
          </div>

          <ScrollArea className="flex-1 px-3">
            <div className="space-y-4 py-4">
              <div className="pt-2 pb-2">
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Operations
                </h3>
              </div>

              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab(item.id)}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </AdminAccessGuard>
  );
};

export default SupportOperationsPortal;

