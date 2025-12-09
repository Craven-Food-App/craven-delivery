import React, { useState, useEffect } from 'react';
import { 
  IconUser, IconCar, IconShield, IconCreditCard, IconSettings, IconLogout, 
  IconChevronRight, IconStar, IconCurrencyDollar, IconMessageCircle,
  IconPhone, IconMail, IconMapPin, IconCalendar
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { ProfileSection } from './ProfileSection';
import { PaymentMethodsSection } from './PaymentMethodsSection';
import { AppSettingsSection } from './AppSettingsSection';
import { VehicleManagementSection } from './VehicleManagementSection';
import { SafeDrivingSection } from './SafeDrivingSection';
import { InstantCashoutModal } from './InstantCashoutModal';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import {
  Box,
  Stack,
  Text,
  Button,
  Group,
  Card,
  Title,
  Loader,
  ThemeIcon,
  Divider,
  Anchor,
  Grid,
  Paper,
} from '@mantine/core';

interface CraverProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  vehicle_type?: string;
  profile_photo?: string;
}

export const AccountSection: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
}> = ({ activeTab, onTabChange }) => {
  const [profile, setProfile] = useState<CraverProfile | null>(null);
  const [stats, setStats] = useState({
    rating: 5.0,
    totalDeliveries: 0,
    weekEarnings: 0,
    todayEarnings: 0,
    acceptanceRate: 100,
    completionRate: 100,
    onTimeRate: 100
  });
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState<'main' | 'profile' | 'payments' | 'settings' | 'vehicle' | 'safety'>('main');
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [availableCashout, setAvailableCashout] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get profile from user_profiles table
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError);
      }

      // Get driver stats and rating details
      const { data: driverProfile, error: driverError } = await supabase
        .from('driver_profiles')
        .select('total_deliveries, rating, acceptance_rate, completion_rate, on_time_rate')
        .eq('user_id', user.id)
        .maybeSingle();

      if (driverError && driverError.code !== 'PGRST116') {
        console.error('Error fetching driver profile:', driverError);
      }

      // Get earnings
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { data: todayOrders } = await supabase
        .from('orders')
        .select('payout_cents')
        .eq('driver_id', user.id)
        .eq('order_status', 'delivered')
        .gte('created_at', todayStart.toISOString());

      const { data: weekOrders } = await supabase
        .from('orders')
        .select('payout_cents')
        .eq('driver_id', user.id)
        .eq('order_status', 'delivered')
        .gte('created_at', weekStart.toISOString());

      // Get feeder application data
      const { data: application } = await supabase
        .from('feeder_applications')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (application) {
        setProfile(application);
      }

      setStats({
        rating: driverProfile?.rating || 5.0,
        totalDeliveries: driverProfile?.total_deliveries || 0,
        todayEarnings: (todayOrders?.reduce((sum, o) => sum + (o.payout_cents || 0), 0) || 0) / 100,
        weekEarnings: (weekOrders?.reduce((sum, o) => sum + (o.payout_cents || 0), 0) || 0) / 100,
        acceptanceRate: driverProfile?.acceptance_rate || 100,
        completionRate: driverProfile?.completion_rate || 100,
        onTimeRate: driverProfile?.on_time_rate || 100
      });

      // Calculate available cashout
      setAvailableCashout((todayOrders?.reduce((sum, o) => sum + (o.payout_cents || 0), 0) || 0) / 100);

    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      notifications.show({
        title: 'Signed out successfully',
        message: '',
        color: 'green',
      });
      window.location.href = '/mobile';
    } catch (error) {
      notifications.show({
        title: 'Failed to sign out',
        message: '',
        color: 'red',
      });
    }
  };

  // Render sub-sections
  if (currentSection === 'profile') {
    return <ProfileSection onBack={() => setCurrentSection('main')} />;
  }
  if (currentSection === 'payments') {
    return <PaymentMethodsSection onBack={() => setCurrentSection('main')} />;
  }
  if (currentSection === 'settings') {
    return <AppSettingsSection onBack={() => setCurrentSection('main')} />;
  }
  if (currentSection === 'vehicle') {
    return <VehicleManagementSection onBack={() => setCurrentSection('main')} />;
  }
  if (currentSection === 'safety') {
    return <SafeDrivingSection onBack={() => setCurrentSection('main')} />;
  }

  if (loading) {
    return (
      <Box h="100vh" bg="slate.0" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap="md">
          <Loader size="xl" color="orange" />
          <Text c="slate.6">Loading your account...</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box h="100vh" bg="slate.0" style={{ paddingBottom: '80px', overflowY: 'auto' }}>
      {/* Header */}
      <Paper
        pos="sticky"
        top={0}
        style={{ zIndex: 10, borderBottom: '1px solid var(--mantine-color-slate-2)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        bg="white"
        className="safe-area-top"
      >
        <Box p="md">
          <Title order={1} fw={700} c="slate.9" style={{ textAlign: 'right' }}>Account</Title>
          <Text size="sm" c="slate.6" style={{ textAlign: 'right' }}>Manage your profile and settings</Text>
        </Box>
      </Paper>

      {/* Profile Card */}
      <Paper
        p="xl"
        style={{ background: 'linear-gradient(to bottom right, var(--mantine-color-orange-5), var(--mantine-color-orange-6))' }}
      >
        <Group gap="md" mb="xl">
          <Box
            w={80}
            h={80}
            style={{ borderRadius: '50%', border: '4px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', backgroundColor: 'white' }}
          >
            {profile?.profile_photo ? (
              <Box component="img" src={profile.profile_photo} alt="Profile" w="100%" h="100%" style={{ objectFit: 'cover' }} />
            ) : (
              <Box w="100%" h="100%" bg="slate.2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconUser size={40} color="var(--mantine-color-slate-5)" />
              </Box>
            )}
          </Box>
          <Box style={{ flex: 1 }}>
            <Title order={2} c="white" fw={700}>
              {profile?.first_name} {profile?.last_name}
            </Title>
            <Text c="orange.1" size="sm" tt="capitalize">{profile?.status || 'Driver'}</Text>
          </Box>
        </Group>

        {/* Stats Grid */}
        <Grid gutter="md">
          <Grid.Col span={6}>
            <Paper p="md" radius="lg" style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
              <Group gap="xs" mb={4}>
                <IconStar size={16} color="white" />
                <Text size="xs" c="orange.1">Rating</Text>
              </Group>
              <Text size="2xl" fw={700} c="white">{stats.rating.toFixed(1)}</Text>
            </Paper>
          </Grid.Col>
          <Grid.Col span={6}>
            <Paper p="md" radius="lg" style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
              <Group gap="xs" mb={4}>
                <IconCurrencyDollar size={16} color="white" />
                <Text size="xs" c="orange.1">This Week</Text>
              </Group>
              <Text size="2xl" fw={700} c="white">${stats.weekEarnings.toFixed(0)}</Text>
            </Paper>
          </Grid.Col>
        </Grid>

        {availableCashout > 0.50 && (
          <Button
            fullWidth
            mt="md"
            bg="white"
            c="orange.6"
            fw={600}
            size="lg"
            radius="lg"
            onClick={() => setShowCashoutModal(true)}
            style={{ ':hover': { backgroundColor: 'var(--mantine-color-orange-0)' } }}
          >
            Cash Out ${availableCashout.toFixed(2)}
          </Button>
        )}
      </Paper>

      {/* Menu Sections */}
      <Stack gap="md" p="md">
        {/* Personal */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="sm" style={{ backgroundColor: 'var(--mantine-color-slate-0)', borderBottom: '1px solid var(--mantine-color-slate-2)' }}>
            <Text size="sm" fw={600} c="slate.7" tt="uppercase" style={{ letterSpacing: '0.05em' }}>Personal</Text>
          </Card.Section>
          
          <Button
            variant="subtle"
            fullWidth
            justify="space-between"
            leftSection={
              <ThemeIcon size="lg" radius="xl" color="blue" variant="light">
                <IconUser size={20} color="var(--mantine-color-blue-6)" />
              </ThemeIcon>
            }
            rightSection={<IconChevronRight size={20} color="var(--mantine-color-slate-4)" />}
            onClick={() => setCurrentSection('profile')}
            style={{ height: 'auto', padding: '16px' }}
          >
            <Text fw={500} c="slate.9">Profile Information</Text>
          </Button>

          <Divider />

          <Button
            variant="subtle"
            fullWidth
            justify="space-between"
            leftSection={
              <ThemeIcon size="lg" radius="xl" color="purple" variant="light">
                <IconCar size={20} color="var(--mantine-color-purple-6)" />
              </ThemeIcon>
            }
            rightSection={<IconChevronRight size={20} color="var(--mantine-color-slate-4)" />}
            onClick={() => setCurrentSection('vehicle')}
            style={{ height: 'auto', padding: '16px' }}
          >
            <Box>
              <Text fw={500} c="slate.9">Vehicle & Documents</Text>
              <Text size="xs" c="slate.6" tt="capitalize">{profile?.vehicle_type || 'Not set'}</Text>
            </Box>
          </Button>
        </Card>

        {/* Financial */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="sm" style={{ backgroundColor: 'var(--mantine-color-slate-0)', borderBottom: '1px solid var(--mantine-color-slate-2)' }}>
            <Text size="sm" fw={600} c="slate.7" tt="uppercase" style={{ letterSpacing: '0.05em' }}>Financial</Text>
          </Card.Section>
          
          <Button
            variant="subtle"
            fullWidth
            justify="space-between"
            leftSection={
              <ThemeIcon size="lg" radius="xl" color="green" variant="light">
                <IconCreditCard size={20} color="var(--mantine-color-green-6)" />
              </ThemeIcon>
            }
            rightSection={<IconChevronRight size={20} color="var(--mantine-color-slate-4)" />}
            onClick={() => setCurrentSection('payments')}
            style={{ height: 'auto', padding: '16px' }}
          >
            <Text fw={500} c="slate.9">Payment Methods</Text>
          </Button>
        </Card>

        {/* App Settings */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="sm" style={{ backgroundColor: 'var(--mantine-color-slate-0)', borderBottom: '1px solid var(--mantine-color-slate-2)' }}>
            <Text size="sm" fw={600} c="slate.7" tt="uppercase" style={{ letterSpacing: '0.05em' }}>Settings</Text>
          </Card.Section>
          
          <Button
            variant="subtle"
            fullWidth
            justify="space-between"
            leftSection={
              <ThemeIcon size="lg" radius="xl" color="gray" variant="light">
                <IconSettings size={20} color="var(--mantine-color-slate-6)" />
              </ThemeIcon>
            }
            rightSection={<IconChevronRight size={20} color="var(--mantine-color-slate-4)" />}
            onClick={() => setCurrentSection('settings')}
            style={{ height: 'auto', padding: '16px' }}
          >
            <Text fw={500} c="slate.9">App Settings</Text>
          </Button>

          <Divider />

          <Button
            variant="subtle"
            fullWidth
            justify="space-between"
            leftSection={
              <ThemeIcon size="lg" radius="xl" color="green" variant="light">
                <IconShield size={20} color="var(--mantine-color-green-6)" />
              </ThemeIcon>
            }
            rightSection={<IconChevronRight size={20} color="var(--mantine-color-slate-4)" />}
            onClick={() => setCurrentSection('safety')}
            style={{ height: 'auto', padding: '16px' }}
          >
            <Text fw={500} c="slate.9">Safety & Security</Text>
          </Button>
        </Card>

        {/* Support */}
        <Card shadow="sm" radius="lg" withBorder>
          <Card.Section p="sm" style={{ backgroundColor: 'var(--mantine-color-slate-0)', borderBottom: '1px solid var(--mantine-color-slate-2)' }}>
            <Text size="sm" fw={600} c="slate.7" tt="uppercase" style={{ letterSpacing: '0.05em' }}>Support</Text>
          </Card.Section>
          
          <Anchor
            href="tel:+18883728368"
            component="a"
            variant="subtle"
            style={{ height: 'auto', padding: '16px', textDecoration: 'none', display: 'block' }}
          >
            <Group>
              <ThemeIcon size="lg" radius="xl" color="blue" variant="light">
                <IconPhone size={20} color="var(--mantine-color-blue-6)" />
              </ThemeIcon>
              <Text fw={500} c="slate.9" style={{ flex: 1 }}>Call Support</Text>
              <IconChevronRight size={20} color="var(--mantine-color-slate-4)" />
            </Group>
          </Anchor>

          <Divider />

          <Anchor
            href="mailto:support@crave-n.shop"
            component="a"
            variant="subtle"
            style={{ height: 'auto', padding: '16px', textDecoration: 'none', display: 'block' }}
          >
            <Group>
              <ThemeIcon size="lg" radius="xl" color="purple" variant="light">
                <IconMail size={20} color="var(--mantine-color-purple-6)" />
              </ThemeIcon>
              <Text fw={500} c="slate.9" style={{ flex: 1 }}>Email Support</Text>
              <IconChevronRight size={20} color="var(--mantine-color-slate-4)" />
            </Group>
          </Anchor>
        </Card>

        {/* Sign Out */}
        <Button
          fullWidth
          variant="light"
          color="red"
          leftSection={<IconLogout size={20} />}
          onClick={handleSignOut}
          size="lg"
          radius="lg"
        >
          Sign Out
        </Button>

        {/* App Version */}
        <Box style={{ textAlign: 'center' }} py="xl">
          <Text size="xs" c="slate.5">Feeder v2.0.0</Text>
        </Box>
      </Stack>

      <InstantCashoutModal
        isOpen={showCashoutModal}
        onClose={() => setShowCashoutModal(false)}
        availableAmount={availableCashout}
        onSuccess={fetchProfile}
      />
    </Box>
  );
};
