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
  Badge,
  Container,
  Grid,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBuildingStore,
  IconChefHat,
  IconUsers,
  IconTrendingUp,
  IconLoader2,
} from '@tabler/icons-react';
import merchantSignupBg from '@/assets/merchant-signup-bg.png';

const RestaurantAuth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already signed in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Check if user has a restaurant
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('id')
          .eq('owner_id', user.id)
          .single();
        
        if (restaurant) {
          navigate('/merchant-portal');
        } else {
          navigate('/restaurant/register');
        }
      }
    };
    
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          notifications.show({
            title: "Welcome back!",
            message: "You've been signed in successfully.",
            color: 'green',
          });
          
          // Check for restaurant after successful login
          setTimeout(async () => {
            const { data: restaurant } = await supabase
              .from('restaurants')
              .select('id')
              .eq('owner_id', session.user.id)
              .single();
            
            if (restaurant) {
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
      notifications.show({
        title: "Error",
        message: "Please fill in all fields",
        color: 'red',
      });
      return;
    }

    setLoading(true);
    
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Cleanup signout:', err);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        throw error;
      }

      if (data.user) {
        notifications.show({
          title: "Success!",
          message: "Signing you in...",
          color: 'green',
        });
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      notifications.show({
        title: "Sign In Failed",
        message: error.message || 'An error occurred during sign in',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      notifications.show({
        title: "Error",
        message: "Please enter both email and password",
        color: 'red',
      });
      return;
    }

    if (password.length < 6) {
      notifications.show({
        title: "Error",
        message: "Password must be at least 6 characters long",
        color: 'red',
      });
      return;
    }

    setLoading(true);
    
    try {
      cleanupAuthState();
      
      const redirectUrl = `${window.location.origin}/restaurant/register`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
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
    } catch (error: any) {
      console.error('Sign up error:', error);
      notifications.show({
        title: "Sign Up Failed",
        message: error.message || 'An error occurred during sign up',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <Box style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Redirecting to your restaurant dashboard...</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box 
      style={{ 
        minHeight: '100vh', 
        backgroundImage: `url(${merchantSignupBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Box
        style={{
          minHeight: '100vh',
          backgroundColor: 'rgba(255, 255, 255, 0.95)', // Semi-transparent overlay for readability
        }}
      >
        <Container size="xl" py="xl">
        {/* Header */}
        <Stack align="center" gap="md" mb="xl">
          <Group gap="xs">
            <IconBuildingStore size={32} color="var(--mantine-color-orange-6)" />
            <Title order={1}>Restaurant Portal</Title>
          </Group>
          <Text size="lg" c="dimmed" ta="center">
            Manage your restaurant, track orders, and grow your business
          </Text>
        </Stack>

        <Grid gutter="xl">
          {/* Features Section */}
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Stack gap="xl">
              <Title order={2} ta={{ base: 'center', lg: 'left' }}>Why Choose Crave'n for Your Restaurant?</Title>

              <Stack gap="md">
                <Card p="md" withBorder>
                  <Group align="flex-start" gap="md">
                    <IconChefHat size={24} color="var(--mantine-color-orange-6)" />
                    <div>
                      <Text fw={600} mb="xs">Easy Menu Management</Text>
                      <Text size="sm" c="dimmed">
                        Upload and organize your menu items with photos, prices, and descriptions
                      </Text>
                    </div>
                  </Group>
                </Card>

                <Card p="md" withBorder>
                  <Group align="flex-start" gap="md">
                    <IconUsers size={24} color="var(--mantine-color-orange-6)" />
                    <div>
                      <Text fw={600} mb="xs">Real-time Order Management</Text>
                      <Text size="sm" c="dimmed">
                        Track orders from placement to delivery with instant notifications
                      </Text>
                    </div>
                  </Group>
                </Card>

                <Card p="md" withBorder>
                  <Group align="flex-start" gap="md">
                    <IconTrendingUp size={24} color="var(--mantine-color-orange-6)" />
                    <div>
                      <Text fw={600} mb="xs">Business Analytics</Text>
                      <Text size="sm" c="dimmed">
                        Monitor your restaurant's performance with detailed insights
                      </Text>
                    </div>
                  </Group>
                </Card>
              </Stack>

              <Card p="md" withBorder bg="orange.0">
                <Stack gap="xs">
                  <Badge color="orange">Special Offer</Badge>
                  <Text size="sm">
                    Join now and get your first month of premium features absolutely free!
                  </Text>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>

          {/* Auth Form */}
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Card w="100%" maw={400} p="xl" withBorder>
                <Stack gap="md">
                  <Stack gap="xs" align="center">
                    <Title order={2}>Restaurant Access</Title>
                    <Text size="sm" c="dimmed" ta="center">
                      Sign in to your restaurant account or create a new one
                    </Text>
                  </Stack>

                  <Tabs defaultValue="signin">
                    <Tabs.List>
                      <Tabs.Tab value="signin">Sign In</Tabs.Tab>
                      <Tabs.Tab value="signup">Get Started</Tabs.Tab>
                    </Tabs.List>
                    
                    <Tabs.Panel value="signin" pt="md">
                      <form onSubmit={handleSignIn}>
                        <Stack gap="md">
                          <TextInput
                            label="Email"
                            type="email"
                            placeholder="Enter your restaurant email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                          />
                          
                          <TextInput
                            label="Password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                          />
                          
                          <Button 
                            type="submit" 
                            fullWidth
                            disabled={loading}
                            leftSection={loading ? <Loader size="sm" /> : null}
                          >
                            {loading ? 'Signing In...' : 'Access Restaurant Dashboard'}
                          </Button>
                        </Stack>
                      </form>
                    </Tabs.Panel>
                    
                    <Tabs.Panel value="signup" pt="md">
                      <form onSubmit={handleSignUp}>
                        <Stack gap="md">
                          <TextInput
                            label="Restaurant Email"
                            type="email"
                            placeholder="Enter your restaurant email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                          />
                          
                          <TextInput
                            label="Password"
                            type="password"
                            placeholder="Create a secure password (min 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                            minLength={6}
                          />
                          
                          <Button 
                            type="submit" 
                            fullWidth
                            disabled={loading}
                            leftSection={loading ? <Loader size="sm" /> : null}
                          >
                            {loading ? 'Creating Account...' : 'Create Restaurant Account'}
                          </Button>
                        </Stack>
                      </form>
                    </Tabs.Panel>
                  </Tabs>
                  
                  <Stack gap="xs" align="center" mt="xl">
                    <Button 
                      variant="subtle"
                      onClick={() => navigate('/auth')}
                      size="sm"
                    >
                      Customer Login
                    </Button>
                    <Button 
                      variant="subtle"
                      onClick={() => navigate('/')}
                      size="sm"
                    >
                      Back to Home
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            </Box>
          </Grid.Col>
        </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default RestaurantAuth;