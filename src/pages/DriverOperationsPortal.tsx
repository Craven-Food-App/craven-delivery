import React, { useState } from 'react';
import AdminAccessGuard from '@/components/AdminAccessGuard';
import ApplicationReview from '@/components/admin/ApplicationReview';
import { AdminDriverOnboardingDashboard } from '@/components/admin/driver-onboarding/AdminDriverOnboardingDashboard';
import { DriverWaitlistDashboard } from '@/components/admin/DriverWaitlistDashboard';
import BackgroundCheckDashboard from '@/components/admin/BackgroundCheckDashboard';
import { BackgroundCheckSettings } from '@/components/admin/BackgroundCheckSettings';
import { DriverQuizManagement } from '@/components/admin/DriverQuizManagement';
import { DriverRatingManagement } from '@/components/admin/DriverRatingManagement';
import { DriverPromoManagement } from '@/components/admin/DriverPromoManagement';
import { DriverSupportDashboard } from '@/components/admin/DriverSupportDashboard';
import { PayoutSettingsManager } from '@/components/admin/PayoutSettingsManager';
import { ResendWaitlistEmail } from '@/pages/admin/ResendWaitlistEmail';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Users, Clock, Mail, FileCheck, Settings, GraduationCap, FileText, TrendingUp, Tags, MessageCircle, DollarSign } from 'lucide-react';
import cravenLogo from "@/assets/craven-logo.png";
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';

const DriverOperationsPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('applications');
  
  // Track user activity
  useActivityTracking('driver-operations');
  
  // Auto-logout after 30 minutes of inactivity
  useAutoLogout('driver-operations');

  const navItems = [
    { id: 'applications', label: 'Applications', icon: Users },
    { id: 'waitlist', label: 'Waitlist Management', icon: Clock },
    { id: 'resend-waitlist-email', label: 'Resend Waitlist Email', icon: Mail },
    { id: 'background-checks', label: 'Background Checks', icon: FileCheck },
    { id: 'background-settings', label: 'BG Check Settings', icon: Settings },
    { id: 'onboarding', label: 'Onboarding', icon: GraduationCap },
    { id: 'quiz', label: 'Quiz Management', icon: FileText },
    { id: 'ratings', label: 'Ratings & Performance', icon: TrendingUp },
    { id: 'promos', label: 'Promos & Challenges', icon: Tags },
    { id: 'support', label: 'Support Chat', icon: MessageCircle },
    { id: 'payouts', label: 'Payouts', icon: DollarSign },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'applications':
        return <ApplicationReview />;
      case 'waitlist':
        return <DriverWaitlistDashboard />;
      case 'resend-waitlist-email':
        return <ResendWaitlistEmail />;
      case 'background-checks':
        return <BackgroundCheckDashboard />;
      case 'background-settings':
        return <BackgroundCheckSettings />;
      case 'onboarding':
        return <AdminDriverOnboardingDashboard />;
      case 'quiz':
        return <DriverQuizManagement />;
      case 'ratings':
        return <DriverRatingManagement />;
      case 'promos':
        return <DriverPromoManagement />;
      case 'support':
        return <DriverSupportDashboard />;
      case 'payouts':
        return <PayoutSettingsManager />;
      default:
        return <ApplicationReview />;
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
              <span className="font-bold">Driver Operations</span>
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

export default DriverOperationsPortal;

