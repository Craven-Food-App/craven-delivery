import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { hasFullAccess } from '@/utils/torranceAccess';

interface InvestorAccessGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const InvestorAccessGuard: React.FC<InvestorAccessGuardProps> = ({ children, fallback }) => {
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsApproved(false);
          setLoading(false);
          navigate('/investors/access', { 
            state: { message: 'Please log in to access investor materials.' } 
          });
          return;
        }

        // TORRANCE STROMAN (CEO): FULL ACCESS TO ALL INVESTOR MATERIALS
        if (hasFullAccess(user.email)) {
          setIsApproved(true);
          setLoading(false);
          return;
        }

        // Check if user is CEO via exec_users table
        const { data: execUser } = await supabase
          .from('exec_users')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (execUser?.role?.toLowerCase() === 'ceo') {
          setIsApproved(true);
          setLoading(false);
          return;
        }

        // Check investor_profiles for access status
        // Handle errors gracefully - if table doesn't exist, allow CEO but deny others
        try {
          const { data: profile, error } = await supabase
            .from('investor_profiles')
            .select('access_status')
            .eq('user_id', user.id)
            .maybeSingle();

          // If table/column doesn't exist (500 error), treat as no access for non-CEO users
          if (error) {
            if (error.code === 'PGRST116' || error.code === '42P01' || error.code === '42703') {
              // Table or column doesn't exist - deny access for non-CEO users
              console.warn('investor_profiles table may not exist yet:', error);
              setIsApproved(false);
              setLoading(false);
              navigate('/investors/access', { 
                state: { message: 'Investor access required. Please request access to view materials.' } 
              });
              return;
            }
            // Other errors - log but continue
            console.warn('Error checking investor access:', error);
          }

          const accessStatus = profile?.access_status || 'none';
          const approved = accessStatus === 'approved';

          setIsApproved(approved);
          
          if (!approved) {
            navigate('/investors/access', { 
              state: { message: 'Investor access required. Please request access to view materials.' } 
            });
          }
        } catch (profileError) {
          // Handle any unexpected errors gracefully
          console.warn('Error checking investor profile:', profileError);
          setIsApproved(false);
          setLoading(false);
          navigate('/investors/access', { 
            state: { message: 'Investor access required. Please request access to view materials.' } 
          });
        }
      } catch (error) {
        console.error('Error checking investor access:', error);
        setIsApproved(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isApproved) {
    return fallback || null;
  }

  return <>{children}</>;
};

export default InvestorAccessGuard;

