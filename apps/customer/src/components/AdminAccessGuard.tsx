import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { hasFullAccess } from '@/utils/torranceAccess';

interface AdminAccessGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AdminAccessGuard: React.FC<AdminAccessGuardProps> = ({ children, fallback }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        return;
      }

      setUser(user);

      // TORRANCE STROMAN: FULL ACCESS TO EVERYTHING
      if (hasFullAccess(user.email)) {
        setIsAdmin(true);
        return;
      }

      // OWNER ACCOUNT: craven@usa.com has universal admin access
      if (user.email === 'craven@usa.com') {
        setIsAdmin(true);
        return;
      }

      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!error && data?.role === 'admin');
    };

    checkAdminAccess();
  }, []);

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
        <p className="text-muted-foreground">You need admin privileges to access this area.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminAccessGuard;