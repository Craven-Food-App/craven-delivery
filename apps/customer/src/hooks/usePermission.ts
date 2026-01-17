import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePermission(permissionKey: string): boolean {
  const [allowed, setAllowed] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Validate permission key
      if (!permissionKey || typeof permissionKey !== 'string') {
        console.error('usePermission: Invalid permission key', permissionKey);
        if (!cancelled) setAllowed(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setAllowed(false);
        return;
      }

      const { data, error } = await supabase.rpc('has_permission', {
        p_user_id: user.id,
        p_permission: permissionKey,
      });

      if (error) {
        console.error('usePermission: Error checking permission', {
          permissionKey,
          userId: user.id,
          error: error.message,
          details: error,
        });
      }

      if (!cancelled) setAllowed(!error && Boolean(data));
    })();
    return () => {
      cancelled = true;
    };
  }, [permissionKey]);

  return allowed;
}


