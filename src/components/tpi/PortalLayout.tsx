import React, { useState, useEffect } from 'react';
import { AppShell, Box } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';
import { Breadcrumbs } from './Breadcrumbs';
import { SidebarItem, User, QuickAction, Notification, BreadcrumbItem } from './types';

interface PortalLayoutProps {
  portalName: string;
  sidebarItems: SidebarItem[];
  user: User;
  children: React.ReactNode;
  maxContentWidth?: number; // default: 1400
  showBreadcrumbs?: boolean; // default: true
  breadcrumbs?: BreadcrumbItem[];
  onSearch?: (query: string) => void;
  quickActions?: QuickAction[];
  notifications?: Notification[];
  onUserMenuClick?: (action: string) => void;
  onSignOut?: () => void;
}

export function PortalLayout({
  portalName,
  sidebarItems,
  user,
  children,
  maxContentWidth = 1400,
  showBreadcrumbs = true,
  breadcrumbs,
  onSearch,
  quickActions,
  notifications,
  onUserMenuClick,
  onSignOut,
}: PortalLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleUserMenuClick = (action: string) => {
    if (action === 'signout' && onSignOut) {
      onSignOut();
    } else if (onUserMenuClick) {
      onUserMenuClick(action);
    }
  };

  // Auto-generate breadcrumbs from path if not provided
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    if (breadcrumbs) return breadcrumbs;
    
    const pathParts = location.pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [
      { label: 'Dashboard', path: `/${pathParts[0]}` }
    ];

    let currentPath = '';
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      if (index < pathParts.length - 1) {
        items.push({
          label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
          path: currentPath,
        });
      } else {
        items.push({
          label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
        });
      }
    });

    return items;
  };

  return (
    <AppShell
      navbar={{
        width: sidebarCollapsed ? 64 : 240,
        breakpoint: 'sm',
        collapsed: { mobile: true, desktop: false },
      }}
      styles={{
        main: {
          padding: 0,
          backgroundColor: '#f9fafb',
          minHeight: '100vh',
        },
      }}
    >
      <AppShell.Navbar
        p={0}
        style={{
          backgroundColor: 'white',
          borderRight: '1px solid #e5e7eb',
        }}
      >
        <SideNav
          items={sidebarItems}
          activePath={location.pathname}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <TopBar
          portalName={portalName}
          onSearch={onSearch}
          quickActions={quickActions}
          notifications={notifications}
          user={user}
          onUserMenuClick={handleUserMenuClick}
        />

        <Box
          style={{
            maxWidth: maxContentWidth,
            margin: '0 auto',
            padding: '24px',
            width: '100%',
          }}
        >
          {showBreadcrumbs && (
            <Breadcrumbs items={getBreadcrumbs()} />
          )}

          <Box style={{ marginTop: showBreadcrumbs ? '24px' : '0' }}>
            {children}
          </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}









































