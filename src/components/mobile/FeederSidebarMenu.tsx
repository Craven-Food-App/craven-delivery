import React from 'react';
import { IconX, IconHome, IconCalendar, IconCurrencyDollar, IconUser, IconStar, IconTrendingUp, IconMessageCircle, IconLogout, IconFlame } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Box,
  Stack,
  Text,
  Button,
  Group,
  ActionIcon,
  Badge,
  Divider,
  Paper,
  Title,
  ThemeIcon,
} from '@mantine/core';

type FeederSidebarMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  onNavigate?: (path: string) => void;
};

const FeederSidebarMenu: React.FC<FeederSidebarMenuProps> = ({
  isOpen,
  onClose,
  activeTab = 'home',
  onNavigate
}) => {
  const [driverName, setDriverName] = React.useState('');
  const [driverRating, setDriverRating] = React.useState(5.00);
  const [deliveries, setDeliveries] = React.useState(0);
  const [perfection, setPerfection] = React.useState(100);
  const [driverStatus, setDriverStatus] = React.useState('New Driver');
  const [driverPoints, setDriverPoints] = React.useState(87); // Diamond status

  // Fetch driver data
  React.useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch driver profile
        const { data: profile } = await supabase
          .from('driver_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setDriverRating(profile.rating || 5.00);
          setDeliveries(profile.total_deliveries || 0);
          setPerfection(profile.rating ? Math.round((profile.rating / 5) * 100) : 100);
          
          // Calculate points based on rating and deliveries
          const points = Math.round((profile.rating || 5) * 17 + (profile.total_deliveries || 0) * 0.1);
          setDriverPoints(points);
        }

        // Fetch user metadata and profile for full name
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        // Try to get full name from craver_applications table first
        const { data: application } = await supabase
          .from('craver_applications')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (application?.first_name || application?.last_name) {
          const fullName = [application.first_name, application.last_name].filter(Boolean).join(' ');
          if (fullName) {
            setDriverName(fullName);
          }
        } else if (authUser?.user_metadata?.full_name) {
          setDriverName(authUser.user_metadata.full_name);
        } else if (authUser?.user_metadata?.first_name || authUser?.user_metadata?.last_name) {
          const fullName = [authUser.user_metadata.first_name, authUser.user_metadata.last_name].filter(Boolean).join(' ');
          if (fullName) {
            setDriverName(fullName);
          }
        } else if (authUser?.email) {
          const emailName = authUser.email.split('@')[0];
          setDriverName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
        }

        // Check if new driver (less than 10 deliveries)
        if (profile && (profile.total_deliveries || 0) < 10) {
          setDriverStatus('New Driver');
        } else {
          setDriverStatus('');
        }
      } catch (error) {
        console.error('Error fetching driver data:', error);
      }
    };

    if (isOpen) {
      fetchDriverData();
    }
  }, [isOpen]);

  const getStatus = (points: number) => {
    if (points >= 85) return { 
      name: 'Diamond', 
      gradient: 'linear-gradient(to bottom right, var(--mantine-color-cyan-2), var(--mantine-color-blue-3), var(--mantine-color-purple-3))', 
      glowGradient: 'linear-gradient(to bottom, rgba(37, 99, 235, 0.4), rgba(96, 165, 250, 0.2), rgba(191, 219, 254, 0.1), transparent)',
      icon: '💎' 
    };
    if (points >= 76) return { 
      name: 'Platinum', 
      gradient: 'linear-gradient(to bottom right, var(--mantine-color-gray-3), var(--mantine-color-gray-1), var(--mantine-color-gray-3))', 
      glowGradient: 'linear-gradient(to bottom, rgba(156, 163, 175, 0.3), rgba(209, 213, 219, 0.2), transparent)',
      icon: '⚪' 
    };
    if (points >= 65) return { 
      name: 'Gold', 
      gradient: 'linear-gradient(to bottom right, var(--mantine-color-yellow-3), var(--mantine-color-yellow-2), var(--mantine-color-yellow-4))', 
      glowGradient: 'linear-gradient(to bottom, rgba(234, 179, 8, 0.3), rgba(250, 204, 21, 0.2), transparent)',
      icon: '🥇' 
    };
    return { 
      name: 'Silver', 
      gradient: 'linear-gradient(to bottom right, var(--mantine-color-gray-4), var(--mantine-color-gray-3), var(--mantine-color-gray-5))', 
      glowGradient: 'linear-gradient(to bottom, rgba(107, 114, 128, 0.3), rgba(156, 163, 175, 0.2), transparent)',
      icon: '🥈' 
    };
  };

  const status = getStatus(driverPoints);

  const menuItems = [
    { icon: IconHome, label: 'Home', path: 'home' },
    { icon: IconCalendar, label: 'Schedule', path: 'schedule' },
    { icon: IconCurrencyDollar, label: 'Earnings', path: 'earnings' },
    { icon: IconUser, label: 'Account', path: 'account' },
    { icon: IconStar, label: 'Ratings', path: 'ratings' },
    { icon: IconTrendingUp, label: 'Promos', path: 'promos' }
  ];

  const handleMenuClick = (path: string) => {
    if (onNavigate) {
      // Convert path to capitalized format expected by handleMenuNavigation
      // Map lowercase paths to the capitalized format
      const pathMap: Record<string, string> = {
        'home': 'Home',
        'schedule': 'Schedule',
        'earnings': 'Earnings',
        'notifications': 'Notifications',
        'account': 'Account',
        'ratings': 'Ratings',
        'promos': 'Promos',
        'help': 'Messages',
        'messages': 'Messages'
      };
      const capitalizedPath = pathMap[path] || path.charAt(0).toUpperCase() + path.slice(1);
      onNavigate(capitalizedPath);
    }
    onClose();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Redirect to mobile splash page
      window.location.href = '/mobile';
    } catch (error) {
      console.error('Error logging out:', error);
      // Still redirect even on error
      window.location.href = '/mobile';
    }
  };

  return (
    <Box
      pos="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      style={{ 
        zIndex: 50, 
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s',
      }}
    >
      {/* Top Glow Effect - Matches Feeder Level */}
      {isOpen && (
        <Box
          pos="absolute"
          top={0}
          left={0}
          right={0}
          h={300}
          style={{
            background: status.glowGradient,
            pointerEvents: 'none',
            zIndex: 1,
            transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isOpen ? 1 : 0,
          }}
        />
      )}
      
      {/* Overlay */}
      <Box 
        pos="absolute" 
        inset={0} 
        style={{ 
          backgroundColor: 'rgba(0,0,0,0.52)', 
          backdropFilter: 'blur(8px)',
          transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: isOpen ? 1 : 0,
        }} 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <Paper
        pos="absolute"
        left={0}
        top={0}
        h="100%"
        w={320}
        radius={0}
        style={{ 
          overflowY: 'auto', 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none', 
          borderRadius: 0,
          boxShadow: '2px 0 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        bg="white"
      >
        <style>{`
          [data-mantine-paper]::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Header Section */}
        <Box
          pos="relative"
          p="xl"
          style={{ background: status.gradient, overflow: 'hidden', paddingTop: 'calc(1.5rem + 50px)' }}
        >
          {/* Sparkle effects for Diamond */}
          {status.name === 'Diamond' && (
            <Box pos="absolute" inset={0} style={{ opacity: 0.3 }}>
              <Box pos="absolute" top={16} left={32} w={12} h={12} bg="white" style={{ borderRadius: '50%', animation: 'pulse 2s ease-in-out infinite' }} />
              <Box pos="absolute" top={48} right={48} w={8} h={8} bg="white" style={{ borderRadius: '50%', animation: 'pulse 2s ease-in-out infinite', animationDelay: '0.3s' }} />
              <Box pos="absolute" bottom={32} left={64} w={8} h={8} bg="white" style={{ borderRadius: '50%', animation: 'pulse 2s ease-in-out infinite', animationDelay: '0.6s' }} />
            </Box>
          )}

          {/* Close Button */}
          <ActionIcon
            pos="absolute"
            top={66}
            right={16}
            variant="light"
            color="gray"
            size="lg"
            radius="xl"
            onClick={onClose}
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.35)', 
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.35)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <IconX size={22} strokeWidth={2.5} />
          </ActionIcon>

          {/* Driver Info */}
          <Box pos="relative" mt="xl" style={{ textAlign: 'center' }}>
            <Title 
              order={2} 
              fw={900} 
              c="dark" 
              mb="md" 
              style={{ 
                textAlign: 'center',
                fontSize: '28px',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              {driverName}
            </Title>
            
            {/* Status Badge with Icon */}
            <Badge
              size="lg"
              variant="light"
              mb="md"
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.45)', 
                backdropFilter: 'blur(12px)',
                border: '1.5px solid rgba(255,255,255,0.7)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                display: 'inline-flex',
                padding: '8px 16px',
                transition: 'all 0.2s ease',
              }}
            >
              <Group gap="xs">
                <Text size="xl" style={{ lineHeight: 1 }}>{status.icon}</Text>
                <Text fw={800} c="dark" size="sm" style={{ letterSpacing: '0.02em' }}>{status.name} Feeder</Text>
              </Group>
            </Badge>

            {/* Stats Row */}
            <Paper 
              p="md" 
              radius="lg" 
              shadow="none" 
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.35)', 
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                margin: '0 auto',
                maxWidth: '100%',
                transition: 'all 0.2s ease',
              }}
            >
              <Stack gap={4}>
                <Group justify="space-between" gap="xs" align="baseline">
                  <Box style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '6px' }}>
                    <IconStar 
                      size={20} 
                      fill="var(--mantine-color-yellow-6)" 
                      color="var(--mantine-color-yellow-6)" 
                      style={{ flexShrink: 0, alignSelf: 'baseline', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }} 
                    />
                    <Text size="xl" fw={900} c="dark" style={{ lineHeight: 1, letterSpacing: '-0.02em' }}>{driverRating.toFixed(2)}</Text>
                  </Box>
                  <Divider orientation="vertical" h={40} style={{ borderColor: 'rgba(255,255,255,0.6)', borderWidth: '1px' }} />
                  <Box style={{ flex: 1, textAlign: 'center' }}>
                    <Text size="xl" fw={900} c="dark" style={{ lineHeight: 1, letterSpacing: '-0.02em' }}>{deliveries}</Text>
                  </Box>
                  <Divider orientation="vertical" h={40} style={{ borderColor: 'rgba(255,255,255,0.6)', borderWidth: '1px' }} />
                  <Box style={{ flex: 1, textAlign: 'center' }}>
                    <Text size="xl" fw={900} c="dark" style={{ lineHeight: 1, letterSpacing: '-0.02em' }}>{perfection}%</Text>
                  </Box>
                  </Group>
                <Group justify="space-between" gap="xs" align="center">
                  <Box style={{ flex: 1, textAlign: 'center' }}>
                  <Text size="xs" c="dark" fw={600}>Rating</Text>
                  </Box>
                  <Box style={{ width: '1px' }} />
                  <Box style={{ flex: 1, textAlign: 'center' }}>
                    <Text size="xs" c="dark" fw={600}>Deliveries</Text>
                  </Box>
                  <Box style={{ width: '1px' }} />
                  <Box style={{ flex: 1, textAlign: 'center' }}>
                    <Text size="xs" c="dark" fw={600}>Perfect</Text>
                  </Box>
                </Group>
                </Stack>
            </Paper>
          </Box>
        </Box>

        {/* New Driver Badge */}
        {driverStatus && (
          <Box px="xl" style={{ marginTop: -16, position: 'relative', zIndex: 10, textAlign: 'center' }}>
            <Paper
              p="md"
              radius="lg"
              style={{ 
                background: 'linear-gradient(135deg, var(--mantine-color-orange-5), var(--mantine-color-red-6))', 
                boxShadow: '0 8px 20px rgba(251, 146, 60, 0.3), 0 4px 8px rgba(0,0,0,0.1)',
                display: 'inline-block',
                width: '100%',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <Group gap="md" justify="center">
                <ThemeIcon 
                  size="lg" 
                  radius="xl" 
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    backdropFilter: 'blur(4px)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <IconFlame size={20} color="white" strokeWidth={2.5} />
                </ThemeIcon>
                <Text c="white" fw={800} size="sm" style={{ letterSpacing: '0.05em' }}>{driverStatus}</Text>
              </Group>
            </Paper>
          </Box>
        )}

        {/* Menu Items */}
        <Stack gap="xs" p="md" pt="xl">
          {menuItems.map((item, idx) => {
            const isActive = activeTab === item.path;
            const IconComponent = item.icon;
            const isMessagesItem = item.path === 'messages';
            return (
              <Button
                key={idx}
                onClick={() => handleMenuClick(item.path)}
                variant={isActive ? 'filled' : 'subtle'}
                color={isActive ? 'orange' : 'gray'}
                fullWidth
                justify="flex-start"
                leftSection={
                  <ThemeIcon
                    size="lg"
                    radius="md"
                    color={isActive ? 'white' : 'orange'}
                    variant="transparent"
                    style={{ 
                      backgroundColor: 'transparent',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {isMessagesItem ? (
                      <img 
                        src="/app-chat.png" 
                        alt="Messages" 
                        style={{ 
                          width: '24px', 
                          height: '24px',
                          filter: isActive ? 'brightness(0) invert(1)' : 'none',
                          transition: 'filter 0.2s ease',
                        }} 
                      />
                    ) : (
                      <IconComponent 
                        size={24} 
                        color={isActive ? 'white' : 'var(--mantine-color-orange-6)'}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                    )}
                  </ThemeIcon>
                }
                size="lg"
                style={{
                  background: isActive 
                    ? 'linear-gradient(135deg, var(--mantine-color-orange-5), var(--mantine-color-red-6))' 
                    : undefined,
                  color: isActive ? 'white' : 'var(--mantine-color-gray-7)',
                  boxShadow: isActive 
                    ? '0 4px 12px rgba(251, 146, 60, 0.25), 0 2px 4px rgba(0,0,0,0.1)' 
                    : 'none',
                  transform: isActive ? 'translateX(4px)' : 'translateX(0)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: isActive ? 'none' : '1px solid transparent',
                  fontWeight: isActive ? 700 : 600,
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(251, 146, 60, 0.08)';
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }
                }}
              >
                <Text fw={isActive ? 700 : 600} size="lg" style={{ letterSpacing: '0.01em' }}>{item.label}</Text>
              </Button>
            );
          })}
        </Stack>

        {/* Logout */}
        <Box px="md" pb="xl">
          <Button
            onClick={handleLogout}
            variant="light"
            color="red"
            fullWidth
            justify="flex-start"
            leftSection={
              <ThemeIcon 
                size="lg" 
                radius="md" 
                color="red" 
                variant="transparent" 
                style={{ 
                  backgroundColor: 'transparent',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <IconLogout size={24} color="var(--mantine-color-red-6)" strokeWidth={2} />
              </ThemeIcon>
            }
            size="lg"
            style={{ 
              border: '1.5px solid var(--mantine-color-red-2)',
              backgroundColor: 'rgba(239, 68, 68, 0.04)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              fontWeight: 600,
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = 'var(--mantine-color-red-3)';
              e.currentTarget.style.transform = 'translateX(2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.04)';
              e.currentTarget.style.borderColor = 'var(--mantine-color-red-2)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <Text fw={600} size="lg" c="red.6" style={{ letterSpacing: '0.01em' }}>Logout</Text>
          </Button>
        </Box>

        {/* Bottom Accent */}
        <Box h={80} />
      </Paper>
    </Box>
  );
};

export default FeederSidebarMenu;
