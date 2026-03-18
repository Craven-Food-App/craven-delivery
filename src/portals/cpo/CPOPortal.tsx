import React, { useState, useEffect } from 'react';
import {
  AppShell,
  Title,
  Text,
  Tabs,
  Group,
  Avatar,
  Loader,
  Center,
  Stack,
  Button,
  Badge,
} from '@mantine/core';
import {
  IconHeartHandshake,
  IconLayoutDashboard,
  IconLine,
  IconFileText,
  IconChartBar,
  IconUsers,
  IconArrowLeft,
  IconTimeline,
  IconChecklist,
  IconCalendar,
  IconTargetArrow,
  IconBuildingStore,
  IconMessage,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { hasFullAccess } from '@/utils/torranceAccess';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import CPODashboard from './tabs/CPODashboard';
import PartnerPipeline from './tabs/PartnerPipeline';
import ContractManagement from './tabs/ContractManagement';
import PartnershipAnalytics from './tabs/PartnershipAnalytics';
import PartnerDirectory from './tabs/PartnerDirectory';
import ActivityLog from './tabs/ActivityLog';
import PartnerOnboarding from './tabs/PartnerOnboarding';
import RenewalCalendar from './tabs/RenewalCalendar';
import PartnerScorecards from './tabs/PartnerScorecards';
import MerchantMetrics from './tabs/MerchantMetrics';

const CPOPortal: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('dashboard');
  const [userEmail, setUserEmail] = useState('');

  useActivityTracking('cpo');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth?hq=true&redirect=/cpo');
        return;
      }
      setUserEmail(user.email || '');

      if (hasFullAccess(user.email)) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      const { data: execUser } = await supabase
        .from('exec_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const execRole = execUser?.role?.toLowerCase() || '';
      const hasAdminRole = roles?.some(r => r.role === 'admin');
      const hasCPORole = execRole === 'cpo' || execRole === 'ceo';

      if (hasCPORole || hasAdminRole) {
        setAuthorized(true);
      }
    } catch (err) {
      console.error('CPO auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" color="orange" />
      </Center>
    );
  }

  if (!authorized) {
    return (
      <Center style={{ minHeight: '100vh', padding: '2rem' }}>
        <Stack align="center" gap="md" style={{ maxWidth: 500 }}>
          <IconHeartHandshake size={48} color="#e74c3c" />
          <Title order={2}>Access Denied</Title>
          <Text c="dimmed" ta="center">
            You don't have access to the CPO Partnership Portal. This portal is restricted to the Chief Partnership Officer and Administrators.
          </Text>
          <Button onClick={() => navigate('/hub')} color="orange">Return to Hub</Button>
        </Stack>
      </Center>
    );
  }

  return (
    <AppShell
      header={{ height: 64 }}
      padding="md"
      styles={{
        main: { backgroundColor: '#f8f9fa', minHeight: '100vh' },
      }}
    >
      <AppShell.Header
        style={{
          backgroundColor: '#fff',
          borderBottom: '2px solid #ff6a00',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 16,
        }}
      >
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={18} />}
          onClick={() => navigate('/hub')}
          size="sm"
        >
          Hub
        </Button>
        <Group gap={12}>
          <Avatar color="orange" radius="xl" size={36}>
            <IconHeartHandshake size={20} />
          </Avatar>
          <div>
            <Title order={4} style={{ lineHeight: 1.2 }}>CPO Partnership Portal</Title>
            <Text size="xs" c="dimmed">{userEmail}</Text>
          </div>
        </Group>
        <Badge color="orange" variant="light" ml="auto" size="lg">
          Chief Partnership Officer
        </Badge>
      </AppShell.Header>

      <AppShell.Main>
        <Tabs value={activeTab} onChange={setActiveTab} color="orange" style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Tabs.List mb="lg" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
            <Tabs.Tab value="dashboard" leftSection={<IconLayoutDashboard size={16} />}>
              Dashboard
            </Tabs.Tab>
            <Tabs.Tab value="pipeline" leftSection={<IconLine size={16} />}>
              Pipeline
            </Tabs.Tab>
            <Tabs.Tab value="contracts" leftSection={<IconFileText size={16} />}>
              Contracts
            </Tabs.Tab>
            <Tabs.Tab value="activity" leftSection={<IconTimeline size={16} />}>
              Activity Log
            </Tabs.Tab>
            <Tabs.Tab value="onboarding" leftSection={<IconChecklist size={16} />}>
              Onboarding
            </Tabs.Tab>
            <Tabs.Tab value="calendar" leftSection={<IconCalendar size={16} />}>
              Calendar
            </Tabs.Tab>
            <Tabs.Tab value="scorecards" leftSection={<IconTargetArrow size={16} />}>
              Scorecards
            </Tabs.Tab>
            <Tabs.Tab value="analytics" leftSection={<IconChartBar size={16} />}>
              Analytics
            </Tabs.Tab>
            <Tabs.Tab value="merchants" leftSection={<IconBuildingStore size={16} />}>
              Merchants
            </Tabs.Tab>
            <Tabs.Tab value="directory" leftSection={<IconUsers size={16} />}>
              Directory
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dashboard"><CPODashboard /></Tabs.Panel>
          <Tabs.Panel value="pipeline"><PartnerPipeline /></Tabs.Panel>
          <Tabs.Panel value="contracts"><ContractManagement /></Tabs.Panel>
          <Tabs.Panel value="activity"><ActivityLog /></Tabs.Panel>
          <Tabs.Panel value="onboarding"><PartnerOnboarding /></Tabs.Panel>
          <Tabs.Panel value="calendar"><RenewalCalendar /></Tabs.Panel>
          <Tabs.Panel value="scorecards"><PartnerScorecards /></Tabs.Panel>
          <Tabs.Panel value="analytics"><PartnershipAnalytics /></Tabs.Panel>
          <Tabs.Panel value="merchants"><MerchantMetrics /></Tabs.Panel>
          <Tabs.Panel value="directory"><PartnerDirectory /></Tabs.Panel>
        </Tabs>
      </AppShell.Main>
    </AppShell>
  );
};

export default CPOPortal;
