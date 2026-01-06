import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useNativeNotification } from '@/hooks/useNativeNotification';
import { ArrowLeft } from 'lucide-react';
import cravenLogo from '@/assets/craven-logo.png';

interface MobileFeederLoginProps {
  onBack?: () => void;
  onLoginSuccess?: () => void;
}

const MobileFeederLogin: React.FC<MobileFeederLoginProps> = ({ onBack, onLoginSuccess }) => {
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showNotification } = useNativeNotification();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    const identifier = loginMethod === "email" ? email.trim() : phone.trim();
    
    if (!identifier || !password) {
      showNotification(
        "Missing Information",
        `Please enter your ${loginMethod} and password.`,
        "error"
      );
      return;
    }

    setLoading(true);

    try {
      console.log(`🔐 Signing in with ${loginMethod}:`, identifier);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
          password,
        });

      if (error) {
        console.error('❌ Auth error:', error);
        throw new Error(error.message || "Invalid credentials.");
      }

      if (!data?.session) {
        throw new Error("Sign-in succeeded but no session was created.");
      }

      console.log('✅ Signed in! User ID:', data.session.user.id);
          setLoading(false);

      showNotification(
        "Welcome back!",
        "Successfully signed in to your Feeder account.",
        "success"
      );
      
      // Navigate to dashboard
      console.log('🚀 Navigating to /mobile...');
      window.location.href = '/mobile';
    } catch (error: any) {
      console.error('❌ Error:', error);
      setLoading(false);
      
      showNotification(
        "Sign In Failed",
        error.message || "Please check your credentials and try again.",
        "error"
      );
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
          <div className="w-16"></div>
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

        {/* Login Form with Tabs */}
        <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as "email" | "phone")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Phone</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email">
        <form onSubmit={handleSignIn} className="space-y-5">
          <div className="space-y-2">
                <Label htmlFor="login-email" className="text-gray-700 font-medium">
                  Email Address
            </Label>
              <Input
                  id="login-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base"
                  disabled={loading}
                />
          </div>
          <div className="space-y-2">
                <Label htmlFor="login-password-email" className="text-gray-700 font-medium">
              Password
            </Label>
              <Input
                  id="login-password-email"
                  type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                  className="h-12 text-base"
                  disabled={loading}
              />
              </div>
              <Button
                type="submit"
                disabled={loading}
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
            </form>
          </TabsContent>
          
          <TabsContent value="phone">
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login-phone" className="text-gray-700 font-medium">
                  Phone Number
                </Label>
                <Input
                  id="login-phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-12 text-base"
                  disabled={loading}
                />
            </div>
              <div className="space-y-2">
                <Label htmlFor="login-password-phone" className="text-gray-700 font-medium">
                  Password
                </Label>
                <Input
                  id="login-password-phone"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 text-base"
                  disabled={loading}
                />
          </div>
          <Button
            type="submit"
            disabled={loading}
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
        </form>
          </TabsContent>
        </Tabs>
      </div>

      {/* Android Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black z-50" style={{ height: '48px' }} />
    </div>
  );
};

export default MobileFeederLogin;
