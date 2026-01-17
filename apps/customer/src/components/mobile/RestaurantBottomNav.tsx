import React from 'react';
import { Store, Menu, Phone, ShoppingBag, Building2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface RestaurantBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: Store },
  { id: 'menu', label: 'Menu', icon: Menu },
  { id: 'pos', label: 'POS', icon: Phone },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'stores', label: 'Stores', icon: Building2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const RestaurantBottomNav: React.FC<RestaurantBottomNavProps> = ({
  activeTab,
  onTabChange
}) => {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <>
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-40 h-16 shadow-lg">
        <div className="flex h-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-1 px-1 h-full transition-smooth relative",
                  isActive 
                    ? "text-primary bg-primary/5" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom padding for content */}
      <div className="h-16 md:hidden" />
    </>
  );
};

export default RestaurantBottomNav;
