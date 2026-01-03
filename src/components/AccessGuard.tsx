import React, { useEffect, useState, startTransition, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { hasFullAccess } from '@/utils/torranceAccess';

interface AccessGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface CachedAccessState {
  granted: boolean;
  onboardingComplete: boolean;
  timestamp: number;
  userId: string;
}

const CACHE_KEY = 'driver_access_state';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const VALIDATION_TIMEOUT = 3000; // 3 seconds

const AccessGuard: React.FC<AccessGuardProps> = ({ children, fallback }) => {
  const [accessState, setAccessState] = useState<'loading' | 'granted' | 'denied' | 'validating'>('loading');
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  /**
   * Load cached access state from localStorage
   * Returns null if cache is expired, invalid, or doesn't exist
   */
  const loadCachedState = (): CachedAccessState | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const state: CachedAccessState = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid (not expired)
      if (now - state.timestamp < CACHE_TTL) {
        return state;
      }
      
      // Cache expired, clear it
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (error) {
      console.error('[AccessGuard] Error loading cache:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  };

  /**
   * Save access state to localStorage cache
   */
  const saveCachedState = (granted: boolean, onboardingComplete: boolean, userId: string): void => {
    try {
      const state: CachedAccessState = {
        granted,
        onboardingComplete,
        timestamp: Date.now(),
        userId
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('[AccessGuard] Error saving cache:', error);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const validateAccess = async (): Promise<void> => {
      try {
        // Step 1: Load cached state immediately for instant UI
        const cached = loadCachedState();
        
        // Step 2: Get current user with timeout
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), VALIDATION_TIMEOUT)
        );

        let authResult;
        try {
          authResult = await Promise.race([getUserPromise, timeoutPromise]);
        } catch (error) {
          // Timeout or error - use cached state if available
          if (cached) {
            if (isMountedRef.current) {
              setAccessState(cached.granted ? 'granted' : 'denied');
              setOnboardingComplete(cached.onboardingComplete);
            }
            return;
          }
          // No cache, deny access
          if (isMountedRef.current) {
            setAccessState('denied');
            setOnboardingComplete(false);
          }
          return;
        }

        const { data: { user }, error: userError } = authResult as any;

        if (userError || !user) {
          if (isMountedRef.current) {
            setAccessState('denied');
            setOnboardingComplete(false);
          }
          saveCachedState(false, false, '');
          return;
        }

        if (isMountedRef.current) {
          setUser(user);
        }

        // Step 3: Check if user has full access (Torrance/CEO)
        if (hasFullAccess(user.email)) {
          if (isMountedRef.current) {
            setAccessState('granted');
            setOnboardingComplete(true);
          }
          saveCachedState(true, true, user.id);
          return;
        }

        // Step 4: Check owner account
        if (user.email === 'craven@usa.com') {
          if (isMountedRef.current) {
            setAccessState('granted');
            setOnboardingComplete(true);
          }
          saveCachedState(true, true, user.id);
          return;
        }

        // Step 5: Validate driver application status (with timeout)
        if (isMountedRef.current) {
          setAccessState('validating');
        }

        const queryPromise = supabase
          .from('craver_applications')
          .select('status, onboarding_completed_at')
          .eq('user_id', user.id)
          .in('status', ['approved', 'active', 'pending_review'])
          .maybeSingle();

        const queryTimeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), VALIDATION_TIMEOUT)
        );

        let applicationData;
        try {
          const result = await Promise.race([queryPromise, queryTimeoutPromise]);
          applicationData = result as any;
        } catch (error) {
          // Query timeout or error - use cached state if available and valid for this user
          if (cached && cached.userId === user.id) {
            if (isMountedRef.current) {
              setAccessState(cached.granted ? 'granted' : 'denied');
              setOnboardingComplete(cached.onboardingComplete);
            }
            return;
          }
          // No valid cache, deny access
          if (isMountedRef.current) {
            setAccessState('denied');
            setOnboardingComplete(false);
          }
          saveCachedState(false, false, user.id);
          return;
        }

        // Step 6: Determine access based on application status
        if (!applicationData || applicationData.error) {
          if (isMountedRef.current) {
            setAccessState('denied');
            setOnboardingComplete(false);
          }
          saveCachedState(false, false, user.id);
          return;
        }

        const { status, onboarding_completed_at } = applicationData;

        // Allow access for:
        // - active drivers (fully activated)
        // - approved drivers who completed onboarding
        // - drivers pending review (completed all steps)
        const isActive = status === 'active';
        const isApprovedWithOnboarding = status === 'approved' && onboarding_completed_at != null;
        const isPendingReview = status === 'pending_review';

        const hasAccess = isActive || isApprovedWithOnboarding || isPendingReview;
        const completed = onboarding_completed_at != null;

        if (isMountedRef.current) {
          setAccessState(hasAccess ? 'granted' : 'denied');
          setOnboardingComplete(completed);
        }

        saveCachedState(hasAccess, completed, user.id);

        // Step 7: Redirect if approved but onboarding not complete
        if (status === 'approved' && !completed) {
          startTransition(() => {
            navigate('/enhanced-onboarding');
          });
        }
      } catch (error) {
        console.error('[AccessGuard] Unexpected error:', error);
        
        // On error, check if user is Torrance - if so, grant access anyway
        try {
          const { data: { user: errorUser } } = await supabase.auth.getUser();
          if (errorUser && hasFullAccess(errorUser.email)) {
            if (isMountedRef.current) {
              setAccessState('granted');
              setOnboardingComplete(true);
            }
            saveCachedState(true, true, errorUser.id);
            return;
          }
        } catch (fallbackError) {
          console.error('[AccessGuard] Error in fallback check:', fallbackError);
        }

        // Use cached state if available
        const cached = loadCachedState();
        if (cached) {
          if (isMountedRef.current) {
            setAccessState(cached.granted ? 'granted' : 'denied');
            setOnboardingComplete(cached.onboardingComplete);
          }
          return;
        }

        // No cache, deny access
        if (isMountedRef.current) {
          setAccessState('denied');
          setOnboardingComplete(false);
        }
      }
    };

    // Load cached state immediately for instant UI
    const cached = loadCachedState();
    if (cached) {
      setAccessState(cached.granted ? 'granted' : 'denied');
      setOnboardingComplete(cached.onboardingComplete);
    }

    // Then validate in background
    validateAccess();

    return () => {
      isMountedRef.current = false;
    };
  }, [navigate]);

  // Show loading only if no cached state and still loading
  if (accessState === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#ffffff' }}>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // Show validating indicator (optional, can remove if you want seamless)
  if (accessState === 'validating') {
    // Still show children while validating (progressive enhancement)
    return <>{children}</>;
  }

  // Access denied
  if (accessState === 'denied' || !user) {
    return fallback || (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f3e8ff 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#1f2937' }}>Access Denied</h1>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>You need an approved Feeder application to access this page.</p>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>Please log in or apply to become a Feeder driver.</p>
        </div>
      </div>
    );
  }

  // Onboarding not complete - redirect handled in useEffect, but show loading here
  if (accessState === 'granted' && onboardingComplete === false) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#ffffff' }}>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // Access granted
  return <>{children}</>;
};

export default AccessGuard;
