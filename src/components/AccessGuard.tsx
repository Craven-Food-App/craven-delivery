import React, { useEffect, useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { hasFullAccess } from '@/utils/torranceAccess';

interface AccessGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AccessGuard: React.FC<AccessGuardProps> = ({ children, fallback }) => {
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsApproved(false);
        return;
      }

      setUser(user);

      // TORRANCE STROMAN: FULL ACCESS TO EVERYTHING
      if (hasFullAccess(user.email)) {
        setIsApproved(true);
        setOnboardingComplete(true);
        return;
      }

      // OWNER ACCOUNT: craven@usa.com has universal access
      if (user.email === 'craven@usa.com') {
        setIsApproved(true);
        setOnboardingComplete(true);
        return;
      }

      const { data, error } = await (supabase as any)
        .from('craver_applications')
        .select('status, onboarding_completed_at')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .single();

      const approved = !error && data?.status === 'approved';
      const completed = data?.onboarding_completed_at != null;

      setIsApproved(approved);
      setOnboardingComplete(completed);

      // If approved but onboarding not complete, redirect to onboarding
      if (approved && !completed) {
        startTransition(() => {
          navigate('/enhanced-onboarding');
        });
      }
    };

    checkAccess();
  }, [navigate]);

  if (isApproved === null || onboardingComplete === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !isApproved) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">You need an approved Feeder application to access this page.</p>
      </div>
    );
  }

  if (!onboardingComplete) {
    // User is approved but hasn't completed onboarding - redirect handled in useEffect
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AccessGuard;