import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { hasFullAccess } from '@/utils/torranceAccess';

const InvestorLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [heroImageUrl, setHeroImageUrl] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // User is already logged in, check their access status
        await checkAccessAndRedirect(user);
      } else {
        setChecking(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const fetchHeroImage = async () => {
      try {
        const { data, error } = await supabase
          .from('marketing_settings')
          .select('investor_hero_image_url')
          .limit(1)
          .single();

        if (!error && data?.investor_hero_image_url) {
          setHeroImageUrl(data.investor_hero_image_url);
        }
      } catch (error) {
        console.error('Error fetching investor hero image:', error);
      }
    };

    fetchHeroImage();
  }, []);

  const checkAccessAndRedirect = async (user: any) => {
    try {
      // Check if CEO/Torrance
      if (hasFullAccess(user.email)) {
        navigate('/investors/portal', { replace: true });
        return;
      }

      // Check exec_users for CEO role
      const { data: execUser } = await supabase
        .from('exec_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (execUser?.role?.toLowerCase() === 'ceo') {
        navigate('/investors/portal', { replace: true });
        return;
      }

      // Check investor_profiles for approval
      const { data: profile } = await supabase
        .from('investor_profiles')
        .select('access_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.access_status === 'approved') {
        navigate('/investors/portal', { replace: true });
      } else {
        // Not approved, redirect to request access
        navigate('/investors/access', { replace: true });
      }
    } catch (error) {
      console.error('Error checking access:', error);
      navigate('/investors/access', { replace: true });
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === 'signup') {
        if (!fullName) {
          toast({
            title: 'Error',
            description: 'Please enter your full name',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        toast({
          title: 'Account Created',
          description: 'Please check your email to verify your account, then sign in.',
        });
        setAuthMode('signin');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // After successful login, check access and redirect
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await checkAccessAndRedirect(user);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Authentication failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Hero Background */}
      {heroImageUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${heroImageUrl})`,
          }}
        >
          {/* Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        <Header />
        <div className="max-w-md mx-auto py-12 px-4">
          <Card className={heroImageUrl ? 'bg-white/95 backdrop-blur-sm' : ''}>
            <CardHeader>
              <CardTitle>Investor Login</CardTitle>
              <CardDescription>
                Sign in to access the investor portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'signin' | 'signup')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                      <Label htmlFor="fullname">Full Name</Label>
                      <Input
                        id="fullname"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-signup">Email</Label>
                      <Input
                        id="email-signup"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password-signup">Password</Label>
                      <Input
                        id="password-signup"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Sign Up
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              <div className="mt-4 text-center">
                <Button
                  variant="link"
                  onClick={() => navigate('/investors/access')}
                  className="text-sm"
                >
                  Need to request access? Click here
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default InvestorLogin;

