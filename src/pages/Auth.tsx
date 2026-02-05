import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Container, 
  Paper, 
  Title, 
  Text, 
  TextInput, 
  PasswordInput, 
  Button, 
  Group, 
  Stack,
  Anchor,
  Divider,
  Alert
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconUser, IconMail, IconLock } from '@tabler/icons-react';
import cravenLogo from "@/assets/craven-logo.png";

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const getRedirectPath = () => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get('redirect');
    if (redirect) return redirect;
    const from = (location.state as any)?.from?.pathname;
    return from || '/restaurants';
  };

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const target = getRedirectPath();
        navigate(target, { replace: true });
      }
    };
    checkAuth();
  }, [navigate, location]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const target = getRedirectPath();
      navigate(target, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
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

      if (data.user && !data.session) {
        setError('Please check your email to confirm your account.');
      } else {
        const target = getRedirectPath();
        navigate(target, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    localStorage.setItem('guest_mode', 'true');
    const target = getRedirectPath();
    navigate(target, { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <Container size="xs" style={{ width: '100%', maxWidth: '420px' }}>
        <Stack gap="lg">
          {/* Logo */}
          <div style={{ textAlign: 'center' }}>
            <img 
              src={cravenLogo} 
              alt="Crave'n Delivery" 
              style={{ height: '64px', marginBottom: '16px' }}
            />
            <Title order={2} c="white" style={{ marginBottom: '8px' }}>
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </Title>
            <Text size="sm" c="white" style={{ opacity: 0.9 }}>
              {mode === 'signin' 
                ? 'Sign in to your Crave\'n account'
                : 'Join Crave\'n and start ordering'
              }
            </Text>
          </div>

          {/* Auth Form */}
          <Paper shadow="lg" p="xl" radius="lg">
            <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}>
              <Stack gap="md">
                {error && (
                  <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                    {error}
                  </Alert>
                )}

                {mode === 'signup' && (
                  <TextInput
                    label="Full Name"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    leftSection={<IconUser size={16} />}
                  />
                )}

                <TextInput
                  label="Email"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  leftSection={<IconMail size={16} />}
                />

                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  leftSection={<IconLock size={16} />}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  variant="gradient"
                  gradient={{ from: 'orange', to: 'red', deg: 90 }}
                  loading={loading}
                >
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Button>

                <Divider label="OR" labelPosition="center" />

                <Button
                  type="button"
                  fullWidth
                  variant="light"
                  color="gray"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={handleContinueAsGuest}
                >
                  Continue as Guest
                </Button>

                <Group justify="center">
                  <Text size="sm" c="dimmed">
                    {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                  </Text>
                  <Anchor
                    component="button"
                    type="button"
                    size="sm"
                    onClick={() => {
                      setMode(mode === 'signin' ? 'signup' : 'signin');
                      setError('');
                    }}
                  >
                    {mode === 'signin' ? 'Sign up' : 'Sign in'}
                  </Anchor>
                </Group>
              </Stack>
            </form>
          </Paper>

          {/* Legal links */}
          <Group justify="center" gap="xs">
            <Anchor
              component="button"
              type="button"
              size="xs"
              c="white"
              onClick={() => navigate("/legal/privacy")}
            >
              Privacy Policy
            </Anchor>
            <Text size="xs" c="white">•</Text>
            <Anchor
              component="button"
              type="button"
              size="xs"
              c="white"
              onClick={() => navigate("/legal/terms")}
            >
              Terms of Service
            </Anchor>
          </Group>
        </Stack>
      </Container>
    </div>
  );
};

export default Auth;
