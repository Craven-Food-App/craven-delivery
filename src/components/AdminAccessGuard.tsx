import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AdminAccessGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AdminAccessGuard: React.FC<AdminAccessGuardProps> = ({ children, fallback }) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        return;
      }

      setUser(user);

      const userEmail = (user.email || '').toLowerCase();
      const isJustinSweet = userEmail === 'jsweet.cfo@cravenusa.com';

      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      const isAdmin = !error && data?.role === 'admin';
      if (isAdmin) {
        setHasAccess(true);
        return;
      }

      const { data: execUser } = await (supabase as any)
        .from('exec_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const isCfoExec = execUser?.role?.toLowerCase() === 'cfo';
      setHasAccess(isCfoExec || isJustinSweet);
    };

    checkAdminAccess();
  }, []);

  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !hasAccess) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
        <p className="text-muted-foreground">You need admin privileges (or CFO read-only authorization) to access this area.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminAccessGuard;