import React, { useState } from 'react';
import AdminAccessGuard from '@/components/AdminAccessGuard';
import CustomerManagement from '@/components/admin/CustomerManagement';
import { PromoCodeManager } from '@/components/admin/PromoCodeManager';
import ChatPortal from '@/components/admin/ChatPortal';
import CraveMoreAdminDashboard from '@/pages/admin/CraveMoreAdminDashboard';
import TesterEnrollmentManagement from '@/components/admin/TesterEnrollmentManagement';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Users, Tags, MessageCircle, TrendingUp, Smartphone } from 'lucide-react';
import cravenLogo from "@/assets/craven-logo.png";
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';

const CustomerSuccessPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('management');
  
  // Track user activity
  useActivityTracking('customer-success');
  
  // Auto-logout after 30 minutes of inactivity
  useAutoLogout('customer-success');

  const navItems = [
    { id: 'management', label: 'Customer Accounts', icon: Users },
    { id: 'promo-codes', label: 'Promo Codes', icon: Tags },
    { id: 'tester-enrollment', label: 'Tester Enrollment', icon: Smartphone },
    { id: 'support-chat', label: 'Support Chat', icon: MessageCircle },
    { id: 'cravemore', label: 'CraveMore Dashboard', icon: TrendingUp },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'management':
        return <CustomerManagement />;
      case 'promo-codes':
        return <PromoCodeManager />;
      case 'tester-enrollment':
        return <TesterEnrollmentManagement />;
      case 'support-chat':
        return <ChatPortal />;
      case 'cravemore':
        return <CraveMoreAdminDashboard />;
      default:
        return <CustomerManagement />;
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
              <span className="font-bold">Customer Success</span>
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

export default CustomerSuccessPortal;

