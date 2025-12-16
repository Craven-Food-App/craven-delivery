import React, { useState } from 'react';
import AdminAccessGuard from '@/components/AdminAccessGuard';
import LiveDashboard from '@/components/admin/LiveDashboard';
import { NotificationSettingsManager } from '@/components/admin/NotificationSettingsManager';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import DeliveryZoneManager from '@/components/admin/DeliveryZoneManager';
import { FeatureToggleManager } from '@/components/admin/FeatureToggleManager';
import InvestorAccessManager from '@/components/admin/InvestorAccessManager';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, BarChart3, Bell, TrendingUp, Eye, MapPin, Users } from 'lucide-react';
import cravenLogo from "@/assets/craven-logo.png";
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Track user activity
  useActivityTracking('admin');
  
  // Auto-logout after 30 minutes of inactivity
  useAutoLogout('admin');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'feature-toggles', label: 'Feature Toggles', icon: Eye },
    { id: 'delivery-zones', label: 'Delivery Zones', icon: MapPin },
    { id: 'investor-access', label: 'Investor Access', icon: Users },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <LiveDashboard />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'notifications':
        return <NotificationSettingsManager />;
      case 'feature-toggles':
        return <FeatureToggleManager />;
      case 'delivery-zones':
        return <DeliveryZoneManager />;
      case 'investor-access':
        return <InvestorAccessManager />;
      default:
        return <LiveDashboard />;
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
              <span className="font-bold">Admin Portal</span>
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
                  Core Admin Functions
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

export default Admin;