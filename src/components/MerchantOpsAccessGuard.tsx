import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface MerchantOpsAccessGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const MerchantOpsAccessGuard: React.FC<MerchantOpsAccessGuardProps> = ({ children, fallback }) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setHasAccess(false);
        return;
      }

      // Check admin role in user_roles
      const { data: adminRole } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminRole?.role === 'admin') {
        setHasAccess(true);
        return;
      }

      // Check exec role (cpo, ceo) in exec_users
      const { data: execUser } = await (supabase as any)
        .from('exec_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const userEmail = (user.email || '').toLowerCase();
      const isJustinSweet = userEmail === 'jsweet.cfo@cravenusa.com';
      const isExecWithAccess = ['cpo', 'ceo', 'cfo'].includes(execUser?.role?.toLowerCase()) || isJustinSweet;
      setHasAccess(isExecWithAccess);
    };

    checkAccess();
  }, []);

  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Access Required</h1>
        <p className="text-muted-foreground">You need admin or executive privileges to access Merchant Operations.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default MerchantOpsAccessGuard;
