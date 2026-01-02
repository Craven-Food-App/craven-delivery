import React, { useState, Suspense, lazy } from 'react';
import AdminAccessGuard from '@/components/AdminAccessGuard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, BarChart3, Bell, TrendingUp, Eye, MapPin, FileCheck, Loader2 } from 'lucide-react';
import cravenLogo from "@/assets/craven-logo.png";
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';

// Lazy load heavy admin components
const LiveDashboard = lazy(() => import('@/components/admin/LiveDashboard'));
const NotificationSettingsManager = lazy(() => import('@/components/admin/NotificationSettingsManager').then(m => ({ default: m.NotificationSettingsManager })));
const AnalyticsDashboard = lazy(() => import('@/components/admin/AnalyticsDashboard'));
const DeliveryZoneManager = lazy(() => import('@/components/admin/DeliveryZoneManager'));
const FeatureToggleManager = lazy(() => import('@/components/admin/FeatureToggleManager').then(m => ({ default: m.FeatureToggleManager })));
const InvestorIntakeManager = lazy(() => import('@/components/admin/InvestorIntakeManager'));

// Loading fallback
const ModuleLoader = () => (
  <div className="flex items-center justify-center min-h-[300px]">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Loading module...</span>
    </div>
  </div>
);

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
    { id: 'investor-intake', label: 'Investor Intake', icon: FileCheck },
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
      case 'investor-intake':
        return <InvestorIntakeManager />;
      default:
        return <LiveDashboard />;
    }
  };

  return (
    <AdminAccessGuard>
      <div className="flex h-screen w-full bg-[#f8f9fa]">
        {/* Compact Enterprise Sidebar */}
        <aside className="w-56 border-r border-gray-200 bg-white flex flex-col shadow-sm">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-200 bg-[#fafbfc]">
            <div className="flex items-center gap-2 mb-2">
              <img src={cravenLogo} alt="Crave'n" className="h-5" />
              <span className="font-semibold text-sm text-gray-900">Admin Portal</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.href = '/hub'}
              className="w-full justify-start h-7 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2"
            >
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Back to Hub
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1">
            <div className="py-2 px-2">
              <div className="px-2 py-1.5 mb-1">
                <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Core Admin Functions
                </h3>
              </div>

              <div className="space-y-0.5">
                {navItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? 'secondary' : 'ghost'}
                    className={`w-full justify-start h-8 text-xs px-2.5 ${
                      activeTab === item.id 
                        ? 'bg-[#e8f0fe] text-[#1a73e8] font-medium hover:bg-[#e8f0fe]' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <item.icon className="h-3.5 w-3.5 mr-2" />
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content Area - Compact */}
        <main className="flex-1 overflow-auto bg-[#f8f9fa]">
          <div className="h-full p-4">
            <Suspense fallback={<ModuleLoader />}>
              {renderContent()}
            </Suspense>
          </div>
        </main>
      </div>
    </AdminAccessGuard>
  );
};

export default Admin;
