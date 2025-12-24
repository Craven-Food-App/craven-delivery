import React from 'react';
import { AppShell, Burger, Group, Text, Badge, Avatar, Menu, UnstyledButton, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBuilding, IconChevronDown, IconLogout, IconUser, IconHome } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import CompanySidebar from './CompanySidebar';

interface CompanyShellProps {
  children: React.ReactNode;
}

export const CompanyShell: React.FC<CompanyShellProps> = ({ children }) => {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = React.useState<string>('');
  
  // Track user activity
  useActivityTracking('company');

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
      }
    };
    getUser();
  }, []);

  const handleBackToHub = () => {
    navigate('/hub');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/hub');
  };

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        main: {
          backgroundColor: '#ffffff',
          minHeight: '100vh',
        },
      }}
    >
      <AppShell.Header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="orange" />
            <IconBuilding size={28} stroke={2} style={{ color: '#ff6a00' }} />
            <div>
              <Text fw={700} size="lg" c="dark">
                Crave'n Company Portal
              </Text>
              <Badge size="xs" color="orange" variant="light">
                High-Level Access
              </Badge>
            </div>
          </Group>
          <Group gap="xs">
            <Button
              leftSection={<IconHome size={16} />}
              variant="light"
              color="orange"
              onClick={handleBackToHub}
              visibleFrom="sm"
            >
              Back to Hub
            </Button>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar size="sm" color="orange" radius="xl">
                      {userEmail.charAt(0).toUpperCase()}
                    </Avatar>
                    <Text size="sm" c="dimmed" visibleFrom="sm">
                      {userEmail.split('@')[0]}
                    </Text>
                    <IconChevronDown size={16} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconHome size={14} />} onClick={handleBackToHub} hiddenFrom="sm">
                  Back to Hub
                </Menu.Item>
                <Menu.Item leftSection={<IconUser size={14} />}>
                  Profile
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconLogout size={14} />}
                  onClick={handleSignOut}
                  color="red"
                >
                  Sign Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="md"
        style={{
          backgroundColor: '#f9fafb',
          borderRight: '1px solid #e5e7eb',
        }}
      >
        <CompanySidebar />
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          backgroundColor: '#ffffff',
        }}
      >
        {children}
      </AppShell.Main>
    </AppShell>
  );
};

