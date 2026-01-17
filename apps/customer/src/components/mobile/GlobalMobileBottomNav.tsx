import React from 'react';
import { Box, Group, Text, Badge, Button } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconHome, IconHeart, IconPackage, IconUser, IconShoppingCart } from '@tabler/icons-react';
import { useCart } from '@/contexts/CartContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

const GlobalMobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { cartCount } = useCart();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isMobile) return null;

  // Don't show on certain pages
  const hideOnPaths = ['/mobile', '/driver', '/enhanced-onboarding', '/restaurant-dashboard', '/merchant'];
  if (hideOnPaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: IconHome,
      path: '/restaurants',
      isActive: location.pathname === '/restaurants' || location.pathname === '/',
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: IconHeart,
      path: '/favorites',
      isActive: location.pathname === '/favorites',
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: IconPackage,
      path: '/order-history',
      isActive: location.pathname === '/order-history',
    },
    {
      id: 'account',
      label: 'Account',
      icon: IconUser,
      path: user ? '/account' : '/auth',
      isActive: location.pathname === '/account',
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: IconShoppingCart,
      path: '/checkout',
      isActive: location.pathname === '/checkout',
      showBadge: true,
    },
  ];

  return (
    <>
      <Box
        component="nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: '430px',
          margin: '0 auto',
          backgroundColor: 'white',
          borderTop: '1px solid #e5e7eb',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
        }}
      >
        <Group justify="space-around" py="xs" px="xs" gap={0}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = item.isActive;

            return (
              <Button
                key={item.id}
                onClick={() => navigate(item.path)}
                variant="subtle"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '2px 4px',
                  minWidth: 'auto',
                  flex: '1 1 0',
                  color: isActive ? '#b91c1c' : '#737373',
                  position: 'relative',
                }}
              >
                <Box style={{ position: 'relative' }}>
                  <IconComponent size={18} style={{ color: isActive ? '#b91c1c' : '#737373' }} />
                  {item.showBadge && cartCount > 0 && (
                    <Badge
                      size="xs"
                      color="red"
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        minWidth: '14px',
                        height: '14px',
                        padding: '0 3px',
                        fontSize: '9px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                    >
                      {cartCount > 9 ? '9+' : cartCount}
                    </Badge>
                  )}
                </Box>
                <Text size="10px" fw={isActive ? 600 : 500} c={isActive ? 'red.7' : 'gray.6'} style={{ lineHeight: 1 }}>
                  {item.label}
                </Text>
              </Button>
            );
          })}
        </Group>
      </Box>
      {/* Spacing for nav */}
      <Box style={{ height: '64px' }} />
    </>
  );
};

export default GlobalMobileBottomNav;

