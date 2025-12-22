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
  const [redirecting, setRedirecting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        console.log('[InvestorAccessGuard] Checking access for user:', user?.email);
        
        if (!user) {
          console.log('[InvestorAccessGuard] No user found, redirecting to login page');
          setIsApproved(false);
          setLoading(false);
          setRedirecting(true);
          navigate('/investors/login', { 
            state: { message: 'Please log in to access investor materials.' },
            replace: true
          });
          return;
        }

        // TORRANCE STROMAN (CEO): FULL ACCESS TO ALL INVESTOR MATERIALS
        if (hasFullAccess(user.email)) {
          console.log('[InvestorAccessGuard] User has full access (Torrance/CEO)');
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
          console.log('[InvestorAccessGuard] User is CEO via exec_users table');
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
              console.warn('[InvestorAccessGuard] investor_profiles table may not exist yet:', error);
              setIsApproved(false);
              setLoading(false);
              setRedirecting(true);
              navigate('/investors/access', { 
                state: { message: 'Investor access required. Please request access to view materials.' },
                replace: true
              });
              return;
            }
            // Other errors - log but continue
            console.warn('[InvestorAccessGuard] Error checking investor access:', error);
          }

          const accessStatus = profile?.access_status || 'none';
          const approved = accessStatus === 'approved';

          console.log('[InvestorAccessGuard] Access status:', { accessStatus, approved, profile });

          setIsApproved(approved);
          
          if (!approved) {
            console.log('[InvestorAccessGuard] Access denied, redirecting to access page');
            setRedirecting(true);
            navigate('/investors/access', { 
              state: { message: 'Investor access required. Please request access to view materials.' },
              replace: true
            });
          } else {
            console.log('[InvestorAccessGuard] Access granted');
          }
        } catch (profileError) {
          // Handle any unexpected errors gracefully
          console.warn('Error checking investor profile:', profileError);
          setIsApproved(false);
          setLoading(false);
          setRedirecting(true);
          navigate('/investors/access', { 
            state: { message: 'Investor access required. Please request access to view materials.' },
            replace: true
          });
        }
      } catch (error) {
        console.error('[InvestorAccessGuard] Error checking investor access:', error);
        // On error, check if user is Torrance/CEO - if so, grant access anyway
        try {
          const { data: { user: errorUser } } = await supabase.auth.getUser();
          if (errorUser && hasFullAccess(errorUser.email)) {
            console.log('[InvestorAccessGuard] Error occurred but user has full access (Torrance/CEO), granting access');
            setIsApproved(true);
            setLoading(false);
            return;
          }
        } catch (fallbackError) {
          console.error('[InvestorAccessGuard] Error in fallback check:', fallbackError);
        }
        // If not Torrance/CEO, redirect to access page
        setIsApproved(false);
        setLoading(false);
        setRedirecting(true);
        navigate('/investors/access', { 
          state: { message: 'Investor access required. Please request access to view materials.' },
          replace: true
        });
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [navigate]);

  if (loading || redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isApproved) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return <>{children}</>;
};

export default InvestorAccessGuard;

