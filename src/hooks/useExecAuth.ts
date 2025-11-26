/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { isCLevelPosition, getExecRoleFromPosition } from '@/utils/roleUtils';
import { FALLBACK_EXECUTIVES } from '@/data/executiveFallbacks';
import { isTorrance, hasFullAccess } from '@/utils/torranceAccess';

interface SupabaseAuthUser {
  id: string;
  email: string | null;
}

export interface ExecUser {
  id: string;
  user_id: string;
  role: string;
  access_level: number;
  title: string;
  department: string;
}

interface EmployeeRecord {
  id: string;
  user_id: string | null;
  position: string | null;
  department: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  work_email: string | null;
}

const PRIVILEGED_ROLES = new Set(['ceo', 'board_member', 'chairperson', 'chairman']);

const deriveRoleFromPosition = (position: string | null): string | null => {
  if (!position) return null;
  const derived = getExecRoleFromPosition(position);
  if (derived) return derived;
  if (isCLevelPosition(position)) return 'executive';
  return null;
};

export const useExecAuth = (requiredRole?: 'ceo' | 'board_member' | 'cfo' | 'coo' | 'cto') => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseAuthUser | null>(null);
  const [execUser, setExecUser] = useState<ExecUser | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const initialAuthCheckDone = useRef(false);

  // Keep navigateRef updated
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const resolveExecFromEmployee = useCallback(
    async (authUser: SupabaseAuthUser): Promise<boolean> => {
      const selectColumns = 'id, user_id, position, department, first_name, last_name, email, work_email';
      const email = authUser.email ?? '';

      const queries = [
        supabase.from('employees' as any).select(selectColumns).eq('user_id', authUser.id).maybeSingle(),
        supabase.from('employees' as any).select(selectColumns).ilike('email', email).maybeSingle(),
        supabase.from('employees' as any).select(selectColumns).ilike('work_email', email).maybeSingle(),
      ];

      let employeeData: EmployeeRecord | null = null;
      for (const promise of queries) {
        const { data } = await promise;
        if (data !== null && typeof data === 'object') {
          const dataObj = data as Record<string, any>;
          if ('id' in dataObj) {
            employeeData = dataObj as unknown as EmployeeRecord;
            break;
          }
        }
      }

      const derivedRole = deriveRoleFromPosition(employeeData?.position ?? null);
      if (!employeeData || !derivedRole) {
        const emailLower = authUser.email?.toLowerCase();
        const fallback = emailLower ? FALLBACK_EXECUTIVES.find((exec) => exec.email.toLowerCase() === emailLower) : undefined;
        if (fallback) {
          const fallbackExec: ExecUser = {
            id: fallback.id,
            user_id: authUser.id,
            role: fallback.role,
            access_level: 5,
            title: fallback.title,
            department: fallback.department,
          };
          setExecUser(fallbackExec);
          // CEO can access all portals (ceo, cfo, coo, cto, board_member)
          setIsAuthorized(!requiredRole || fallback.role === requiredRole || fallback.role === 'ceo');
          return true;
        }
        return false;
      }

      const fallbackExec: ExecUser = {
        id: employeeData.id || authUser.id,
        user_id: authUser.id,
        role: derivedRole,
        access_level: 5,
        title: employeeData.position || derivedRole.toUpperCase(),
        department: employeeData.department || 'Executive',
      };

      try {
        await supabase
          .from('exec_users' as any)
          .upsert(
            {
              user_id: authUser.id,
              role: derivedRole,
              access_level: 5,
              title: fallbackExec.title,
              department: fallbackExec.department,
              first_name: employeeData.first_name,
              last_name: employeeData.last_name,
              email: employeeData.email || employeeData.work_email || authUser.email,
            },
            { onConflict: 'user_id' }
          );
      } catch (err) {
        console.warn('Unable to sync employee record into exec_users', err);
      }

      setExecUser(fallbackExec);
      if (requiredRole) {
        setIsAuthorized(derivedRole === requiredRole || derivedRole === 'ceo');
      } else {
        setIsAuthorized(true);
      }
      return true;
    },
    [requiredRole]
  );

  const redirectToHub = useCallback(() => {
    const currentHost = window.location.hostname;
    const isHQ =
      currentHost === 'hq.cravenusa.com' ||
      currentHost === 'localhost' ||
      currentHost === '127.0.0.1' ||
      currentHost.includes('board.cravenusa.com') ||
      currentHost.includes('ceo.cravenusa.com') ||
      currentHost.includes('cfo.cravenusa.com') ||
      currentHost.includes('coo.cravenusa.com') ||
      currentHost.includes('cto.cravenusa.com');

    if (!isHQ && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      window.location.href = 'https://hq.cravenusa.com/hub';
    } else {
      navigateRef.current('/hub');
    }
  }, []); // No dependencies - using ref for navigate

  const checkAuth = useCallback(async () => {
    console.log('[useExecAuth] checkAuth called');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const currentUser = userData?.user as SupabaseAuthUser | null;

      if (userError || !currentUser) {
        setIsAuthorized(false);
        setLoading(false);
        redirectToHub();
        return;
      }

      setUser(currentUser);

      // TORRANCE STROMAN: FULL ACCESS TO EVERYTHING - NO RESTRICTIONS - CHECK FIRST
      // Check email in multiple ways to be absolutely sure
      const email = currentUser.email?.toLowerCase() || '';
      const emailNormalized = email.trim();
      const isTorranceEmail = 
        emailNormalized === 'tstroman.ceo@cravenusa.com' || 
        emailNormalized.includes('torrance') || 
        emailNormalized.includes('tstroman') ||
        currentUser.email?.toLowerCase().includes('torrance') ||
        currentUser.email?.toLowerCase().includes('tstroman') ||
        hasFullAccess(currentUser.email);
      
      if (isTorranceEmail) {
        console.log('✅ TORRANCE ACCESS GRANTED - FULL ACCESS:', currentUser.email);
        const ownerExec: ExecUser = {
          id: currentUser.id,
          user_id: currentUser.id,
          role: 'ceo',
          access_level: 10,
          title: 'Owner & CEO',
          department: 'Executive',
        };
        setExecUser(ownerExec);
        // Torrance has FULL ACCESS to ALL portals - bypass all checks
        setIsAuthorized(true);
        setLoading(false);
        return;
      }
      
      console.log('❌ Not Torrance, checking other auth methods:', currentUser.email);

      const { data: execData } = await supabase
        .from('exec_users' as any)
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (execData !== null && typeof execData === 'object') {
        const dataObj = execData as Record<string, any>;
        if ('id' in dataObj) {
          const execRow = dataObj as unknown as ExecUser;
        setExecUser(execRow);
        if (requiredRole) {
          // Allow access if role matches OR if user is CEO (CEO can access all portals)
          setIsAuthorized(execRow.role === requiredRole || execRow.role === 'ceo');
        } else {
          setIsAuthorized(true);
        }
      }
      } else {
        const resolved = await resolveExecFromEmployee(currentUser);
        if (!resolved) {
          setIsAuthorized(false);
          setExecUser(null);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  }, [redirectToHub, requiredRole, resolveExecFromEmployee]);

  useEffect(() => {
    // Only run initial check once
    if (!initialAuthCheckDone.current) {
      console.log('[useExecAuth] Running initial auth check');
      initialAuthCheckDone.current = true;
      checkAuth();
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useExecAuth] Auth state change:', event);
      
      if (event === 'SIGNED_OUT') {
        console.log('[useExecAuth] User signed out');
        setUser(null);
        setExecUser(null);
        setIsAuthorized(false);
        redirectToHub();
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Only re-check on actual sign in, not on token refresh
        console.log('[useExecAuth] User signed in, re-checking auth');
        checkAuth();
      } else if (event === 'TOKEN_REFRESHED') {
        // Explicitly ignore token refresh - no need to re-check everything
        console.log('[useExecAuth] Token refreshed, ignoring (no re-check needed)');
      } else if (event === 'INITIAL_SESSION') {
        // Explicitly ignore initial session - already handled above
        console.log('[useExecAuth] Initial session detected, ignoring (already checked)');
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [checkAuth, redirectToHub]);

  const signOut = async () => {
    await supabase.auth.signOut();
    redirectToHub();
  };

  return {
    loading,
    user,
    execUser,
    isAuthorized,
    signOut,
  };
};
