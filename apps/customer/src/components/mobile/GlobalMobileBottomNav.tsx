import React, { useState, useEffect } from 'react';
import { Box, Group, Text, Badge, ActionIcon } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconHome, IconHeart, IconPackage, IconUser, IconShoppingCart } from '@tabler/icons-react';
import { useCart } from '@/contexts/CartContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

/**
 * Global Mobile Bottom Navigation
 * - Always positioned at absolute bottom
 * - Respects safe area (Android/iOS)
 * - Responsive to all screen sizes
 * - Persistent across app (except certain pages)
 */
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

  // Only show on mobile
  if (!isMobile) return null;

  // Hide on specific paths
  const hideOnPaths = [
    '/driver',
    '/enhanced-onboarding',
    '/restaurant-dashboard',
    '/merchant',
    '/auth',
    '/customer-support',
  ];
  
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
    <Box
      component="nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        maxWidth: '100vw',
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        // Safe area for bottom (Android nav buttons, iOS home indicator)
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
        paddingTop: '8px',
        // Ensure it's always visible
        visibility: 'visible',
        display: 'flex',
      }}
    >
      <Group
        justify="space-around"
        gap={0}
        style={{
          width: '100%',
          margin: '0 auto',
          maxWidth: '100%',
        }}
      >
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = item.isActive;

          return (
            <ActionIcon
              key={item.id}
              onClick={() => navigate(item.path)}
              variant="subtle"
              size="xl"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '4px 8px',
                minWidth: '60px',
                minHeight: '48px',
                flex: '1 1 0',
                color: isActive ? '#ff6b35' : '#737373',
                position: 'relative',
                backgroundColor: 'transparent',
                borderRadius: 0,
                // Touch-friendly size
                touchAction: 'manipulation',
              }}
            >
              <Box style={{ position: 'relative' }}>
                <IconComponent 
                  size={24} 
                  stroke={isActive ? 2.5 : 2}
                  style={{ color: isActive ? '#ff6b35' : '#737373' }} 
                />
                {item.showBadge && cartCount > 0 && (
                  <Badge
                    size="xs"
                    color="red"
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      borderRadius: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    {cartCount > 9 ? '9+' : cartCount}
                  </Badge>
                )}
              </Box>
              <Text 
                size="11px" 
                fw={isActive ? 600 : 500}
                style={{ 
                  color: isActive ? '#ff6b35' : '#737373',
                  lineHeight: 1,
                  marginTop: '2px',
                }}
              >
                {item.label}
              </Text>
            </ActionIcon>
          );
        })}
      </Group>
    </Box>
  );
};

export default GlobalMobileBottomNav;

