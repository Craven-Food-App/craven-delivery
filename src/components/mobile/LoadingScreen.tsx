import React, { useState, useEffect } from 'react';
import {
  Box,
  Stack,
  Text,
  Image,
  Loader,
  Group,
} from '@mantine/core';
import cravenLogo from '@/assets/craven-c-new.png';

interface LoadingScreenProps {
  isLoading: boolean;
}

const LoadingScreen = ({ isLoading }: LoadingScreenProps) => {
  const [imageError, setImageError] = useState(false);
  const [loadingText, setLoadingText] = useState('Getting ready...');

  useEffect(() => {
    if (!isLoading) return;

    console.log('LoadingScreen: Displaying loading screen');
    
    const messages = [
      'Getting ready...',
      'Loading your dashboard...',
      'Almost there...'
    ];
    let index = 0;
    
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingText(messages[index]);
    }, 800);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      <Box
        pos="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        style={{ zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: '#FFFFFF' }}
      >
      {/* Logo container - fixed dimensions, doesn't shift */}
      <Box 
        pos="relative" 
        w={128} 
        h={128}
        style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginBottom: 48
        }}
      >
        {!imageError ? (
          <Image
            src={cravenLogo}
            alt="Crave'n"
            w={128}
            h={128}
            style={{ 
              animation: 'spin 2s ease-in-out infinite',
              transformOrigin: 'center center',
              display: 'block'
            }}
            onError={() => {
              console.error('LoadingScreen: Failed to load logo image');
              setImageError(true);
            }}
            onLoad={() => console.log('LoadingScreen: Logo loaded successfully')}
          />
        ) : (
          <Loader
            size="xl"
            type="bars"
            color="orange"
            style={{ opacity: 0.8 }}
          />
        )}
        {/* Dots below logo - fixed position */}
        <Box 
          pos="absolute" 
          bottom={-32} 
          left="50%" 
          style={{ transform: 'translateX(-50%)' }}
        >
          <Group gap={4}>
            <Box
              w={8}
              h={8}
              bg="#E8622A"
              style={{ borderRadius: '50%', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: '0s' }}
            />
            <Box
              w={8}
              h={8}
              bg="#E8622A"
              style={{ borderRadius: '50%', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: '0.2s' }}
            />
            <Box
              w={8}
              h={8}
              bg="#E8622A"
              style={{ borderRadius: '50%', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: '0.4s' }}
            />
          </Group>
        </Box>
      </Box>
      
      {/* Text container - fixed height to prevent shifting */}
      <Stack 
        gap="xs" 
        style={{ 
          textAlign: 'center', 
          color: '#111111',
          minHeight: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Text size="2xl" fw={700} style={{ lineHeight: 1.2, color: '#111111' }}>CRAVE'N</Text>
        <Text 
          size="lg" 
          opacity={0.7}
          style={{ 
            minHeight: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#111111'
          }}
        >
          {loadingText}
        </Text>
      </Stack>
    </Box>
    </>
  );
};

export default LoadingScreen;
