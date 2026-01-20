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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center mb-6">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Redirecting...</p>
      </div>
      <div className="mt-auto mb-4 text-center text-xs text-muted-foreground space-x-3">
        <button
          type="button"
          className="underline"
          onClick={() => navigate("/legal/privacy")}
        >
          Privacy Policy
        </button>
        <span>•</span>
        <button
          type="button"
          className="underline"
          onClick={() => navigate("/legal/terms")}
        >
          Terms of Service
        </button>
      </div>
    </div>
  );
};

export default Auth;
