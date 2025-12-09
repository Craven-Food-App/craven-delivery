import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  Text,
  Group,
  Button,
  Stack,
  Badge,
  Divider,
  ScrollArea,
  Menu,
  Avatar,
  UnstyledButton,
  Tooltip,
  ActionIcon,
  Burger,
  useMantineTheme,
} from '@mantine/core';
import {
  IconDashboard,
  IconSettings,
  IconLogout,
  IconChevronRight,
  IconUserCircle,
  IconCurrencyDollar,
  IconChartBar,
  IconUsers,
  IconTrendingUp,
  IconBook,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { DriverCompensationDashboard } from '@/components/finance/driver-compensation/DriverCompensationDashboard';
import { DriverCompensationConfig } from '@/components/finance/driver-compensation/DriverCompensationConfig';
import { PeakRulesManager } from '@/components/finance/driver-compensation/PeakRulesManager';
import { BonusesOverview } from '@/components/finance/driver-compensation/BonusesOverview';
import { ProfitabilityDashboard } from '@/components/finance/driver-compensation/ProfitabilityDashboard';
import { DriverCompensationDocumentation } from '@/components/finance/driver-compensation/DriverCompensationDocumentation';
import { hasFullAccess } from '@/utils/torranceAccess';
import { useState, useEffect } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const DriverCompensationLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [opened, setOpened] = useState(false);
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);
  };

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <IconDashboard size={20} />,
      path: '/driver-compensation-portal/dashboard',
    },
    {
      id: 'config',
      label: 'Pay Configuration',
      icon: <IconSettings size={20} />,
      path: '/driver-compensation-portal/config',
    },
    {
      id: 'peak-rules',
      label: 'Peak Rules',
      icon: <IconTrendingUp size={20} />,
      path: '/driver-compensation-portal/peak-rules',
    },
    {
      id: 'bonuses',
      label: 'Bonuses',
      icon: <IconUsers size={20} />,
      path: '/driver-compensation-portal/bonuses',
    },
    {
      id: 'profitability',
      label: 'Profitability',
      icon: <IconChartBar size={20} />,
      path: '/driver-compensation-portal/profitability',
    },
    {
      id: 'documentation',
      label: 'Documentation',
      icon: <IconBook size={20} />,
      path: '/driver-compensation-portal/documentation',
    },
  ];

  const currentPath = location.pathname;
  const activeItem = navItems.find(item => currentPath.includes(item.id)) || navItems[0];

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpened(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/hub');
  };

  const torranceHasAccess = user?.email && hasFullAccess(user.email);

  return (
    <AppShell
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      header={{ height: 60 }}
    >
      <AppShell.Header p="md" style={{ borderBottom: `1px solid ${theme.colors.gray[2]}` }}>
        <Group justify="space-between" h="100%">
          <Group>
            <Burger
              opened={opened}
              onClick={() => setOpened(o => !o)}
              size="sm"
              hiddenFrom="sm"
            />
            <IconCurrencyDollar size={32} color={theme.colors.blue[6]} />
            <div>
              <Text fw={600} size="lg">
                Driver Compensation Portal
              </Text>
              {torranceHasAccess && (
                <Badge variant="light" color="green" size="sm">
                  Universal Access
                </Badge>
              )}
            </div>
          </Group>
          <Group>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => navigate('/hub')}
            >
              Back to Hub
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section>
          <Group mb="xl">
            <IconCurrencyDollar size={32} color={theme.colors.blue[6]} />
            <div>
              <Text fw={700} size="lg">Driver Compensation</Text>
              <Badge size="sm" color="blue" variant="light">
                Finance
              </Badge>
            </div>
          </Group>
          <Divider mb="md" />
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea}>
          <Stack gap="xs">
            {navItems.map(item => {
              const isActive = currentPath.includes(item.id);
              return (
                <Tooltip
                  key={item.id}
                  label={item.label}
                  position="right"
                  disabled={opened}
                >
                  <UnstyledButton
                    onClick={() => handleNavigation(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: isActive ? theme.colors.blue[0] : 'transparent',
                      color: isActive ? theme.colors.blue[7] : theme.colors.gray[7],
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = theme.colors.gray[0];
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {item.icon}
                    <Text ml="sm" size="sm" style={{ flex: 1 }}>
                      {item.label}
                    </Text>
                  </UnstyledButton>
                </Tooltip>
              );
            })}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <Divider mb="md" />
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <UnstyledButton
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                }}
              >
                <Avatar size="sm" radius="xl" color="blue">
                  <IconUserCircle size={20} />
                </Avatar>
                <Text ml="sm" size="sm" style={{ flex: 1 }}>
                  {user?.email || 'User'}
                </Text>
                <IconChevronRight size={16} />
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconSettings size={16} />}>
                Settings
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconLogout size={16} />}
                color="red"
                onClick={handleLogout}
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
};

const DriverCompensationPortal: React.FC = () => {
  return (
    <DriverCompensationLayout>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DriverCompensationDashboard />} />
        <Route path="config" element={<DriverCompensationConfig />} />
        <Route path="peak-rules" element={<PeakRulesManager />} />
        <Route path="bonuses" element={<BonusesOverview />} />
        <Route path="profitability" element={<ProfitabilityDashboard />} />
        <Route path="documentation" element={<DriverCompensationDocumentation />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DriverCompensationLayout>
  );
};

export default DriverCompensationPortal;
