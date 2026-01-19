import React from 'react';
import {
  Box,
  Group,
  Text,
  Anchor,
  Badge,
} from '@mantine/core';
import { Link, useLocation } from 'react-router-dom';
import { IconHome, IconSearch, IconUser, IconShoppingCart } from '@tabler/icons-react';
import ChatButton from '@/components/chat/ChatButton';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

interface MobileBottomNavProps {
  cartCount?: number;
  user?: any;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  cartCount = 0,
  user
}) => {
  const location = useLocation();
  const restaurantsVisible = useFeatureFlag('feature_restaurants_visible');
  
  const tabs = [
    ...(restaurantsVisible ? [
      {
        id: 'home',
        label: 'Home',
        icon: IconHome,
        path: '/restaurants'
      }, 
      {
        id: 'restaurants',
        label: 'Search',
        icon: IconSearch,
        path: '/restaurants'
      }
    ] : []),
    {
      id: 'orders',
      label: 'Orders',
      icon: IconShoppingCart,
      path: user ? '/order-history' : '/auth'
    }, 
    {
      id: 'profile',
      label: 'Account',
      icon: IconUser,
      path: user ? '/account' : '/auth'
    }
  ];

  return (
    <>
      <Box
        pos="fixed"
        bottom={20}
        right={16}
        style={{ zIndex: 50, marginTop: '340px', padding: 0, margin: '340px 16px 0 0' }}
      >
        <ChatButton
          type="customer_support"
          userType="customer"
          variant="default"
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90 border-2 border-background"
        >
          <Box component="span" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>Chat Support</Box>
        </ChatButton>
      </Box>

      <Box
        pos="fixed"
        bottom={0}
        left={0}
        right={0}
        bg="white"
        style={{ borderTop: '1px solid var(--mantine-color-gray-2)', zIndex: 40, height: '0px' }}
        className="safe-area-padding-bottom"
      >
        <Group h="100%" gap={0}>
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = tab.id === 'home' 
              ? location.pathname === '/restaurants' || location.pathname === '/'
              : tab.id === 'restaurants' 
                ? location.pathname === '/restaurants'
                : tab.id === 'orders'
                  ? location.pathname === '/order-history'
                  : tab.id === 'profile'
                    ? location.pathname === '/account'
                    : location.pathname === tab.path;
            
            return (
              <Anchor
                key={tab.id}
                component={Link}
                to={tab.path}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px', height: '100%', transition: 'all 0.2s', position: 'relative', color: isActive ? 'var(--mantine-color-orange-5)' : 'var(--mantine-color-gray-5)', backgroundColor: isActive ? 'rgba(255, 107, 31, 0.05)' : 'transparent', textDecoration: 'none' }}
              >
                <TabIcon size={20} style={{ marginBottom: 4 }} />
                <Text size="10px" fw={500} style={{ lineHeight: 'tight' }}>{tab.label}</Text>
                
                {tab.id === 'orders' && cartCount > 0 && (
                  <Badge
                    pos="absolute"
                    top={-4}
                    right="25%"
                    bg="red.5"
                    c="white"
                    size="xs"
                    style={{ borderRadius: '50%', height: '20px', width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    fw={700}
                  >
                    {cartCount > 9 ? '9+' : cartCount}
                  </Badge>
                )}
              </Anchor>
            );
          })}
        </Group>
      </Box>

      <Box h={64} style={{ display: 'block' }} />
    </>
  );
};

export default MobileBottomNav;
