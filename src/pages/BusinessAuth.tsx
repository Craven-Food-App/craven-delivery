import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LogIn, User, Lock, Loader2, Mail, ArrowLeft } from 'lucide-react';
// Import the background image
import hubBackgroundImage from '@/assets/hub_background.png';

/**
 * Normalize ?redirect= so navigation always targets an app path (leading /).
 * Values like "merchant-portal" would otherwise resolve relative to /business-auth and break.
 */
function normalizeRedirectPath(raw: string | null | undefined): string {
  const fallback = '/hub';
  if (raw == null || typeof raw !== 'string') return fallback;
  let path = raw.trim();
  if (!path) return fallback;
  if (/^https?:\/\//i.test(path)) {
    try {
      const u = new URL(path);
      if (u.origin === window.location.origin) {
        return `${u.pathname}${u.search}${u.hash}`;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }
  if (path.startsWith('//')) return fallback;
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

const BusinessAuth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const { toast } = useToast();

  // Get redirect parameter from URL (always a safe same-origin path)
  const getRedirectPath = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return normalizeRedirectPath(urlParams.get('redirect'));
  };

  const replaceLocationToRedirect = () => {
    let path = getRedirectPath();
    const next = new URL(path, window.location.origin);
    const want = `${next.pathname}${next.search}`;
    const cur = `${window.location.pathname}${window.location.search}`;
    // Avoid reload loop (e.g. ?redirect=/business-auth while on this page)
    if (want === cur || next.pathname === '/business-auth') {
      path = '/hub';
    }
    window.location.replace(new URL(path, window.location.origin).href);
  };

  const redirectToExecutiveProfile = () => {
    const origin = window.location.origin;
    window.location.href = `${origin}/executive/profile?reset=true`;
  };

  // Check if user is already signed in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const isRecovery = hashParams.get('type') === 'recovery';
        if (user.user_metadata?.temp_password === true || isRecovery) {
          redirectToExecutiveProfile();
          return;
        }
        // Hard-navigate without setUser — avoids an infinite "Redirecting to portal..." state if navigation fails
        replaceLocationToRedirect();
        return;
      }
    };
    
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Check if user has a temporary password
          const hasTempPassword = session.user.user_metadata?.temp_password === true;
          
          // Check if this is a password recovery session
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const isRecovery = hashParams.get('type') === 'recovery';
          
          if (hasTempPassword || isRecovery) {
            setShowResetPassword(false);
            setResetSent(false);
            setUser(null);
            redirectToExecutiveProfile();
            return;
          } else {
            // Normal sign in
            setUser(session.user);
            toast({
              title: "Welcome!",
              description: "You've been signed in successfully.",
            });
            setTimeout(() => {
              replaceLocationToRedirect();
            }, 1000);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);


  // --- Login Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        throw authError;
      }

      if (data.user) {
        // Check if user has a temporary password
        const hasTempPassword = data.user.user_metadata?.temp_password === true;
        
        if (hasTempPassword) {
          redirectToExecutiveProfile();
          return;
        }

        toast({
          title: "Success!",
          description: "Signing you in...",
        });
        setTimeout(() => {
          replaceLocationToRedirect();
        }, 1000);
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'An error occurred during sign in');
      toast({
        title: "Sign In Failed",
        description: error.message || 'An error occurred during sign in',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Password Reset ---
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      // Determine the correct redirect URL based on environment
      // Priority: Environment variable > Production detection > Current origin
      const getRedirectUrl = () => {
        // Check for environment variable first (useful for development/testing)
        const appBaseUrl =
          import.meta.env.VITE_APP_BASE_URL ||
          import.meta.env.APP_BASE_URL ||
          import.meta.env.VITE_SITE_URL ||
          import.meta.env.VITE_APP_URL;

        if (appBaseUrl) {
          const normalizedBase = appBaseUrl.replace(/\/+$/, '');
          return `${normalizedBase}/executive/reset-password`;
        }
        
        const hostname = window.location.hostname;
        
        // Production URLs - always use production URL for password reset emails
        if (hostname.includes('cravenusa.com')) {
          return `https://cravenusa.com/executive/reset-password`;
        }
        
        // Lovable project URL (if deployed there)
        if (hostname.includes('lovableproject.com')) {
          return `https://${hostname}/executive/reset-password`;
        }
        
        // Development - use production URL so email links work
        // For local testing, set VITE_APP_BASE_URL environment variable to your production URL
        // or use a tunnel service like ngrok
        return `https://cravenusa.com/executive/reset-password`;
      };
      
      const redirectUrl = getRedirectUrl();
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        throw resetError;
      }

      setResetSent(true);
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your email for password reset instructions.",
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || 'Failed to send password reset email');
      toast({
        title: "Error",
        description: error.message || 'Failed to send password reset email',
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Handle password update after clicking reset link
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please enter both password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          temp_password: false, // Clear temporary password flag
          temp_password_set_at: null,
        },
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. Signing you in...",
      });

      // If this was a temporary password change, sign in automatically
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Clear the form
        setShowUpdatePassword(false);
        setNewPassword('');
        setConfirmPassword('');
        setShowResetPassword(false);
        setResetSent(false);
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, '/business-auth');
        
        // Redirect to hub (query was cleared above; getRedirectPath → /hub)
        setTimeout(() => {
          replaceLocationToRedirect();
        }, 1000);
      } else {
        // Clear the form and show login
        setShowUpdatePassword(false);
        setNewPassword('');
        setConfirmPassword('');
        setShowResetPassword(false);
        setResetSent(false);
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, '/business-auth');
      }
    } catch (error: any) {
      console.error('Password update error:', error);
      setError(error.message || 'Failed to update password');
      toast({
        title: "Error",
        description: error.message || 'Failed to update password',
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Check if this is a password reset callback
  useEffect(() => {
    const checkResetSession = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Check if URL indicates password reset
      const isResetFlow = urlParams.get('reset') === 'true' || hashParams.get('type') === 'recovery';
      
      if (isResetFlow) {
        // Check if user has a valid session from the reset link
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          redirectToExecutiveProfile();
        }
      }
    };
    
    checkResetSession();
  }, []);

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-4 text-[#ff7a45]" />
          <p className="text-sm sm:text-base text-gray-400">Redirecting to portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gray-900 overflow-hidden">
      {/* Background Container - Using static image */}
      <div className="absolute inset-0 w-full h-full">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${hubBackgroundImage})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
          }}
        />
      </div>

      {/* Login Form Container (Overlay) */}
      <div className="relative z-10 w-full max-w-md mx-auto px-3 sm:px-4 lg:ml-[200px] xl:ml-[300px] lg:mr-auto">
        <div 
          className="p-5 sm:p-6 md:p-8 lg:p-10 rounded-xl shadow-2xl border-t-4 border-[#ff7a45]"
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 122, 69, 0.3)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="text-center mb-5 sm:mb-6 md:mb-8">
            <div className="inline-block p-2 sm:p-3 rounded-full bg-[#ff7a45] shadow-lg mb-2 sm:mb-3 md:mb-4">
              <LogIn className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
              CRAVE'N BUSINESS
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              Partner Portal Access
            </p>
          </div>

          {error && (
            <div 
              className="mb-4 p-2.5 sm:p-3 rounded-lg border"
              style={{
                background: 'rgba(220, 38, 38, 0.2)',
                borderColor: 'rgba(220, 38, 38, 0.4)',
              }}
            >
              <p className="text-xs sm:text-sm text-red-400">{error}</p>
            </div>
          )}

          {resetSent && (
            <div 
              className="mb-4 p-2.5 sm:p-3 rounded-lg border"
              style={{
                background: 'rgba(34, 197, 94, 0.2)',
                borderColor: 'rgba(34, 197, 94, 0.4)',
              }}
            >
              <p className="text-xs sm:text-sm text-green-400">
                Password reset email sent! Please check your inbox and follow the instructions to reset your password.
              </p>
            </div>
          )}

          {showUpdatePassword ? (
            // Update Password Form (after clicking email link or temporary password)
            <div>
              <div 
                className="mb-4 p-3 rounded-lg border"
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                }}
              >
                <p className="text-xs sm:text-sm text-yellow-300 font-semibold mb-1">
                  Password Change Required
                </p>
                <p className="text-xs text-yellow-200">
                  Please set a new password to continue.
                </p>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-3 sm:space-y-4 md:space-y-5">
              <div>
                <label htmlFor="new-password" className="sr-only">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3 pointer-events-none">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />
                  </div>
                  <input
                    id="new-password"
                    name="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-8 sm:pl-9 md:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border rounded-lg focus:ring-[#ff7a45] focus:border-[#ff7a45] transition duration-150 text-white placeholder:text-gray-400"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                    disabled={isUpdatingPassword}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3 pointer-events-none">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />
                  </div>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-8 sm:pl-9 md:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border rounded-lg focus:ring-[#ff7a45] focus:border-[#ff7a45] transition duration-150 text-white placeholder:text-gray-400"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                    disabled={isUpdatingPassword}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className={`w-full flex justify-center items-center py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 border border-transparent rounded-lg text-white text-sm sm:text-base font-semibold shadow-lg transition duration-200 ease-in-out
                  ${isUpdatingPassword
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#ff7a45] hover:bg-[#ff5a1f] focus:outline-none focus:ring-4 focus:ring-[#ff7a45] focus:ring-opacity-50 transform hover:scale-[1.01] active:scale-[0.98]'
                  }`}
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                    Update Password
                  </>
                )}
              </button>
            </form>
            </div>
          ) : showResetPassword && !resetSent ? (
            // Password Reset Form
            <form onSubmit={handleResetPassword} className="space-y-3 sm:space-y-4 md:space-y-5">
              <div>
                <label htmlFor="reset-email" className="sr-only">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3 pointer-events-none">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />
                  </div>
                  <input
                    id="reset-email"
                    name="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-8 sm:pl-9 md:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border rounded-lg focus:ring-[#ff7a45] focus:border-[#ff7a45] transition duration-150 text-white placeholder:text-gray-400"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                    disabled={isResetting}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isResetting}
                className={`w-full flex justify-center items-center py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 border border-transparent rounded-lg text-white text-sm sm:text-base font-semibold shadow-lg transition duration-200 ease-in-out
                  ${isResetting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#ff7a45] hover:bg-[#ff5a1f] focus:outline-none focus:ring-4 focus:ring-[#ff7a45] focus:ring-opacity-50 transform hover:scale-[1.01] active:scale-[0.98]'
                  }`}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                    Send Reset Link
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setResetEmail('');
                  setError(null);
                  setResetSent(false);
                }}
                className="w-full flex justify-center items-center py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 border rounded-lg text-gray-300 text-sm sm:text-base font-medium hover:text-white transition duration-150"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                Back to Sign In
              </button>
            </form>
          ) : (
            // Login Form
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3 pointer-events-none">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full pl-8 sm:pl-9 md:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border rounded-lg focus:ring-[#ff7a45] focus:border-[#ff7a45] transition duration-150 text-white placeholder:text-gray-400"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                  disabled={isSubmitting || loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3 pointer-events-none">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-8 sm:pl-9 md:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border rounded-lg focus:ring-[#ff7a45] focus:border-[#ff7a45] transition duration-150 text-white placeholder:text-gray-400"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                  disabled={isSubmitting || loading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || loading || !!error}
              className={`w-full flex justify-center items-center py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 border border-transparent rounded-lg text-white text-sm sm:text-base font-semibold shadow-lg transition duration-200 ease-in-out
                ${isSubmitting || loading || !!error
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#ff7a45] hover:bg-[#ff5a1f] focus:outline-none focus:ring-4 focus:ring-[#ff7a45] focus:ring-opacity-50 transform hover:scale-[1.01] active:scale-[0.98]'
                }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 animate-spin" />
                  <span>Logging In...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>
          )}

          {/* Footer Links */}
          {!showResetPassword && !resetSent && !showUpdatePassword && (
            <div className="mt-3 sm:mt-4 md:mt-6 text-center text-xs sm:text-sm">
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setShowResetPassword(true);
                  setResetEmail(email); // Pre-fill with the email they entered
                }}
                className="font-medium text-[#ff7a45] hover:text-[#ff9c6e] transition duration-150 block sm:inline"
              >
                Forgot Password?
              </a>
              <span className="mx-2 text-gray-400 hidden sm:inline">|</span>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  toast({
                    title: "Support",
                    description: "Contact IT support at support@cravenusa.com",
                  });
                }}
                className="font-medium text-gray-300 hover:text-[#ff7a45] transition duration-150 block sm:inline mt-2 sm:mt-0"
              >
                Need Support?
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessAuth;
