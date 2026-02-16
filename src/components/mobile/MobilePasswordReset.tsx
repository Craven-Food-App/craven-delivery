import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import cravenLogo from '@/assets/craven-logo.png';

export const MobilePasswordReset: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const isFirstLogin = searchParams.get('firstLogin') === 'true';
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is authenticated or has password reset token
  useEffect(() => {
    const checkAuth = async () => {
      // Check for Supabase password reset hash in URL
      const hash = window.location.hash;
      if (hash && hash.includes('type=recovery')) {
        // User came from password reset email - Supabase will handle auth
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user && !isFirstLogin) {
        // If not first login and not authenticated, redirect to login
        navigate('/mobile');
      }
    };
    checkAuth();
  }, [navigate, isFirstLogin]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate passwords
      if (newPassword.length < 8) {
        toast({
          title: "Password Too Short",
          description: "Password must be at least 8 characters long.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: "Passwords Don't Match",
          description: "Please make sure both passwords match.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Get user to clear the needs_password_reset flag and check onboarding
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Clear the needs_password_reset flag
        await supabase
          .from('user_profiles')
          .update({ needs_password_reset: false })
          .eq('user_id', user.id);

        toast({
          title: "Password Updated!",
          description: "Your password has been successfully updated.",
        });

        // Redirect to dashboard or onboarding based on status
        if (isFirstLogin) {
          // Check onboarding status and route accordingly
          const { data: application } = await supabase
            .from('craver_applications')
            .select('onboarding_completed_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!application?.onboarding_completed_at) {
            navigate('/enhanced-onboarding');
          } else {
            navigate('/mobile');
          }
        } else {
          navigate('/mobile');
        }
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-orange-50 to-white overflow-y-auto z-50">
      {/* Header */}
      <div className="sticky z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200" style={{ top: 0, paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-700 hover:text-orange-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <img src={cravenLogo} alt="Crave'n" className="h-8" />
          <div className="w-16"></div>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 py-8 max-w-md mx-auto" style={{ marginTop: '130px' }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isFirstLogin ? 'Set Your Password' : 'Reset Password'}
          </h1>
          <p className="text-gray-600">
            {isFirstLogin 
              ? 'Please create a secure password for your account'
              : 'Enter your new password below'}
          </p>
        </div>

        <form onSubmit={handlePasswordReset} className="space-y-5">
          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-gray-700 font-medium">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password (min. 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="h-12 text-base pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Must be at least 8 characters long
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-gray-700 font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="h-12 text-base pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating Password...
              </div>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

