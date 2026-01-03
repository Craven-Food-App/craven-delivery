import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, ArrowLeft, Mail, Phone } from 'lucide-react';
import cravenLogo from '@/assets/craven-logo.png';

interface MobileFeederLoginProps {
  onBack?: () => void;
  onLoginSuccess?: () => void;
}

type LoginMethod = 'email' | 'phone';

const MobileFeederLogin: React.FC<MobileFeederLoginProps> = ({ onBack, onLoginSuccess }) => {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();


  // Format phone number as user types
  const handlePhoneChange = (value: string) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    
    // Format: (XXX) XXX-XXXX
    let formatted = cleaned;
    if (cleaned.length >= 6) {
      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (cleaned.length >= 3) {
      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    }
    
    setPhone(formatted);
  };


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading || hasNavigated) return;
    
    // Validate inputs
    const loginValue = loginMethod === 'email' ? email.trim() : phone.replace(/\D/g, '');
    if (!loginValue || !password) {
      toast({
        title: "Missing Information",
        description: loginMethod === 'email' 
          ? "Please enter your email and password."
          : "Please enter your phone number and password.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      console.log('🔐 Starting sign-in process...');
      let authResult;
      
      if (loginMethod === 'email') {
        console.log('📧 Signing in with email:', email.trim());
        authResult = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      } else {
        // For phone login, convert formatted phone to E.164 format
        const cleanedPhone = phone.replace(/\D/g, '');
        const e164Phone = `+1${cleanedPhone}`; // Assuming US numbers
        console.log('📱 Signing in with phone:', e164Phone);
        authResult = await supabase.auth.signInWithPassword({
          phone: e164Phone,
          password,
        });
      }

      if (authResult.error) {
        console.error('❌ Auth error:', authResult.error);
        throw authResult.error;
      }

      console.log('✅ Authentication successful, user:', authResult.data.user?.id);

      if (authResult.data.user) {
        // Mark as navigated to prevent any re-runs
        setHasNavigated(true);
        setLoading(false);
        
        // Show success toast
        toast({
          title: "Welcome back!",
          description: "Successfully signed in to your Feeder account.",
        });
        
        // Force navigation with window.location for reliability
        console.log('🚀 Navigating to /mobile...');
        window.location.href = '/mobile';
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setLoading(false);
      
      // Provide user-friendly error messages
      let errorMessage = "Please check your credentials and try again.";
      if (error.message?.includes('Invalid login credentials') || error.message?.includes('Invalid credentials')) {
        errorMessage = "The email or password you entered is incorrect. Please try again.";
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = "Please check your email and confirm your account before signing in.";
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = "Too many login attempts. Please wait a moment and try again.";
      } else if (error.message?.includes('missing email or phone')) {
        errorMessage = "Please enter your email address.";
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

  const handleApplyRedirect = () => {
    navigate('/driver-onboarding/apply');
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-white overflow-y-auto z-50" style={{ paddingTop: 'calc(env(safe-area-inset-top, 100px) + 70px)' }}>
      {/* Header with back button */}
      <div className="sticky z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200" style={{ top: 0, paddingTop: 'env(safe-area-inset-top, 80px)', minHeight: 'calc(env(safe-area-inset-top, 80px) + 80px)' }}>
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back, Feeder!
          </h1>
          <p className="text-gray-600">
            Sign in to start earning and delivering happiness
          </p>
        </div>

        {/* Login Method Toggle */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setLoginMethod('email')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-medium transition-all ${
              loginMethod === 'email'
                ? 'bg-white text-orange-500 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={() => setLoginMethod('phone')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-medium transition-all ${
              loginMethod === 'phone'
                ? 'bg-white text-orange-500 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            <Phone className="w-4 h-4" />
            Phone
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSignIn} className="space-y-5">
          {/* Email or Phone Input */}
          <div className="space-y-2">
            <Label htmlFor="login-input" className="text-gray-700 font-medium">
              {loginMethod === 'email' ? 'Email Address' : 'Phone Number'}
            </Label>
            {loginMethod === 'email' ? (
              <Input
                id="login-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base"
              />
            ) : (
              <Input
                id="login-input"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                maxLength={14}
                required
                className="h-12 text-base"
              />
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700 font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
          </div>

          {/* Sign In Button */}
          <Button
            type="submit"
            disabled={loading}
            onClick={(e) => {
              // Fallback: if form submit doesn't work, handle click directly
              if (!loading && !hasNavigated) {
                handleSignIn(e as any);
              }
            }}
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing In...
              </div>
            ) : (
              'Sign In'
            )}
          </Button>

          {/* Forgot Password */}
          <button
            type="button"
            className="w-full text-center text-sm text-gray-600 hover:text-orange-500 underline"
            onClick={async () => {
              if (!email && loginMethod === 'email') {
                toast({
                  title: "Email Required",
                  description: "Please enter your email address first.",
                  variant: "destructive",
                });
                return;
              }
              
              if (loginMethod === 'phone') {
                toast({
                  title: "Email Required",
                  description: "Please switch to email login to reset your password.",
                  variant: "destructive",
                });
                return;
              }

              try {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/mobile?reset=true`,
                });

                if (error) throw error;

                toast({
                  title: "Password Reset Email Sent",
                  description: "Please check your email for instructions to reset your password.",
                });
              } catch (error: any) {
                console.error('Password reset error:', error);
                toast({
                  title: "Error",
                  description: error.message || "Failed to send password reset email. Please try again.",
                  variant: "destructive",
                });
              }
            }}
          >
            Forgot your password?
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 font-medium">
              New to Crave'n?
            </span>
          </div>
        </div>

        {/* Apply Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleApplyRedirect}
          className="w-full h-12 border-2 border-orange-500 text-orange-500 hover:bg-orange-50 text-lg font-semibold rounded-lg"
        >
          Apply to Become a Feeder
        </Button>

        {/* Info Text */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Your account will be created when you submit your application
        </p>
      </div>
    </div>
  );
};

export default MobileFeederLogin;

