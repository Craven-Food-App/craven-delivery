import React, { useState } from 'react';
import AdminAccessGuard from '@/components/AdminAccessGuard';
import ApplicationReview from '@/components/admin/ApplicationReview';
import { AdminDriverOnboardingDashboard } from '@/components/admin/driver-onboarding/AdminDriverOnboardingDashboard';
import { DriverWaitlistDashboard } from '@/components/admin/DriverWaitlistDashboard';
import LiveDashboard from '@/components/admin/LiveDashboard';
import ChatPortal from '@/components/admin/ChatPortal';
import BackgroundCheckDashboard from '@/components/admin/BackgroundCheckDashboard';
import { BackgroundCheckSettings } from '@/components/admin/BackgroundCheckSettings';
import { EnhancedRestaurantOnboarding } from '@/components/admin/restaurant-onboarding/EnhancedRestaurantOnboarding';
import { EnhancedRestaurantVerificationDashboard } from '@/components/admin/EnhancedRestaurantVerificationDashboard';
import { TabletShippingManagement } from '@/components/admin/TabletShippingManagement';
import { NotificationSettingsManager } from '@/components/admin/NotificationSettingsManager';
import { PayoutSettingsManager } from '@/components/admin/PayoutSettingsManager';
import CommissionSettingsManager from '@/components/admin/CommissionSettingsManager';
import { EnhancedCommissionDashboard } from '@/components/admin/commission/EnhancedCommissionDashboard';
import { PromoCodeManager } from '@/components/admin/PromoCodeManager';
import { DriverRatingManagement } from '@/components/admin/DriverRatingManagement';
import { DriverPromoManagement } from '@/components/admin/DriverPromoManagement';
import { DriverSupportDashboard } from '@/components/admin/DriverSupportDashboard';
import { DriverQuizManagement } from '@/components/admin/DriverQuizManagement';
import { TestCustomer } from '@/components/testing/TestCustomer';
import { TestDriver } from '@/components/testing/TestDriver';
import { TestRestaurant } from '@/components/testing/TestRestaurant';
import { TestDataManager } from '@/components/testing/TestDataManager';
import { LiveDriverTesting } from '@/components/testing/LiveDriverTesting';
import { TestDiamondExclusiveOrders } from '@/components/testing/TestDiamondExclusiveOrders';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, BarChart3, Users, Store, Car, ShoppingBag, MessageCircle, Bell, DollarSign, Tags, GraduationCap, FileCheck, Shield, ChevronRight, Package, Settings, AlertCircle, TrendingUp, LifeBuoy, FileText, TestTube, Zap, Database, Clock, Eye, Gem } from 'lucide-react';
import cravenLogo from "@/assets/craven-logo.png";
import { cn } from '@/lib/utils';
import RefundManagement from '@/components/admin/RefundManagement';
import DisputeResolution from '@/components/admin/DisputeResolution';
import CustomerManagement from '@/components/admin/CustomerManagement';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import SupportTickets from '@/components/admin/SupportTickets';
import AuditLogs from '@/components/admin/AuditLogs';
import DeliveryZoneManager from '@/components/admin/DeliveryZoneManager';
import { FeatureToggleManager } from '@/components/admin/FeatureToggleManager';
import { useActivityTracking } from '@/hooks/useActivityTracking';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedSection, setExpandedSection] = useState<string | null>('merchants');
  
  // Track user activity
  useActivityTracking('admin');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const navSections = [
    {
      id: 'merchants',
      title: 'Merchants',
      icon: Store,
      items: [
        { id: 'merchant-onboarding', label: 'Onboarding', icon: GraduationCap },
        { id: 'merchant-verification', label: 'Document Verification', icon: FileCheck },
        { id: 'merchant-tablet', label: 'Tablet Shipping', icon: Package },
        { id: 'merchant-settings', label: 'Settings', icon: Shield },
      ]
    },
    {
      id: 'drivers',
      title: 'Drivers (Feeders)',
      icon: Car,
      items: [
        { id: 'driver-applications', label: 'Applications', icon: Users },
        { id: 'driver-waitlist', label: 'Waitlist Management', icon: Clock },
        { id: 'driver-background', label: 'Background Checks', icon: FileCheck },
        { id: 'driver-background-settings', label: 'BG Check Settings', icon: Settings },
        { id: 'driver-onboarding', label: 'Onboarding', icon: GraduationCap },
        { id: 'driver-quiz', label: 'Quiz Management', icon: FileText },
        { id: 'driver-ratings', label: 'Ratings & Performance', icon: TrendingUp },
        { id: 'driver-promos', label: 'Promos & Challenges', icon: Tags },
        { id: 'driver-support', label: 'Support Chat', icon: MessageCircle },
        { id: 'driver-payouts', label: 'Payouts', icon: DollarSign },
      ]
    },
    {
      id: 'customers',
      title: 'Customers (Cravers)',
      icon: ShoppingBag,
      items: [
        { id: 'customer-management', label: 'Customer Accounts', icon: Users },
        { id: 'customer-promo', label: 'Promo Codes', icon: Tags },
        { id: 'customer-support', label: 'Support Chat', icon: MessageCircle },
      ]
    },
    {
      id: 'operations',
      title: 'Operations',
      icon: Settings,
      items: [
        { id: 'feature-toggles', label: 'Feature Toggles', icon: Eye },
        { id: 'refunds', label: 'Refunds', icon: DollarSign },
        { id: 'disputes', label: 'Disputes', icon: AlertCircle },
        { id: 'support-tickets', label: 'Support Tickets', icon: LifeBuoy },
        { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
        { id: 'delivery-zones', label: 'Delivery Zones', icon: BarChart3 },
      ]
    },
    {
      id: 'testing',
      title: 'Testing Portal',
      icon: TestTube,
      items: [
        { id: 'test-customer', label: 'Customer Testing', icon: Users },
        { id: 'test-driver', label: 'Driver Testing', icon: Car },
        { id: 'test-restaurant', label: 'Restaurant Testing', icon: Store },
        { id: 'test-live', label: 'Live Driver Testing', icon: Zap },
        { id: 'test-data', label: 'Test Data Manager', icon: Database },
        { id: 'test-diamond-exclusive', label: 'Diamond Exclusive Orders', icon: Gem },
      ]
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <LiveDashboard />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'merchant-onboarding':
        return <EnhancedRestaurantOnboarding />;
      case 'merchant-verification':
        return <EnhancedRestaurantVerificationDashboard />;
      case 'merchant-tablet':
        return <TabletShippingManagement />;
      case 'merchant-settings':
        return <EnhancedCommissionDashboard />;
      case 'driver-applications':
        return <ApplicationReview />;
      case 'driver-waitlist':
        return <DriverWaitlistDashboard />;
      case 'driver-background':
        return <BackgroundCheckDashboard />;
      case 'driver-background-settings':
        return <BackgroundCheckSettings />;
      case 'driver-onboarding':
        return <AdminDriverOnboardingDashboard />;
      case 'driver-quiz':
        return <DriverQuizManagement />;
      case 'driver-ratings':
        return <DriverRatingManagement />;
      case 'driver-promos':
        return <DriverPromoManagement />;
      case 'driver-support':
        return <DriverSupportDashboard />;
      case 'driver-payouts':
        return <PayoutSettingsManager />;
      case 'customer-management':
        return <CustomerManagement />;
      case 'customer-promo':
        return <PromoCodeManager />;
      case 'customer-support':
        return <ChatPortal />;
      case 'feature-toggles':
        return <FeatureToggleManager />;
      case 'refunds':
        return <RefundManagement />;
      case 'disputes':
        return <DisputeResolution />;
      case 'support-tickets':
        return <SupportTickets />;
      case 'audit-logs':
        return <AuditLogs />;
      case 'delivery-zones':
        return <DeliveryZoneManager />;
      case 'notifications':
        return <NotificationSettingsManager />;
      case 'test-customer':
        return <TestCustomer />;
      case 'test-driver':
        return <TestDriver />;
      case 'test-restaurant':
        return <TestRestaurant />;
      case 'test-live':
        return <LiveDriverTesting />;
      case 'test-data':
        return <TestDataManager />;
      case 'test-diamond-exclusive':
        return <TestDiamondExclusiveOrders />;
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
              {/* Dashboard */}
              <Button
                variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('dashboard')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </Button>

              {/* Analytics */}
              <Button
                variant={activeTab === 'analytics' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('analytics')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </Button>

              {/* Settings */}
              <Button
                variant={activeTab === 'notifications' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('notifications')}
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>

              <div className="pt-4 pb-2">
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Channels
                </h3>
              </div>

              {/* Navigation Sections */}
              {navSections.map((section) => (
                <div key={section.id} className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="flex items-center">
                      <section.icon className="h-4 w-4 mr-2" />
                      <span>{section.title}</span>
                    </div>
                    <ChevronRight 
                      className={cn(
                        "h-4 w-4 transition-transform",
                        expandedSection === section.id && "rotate-90"
                      )}
                    />
                  </Button>

                  {expandedSection === section.id && (
                    <div className="ml-4 space-y-1">
                      {section.items.map((item) => (
                        <Button
                          key={item.id}
                          variant={activeTab === item.id ? 'secondary' : 'ghost'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setActiveTab(item.id)}
                        >
                          <item.icon className="h-4 w-4 mr-2" />
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
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