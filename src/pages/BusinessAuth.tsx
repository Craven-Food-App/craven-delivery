import React from 'react';
import { LogIn, User, Lock, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { useToast } from '@/hooks/use-toast';
// Import the background image
import hubBackgroundImage from '@/assets/hub_background.png';

const BusinessAuth: React.FC = () => {
  const { toast } = useToast();
  const location = useLocation();

  const auth = useBusinessAuth({
    search: location.search,
    navigation: {
      toRedirectTarget: (path) => {
        const next = new URL(path, window.location.origin);
        const want = `${next.pathname}${next.search}`;
        const current = `${window.location.pathname}${window.location.search}`;
        // Avoid reload loop (e.g. ?redirect=/business-auth while on this page)
        const target = want === current || next.pathname === '/business-auth' ? '/hub' : path;
        window.location.replace(new URL(target, window.location.origin).href);
      },
      toExecutiveProfile: () => {
        window.location.href = `${window.location.origin}/executive/profile?reset=true`;
      },
      clearAuthParams: () => {
        window.history.replaceState({}, document.title, '/business-auth');
      },
    },
  });

  const showResetPassword = auth.mode === 'reset';
  const showUpdatePassword = auth.mode === 'updatePassword';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void auth.signIn();
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    void auth.sendResetEmail();
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    void auth.updatePassword();
  };

  if (auth.isRedirecting) {
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

          {auth.error && (
            <div 
              className="mb-4 p-2.5 sm:p-3 rounded-lg border"
              style={{
                background: 'rgba(220, 38, 38, 0.2)',
                borderColor: 'rgba(220, 38, 38, 0.4)',
              }}
            >
              <p className="text-xs sm:text-sm text-red-400">{auth.error}</p>
            </div>
          )}

          {auth.resetSent && (
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
                    value={auth.newPassword}
                    onChange={(e) => auth.setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-8 sm:pl-9 md:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border rounded-lg focus:ring-[#ff7a45] focus:border-[#ff7a45] transition duration-150 text-white placeholder:text-gray-400"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                    disabled={auth.isUpdatingPassword}
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
                    value={auth.confirmPassword}
                    onChange={(e) => auth.setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-8 sm:pl-9 md:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border rounded-lg focus:ring-[#ff7a45] focus:border-[#ff7a45] transition duration-150 text-white placeholder:text-gray-400"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                    disabled={auth.isUpdatingPassword}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={auth.isUpdatingPassword}
                className={`w-full flex justify-center items-center py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 border border-transparent rounded-lg text-white text-sm sm:text-base font-semibold shadow-lg transition duration-200 ease-in-out
                  ${auth.isUpdatingPassword
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#ff7a45] hover:bg-[#ff5a1f] focus:outline-none focus:ring-4 focus:ring-[#ff7a45] focus:ring-opacity-50 transform hover:scale-[1.01] active:scale-[0.98]'
                  }`}
              >
                {auth.isUpdatingPassword ? (
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
          ) : showResetPassword && !auth.resetSent ? (
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
                    value={auth.resetEmail}
                    onChange={(e) => auth.setResetEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-8 sm:pl-9 md:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border rounded-lg focus:ring-[#ff7a45] focus:border-[#ff7a45] transition duration-150 text-white placeholder:text-gray-400"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                    disabled={auth.isResetting}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={auth.isResetting}
                className={`w-full flex justify-center items-center py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 border border-transparent rounded-lg text-white text-sm sm:text-base font-semibold shadow-lg transition duration-200 ease-in-out
                  ${auth.isResetting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#ff7a45] hover:bg-[#ff5a1f] focus:outline-none focus:ring-4 focus:ring-[#ff7a45] focus:ring-opacity-50 transform hover:scale-[1.01] active:scale-[0.98]'
                  }`}
              >
                {auth.isResetting ? (
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
                onClick={auth.cancelPasswordReset}
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
                  value={auth.email}
                  onChange={(e) => auth.setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full pl-8 sm:pl-9 md:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border rounded-lg focus:ring-[#ff7a45] focus:border-[#ff7a45] transition duration-150 text-white placeholder:text-gray-400"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                  disabled={auth.isSubmitting}
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
                  value={auth.password}
                  onChange={(e) => auth.setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-8 sm:pl-9 md:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border rounded-lg focus:ring-[#ff7a45] focus:border-[#ff7a45] transition duration-150 text-white placeholder:text-gray-400"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                  disabled={auth.isSubmitting}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={auth.isSubmitting}
              className={`w-full flex justify-center items-center py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 border border-transparent rounded-lg text-white text-sm sm:text-base font-semibold shadow-lg transition duration-200 ease-in-out
                ${auth.isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#ff7a45] hover:bg-[#ff5a1f] focus:outline-none focus:ring-4 focus:ring-[#ff7a45] focus:ring-opacity-50 transform hover:scale-[1.01] active:scale-[0.98]'
                }`}
            >
              {auth.isSubmitting ? (
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
          {!showResetPassword && !auth.resetSent && !showUpdatePassword && (
            <div className="mt-3 sm:mt-4 md:mt-6 text-center text-xs sm:text-sm">
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  auth.startPasswordReset();
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
                    description: "Contact IT support at help@cravenusa.com",
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
