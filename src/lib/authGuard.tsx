import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Stack, Title, Text, Button, Card } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchUserRoles, hasAnyRole } from './roles';
import { hasFullAccess } from '@/utils/torranceAccess';

interface CompanySecureRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackPath?: string;
}

export const CompanySecureRoute: React.FC<CompanySecureRouteProps> = ({
  children,
  allowedRoles,
  fallbackPath = '/hub',
}) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      console.log('🔐 [CompanySecureRoute] Starting auth check...');
      try {
        // Get user first, then check roles in parallel
        const { data: { user } } = await supabase.auth.getUser();
        console.log('🔐 [CompanySecureRoute] User:', user?.email || 'No user');
        if (!user) {
          console.log('🔐 [CompanySecureRoute] No user found, denying access');
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        // TORRANCE STROMAN: FULL ACCESS TO EVERYTHING
        if (hasFullAccess(user.email)) {
          console.log('🔐 [CompanySecureRoute] Full access granted (Torrance)');
          setIsAuthorized(true);
          setLoading(false);
          return;
        }

        // Check both user_roles and exec_users in parallel
        const [roles, execUserResult, companyPerms] = await Promise.all([
          fetchUserRoles(),
          supabase
            .from('exec_users')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle(),
          // Check if user has any company.* permissions (for CFO limited access)
          Promise.all([
            supabase.rpc('has_permission', { p_user_id: user.id, p_permission: 'company.executives.view' }),
            supabase.rpc('has_permission', { p_user_id: user.id, p_permission: 'company.leadership.view' }),
          ]),
        ]);

        const authorized = hasAnyRole(roles, allowedRoles);
        console.log('🔐 [CompanySecureRoute] Roles check result:', { roles, allowedRoles, authorized });
        
        // Fallback check with exec_users if not authorized via user_roles
        if (!authorized && execUserResult.data) {
          console.log('🔐 [CompanySecureRoute] Checking exec_users fallback:', execUserResult.data);
          const execRole = execUserResult.data.role?.toUpperCase();
          const hasAccess = allowedRoles.some(role => {
            const normalizedRole = role.replace('CRAVEN_', '').toLowerCase();
            return execRole === normalizedRole || execRole === 'CEO';
          });
          console.log('🔐 [CompanySecureRoute] Exec access:', hasAccess);
          setIsAuthorized(hasAccess);
        } else if (!authorized) {
          // Check if user has any company portal permissions (CFO with limited access)
          const hasAnyCompanyPermission = companyPerms[0].data || companyPerms[1].data;
          console.log('🔐 [CompanySecureRoute] Company permission check:', hasAnyCompanyPermission);
          setIsAuthorized(hasAnyCompanyPermission);
        } else {
          console.log('🔐 [CompanySecureRoute] Access granted via roles');
          setIsAuthorized(authorized);
        }
      } catch (error) {
        console.error('🔐 [CompanySecureRoute] Error checking access:', error);
        setIsAuthorized(false);
      } finally {
        console.log('🔐 [CompanySecureRoute] Auth check complete, loading=false');
        setLoading(false);
      }
    };

    console.log('🔐 [CompanySecureRoute] Effect triggered, starting check...');
    checkAccess();
  }, [allowedRoles]);

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Stack align="center" gap="md">
          <Text>Checking access...</Text>
        </Stack>
      </Container>
    );
  }

  if (!isAuthorized) {
    return (
      <Container size="md" py="xl">
        <Card shadow="md" padding="xl" radius="md">
          <Stack align="center" gap="md">
            <IconLock size={64} stroke={1.5} style={{ color: 'var(--mantine-color-red-6)' }} />
            <Title order={2}>Access Denied</Title>
            <Text size="lg" ta="center" c="dimmed">
              You don't have the required permissions to access this portal.
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              This portal is restricted to high-level corporate access only.
            </Text>
            <Button onClick={() => navigate(fallbackPath)} mt="md">
              Return to Hub
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  console.log('🔐 [CompanySecureRoute] Access granted, rendering children');
  return <>{children}</>;
};

