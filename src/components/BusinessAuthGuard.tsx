import React, { useEffect, useState, startTransition, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
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
const BusinessAuthGuard: React.FC<BusinessAuthGuardProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setIsAuthenticated(false);
          startTransition(() => {
            navigate('/auth?hq=true');
          });
        } else if (event === 'SIGNED_IN' && session?.user) {
          setIsAuthenticated(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        setIsAuthenticated(false);
        startTransition(() => {
          navigate('/auth?hq=true');
        });
      } else {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      startTransition(() => {
        navigate('/auth?hq=true');
      });
    } finally {
      setLoading(false);
    }
  };

  // Debug: Log route changes
  useEffect(() => {
    console.log('[BusinessAuthGuard] Current path:', window.location.pathname);
  }, []);

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
