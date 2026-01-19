import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Legacy Auth page - now redirects to /restaurants
 * Authentication is now handled on the Restaurants landing page
 */
const Auth: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Redirect to restaurants page
    // The restaurants page will show the landing/login page if user is not authenticated
    const redirect = searchParams.get('redirect') || '/restaurants';
    navigate(redirect, { replace: true });
  }, [navigate, searchParams]);

  // Show loading while redirecting
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Redirecting...</p>
        </div>
    </div>
  );
};

export default Auth;
