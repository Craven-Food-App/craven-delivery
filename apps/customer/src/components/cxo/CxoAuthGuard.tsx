import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader, Alert, Button, Stack, Title, Text, Center } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface CxoAuthGuardProps {
  children: React.ReactNode;
}

const CxoAuthGuard: React.FC<CxoAuthGuardProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth?hq=true');
        return;
      }

      // Check if user has CXO, CEO, or ADMIN role
      const { data: employee } = await supabase
        .from('employees')
        .select('position')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check exec_users table for CEO role
      const { data: execUser } = await supabase
        .from('exec_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const position = employee?.position?.toLowerCase() || '';
      const role = userRole?.role?.toUpperCase() || '';
      const execRole = execUser?.role?.toLowerCase() || '';

      const isCxo = 
        position.includes('chief experience officer') ||
        position.includes('cxo') ||
        role === 'CXO' ||
        role === 'ADMIN' ||
        role === 'admin' ||
        execRole === 'ceo' || // CEO should have access to all executive portals
        execRole === 'cxo';

      if (isCxo) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } catch (error) {
      console.error('Authorization check error:', error);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!isAuthorized) {
    return (
      <Center style={{ minHeight: '100vh', padding: '2rem' }}>
        <Stack align="center" gap="md" style={{ maxWidth: 500 }}>
          <IconAlertCircle size={48} color="red" />
          <Title order={2}>Access Denied</Title>
          <Text c="dimmed" ta="center">
            You don't have access to the CXO Portal. This portal is restricted to the Chief Experience Officer and Administrators.
          </Text>
          <Button onClick={() => navigate('/hub')}>Return to Hub</Button>
        </Stack>
      </Center>
    );
  }

  return <>{children}</>;
};

export default CxoAuthGuard;

