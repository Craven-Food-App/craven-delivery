import React, { startTransition } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { NavLink as MantineNavLink, Stack, Group, Text, Divider, Badge, Tooltip, Box } from '@mantine/core';
import {
  IconDashboard,
  IconShield,
  IconUsers,
  IconFileText,
  IconBuilding,
  IconUserCheck,
  IconUsersGroup,
  IconWorld,
  IconBook,
  IconCheckbox,
  IconChevronRight,
  IconBuildingSkyscraper,
  IconChartPie,
} from '@tabler/icons-react';
import { fetchUserRoles, canManageGovernance, canVoteOnResolutions } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { usePermission } from '@/hooks/usePermission';

const JASON_EMAIL = 'jparcell2022@gmail.com';

const CompanySidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  
  // Permission checks for specific tabs
  const hasExecutivesAccess = usePermission('company.executives.view');
  const hasLeadershipAccess = usePermission('company.leadership.view');
  // SOP Documents should be accessible to all executives (roles: ['all'] handles this)
  // Permission check is optional fallback
  const hasSOPAccess = usePermission('company.sop.view') ?? true; // Default to true if permission doesn't exist

  useEffect(() => {
    let mounted = true;
    const loadRoles = async () => {
      try {
        // Check if user is tstroman.ceo@cravenusa.com first (CEO executive account)
        const { data: { user } } = await supabase.auth.getUser();
        if (mounted && user?.email) {
          setUserEmail(user.email.toLowerCase());
        }
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
      label: 'Cap Table',
      icon: IconChartPie,
      path: '/company/cap-table',
      roles: ['all'],
    },
    {
      label: 'Executives',
      icon: IconBuildingSkyscraper,
      path: '/company/executives',
      roles: ['CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY', 'CRAVEN_EXECUTIVE'],
    },
    {
      label: 'Governance',
      icon: IconShield,
      path: '/company/governance',
      roles: ['CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY'],
      children: [
        { label: 'Appointments', path: '/company/governance?tab=appointments' },
        { label: 'Officers', path: '/company/governance?tab=officers' },
        { label: 'Resolutions', path: '/company/governance?tab=resolutions' },
        { label: 'Certificates', path: '/company/governance?tab=certificates' },
        { label: 'Exit Workflows', path: '/company/governance?tab=exit-workflows' },
        { label: 'Logs', path: '/company/governance?tab=logs' },
      ],
    },
    {
      label: 'Board',
      icon: IconUsers,
      path: '/company/board',
      roles: ['CRAVEN_BOARD_MEMBER', 'CRAVEN_FOUNDER'],
    },
    {
      label: 'Team',
      icon: IconUserCheck,
      path: '/company/team',
      roles: ['all'],
    },
    {
      label: 'Leadership',
      icon: IconUsersGroup,
      path: '/company/leadership',
      roles: ['all'],
    },
    {
      label: 'SOP Documents',
      icon: IconBook,
      path: '/company/sop',
      roles: ['all'],
      permission: 'company.sop.view',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/company') {
      return location.pathname === '/company';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      style={{
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        padding: '12px',
      }}
    >
      <Stack gap={4}>
        {/* Compact Enterprise Header */}
        <Box mb="sm" pb="sm" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#9ca3af',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Sections
          </div>
        </Box>

        {navItems.map((item) => {
          // JASON PARCELL: Only show Team tab (read-only)
          const isJason = userEmail === JASON_EMAIL;
          if (isJason && item.label !== 'Team') {
            return null;
          }

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
            } else if (item.label === 'SOP Documents') {
              hasAccess = hasSOPAccess !== false;
            }
          }

          if (!hasAccess) {
            console.log(`[Sidebar] Hiding ${item.label} - hasAccess: ${hasAccess}, roles: ${item.roles}, permission: ${item.permission}`);
            return null;
          }
          
          console.log(`[Sidebar] Showing ${item.label} - path: ${item.path}`);

          const Icon = item.icon;
          const active = isActive(item.path);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <Box key={item.path}>
              <Tooltip label={item.label} position="right" withArrow disabled={active}>
                <MantineNavLink
                  label={
                    <Group justify="space-between" gap={8}>
                      <Text size="sm" fw={active ? 600 : 500}>
                        {item.label}
                      </Text>
                      {hasChildren && (
                        <IconChevronRight 
                          size={14} 
                          style={{ 
                            transform: active ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            opacity: 0.6
                          }} 
                        />
                      )}
                    </Group>
                  }
                  leftSection={<Icon size={16} stroke={active ? 2.5 : 2} />}
                  active={active}
                  onClick={(e) => {
                    e.preventDefault();
                    startTransition(() => {
                      navigate(item.path);
                    });
                  }}
                  style={{
                    borderRadius: '4px',
                    padding: '6px 8px',
                    fontSize: 13,
                    color: active ? '#ffffff' : '#374151',
                    backgroundColor: active 
                      ? 'linear-gradient(135deg, #ff6a00 0%, #ff8533 100%)' 
                      : 'transparent',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    border: active ? 'none' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                    boxShadow: active 
                      ? '0 2px 8px rgba(255, 106, 0, 0.25)' 
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                />
              </Tooltip>
              
              {hasChildren && active && (
                <Stack gap={2} mt={4} pl={28}>
                  {item.children.map((child) => {
                    const childPath = child.path.split('?')[0];
                    const childTab = child.path.split('tab=')[1];
                    const currentTab = new URLSearchParams(location.search).get('tab');
                    const isChildActive = location.pathname === childPath && currentTab === childTab;
                    
                    return (
                      <MantineNavLink
                        key={child.path}
                        label={
                          <Text size="xs" fw={isChildActive ? 600 : 500}>
                            {child.label}
                          </Text>
                        }
                        active={isChildActive}
                        onClick={(e) => {
                          e.preventDefault();
                          startTransition(() => {
                            navigate(child.path);
                          });
                        }}
                        style={{
                          borderRadius: '4px',
                          padding: '6px 8px',
                          fontSize: 12,
                          color: isChildActive ? '#ff6a00' : '#6b7280',
                          backgroundColor: isChildActive ? 'rgba(255, 106, 0, 0.08)' : 'transparent',
                          fontWeight: isChildActive ? 600 : 500,
                          cursor: 'pointer',
                          borderLeft: isChildActive ? '3px solid #ff6a00' : '3px solid transparent',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isChildActive) {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isChildActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      />
                    );
                  })}
                </Stack>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default CompanySidebar;


