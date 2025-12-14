import React, { useState } from 'react';
import AdminAccessGuard from '@/components/AdminAccessGuard';
import { EnhancedRestaurantOnboarding } from '@/components/admin/restaurant-onboarding/EnhancedRestaurantOnboarding';
import { EnhancedRestaurantVerificationDashboard } from '@/components/admin/EnhancedRestaurantVerificationDashboard';
import { TabletShippingManagement } from '@/components/admin/TabletShippingManagement';
import { EnhancedCommissionDashboard } from '@/components/admin/commission/EnhancedCommissionDashboard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, GraduationCap, FileCheck, Package, Shield } from 'lucide-react';
import cravenLogo from "@/assets/craven-logo.png";
import { cn } from '@/lib/utils';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';

const MerchantOperationsPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('onboarding');
  
  // Track user activity
  useActivityTracking('merchant-operations');
  
  // Auto-logout after 30 minutes of inactivity
  useAutoLogout('merchant-operations');

  const navItems = [
    { id: 'onboarding', label: 'Onboarding', icon: GraduationCap },
    { id: 'verification', label: 'Document Verification', icon: FileCheck },
    { id: 'tablet-shipping', label: 'Tablet Shipping', icon: Package },
    { id: 'commission-settings', label: 'Commission Settings', icon: Shield },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'onboarding':
        return <EnhancedRestaurantOnboarding />;
      case 'verification':
        return <EnhancedRestaurantVerificationDashboard />;
      case 'tablet-shipping':
        return <TabletShippingManagement />;
      case 'commission-settings':
        return <EnhancedCommissionDashboard />;
      default:
        return <EnhancedRestaurantOnboarding />;
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
              <span className="font-bold">Merchant Operations</span>
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

export default MerchantOperationsPortal;

