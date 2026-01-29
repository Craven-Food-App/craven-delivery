import React from 'react';
import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { supabase } from '@/integrations/supabase/client';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import CompanySidebar from './CompanySidebar';
import { CompanyHeader } from './CompanyHeader';

interface CompanyShellProps {
  children: React.ReactNode;
}

export const CompanyShell: React.FC<CompanyShellProps> = ({ children }) => {
  const [opened, { toggle }] = useDisclosure();
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

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        main: {
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
        },
      }}
    >
      <AppShell.Header>
        <CompanyHeader
          opened={opened}
          onToggle={toggle}
          portalName="Company Portal"
          userEmail={userEmail}
        />
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

