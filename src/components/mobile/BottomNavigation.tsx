import React from 'react';
import { Home, Calendar, User, Bell, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeederDarkMode } from '@/contexts/FeederDarkModeContext';

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
  const { colors: C } = useFeederDarkMode();

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 backdrop-blur-sm z-50 h-20 shadow-lg"
      style={{ background: `${C.card}F2`, borderTop: `1px solid ${C.border}` }}
    >
      <div className="flex h-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const hasNotification = tab.id === 'notifications';
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex-1 flex flex-col items-center justify-center py-2 px-1 h-full transition-all duration-200 relative"
            >
              <div className="relative">
                <Icon 
                  className="h-5 w-5 mb-1.5" 
                  style={{ color: isActive ? C.orange : C.muted2 }}
                />
                {hasNotification && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </div>
              <span 
                className={cn("text-xs leading-tight", isActive ? "font-semibold" : "font-medium")}
                style={{ color: isActive ? C.orange : C.muted2 }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
