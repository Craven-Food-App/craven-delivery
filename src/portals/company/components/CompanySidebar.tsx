import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NavLink as MantineNavLink, Stack, Group, Text, Divider, Badge } from '@mantine/core';
import {
  IconDashboard,
  IconShield,
  IconUsers,
  IconFileText,
  IconBuilding,
  IconUserCheck,
  IconUsersGroup,
  IconWorld,
} from '@tabler/icons-react';
import { fetchUserRoles, canManageGovernance, canVoteOnResolutions } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { usePermission } from '@/hooks/usePermission';

const CompanySidebar: React.FC = () => {
  const location = useLocation();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  
  // Permission checks for specific tabs
  const hasExecutivesAccess = usePermission('company.executives.view');
  const hasLeadershipAccess = usePermission('company.leadership.view');

  useEffect(() => {
    let mounted = true;
    const loadRoles = async () => {
      try {
        // Check if user is tstroman.ceo@cravenusa.com first (CEO executive account)
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email === 'tstroman.ceo@cravenusa.com' && mounted) {
          setUserRoles([
            'CRAVEN_FOUNDER',
            'CRAVEN_CORPORATE_SECRETARY',
            'CRAVEN_BOARD_MEMBER',
            'CRAVEN_EXECUTIVE',
            'CRAVEN_CEO',
            'CRAVEN_CFO',
            'CRAVEN_CTO',
            'CRAVEN_COO',
            'CRAVEN_CXO',
          ]);
          return;
        }

        const roles = await fetchUserRoles();
        if (mounted) {
          setUserRoles(roles);
        }
      } catch (error) {
        console.error('Error loading roles:', error);
        if (mounted) {
          setUserRoles([]);
        }
      }
    };
    loadRoles();
    return () => {
      mounted = false;
    };
  }, []);

  const canManage = canManageGovernance(userRoles);
  const canVote = canVoteOnResolutions(userRoles);

  const navItems = [
    {
      label: 'Dashboard',
      icon: IconDashboard,
      path: '/company',
      roles: ['all'],
    },
    {
      label: 'Governance Admin',
      icon: IconShield,
      path: '/company/governance-admin',
      roles: ['CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY'],
      children: [
        { label: 'Appointments', path: '/company/governance-admin/appointments' },
        { label: 'Resolutions', path: '/company/governance-admin/resolutions' },
        { label: 'Officers', path: '/company/governance-admin/officers' },
        { label: 'Logs', path: '/company/governance-admin/logs' },
      ],
    },
    {
      label: 'Board',
      icon: IconUsers,
      path: '/company/board',
      roles: ['CRAVEN_BOARD_MEMBER', 'CRAVEN_FOUNDER'],
    },
    {
      label: 'Executives',
      icon: IconUserCheck,
      path: '/company/executives',
      roles: ['CRAVEN_EXECUTIVE'],
      permission: 'company.executives.view', // CFOs get this automatically
      children: [
        { label: 'My Appointment', path: '/company/executives/my-appointment' },
        { label: 'Directory', path: '/company/executives/directory' },
      ],
    },
    {
      label: 'Leadership',
      icon: IconWorld,
      path: '/company/leadership-public',
      roles: ['all'],
      permission: 'company.leadership.view', // CFOs get this automatically
    },
    {
      label: 'Template Manager',
      icon: IconFileText,
      path: '/company/leadership/templates',
      roles: ['CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY', 'CRAVEN_CEO'],
    },
  ];

  const isActive = (path: string) => {
    if (path === '/company') {
      return location.pathname === '/company';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Stack gap="xs">
      {navItems.map((item) => {
        // Check if user has access via roles OR permissions
        let hasAccess =
          item.roles.includes('all') ||
          item.roles.some((role) => userRoles.includes(role)) ||
          (item.label === 'Governance Admin' && canManage) ||
          (item.label === 'Board' && canVote);
        
        // Check permission-based access for specific tabs
        if (!hasAccess && item.permission) {
          if (item.label === 'Executives') {
            hasAccess = hasExecutivesAccess;
          } else if (item.label === 'Leadership') {
            hasAccess = hasLeadershipAccess;
          }
        }

        if (!hasAccess) return null;

        const Icon = item.icon;

        return (
          <div key={item.path}>
            <MantineNavLink
              component={NavLink}
              to={item.path}
              label={item.label}
              leftSection={<Icon size={20} />}
              active={isActive(item.path)}
              style={{
                borderRadius: '8px',
                color: isActive(item.path) ? '#ff6a00' : '#374151',
                backgroundColor: isActive(item.path) ? 'rgba(255, 106, 0, 0.1)' : 'transparent',
                fontWeight: isActive(item.path) ? 600 : 400,
              }}
            />
            {item.children && isActive(item.path) && (
              <Stack gap={4} mt={8} pl={32}>
                {item.children.map((child) => (
                  <MantineNavLink
                    key={child.path}
                    component={NavLink}
                    to={child.path}
                    label={child.label}
                    active={location.pathname === child.path}
                    style={{
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: location.pathname === child.path ? '#ff6a00' : '#6b7280',
                      backgroundColor: location.pathname === child.path ? 'rgba(255, 106, 0, 0.1)' : 'transparent',
                      fontWeight: location.pathname === child.path ? 600 : 400,
                    }}
                  />
                ))}
              </Stack>
            )}
          </div>
        );
      })}
    </Stack>
  );
};

export default CompanySidebar;

