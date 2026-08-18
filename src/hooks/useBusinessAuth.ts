import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const FALLBACK_ROUTE = '/hub';

/**
 * Normalize ?redirect= so navigation always targets an app path (leading /).
 * Values like "merchant-portal" would otherwise resolve relative to /business-auth and break.
 */
export function normalizeRedirectPath(raw: string | null | undefined): string {
  if (raw == null || typeof raw !== 'string') return FALLBACK_ROUTE;
  let path = raw.trim();
  if (!path) return FALLBACK_ROUTE;
  if (/^https?:\/\//i.test(path)) {
    try {
      const u = new URL(path);
      if (u.origin === window.location.origin) {
        return `${u.pathname}${u.search}${u.hash}`;
      }
      return FALLBACK_ROUTE;
    } catch {
      return FALLBACK_ROUTE;
    }
  }
  if (path.startsWith('//')) return FALLBACK_ROUTE;
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

/**
 * Password reset links are opened outside the app, so they always have to point
 * at the public website rather than the current origin.
 */
function resetPasswordRedirectUrl(): string {
  const appBaseUrl =
    import.meta.env.VITE_APP_BASE_URL ||
    import.meta.env.APP_BASE_URL ||
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_APP_URL;

  if (appBaseUrl) {
    return `${String(appBaseUrl).replace(/\/+$/, '')}/executive/reset-password`;
  }

  const hostname = window.location.hostname;
  if (hostname.includes('lovableproject.com')) {
    return `https://${hostname}/executive/reset-password`;
  }
  return 'https://cravenusa.com/executive/reset-password';
}

export type BusinessAuthNavigation = {
  /** Send an authenticated user to the resolved post-login route. */
  toRedirectTarget: (path: string) => void;
  /** Send a user with a temporary password to the forced-change screen. */
  toExecutiveProfile: () => void;
  /** Drop reset/recovery params once a password change completes. */
  clearAuthParams?: () => void;
};

export type BusinessAuthMode = 'signIn' | 'reset' | 'updatePassword';

export function useBusinessAuth(options: {
  navigation: BusinessAuthNavigation;
  /** Query string to read ?redirect= from. Defaults to window.location.search. */
  search?: string;
}) {
  const { navigation, search } = options;
  const { toast } = useToast();

  const [mode, setMode] = useState<BusinessAuthMode>('signIn');
  const [email, setEmailValue] = useState('');
  const [password, setPasswordValue] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Kept in refs so the auth listener never re-subscribes when a caller
  // re-renders with new closures.
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;
  const searchRef = useRef(search);
  searchRef.current = search;
  const redirectTimer = useRef<number | null>(null);

  const goToRedirectTarget = useCallback(() => {
    const params = new URLSearchParams(searchRef.current || window.location.search);
    navigationRef.current.toRedirectTarget(normalizeRedirectPath(params.get('redirect')));
  }, []);

  const scheduleRedirect = useCallback(() => {
    if (redirectTimer.current) window.clearTimeout(redirectTimer.current);
    redirectTimer.current = window.setTimeout(goToRedirectTarget, 1000);
  }, [goToRedirectTarget]);

  useEffect(
    () => () => {
      if (redirectTimer.current) window.clearTimeout(redirectTimer.current);
    },
    [],
  );

  const hasRecoveryHash = () =>
    new URLSearchParams(window.location.hash.substring(1)).get('type') === 'recovery';

  useEffect(() => {
    const checkExistingSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (user.user_metadata?.temp_password === true || hasRecoveryHash()) {
        navigationRef.current.toExecutiveProfile();
        return;
      }
      // Navigate without flipping into the redirecting state, so a failed
      // navigation cannot leave the user stuck on a spinner.
      goToRedirectTarget();
    };

    void checkExistingSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_IN' || !session?.user) return;

      if (session.user.user_metadata?.temp_password === true || hasRecoveryHash()) {
        setMode('signIn');
        setResetSent(false);
        setIsRedirecting(false);
        navigationRef.current.toExecutiveProfile();
        return;
      }

      setIsRedirecting(true);
      toast({ title: 'Welcome!', description: "You've been signed in successfully." });
      scheduleRedirect();
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const checkRecoverySession = async () => {
      const params = new URLSearchParams(searchRef.current || window.location.search);
      if (params.get('reset') !== 'true' && !hasRecoveryHash()) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) navigationRef.current.toExecutiveProfile();
    };

    void checkRecoverySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clearing on edit keeps a failed attempt from latching the form closed.
  const setEmail = useCallback((value: string) => {
    setEmailValue(value);
    setError(null);
  }, []);

  const setPassword = useCallback((value: string) => {
    setPasswordValue(value);
    setError(null);
  }, []);

  const signIn = useCallback(async () => {
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please enter both email and password',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        throw authError;
      }

      if (data.user) {
        if (data.user.user_metadata?.temp_password === true) {
          navigationRef.current.toExecutiveProfile();
          return;
        }
        toast({ title: 'Success!', description: 'Signing you in...' });
        scheduleRedirect();
      }
    } catch (caught: any) {
      console.error('Sign in error:', caught);
      const message = caught?.message || 'An error occurred during sign in';
      setError(message);
      toast({ title: 'Sign In Failed', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, scheduleRedirect, toast]);

  const sendResetEmail = useCallback(async () => {
    if (!resetEmail) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: resetPasswordRedirectUrl(),
      });
      if (resetError) throw resetError;

      setResetSent(true);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Please check your email for password reset instructions.',
      });
    } catch (caught: any) {
      console.error('Password reset error:', caught);
      const message = caught?.message || 'Failed to send password reset email';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  }, [resetEmail, toast]);

  const updatePassword = useCallback(async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please enter both password fields',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingPassword(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { temp_password: false, temp_password_set_at: null },
      });
      if (updateError) throw updateError;

      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated. Signing you in...',
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setMode('signIn');
      setNewPassword('');
      setConfirmPassword('');
      setResetSent(false);
      navigationRef.current.clearAuthParams?.();

      if (user) scheduleRedirect();
    } catch (caught: any) {
      console.error('Password update error:', caught);
      const message = caught?.message || 'Failed to update password';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsUpdatingPassword(false);
    }
  }, [confirmPassword, newPassword, scheduleRedirect, toast]);

  const startPasswordReset = useCallback(() => {
    setMode('reset');
    setResetEmail(email);
    setError(null);
  }, [email]);

  const cancelPasswordReset = useCallback(() => {
    setMode('signIn');
    setResetEmail('');
    setError(null);
    setResetSent(false);
  }, []);

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    resetEmail,
    setResetEmail,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    resetSent,
    isSubmitting,
    isResetting,
    isUpdatingPassword,
    isRedirecting,
    signIn,
    sendResetEmail,
    updatePassword,
    startPasswordReset,
    cancelPasswordReset,
  };
}

export type BusinessAuthController = ReturnType<typeof useBusinessAuth>;
