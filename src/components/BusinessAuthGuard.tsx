import React, { useEffect, useState, startTransition, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface BusinessAuthGuardProps {
  children: React.ReactNode;
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <Loader2 className="h-8 w-8 animate-spin text-[#ff7a45]" />
  </div>
);

/**
 * Guard component that protects business portal routes
 * Redirects to /auth if user is not authenticated
 */
const loginWithReturn = (navigate: ReturnType<typeof useNavigate>, pathname: string, search: string) => {
  const returnTo = `${pathname}${search || ''}`;
  const q = new URLSearchParams();
  q.set('hq', 'true');
  if (returnTo && returnTo !== '/auth' && !returnTo.startsWith('/auth?')) {
    q.set('redirect', returnTo);
  }
  navigate(`/auth?${q.toString()}`);
};

const BusinessAuthGuard: React.FC<BusinessAuthGuardProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setIsAuthenticated(false);
          startTransition(() => {
            loginWithReturn(
              navigate,
              typeof window !== 'undefined' ? window.location.pathname : location.pathname,
              typeof window !== 'undefined' ? window.location.search : location.search,
            );
          });
        } else if (event === 'SIGNED_IN' && session?.user) {
          setIsAuthenticated(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname, location.search]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        setIsAuthenticated(false);
        startTransition(() => {
          loginWithReturn(navigate, location.pathname, location.search);
        });
      } else {
        setIsAuthenticated(true);
      }
    } catch {
      setIsAuthenticated(false);
      startTransition(() => {
        loginWithReturn(navigate, location.pathname, location.search);
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff7a45]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Wrap children in Suspense to handle lazy-loaded components
  return (
    <Suspense fallback={<LoadingFallback />}>
      {children}
    </Suspense>
  );
};

export default BusinessAuthGuard;
