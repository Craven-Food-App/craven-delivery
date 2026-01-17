import React, { useState, useEffect } from 'react';
import {
  Box,
  Group,
  Text,
  Image,
  Badge,
} from '@mantine/core';
import { useScrollDirection } from '@/hooks/useScrollDirection';

type DriverTabType = 'home' | 'schedule' | 'earnings' | 'notifications' | 'account';

interface DriverBottomNavProps {
  activeTab: DriverTabType;
  onTabChange: (tab: DriverTabType) => void;
  notificationCount?: number;
}

const tabs = [
  { id: 'home' as const, label: 'Home', icon: '/app-home.png' },
  { id: 'schedule' as const, label: 'Schedule', icon: '/app-schedule.png' },
  { id: 'earnings' as const, label: 'Earnings', icon: '/app-earnings.png' },
  { id: 'notifications' as const, label: 'Alerts', icon: '/app-alerts.png' },
  { id: 'account' as const, label: 'Account', icon: '/app-account.png' },
];

export const DriverBottomNav: React.FC<DriverBottomNavProps> = ({
  activeTab,
  onTabChange,
  notificationCount = 0
}) => {
  const { scrollDirection, isScrolling } = useScrollDirection(5, 200);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Always show at the top
    if (window.scrollY < 10) {
      setIsVisible(true);
      return;
    }

    // Hide when scrolling down
    if (isScrolling && scrollDirection === 'down') {
      setIsVisible(false);
    } 
    // Show when scrolling up or when scrolling stops
    else if (scrollDirection === 'up' || !isScrolling) {
      setIsVisible(true);
    }
  }, [scrollDirection, isScrolling]);

  return (
    <>
      <Box
        pos="fixed"
        bottom={0}
        left={0}
        right={0}
        bg="white"
        style={{ 
          borderTop: '1px solid var(--mantine-color-gray-2)', 
          zIndex: 50, 
          boxShadow: '0 -4px 6px rgba(0,0,0,0.1)', 
          height: 'calc(5rem + env(safe-area-inset-bottom, 0px))', 
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease-in-out',
          willChange: 'transform'
        }}
      >
        <Group h={80} gap={0}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const hasNotification = tab.id === 'notifications' && notificationCount > 0;
            
            return (
              <Box
                key={tab.id}
                component="button"
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', height: '100%', transition: 'all 0.2s', position: 'relative', color: isActive ? 'var(--mantine-color-orange-6)' : 'var(--mantine-color-gray-5)', cursor: 'pointer' }}
                onClick={() => onTabChange(tab.id)}
              >
                <Box pos="relative">
                  <Image
                    src={tab.icon}
                    alt={tab.label}
                    h={24}
                    w={24}
                    mb={6}
                    style={{ opacity: isActive ? 1 : 0.6, transition: 'all 0.2s' }}
                  />
                  {hasNotification && (
                    <Badge
                      pos="absolute"
                      top={-4}
                      right={-4}
                      w={20}
                      h={20}
                      bg="red.5"
                      style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
                      size="xs"
                      fw={700}
                    >
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </Badge>
                  )}
                </Box>
                <Text
                  size="xs"
                  fw={isActive ? 600 : 500}
                  style={{ lineHeight: 'tight' }}
                  c={isActive ? 'orange.6' : 'gray.5'}
                >
                  {tab.label}
                </Text>
              </Box>
            );
          })}
        </Group>
      </Box>

      <Box h="calc(5rem + env(safe-area-inset-bottom, 0px))" />
    </>
  );
};
