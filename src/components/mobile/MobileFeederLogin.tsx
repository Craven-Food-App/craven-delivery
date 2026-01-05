import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import cravenLogo from '@/assets/craven-logo.png';

interface MobileFeederLoginProps {
  onBack?: () => void;
  onLoginSuccess?: () => void;
}

const MobileFeederLogin: React.FC<MobileFeederLoginProps> = ({ onBack, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading || hasNavigated) return;
    
    // Get values from DOM as fallback (in case React state wasn't updated)
    const emailInput = document.getElementById('login-input') as HTMLInputElement;
    
    const emailValue = email.trim() || emailInput?.value?.trim() || '';
    
    // Validate inputs
    if (!emailValue) {
      toast({
        title: "Missing Information",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      console.log('🔐 Starting sign-in process...');
      console.log('📧 Sending 6-digit code to email:', emailValue);
      
      // Use Supabase's native OTP - this sends a 6-digit code to email
      const { error } = await supabase.auth.signInWithOtp({
        email: emailValue,
        options: {
          shouldCreateUser: false, // Only allow existing users to login
        },
      });

      if (error) {
        console.error('❌ OTP error:', error);
        if (error.message?.includes('Signups not allowed')) {
          throw new Error('No account found with this email address.');
        }
        throw error;
      }

      console.log('✅ Verification code sent successfully');
      setLoading(false);
      setCodeSent(true);
      
      // Show success toast
      toast({
        title: "Code sent!",
        description: "Check your email for a 6-digit verification code.",
      });
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setLoading(false);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to send verification code. Please try again.";
      if (error.message?.includes('Too many requests')) {
        errorMessage = "Too many login attempts. Please wait a moment and try again.";
      } else if (error.message?.includes('User not found')) {
        errorMessage = "No account found with this email. Please check your email address.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (verifying || hasNavigated) return;
    
    const codeValue = verificationCode.trim().replace(/\D/g, ''); // Remove non-digits
    
    if (codeValue.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit code.",
        variant: "destructive",
      });
      return;
    }
    
    setVerifying(true);

    try {
      console.log('🔐 Verifying code...');
      
      // Use Supabase's native OTP verification
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: codeValue,
        type: 'email',
      });

      if (error) {
        console.error('❌ Verification error:', error);
        throw error;
      }

      if (!data?.user) {
        throw new Error('Verification failed. Please try again.');
      }

      console.log('✅ Verification successful, user:', data.user.id);

      // User is now signed in - navigate to dashboard
      setHasNavigated(true);
      setVerifying(false);
      
      toast({
        title: "Welcome back!",
        description: "Successfully signed in to your Feeder account.",
      });
      
      console.log('🚀 Navigating to /mobile...');
      window.location.href = '/mobile';
    } catch (error: any) {
      console.error('❌ Verification error:', error);
      setVerifying(false);
      
      let errorMessage = "Invalid verification code. Please try again.";
      if (error.message?.includes('expired')) {
        errorMessage = "This code has expired. Please request a new one.";
      } else if (error.message?.includes('Invalid token')) {
        errorMessage = "Invalid code. Please check and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleResendCode = async () => {
    setCodeSent(false);
    setVerificationCode('');
    setLoading(true);
    
    try {
      const emailValue = email.trim();
      const { error } = await supabase.auth.signInWithOtp({
        email: emailValue,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      setCodeSent(true);
      setLoading(false);
      toast({
        title: "Code resent!",
        description: "A new 6-digit code has been sent to your email.",
      });
    } catch (error: any) {
      setLoading(false);
      toast({
        title: "Failed to resend code",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-white overflow-y-auto z-50">
      {/* Header with back button */}
      <div className="sticky z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200" style={{ top: 0, paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onBack || (() => navigate(-1))}
            className="flex items-center gap-2 text-gray-700 hover:text-orange-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <img src={cravenLogo} alt="Crave'n" className="h-8" />
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Login Form */}
      <div className="px-6 py-8 max-w-md mx-auto" style={{ marginTop: '-10px', paddingBottom: `calc(24px + env(safe-area-inset-bottom, 48px))` }}>
        {/* Welcome Section */}
        <div className="text-left mb-8">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Are you ready to Feed?
          </h3>
          <p className="text-gray-600">
            Sign in to start earning and delivering happiness
          </p>
        </div>


        {/* Login Form */}
        {!codeSent ? (
          <form onSubmit={handleSignIn} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="login-input" className="text-gray-700 font-medium">
                Email Address
              </Label>
              <Input
                id="login-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base"
                disabled={loading}
              />
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending Code...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label htmlFor="verification-code" className="text-gray-700 font-medium">
                Enter 6-Digit Code
              </Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                }}
                required
                className="h-12 text-base text-center text-2xl font-bold tracking-widest"
                disabled={verifying}
                autoFocus
              />
              <p className="text-sm text-gray-500 text-center">
                We sent a 6-digit code to <span className="font-semibold">{email}</span>
              </p>
            </div>

            {/* Verify Button */}
            <Button
              type="submit"
              disabled={verifying || verificationCode.length !== 6}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {verifying ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : (
                'Verify Code'
              )}
            </Button>

            {/* Resend Code */}
            <button
              type="button"
              onClick={handleResendCode}
              disabled={loading}
              className="w-full text-center text-sm text-gray-600 hover:text-orange-500 underline disabled:opacity-50"
            >
              Didn't receive the code? Resend
            </button>
          </form>
        )}

      </div>

      {/* Android Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black z-50" style={{ height: '48px' }} />
    </div>
  );
};

export default MobileFeederLogin;

