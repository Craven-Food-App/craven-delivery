import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button } from '@mantine/core';
import { IconShoppingCart } from '@tabler/icons-react';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

export function ViewCartButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount, getCartTotal, restaurantId } = useCart();
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isLandingPage, setIsLandingPage] = useState(false);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const isAndroidPlatform = platform === 'android';
    const isAndroidUA = /Android/i.test(navigator.userAgent);
    setIsAndroid(isAndroidPlatform || isAndroidUA);
  }, []);

  // Detect landing page - check if splash address input is visible
  useEffect(() => {
    const checkLandingPage = () => {
      const splashInput = document.querySelector('input[placeholder*="Enter delivery address"]') as HTMLElement;
      if (splashInput) {
        const style = window.getComputedStyle(splashInput);
        const isVisible = style.display !== 'none' && 
                         style.visibility !== 'hidden' && 
                         splashInput.offsetParent !== null;
        setIsLandingPage(isVisible);
      } else {
        setIsLandingPage(false);
      }
    };
    
    checkLandingPage();
    const interval = setInterval(checkLandingPage, 200);
    return () => clearInterval(interval);
  }, [location.pathname]);
  
  // Don't show on checkout, payment, auth pages, or landing page
  const hideOnPages = ['/checkout', '/payment-success', '/payment-canceled', '/auth'];
  const shouldHide = hideOnPages.some(page => location.pathname.includes(page));

  // Fetch restaurant name when restaurantId changes
  useEffect(() => {
    const fetchRestaurantName = async () => {
      if (restaurantId) {
        try {
          const { data, error } = await supabase
            .from('restaurants')
            .select('name')
            .eq('id', restaurantId)
            .single();
          
          if (error) throw error;
          setRestaurantName(data?.name || null);
        } catch (error) {
          console.error('Error fetching restaurant name:', error);
          setRestaurantName(null);
        }
      } else {
        setRestaurantName(null);
      }
    };
    
    fetchRestaurantName();
  }, [restaurantId]);

  // Don't render if cart is empty, on certain pages, or on landing page
  if (cartCount === 0 || shouldHide || isLandingPage) {
    return null;
  }

  return (
    <>
      {/* View Cart Button - Positioned at bottom */}
      <Box
        style={{
          position: 'fixed',
          bottom: 'env(safe-area-inset-bottom, 0px)',
          left: 0,
          right: 0,
          width: '100%',
          zIndex: 9999,
          padding: '12px 16px',
          backgroundColor: 'transparent',
          margin: 0
        }}
      >
        <Button
          fullWidth
          size="lg"
          onClick={() => navigate('/checkout')}
          leftSection={<IconShoppingCart size={20} />}
          style={{
            backgroundColor: '#ff5f1f',
            color: 'white',
            fontWeight: 600,
            fontSize: '16px',
            height: '48px',
            margin: 0
          }}
        >
          {restaurantName ? (
            <>
              View Cart from {restaurantName} ({cartCount} {cartCount === 1 ? 'item' : 'items'}) • ${(getCartTotal() / 100).toFixed(2)}
            </>
          ) : (
            <>
              View Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'}) • ${(getCartTotal() / 100).toFixed(2)}
            </>
          )}
        </Button>
      </Box>
    </>
  );
}

