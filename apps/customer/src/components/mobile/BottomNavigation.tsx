import React from 'react';
import { Home, Calendar, User, Bell, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'home' | 'schedule' | 'earnings' | 'notifications' | 'account';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'schedule' as const, label: 'Schedule', icon: Calendar },
  { id: 'earnings' as const, label: 'Earnings', icon: DollarSign },
  { id: 'notifications' as const, label: 'Alerts', icon: Bell },
  { id: 'account' as const, label: 'Account', icon: User },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border/50 z-50 h-20 shadow-lg">
      <div className="flex h-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const hasNotification = tab.id === 'notifications'; // Mock notification badge
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 px-1 h-full transition-all duration-200 relative",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground/70 hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5 mb-1.5", isActive && "text-primary")} />
                {hasNotification && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </div>
              <span className={cn(
                "text-xs font-medium leading-tight",
                isActive ? "text-primary font-semibold" : "text-muted-foreground/70"
              )}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};