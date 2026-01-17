import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MarketingAccessGuardProps {
  children: React.ReactNode;
  requiredLevel?: 'standard' | 'manager' | 'director' | 'executive';
}

export const MarketingAccessGuard: React.FC<MarketingAccessGuardProps> = ({
  children,
  requiredLevel = 'standard'
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkMarketingAccess();
  }, []);

  const isCEO = async (userId: string, email: string): Promise<boolean> => {
    try {
      // Check multiple ways to identify CEO
      const checks = await Promise.all([
        // Check ceo_access_credentials
        supabase
          .from('ceo_access_credentials')
          .select('id')
          .eq('user_email', email)
          .single(),
        // Check exec_users
        supabase
          .from('exec_users')
          .select('role, access_level')
          .eq('user_id', userId)
          .eq('role', 'ceo')
          .eq('access_level', 1)
          .single(),
        // Check known CEO email
        Promise.resolve(email === 'craven@usa.com' || email.toLowerCase().includes('torrance'))
      ]);

      return checks[0].data !== null || 
             checks[1].data !== null || 
             checks[2] === true;
    } catch (error) {
      console.error('Error checking CEO status:', error);
      // Fallback to email check
      return email === 'craven@usa.com' || email.toLowerCase().includes('torrance');
    }
  };

  const checkMarketingAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // ALWAYS check CEO first - CEO gets instant full access
      const ceoCheck = await isCEO(user.id, user.email || '');
      if (ceoCheck) {
        // Ensure CEO has access record using the database function
        try {
          await supabase.rpc('ensure_ceo_marketing_access');
        } catch (error) {
          console.error('Error ensuring CEO access:', error);
          // Fallback: manually insert/update
          await supabase
            .from('marketing_portal_access')
            .upsert({
              user_id: user.id,
              access_level: 'executive',
              is_active: true,
              notes: 'CEO - Automatic Full Access'
            }, {
              onConflict: 'user_id'
            });
        }
        
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // For non-CEO users, check normal access
      const { data: access, error } = await supabase
        .from('marketing_portal_access')
        .select('access_level, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error || !access) {
        // Also check if employee has marketing position/department
        const { data: employee } = await supabase
          .from('employees')
          .select(`
            position,
            department:departments(name),
            employment_status
          `)
          .eq('user_id', user.id)
          .eq('employment_status', 'active')
          .single();

        if (employee && (
          employee.position?.toLowerCase().includes('marketing') ||
          employee.department?.name?.toLowerCase().includes('marketing')
        )) {
          // Auto-grant access if they have marketing position
          await supabase.from('marketing_portal_access').insert({
            user_id: user.id,
            access_level: employee.position?.toLowerCase().includes('manager') ? 'manager' : 'standard',
            notes: 'Auto-granted: Marketing position detected'
          });
          setHasAccess(true);
          setLoading(false);
          return;
        }

        setHasAccess(false);
        toast({
          title: "Access Denied",
          description: "You do not have access to the Marketing Portal. Please contact HR if this is an error.",
          variant: "destructive"
        });
        navigate('/');
        setLoading(false);
        return;
      }

      // Check access level requirements
      const levelHierarchy = { 'standard': 1, 'manager': 2, 'director': 3, 'executive': 4 };
      const userLevel = levelHierarchy[access.access_level as keyof typeof levelHierarchy] || 0;
      const requiredLevelNum = levelHierarchy[requiredLevel] || 0;

      if (userLevel < requiredLevelNum) {
        setHasAccess(false);
        toast({
          title: "Insufficient Access Level",
          description: `This section requires ${requiredLevel} access or higher.`,
          variant: "destructive"
        });
        navigate('/marketing-portal');
        setLoading(false);
        return;
      }

      setHasAccess(true);
      setLoading(false);
    } catch (error) {
      console.error('Error checking marketing access:', error);
      setHasAccess(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};

