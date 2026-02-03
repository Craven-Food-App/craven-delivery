import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Modal, Stack, Text, Title, Button, Group } from '@mantine/core';
import { IconLock, IconShoppingCart, IconUser, IconArrowLeft } from '@tabler/icons-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component
 * 
 * Wraps routes that require authentication.
 * Shows a modal prompting users to sign in with "Continue as Guest" option.
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authenticated = !!session;
      setIsAuthenticated(authenticated);
      
      // Show modal if not authenticated
      if (!authenticated) {
        setShowAuthModal(true);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authenticated = !!session;
      setIsAuthenticated(authenticated);
      if (authenticated) {
        setShowAuthModal(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleContinueAsGuest = () => {
    // Go back to restaurants page
    navigate('/restaurants', { replace: true });
  };

  const handleSignIn = () => {
    // Navigate to auth page with return location
    navigate('/auth', { state: { from: location } });
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authenticated, show the protected content
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show authentication modal for unauthenticated users
  return (
    <>
      <Modal
        opened={showAuthModal}
        onClose={handleContinueAsGuest}
        title={
          <Group gap="sm">
            <IconLock size={24} color="#f97316" />
            <Title order={3}>Sign In Required</Title>
          </Group>
        }
        centered
        size="md"
        closeOnClickOutside={true}
        closeOnEscape={true}
      >
        <Stack gap="lg">
          {/* Icon and message */}
          <Stack gap="xs" align="center">
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              {location.pathname.includes('checkout') ? (
                <IconShoppingCart size={32} color="white" />
              ) : (
                <IconUser size={32} color="white" />
              )}
            </div>
            
            <Text size="lg" fw={600} ta="center">
              {location.pathname.includes('checkout') 
                ? 'Ready to place your order?'
                : 'Access Your Account'
              }
            </Text>
            
            <Text size="sm" c="dimmed" ta="center">
              {location.pathname.includes('checkout')
                ? 'Sign in or create an account to complete your order and track delivery in real-time.'
                : 'Sign in to access your account features, order history, and saved preferences.'
              }
            </Text>
          </Stack>

          {/* Action buttons */}
          <Stack gap="sm">
            <Button
              fullWidth
              size="lg"
              variant="gradient"
              gradient={{ from: 'orange', to: 'red', deg: 90 }}
              leftSection={<IconUser size={20} />}
              onClick={handleSignIn}
            >
              Sign In / Register
            </Button>

            <Button
              fullWidth
              size="lg"
              variant="light"
              color="gray"
              leftSection={<IconArrowLeft size={20} />}
              onClick={handleContinueAsGuest}
            >
              Continue as Guest
            </Button>
          </Stack>

          {/* Info text */}
          <Text size="xs" c="dimmed" ta="center">
            Create an account to save your favorite restaurants, track orders, and get exclusive deals.
          </Text>
        </Stack>
      </Modal>

      {/* Show a placeholder while modal is displayed */}
      <div className="min-h-screen bg-gray-50" />
    </>
  );
};

