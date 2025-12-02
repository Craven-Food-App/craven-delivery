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
  ActionIcon,
  Burger,
  useMantineTheme,
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
} from '@tabler/icons-react';
import { useFinanceRBAC } from '@/hooks/useFinanceRBAC';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
  roles?: string[];
  requiresPermission?: boolean;
}

interface EnterpriseFinancePortalLayoutProps {
  children: React.ReactNode;
}

export const EnterpriseFinancePortalLayout: React.FC<EnterpriseFinancePortalLayoutProps> = ({ children }) => {
  const [opened, setOpened] = useState(false);
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { userRoles, getPrimaryRole, hasPermission, hasRole, isCFO, hasFullAdmin, loading } = useFinanceRBAC();
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [entities, setEntities] = useState<any[]>([]);

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      const { data, error } = await supabase
        .from('finance_entities')
        .select('*')
        .eq('is_active', true)
        .order('entity_name');

      if (error) {
        // Table doesn't exist - that's okay, just continue without entities
        if (error.code === '42P01') {
          console.warn('Finance entities table not found - continuing without entity filter');
          return;
        }
        throw error;
      }
      setEntities(data || []);
      if (data && data.length > 0 && !selectedEntity) {
        setSelectedEntity(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching entities:', error);
      // Don't block rendering if entities can't be fetched
    }
  };

  const primaryRole = getPrimaryRole();

  // Define navigation items based on role
  const getNavItems = (): NavItem[] => {
    const allItems: NavItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <IconDashboard size={20} />,
      },
      {
        id: 'general-ledger',
        label: 'General Ledger',
        icon: <IconFileText size={20} />,
        permission: 'GL_VIEW_ALL',
        roles: ['CFO', 'CONTROLLER', 'SENIOR_ACCOUNTANT', 'STAFF_ACCOUNTANT'],
      },
      {
        id: 'accounts-payable',
        label: 'Accounts Payable',
        icon: <IconCurrencyDollar size={20} />,
        permission: 'AP_VIEW_ALL',
        roles: ['CFO', 'CONTROLLER', 'AP_SPECIALIST', 'SENIOR_ACCOUNTANT'],
      },
      {
        id: 'accounts-receivable',
        label: 'Accounts Receivable',
        icon: <IconTrendingUp size={20} />,
        permission: 'AR_VIEW_ALL',
        roles: ['CFO', 'CONTROLLER', 'AR_SPECIALIST', 'SENIOR_ACCOUNTANT'],
      },
      {
        id: 'banking-treasury',
        label: 'Banking & Treasury',
        icon: <IconBuildingBank size={20} />,
        permission: 'BANKING_VIEW',
        roles: ['CFO', 'CONTROLLER', 'TREASURY_MANAGER'],
      },
      {
        id: 'payroll',
        label: 'Payroll System',
        icon: <IconUsers size={20} />,
        permission: 'PAYROLL_VIEW',
        roles: ['CFO', 'CONTROLLER', 'PAYROLL_SPECIALIST'],
      },
      {
        id: 'budget-forecast',
        label: 'Budget & Forecast',
        icon: <IconChartBar size={20} />,
        permission: 'BUDGET_VIEW_ALL',
        roles: ['CFO', 'VP_FINANCE', 'FP&A_ANALYST', 'CONTROLLER'],
      },
      {
        id: 'reports',
        label: 'Financial Reports',
        icon: <IconReport size={20} />,
        requiresPermission: false, // Most roles can view reports
      },
      {
        id: 'approvals',
        label: 'Approval Queue',
        icon: <IconChecklist size={20} />,
        requiresPermission: false, // Based on role having approval authority
      },
      {
        id: 'fixed-assets',
        label: 'Fixed Assets',
        icon: <IconBuilding size={20} />,
        roles: ['CFO', 'CONTROLLER', 'SENIOR_ACCOUNTANT'],
      },
      {
        id: 'tax-management',
        label: 'Tax Management',
        icon: <IconShield size={20} />,
        roles: ['CFO', 'CONTROLLER', 'TAX_DIRECTOR'],
      },
      {
        id: 'audit',
        label: 'Audit & Compliance',
        icon: <IconShield size={20} />,
        roles: ['CFO', 'CONTROLLER', 'INTERNAL_AUDITOR'],
      },
    ];

    // Filter based on user's permissions and roles
    return allItems.filter(item => {
      // CFO sees everything
      if (isCFO || hasFullAdmin) return true;

      // Check role-based access
      if (item.roles) {
        const hasMatchingRole = item.roles.some(roleCode => hasRole(roleCode));
        if (!hasMatchingRole) return false;
      }

      // Check permission-based access
      if (item.permission && item.requiresPermission !== false) {
        return hasPermission(item.permission);
      }

      // Items without specific restrictions are visible to authenticated finance users
      return true;
    });
  };

  const navItems = getNavItems();
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  const handleNavigation = (itemId: string) => {
    navigate(`/finance/${itemId}`);
    setOpened(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Text>Loading Finance Portal...</Text>
      </div>
    );
  }

  if (!primaryRole) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Text c="red" fw={600}>No Finance Role Assigned</Text>
        <Text c="dimmed" mt="md">
          You do not have access to the Finance Portal. Please contact your administrator.
        </Text>
      </div>
    );
  }

  return (
    <AppShell
      navbarOffsetBreakpoint="sm"
      asideOffsetBreakpoint="sm"
      navbar={
        <AppShell.Navbar
          p="md"
          hidden={!opened}
          style={{ height: '100vh', position: 'fixed' }}
        >
          <AppShell.Section>
            <Group mb="xl">
              <IconBuildingBank size={32} color={theme.colors.blue[6]} />
              <div>
                <Text fw={700} size="lg">Finance Portal</Text>
                <Badge size="sm" color="blue" variant="light">
                  {primaryRole.role_name}
                </Badge>
              </div>
            </Group>

            {/* Entity Selection */}
            {entities.length > 1 && (
              <Menu shadow="md" width={250}>
                <Menu.Target>
                  <Button
                    variant="subtle"
                    fullWidth
                    leftSection={<IconBuilding size={16} />}
                    rightSection={<IconChevronRight size={16} />}
                    justify="space-between"
                    mb="md"
                  >
                    <Text truncate style={{ maxWidth: 150 }}>
                      {entities.find(e => e.id === selectedEntity)?.entity_name || 'Select Entity'}
                    </Text>
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {entities.map(entity => (
                    <Menu.Item
                      key={entity.id}
                      onClick={() => setSelectedEntity(entity.id)}
                      rightSection={selectedEntity === entity.id ? '✓' : null}
                    >
                      {entity.entity_name}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            )}

            <Divider mb="md" />
          </AppShell.Section>

          <AppShell.Section grow component={ScrollArea}>
            <Stack gap="xs">
              {navItems.map(item => {
                const isActive = currentPath === item.id;
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
                    User Profile
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
      }
      header={
        <AppShell.Header p="md" style={{ borderBottom: `1px solid ${theme.colors.gray[2]}` }}>
          <Group justify="space-between" h="100%">
            <Group>
              <Burger
                opened={opened}
                onClick={() => setOpened(o => !o)}
                size="sm"
                hiddenFrom="sm"
              />
              <Text fw={600} size="lg">
                Finance Department Portal
              </Text>
              {primaryRole && (
                <Badge variant="light" color="blue">
                  {primaryRole.role_name}
                </Badge>
              )}
            </Group>
            <Group>
              {isCFO && (
                <Badge color="green" variant="light">
                  Full Admin Access
                </Badge>
              )}
              <Button
                variant="subtle"
                size="xs"
                onClick={() => navigate('/finance/approvals')}
              >
                <IconChecklist size={16} style={{ marginRight: 8 }} />
                Approvals
              </Button>
            </Group>
          </Group>
        </AppShell.Header>
      }
    >
      {children}
    </AppShell>
  );
};


