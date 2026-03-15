import React, { useState, useEffect, useCallback } from 'react';
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
import DriverPayoutSettingsCompact from '@/components/admin/DriverPayoutSettingsCompact';
import { ResendWaitlistEmail } from '@/pages/admin/ResendWaitlistEmail';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Users,
  Clock,
  Mail,
  FileCheck,
  Settings,
  GraduationCap,
  FileText,
  TrendingUp,
  Tags,
  MessageCircle,
  DollarSign,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
} from 'lucide-react';
import cravenLogo from '@/assets/craven-logo.png';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    label: 'Pipeline',
    items: [
      { id: 'applications', label: 'Applications', icon: Users },
      { id: 'waitlist', label: 'Waitlist Management', icon: Clock },
      { id: 'resend-waitlist-email', label: 'Resend Waitlist Email', icon: Mail },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { id: 'background-checks', label: 'Background Checks', icon: FileCheck },
      { id: 'background-settings', label: 'BG Check Settings', icon: Settings },
    ],
  },
  {
    label: 'Training & Readiness',
    items: [
      { id: 'onboarding', label: 'Onboarding', icon: GraduationCap },
      { id: 'quiz', label: 'Quiz Management', icon: FileText },
    ],
  },
  {
    label: 'Performance',
    items: [
      { id: 'ratings', label: 'Ratings & Performance', icon: TrendingUp },
      { id: 'promos', label: 'Promos & Challenges', icon: Tags },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'support', label: 'Support Chat', icon: MessageCircle },
      { id: 'payouts', label: 'Payout Configuration', icon: DollarSign },
    ],
  },
];

const allItems = navGroups.flatMap(g => g.items);

const DriverOperationsPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('applications');
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useActivityTracking('driver-operations');
  useAutoLogout('driver-operations');

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const activeItem = allItems.find(i => i.id === activeTab);
  const activeGroup = navGroups.find(g => g.items.some(i => i.id === activeTab));

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case 'applications': return <ApplicationReview />;
      case 'waitlist': return <DriverWaitlistDashboard />;
      case 'resend-waitlist-email': return <ResendWaitlistEmail />;
      case 'background-checks': return <BackgroundCheckDashboard />;
      case 'background-settings': return <BackgroundCheckSettings />;
      case 'onboarding': return <AdminDriverOnboardingDashboard />;
      case 'quiz': return <DriverQuizManagement />;
      case 'ratings': return <DriverRatingManagement />;
      case 'promos': return <DriverPromoManagement />;
      case 'support': return <DriverSupportDashboard />;
      case 'payouts': return <DriverPayoutSettingsCompact />;
      default: return <ApplicationReview />;
    }
  }, [activeTab]);

  return (
    <AdminAccessGuard>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-screen w-full bg-muted/30">
          {/* Sidebar */}
          <aside
            className={cn(
              'flex flex-col border-r bg-card transition-all duration-200 ease-in-out shrink-0',
              collapsed ? 'w-[68px]' : 'w-[260px]'
            )}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 h-16 border-b shrink-0">
              <img src={cravenLogo} alt="Crave'N" className="h-7 w-7 object-contain shrink-0" />
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-foreground truncate">Driver Operations</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Admin Portal</span>
                </div>
              )}
            </div>

            {/* Back button */}
            <div className="px-3 pt-3 pb-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => (window.location.href = '/hub')}
                    className={cn('w-full', collapsed ? 'justify-center px-0' : 'justify-start')}
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="ml-2 text-xs">Back to Hub</span>}
                  </Button>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">Back to Hub</TooltipContent>}
              </Tooltip>
            </div>

            {/* Nav */}
            <ScrollArea className="flex-1 px-3">
              <div className="py-2 space-y-5">
                {navGroups.map(group => (
                  <div key={group.label}>
                    {!collapsed && (
                      <h3 className="px-3 mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                        {group.label}
                      </h3>
                    )}
                    {collapsed && <div className="border-t mx-2 mb-2" />}
                    <div className="space-y-0.5">
                      {group.items.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                          <Tooltip key={item.id}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                  'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                                  collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
                                  isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                )}
                              >
                                <item.icon className="h-4 w-4 shrink-0" />
                                {!collapsed && <span className="truncate">{item.label}</span>}
                              </button>
                            </TooltipTrigger>
                            {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Collapse toggle */}
            <div className="border-t p-3 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed(c => !c)}
                className={cn('w-full', collapsed ? 'justify-center px-0' : 'justify-start')}
              >
                {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
              </Button>
            </div>
          </aside>

          {/* Main */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Top bar */}
            <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{activeGroup?.label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold text-foreground">{activeItem?.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-auto">
              <div className="max-w-[1600px] mx-auto p-6">
                {renderContent()}
              </div>
            </main>
          </div>
        </div>
      </TooltipProvider>
    </AdminAccessGuard>
  );
};

export default DriverOperationsPortal;
