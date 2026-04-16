import React, { useState, useEffect } from 'react';
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
  Burger,
  useMantineTheme,
  Box,
} from '@mantine/core';
import {
  IconDashboard,
  IconBuildingBank,
  IconCurrencyDollar,
  IconFileText,
  IconChartBar,
  IconUsers,
  IconSettings,
  IconLogout,
  IconChevronRight,
  IconBuilding,
  IconShield,
  IconChecklist,
  IconReport,
  IconWallet,
  IconTrendingUp,
  IconUserCircle,
  IconArrowLeft,
  IconMail,
  IconBook,
  IconRocket,
  IconScale,
  IconAlertTriangle,
  IconBriefcase,
  IconPresentationAnalytics,
  IconCalendarStats,
  IconCalculator,
  IconClipboardList,
  IconMessageCircle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { hasFullAccess, hasCFOPortalAccess } from '@/utils/torranceAccess';

export interface CFONavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  dividerBefore?: boolean;
  dividerAfter?: boolean;
  group?: string;
}

interface CFOPortalLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  navItems: CFONavItem[];
  transactionCount?: number;
  payoutCount?: number;
}

// Icon mapping for nav items - Enterprise Fortune 500 Grade
const getIconForSection = (id: string): React.ReactNode => {
  const iconMap: Record<string, React.ReactNode> = {
    // Executive Functions
    'evaluation': <IconShield size={20} />,
    'onboarding': <IconScale size={20} />,
    'overview': <IconDashboard size={20} />,
    // Core Accounting
    'general-ledger': <IconFileText size={20} />,
    'ap': <IconCurrencyDollar size={20} />,
    'ar': <IconTrendingUp size={20} />,
    'invoices-expenses': <IconFileText size={20} />,
    'vendors': <IconUsers size={20} />,
    // Banking & Treasury (consolidated)
    'treasury': <IconWallet size={20} />,
    // Team & Payroll (consolidated)
    'team': <IconUsers size={20} />,
    // Planning & Analysis (consolidated)
    'fpa': <IconRocket size={20} />,
    // Tax & Compliance (consolidated)
    'tax-compliance': <IconCalculator size={20} />,
    // Audit & Risk (consolidated)
    'audit-risk': <IconClipboardList size={20} />,
    // Stakeholder Reporting (consolidated)
    'reporting': <IconReport size={20} />,
    // Period Close
    'close': <IconChecklist size={20} />,
    // Communications (consolidated)
    'c-comms': <IconMessageCircle size={20} />,
  };
  return iconMap[id] || <IconDashboard size={20} />;
};

// Group definitions — consolidated 15-section architecture
const navGroups = [
  { id: 'executive', label: 'Executive Function', items: ['evaluation', 'onboarding', 'overview'] },
  { id: 'accounting', label: 'Core Accounting', items: ['general-ledger', 'ap', 'ar', 'invoices-expenses', 'vendors'] },
  { id: 'banking', label: 'Banking & Treasury', items: ['treasury'] },
  { id: 'planning', label: 'Planning & Analysis', items: ['fpa'] },
  { id: 'compliance', label: 'Compliance & Controls', items: ['tax-compliance', 'audit-risk'] },
  { id: 'reporting', label: 'Stakeholder Reporting', items: ['reporting'] },
  { id: 'close', label: 'Period Close', items: ['close'] },
  { id: 'operations', label: 'Operations', items: ['team', 'c-comms'] },
];

export const CFOPortalLayout: React.FC<CFOPortalLayoutProps> = ({
  children,
  activeSection,
  onNavigate,
  navItems,
}) => {
  const [opened, setOpened] = useState(false);
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
    };
    getUser();
  }, []);

  const torranceHasAccess = user?.email && hasCFOPortalAccess(user.email);

  const handleNavigation = (itemId: string) => {
    onNavigate(itemId);
    setOpened(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth?hq=true');
  };

  // Organize nav items by group
  const getGroupedItems = () => {
    const grouped: { group: string; label: string; items: CFONavItem[] }[] = [];
    
    navGroups.forEach(group => {
      const groupItems = navItems.filter(item => group.items.includes(item.id));
      if (groupItems.length > 0) {
        grouped.push({
          group: group.id,
          label: group.label,
          items: groupItems,
        });
      }
    });

    // Add any ungrouped items
    const groupedIds = navGroups.flatMap(g => g.items);
    const ungrouped = navItems.filter(item => !groupedIds.includes(item.id));
    if (ungrouped.length > 0) {
      grouped.push({
        group: 'other',
        label: 'Other',
        items: ungrouped,
      });
    }

    return grouped;
  };

  const groupedItems = getGroupedItems();

  return (
    <AppShell
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      header={{ height: 60 }}
      styles={{
        main: {
          background: '#f8fafc',
          minHeight: '100vh',
        },
      }}
    >
      <AppShell.Header
        p="md"
        style={{
          borderBottom: `1px solid ${theme.colors.gray[2]}`,
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
        }}
      >
        <Group justify="space-between" h="100%">
          <Group>
            <Burger
              opened={opened}
              onClick={() => setOpened(o => !o)}
              size="sm"
              hiddenFrom="sm"
              color="white"
            />
            <Button
              variant="subtle"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/main-hub')}
              mr="md"
              color="white"
              styles={{ root: { color: 'white', '&:hover': { background: 'rgba(255,255,255,0.1)' } } }}
            >
              Back to Hub
            </Button>
            <Text fw={700} size="lg" c="white">
              CFO Portal
            </Text>
            {torranceHasAccess && (
              <Badge variant="light" color="green">
                Universal Access
              </Badge>
            )}
          </Group>
          <Group>
            <Badge color="blue" variant="light">
              Chief Financial Officer
            </Badge>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="md"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          borderRight: `1px solid ${theme.colors.gray[2]}`,
        }}
      >
        <AppShell.Section>
          <Group mb="lg">
            <Box
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              }}
            >
              <IconBuildingBank size={24} color="white" />
            </Box>
            <div>
              <Text fw={700} size="md">CFO Command Center</Text>
              <Text size="xs" c="dimmed">Financial Operations</Text>
            </div>
          </Group>
          <Divider mb="md" />
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea} scrollbarSize={6}>
          <Stack gap={4}>
            {groupedItems.map((group, groupIndex) => (
              <div key={group.group}>
                {groupIndex > 0 && <Divider my="sm" />}
                <Text size="xs" fw={600} c="dimmed" mb="xs" tt="uppercase" pl={12}>
                  {group.label}
                </Text>
                {group.items.map(item => {
                  const isActive = activeSection === item.id;
                  return (
                    <Tooltip
                      key={item.id}
                      label={item.label}
                      position="right"
                      disabled={opened}
                    >
                      <UnstyledButton
                        onClick={() => handleNavigation(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: isActive
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%)'
                            : 'transparent',
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%)'
                            : 'transparent',
                          color: isActive ? theme.colors.blue[7] : theme.colors.gray[7],
                          fontWeight: isActive ? 600 : 400,
                          transition: 'all 0.2s ease',
                          border: isActive ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
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
                        <Box
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isActive
                              ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                              : theme.colors.gray[1],
                            color: isActive ? 'white' : theme.colors.gray[6],
                            marginRight: 12,
                          }}
                        >
                          {getIconForSection(item.id)}
                        </Box>
                        <Text size="sm" style={{ flex: 1 }}>
                          {item.label}
                        </Text>
                        {item.badge && (
                          <Badge size="sm" variant="filled" color="orange">
                            {item.badge}
                          </Badge>
                        )}
                      </UnstyledButton>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
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
                  background: theme.colors.gray[0],
                }}
              >
                <Avatar size="sm" radius="xl" color="blue">
                  <IconUserCircle size={20} />
                </Avatar>
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <Text size="sm" fw={500}>
                    {user?.email?.split('@')[0] || 'CFO User'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Chief Financial Officer
                  </Text>
                </div>
                <IconChevronRight size={16} color={theme.colors.gray[5]} />
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
        <Box p="md">
          {children}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
};

export default CFOPortalLayout;

