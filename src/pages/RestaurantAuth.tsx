import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Button,
  TextInput,
  Card,
  Tabs,
  Text,
  Title,
  Stack,
  Group,
  Box,
  Loader,
  Container,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import craveCLogo from '@/assets/crave-c-logo.png';

// Background: craven-merchant-app-bg.png from public folder (also in apps/tablet/public)
const MERCHANT_AUTH_BG = '/craven-merchant-app-bg.png';

const RestaurantAuth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: restaurants } = await supabase
          .from('restaurants')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1);

        if (restaurants && restaurants.length > 0) {
          navigate('/merchant-portal');
        } else {
          navigate('/restaurant/register');
        }
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          notifications.show({
            title: "Welcome back!",
            message: "You've been signed in successfully.",
            color: 'green',
          });

          setTimeout(async () => {
            const { data: restaurants } = await supabase
              .from('restaurants')
              .select('id')
              .eq('owner_id', session.user.id)
              .limit(1);

            if (restaurants && restaurants.length > 0) {
              navigate('/merchant-portal');
            } else {
              navigate('/restaurant/register');
            }
          }, 1000);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      notifications.show({ title: "Error", message: "Please fill in all fields", color: 'red' });
      return;
    }
    setLoading(true);
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        /* ignore */
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        throw error;
      }
      if (data.user) {
        notifications.show({ title: "Success!", message: "Signing you in...", color: 'green' });
      }
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      notifications.show({
        title: "Sign In Failed",
        message: (error as Error)?.message || 'An error occurred during sign in',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      notifications.show({ title: "Error", message: "Please enter both email and password", color: 'red' });
      return;
    }
    if (password.length < 6) {
      notifications.show({ title: "Error", message: "Password must be at least 6 characters long", color: 'red' });
      return;
    }
    setLoading(true);
    try {
      cleanupAuthState();
      const redirectUrl = `${window.location.origin}/restaurant/register`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) {
        if (error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        throw error;
      }
      if (data.user) {
        notifications.show({
          title: "Account Created!",
          message: "Please check your email to confirm your account, then you can register your restaurant.",
          color: 'green',
        });
      }
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      notifications.show({
        title: "Sign Up Failed",
        message: (error as Error)?.message || 'An error occurred during sign up',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <Box style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--mantine-color-dark-8)' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" color="orange" />
          <Text c="gray.3">Redirecting to your merchant dashboard...</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundImage: `url(${MERCHANT_AUTH_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay for readability, keeps background visible */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      />
      <Box
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Container size="sm">
          <Stack align="center" gap="xl">
            <Group gap="sm" style={{ marginBottom: 8 }}>
              <img src={craveCLogo} alt="Crave'n" style={{ height: 40, width: 'auto' }} />
              <Title order={1} c="white" style={{ letterSpacing: '-0.02em' }}>
                Merchant Portal
              </Title>
            </Group>
            <Text c="gray.4" size="lg" ta="center">
              Sign in to manage your store, orders, and catalog
            </Text>

            <Card
              p="xl"
              radius="md"
              withBorder
              style={{
                width: '100%',
                maxWidth: 420,
                backgroundColor: 'rgba(255, 255, 255, 0.97)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }}
            >
              <Tabs defaultValue="signin">
                <Tabs.List grow mb="md">
                  <Tabs.Tab value="signin">Sign In</Tabs.Tab>
                  <Tabs.Tab value="signup">Get Started</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="signin">
                  <form onSubmit={handleSignIn}>
                    <Stack gap="md">
                      <TextInput
                        label="Email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                        size="md"
                      />
                      <TextInput
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        size="md"
                      />
                      <Button
                        type="submit"
                        fullWidth
                        size="md"
                        color="orange"
                        disabled={loading}
                        leftSection={loading ? <Loader size="sm" color="white" /> : null}
                      >
                        {loading ? 'Signing in…' : 'Sign in'}
                      </Button>
                    </Stack>
                  </form>
                </Tabs.Panel>

                <Tabs.Panel value="signup">
                  <form onSubmit={handleSignUp}>
                    <Stack gap="md">
                      <TextInput
                        label="Email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                        size="md"
                      />
                      <TextInput
                        label="Password"
                        type="password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        minLength={6}
                        size="md"
                      />
                      <Button
                        type="submit"
                        fullWidth
                        size="md"
                        color="orange"
                        disabled={loading}
                        leftSection={loading ? <Loader size="sm" color="white" /> : null}
                      >
                        {loading ? 'Creating account…' : 'Create account'}
                      </Button>
                    </Stack>
                  </form>
                </Tabs.Panel>
              </Tabs>

              <Stack gap="xs" align="center" mt="lg">
                <Button variant="subtle" size="sm" color="gray" onClick={() => navigate('/auth')}>
                  Customer login
                </Button>
                <Button variant="subtle" size="sm" color="gray" onClick={() => navigate('/')}>
                  Back to home
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default RestaurantAuth;
