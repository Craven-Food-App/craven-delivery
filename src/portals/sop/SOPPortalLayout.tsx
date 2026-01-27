import React from 'react';
import { AppShell, Burger, Group, Text, Badge, Avatar, Menu, UnstyledButton, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBook, IconHome, IconLogout, IconUser } from '@tabler/icons-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const SOPPortalLayout: React.FC = () => {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = React.useState<string>('');

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || '');
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
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="green" />
            <IconBook size={28} stroke={2} style={{ color: '#10b981' }} />
            <div>
              <Text fw={700} size="lg" c="dark">
                SOP Portal
              </Text>
              <Badge size="xs" color="green" variant="light">
                Standard Operating Procedures
              </Badge>
            </div>
          </Group>
          <Group gap="xs">
            <Button
              leftSection={<IconHome size={16} />}
              variant="light"
              color="green"
              onClick={handleBackToHub}
              visibleFrom="sm"
            >
              Back to Hub
            </Button>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar size="sm" color="green" radius="xl">
                      {userEmail.charAt(0).toUpperCase()}
                    </Avatar>
                    <Text size="sm" c="dimmed" visibleFrom="sm">
                      {userEmail.split('@')[0]}
                    </Text>
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
        <Text size="sm" c="dimmed" mb="md">
          SOP Navigation
        </Text>
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          backgroundColor: '#ffffff',
        }}
      >
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};

