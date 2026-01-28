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
      <AppShell.Header
        style={{
          backgroundColor: '#ffffff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e5e7eb',
          height: 60,
          minHeight: 60,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            flex: '1 1 auto',
          }}
        >
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="sm"
            size="sm"
            style={{ marginRight: 12 }}
          />
          <div
            style={{
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: '#FF6B35',
              marginRight: 16,
              whiteSpace: 'nowrap',
            }}
          >
            Crave'n
          </div>
          <div
            style={{
              borderLeft: '1px solid #e5e7eb',
              height: 24,
              marginRight: 16,
            }}
          />
          <div
            style={{
              fontSize: 14,
              color: '#6b7280',
              marginRight: 16,
              whiteSpace: 'nowrap',
            }}
          >
            Company Portal
          </div>
          <div
            style={{
              borderLeft: '1px solid #e5e7eb',
              height: 24,
              marginRight: 16,
            }}
          />
          <div
            style={{
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#1f2937',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              {userEmail.split('@')[0] || 'Corporate User'}
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#6b7280',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              Corporate HQ
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginLeft: 16,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#FF6B35',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {userEmail.charAt(0).toUpperCase() || 'C'}
          </div>
          <Button
            onClick={handleSignOut}
            style={{
              borderColor: '#d1d5db',
              color: '#374151',
              height: 32,
              fontSize: 12,
              padding: '0 14px',
              borderRadius: 4,
              background: '#ffffff',
            }}
          >
            Sign Out
          </Button>
        </div>
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

