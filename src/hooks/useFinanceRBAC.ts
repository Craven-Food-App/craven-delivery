import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { hasFullAccess, hasCFOPortalAccess } from '@/utils/torranceAccess';

export interface FinanceRole {
  id: string;
  role_code: string;
  role_name: string;
  role_category: string;
  access_level: string;
}

export interface FinanceUserRole {
  id: string;
  user_id: string;
  role_id: string;
  entity_id: string | null;
  region_codes: string[] | null;
  department_codes: string[] | null;
  gl_account_ranges: string[] | null;
  role: FinanceRole;
}

export interface FinancePermission {
  id: string;
  permission_code: string;
  permission_name: string;
  resource_type: string;
  action_type: string;
  conditions?: any;
}

export const useFinanceRBAC = () => {
  const [user, setUser] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<FinanceUserRole[]>([]);
  const [permissions, setPermissions] = useState<FinancePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCFO, setIsCFO] = useState(false);
  const [hasFullAdmin, setHasFullAdmin] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      
      // TORRANCE STROMAN: UNIVERSAL ACCESS - BYPASS ROLE FETCHING
      if (authUser && hasCFOPortalAccess(authUser.email || '')) {
        setIsCFO(true);
        setHasFullAdmin(true);
        setLoading(false);
        return;
      }
      
      if (authUser) {
        fetchUserRoles(authUser.id);
      } else {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const fetchUserRoles = async (userId: string) => {
    
    setLoading(true);
    try {
      // Fetch user's finance roles with role details
      const { data: rolesData, error: rolesError } = await supabase
        .from('finance_user_roles')
        .select(`
          *,
          role:finance_roles(*)
        `)
        .eq('user_id', userId)
        .eq('approval_status', 'approved')
        .or(`expiration_date.is.null,expiration_date.gte.${new Date().toISOString().split('T')[0]}`);

      if (rolesError) throw rolesError;

      const roles = rolesData || [];
      setUserRoles(roles);
      
      // Check if user is CFO
      const cfoRole = roles.find((r: any) => r.role?.role_code === 'CFO');
      setIsCFO(!!cfoRole);
      setHasFullAdmin(!!cfoRole || roles.some((r: any) => r.role?.access_level === 'FULL_ADMIN'));

      // Fetch permissions for user's roles
      if (roles.length > 0) {
        const roleIds = roles.map((r: any) => r.role_id);
        const { data: permsData, error: permsError } = await supabase
          .from('finance_role_permissions')
          .select(`
            *,
            permission:finance_permissions(*)
          `)
          .in('role_id', roleIds);

        if (permsError) throw permsError;

        const userPermissions = (permsData || []).map((rp: any) => ({
          ...rp.permission,
          conditions: rp.conditions,
        }));
        setPermissions(userPermissions);
      }
    } catch (error) {
      console.error('Error fetching finance roles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has specific permission
  const hasPermission = (permissionCode: string, entityId?: string): boolean => {
    // TORRANCE STROMAN: UNIVERSAL ACCESS
    if (user?.email && hasFullAccess(user.email)) return true;
    if (hasFullAdmin) return true; // CFO and full admins bypass permission checks
    
    return permissions.some(perm => {
      if (perm.permission_code !== permissionCode) return false;
      
      // Check entity restrictions if entityId provided
      if (entityId) {
        const roleAssignment = userRoles.find(ur => 
          ur.entity_id === entityId || ur.entity_id === null
        );
        if (!roleAssignment) return false;
      }
      
      return true;
    });
  };

  // Check if user has any role in a category
  const hasRoleCategory = (category: string): boolean => {
    return userRoles.some(ur => ur.role?.role_category === category);
  };

  // Check if user has specific role code
  const hasRole = (roleCode: string): boolean => {
    return userRoles.some(ur => ur.role?.role_code === roleCode);
  };

  // Get user's assigned GL account ranges
  const getAssignedAccountRanges = (): string[] => {
    const ranges: string[] = [];
    userRoles.forEach(ur => {
      if (ur.gl_account_ranges) {
        ranges.push(...ur.gl_account_ranges);
      }
    });
    return ranges;
  };

  // Check if account number is in user's assigned ranges
  const canAccessAccount = (accountNumber: string): boolean => {
    // TORRANCE STROMAN: UNIVERSAL ACCESS
    if (user?.email && hasFullAccess(user.email)) return true;
    if (hasFullAdmin) return true;
    
    const ranges = getAssignedAccountRanges();
    if (ranges.length === 0) return false; // No assignments = no access
    
    const accountNum = parseInt(accountNumber);
    if (isNaN(accountNum)) return false;
    
    return ranges.some(range => {
      const [min, max] = range.split('-').map(n => parseInt(n.trim()));
      return accountNum >= min && accountNum <= max;
    });
  };

  // Get user's primary role (highest access level)
  const getPrimaryRole = (): FinanceRole | null => {
    // TORRANCE STROMAN: UNIVERSAL ACCESS - RETURN CFO ROLE
    if (user?.email && hasFullAccess(user.email)) {
      return {
        id: 'torrance-universal',
        role_code: 'CFO',
        role_name: 'Chief Financial Officer',
        role_category: 'EXECUTIVE',
        access_level: 'FULL_ADMIN',
      };
    }
    
    if (userRoles.length === 0) return null;
    
    const accessLevelOrder = {
      'FULL_ADMIN': 5,
      'ACCOUNTING_ADMIN': 4,
      'FP&A_ADMIN': 4,
      'PROCESSOR': 3,
      'ANALYST': 2,
      'VIEWER': 1,
    };
    
    return userRoles
      .map(ur => ur.role)
      .filter((r): r is FinanceRole => r !== null)
      .sort((a, b) => {
        const aLevel = accessLevelOrder[a.access_level as keyof typeof accessLevelOrder] || 0;
        const bLevel = accessLevelOrder[b.access_level as keyof typeof accessLevelOrder] || 0;
        return bLevel - aLevel;
      })[0] || null;
  };

  return {
    userRoles,
    permissions,
    loading,
    isCFO,
    hasFullAdmin,
    hasPermission,
    hasRoleCategory,
    hasRole,
    getAssignedAccountRanges,
    canAccessAccount,
    getPrimaryRole,
    refreshRoles: fetchUserRoles,
  };
};

