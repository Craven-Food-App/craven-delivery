import React, { useEffect, useState } from 'react';
import {
  Box,
  Stack,
  Text,
  Button,
  Image,
  Anchor,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import mobileDriverWelcomeImage from '@/assets/mobile-driver-welcome.png';
import MobileFeederLogin from './MobileFeederLogin';
import { supabase } from '@/integrations/supabase/client';

interface MobileDriverWelcomeScreenProps {
  onStartFeeding?: () => void;
}

const MobileDriverWelcomeScreen: React.FC<MobileDriverWelcomeScreenProps> = ({ 
  onStartFeeding 
}) => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  
  console.log('MobileDriverWelcomeScreen rendered');
  console.log('Image source:', mobileDriverWelcomeImage);

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('Session exists, redirecting to dashboard');
          if (onStartFeeding) {
            onStartFeeding();
          } else {
            navigate('/mobile');
          }
        }
      } catch (e) {
        console.error('Session check failed:', e);
      }
    };
    
    const timeoutId = setTimeout(() => {
      console.log('Session check timeout - proceeding with welcome screen');
    }, 1000);
    
    checkExistingSession().finally(() => clearTimeout(timeoutId));
  }, []);

  const handleFeedNow = () => {
    console.log('FEED NOW clicked, showing login screen');
    setShowLogin(true);
  };

  const handleLoginSuccess = () => {
    console.log('Login successful, proceeding to dashboard');
    setShowLogin(false);
    // MobileFeederLogin already handles routing (onboarding check, etc.)
    // This callback is only called if user should go to dashboard
    if (onStartFeeding) {
      onStartFeeding();
    } else {
      // Refresh the page to ensure proper state
      window.location.href = '/mobile';
    }
  };

  return (
    <Box pos="fixed" top={0} left={0} right={0} bottom={0} w="100%" h="100%" bg="white">
      <Image
        src={mobileDriverWelcomeImage}
        alt="CRAVE'N Delivery Rider"
        pos="absolute"
        top={-20}
        left={0}
        right={0}
        bottom={0}
        w="100%"
        h="100%"
        style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
        onLoad={() => console.log('Mobile driver welcome image loaded successfully')}
        onError={(e) => {
          console.error('Mobile driver welcome image failed to load:', e);
          e.currentTarget.style.display = 'none';
          const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
          if (nextElement) {
            nextElement.style.display = 'block';
          }
        }}
      />
      
      <Box
        style={{ display: 'none', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom right, var(--mantine-color-orange-4), var(--mantine-color-orange-6))' }}
      />

      {showLogin ? (
        <MobileFeederLogin onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Stack
          pos="absolute"
          bottom={0}
          left={0}
          right={0}
          align="center"
          justify="flex-end"
          px="xl"
          style={{ 
            zIndex: 20,
            paddingBottom: `calc(50px + env(safe-area-inset-bottom, 48px))`
          }}
        >
          <Button
            size="lg"
            fullWidth
            maw={400}
            h={56}
            style={{ fontSize: '20px', fontWeight: 700, background: 'linear-gradient(to right, var(--mantine-color-orange-5), var(--mantine-color-orange-6))', color: 'white', boxShadow: '0 20px 25px rgba(0,0,0,0.3)', borderRadius: '16px' }}
            onClick={handleFeedNow}
            mb={8}
          >
            FEED NOW
          </Button>
          <Box px="md" style={{ textAlign: 'center', width: '100%', maxWidth: 400, marginTop: 0 }}>
            <Text size="xs" c="dimmed" style={{ lineHeight: 1.3, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Wrong app if you're Crave'n food?{' '}
              <Anchor href="/" c="dark" td="underline" fw={500} style={{ color: 'black', fontSize: '11px', whiteSpace: 'nowrap' }}>
                Download Ordering App
              </Anchor>
            </Text>
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default MobileDriverWelcomeScreen;
