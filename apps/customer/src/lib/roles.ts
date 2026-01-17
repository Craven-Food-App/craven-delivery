import { supabase } from '@/integrations/supabase/client';
import { hasFullAccess } from '@/utils/torranceAccess';

/**
 * Fetch all roles for the current user
 */
export async function fetchUserRoles(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // TORRANCE STROMAN: FULL ACCESS - Gets ALL roles
    if (hasFullAccess(user.email)) {
      return [
        'CRAVEN_FOUNDER',
        'CRAVEN_CORPORATE_SECRETARY',
        'CRAVEN_BOARD_MEMBER',
        'CRAVEN_EXECUTIVE',
        'CRAVEN_CEO',
        'CRAVEN_CFO',
        'CRAVEN_CTO',
        'CRAVEN_COO',
        'CRAVEN_CXO',
        'admin',
      ];
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (error || !data) return [];
    return data.map((r) => r.role);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(userRoles: string[], roles: string[]): boolean {
  return roles.some((r) => userRoles.includes(r));
}

/**
 * Check if user has all of the specified roles
 */
export function hasAllRoles(userRoles: string[], roles: string[]): boolean {
  return roles.every((r) => userRoles.includes(r));
}

/**
 * Role checkers for specific roles
 */
export const isFounder = (roles: string[]) => roles.includes('CRAVEN_FOUNDER');
export const isCorporateSecretary = (roles: string[]) => roles.includes('CRAVEN_CORPORATE_SECRETARY');
export const isBoardMember = (roles: string[]) => roles.includes('CRAVEN_BOARD_MEMBER');
export const isExecutive = (roles: string[]) => roles.includes('CRAVEN_EXECUTIVE');
export const isCEO = (roles: string[]) => roles.includes('CRAVEN_CEO');
export const isCFO = (roles: string[]) => roles.includes('CRAVEN_CFO');
export const isCTO = (roles: string[]) => roles.includes('CRAVEN_CTO');
export const isCXO = (roles: string[]) => roles.includes('CRAVEN_CXO');
export const isCOO = (roles: string[]) => roles.includes('CRAVEN_COO');

/**
 * Check if user has high-level company portal access
 */
export async function hasCompanyPortalAccess(roles?: string[]): Promise<boolean> {
  // TORRANCE STROMAN: FULL ACCESS
  const { data: { user } } = await supabase.auth.getUser();
  if (hasFullAccess(user?.email)) {
    return true;
  }
  
  if (!roles) {
    roles = await fetchUserRoles();
  }
  
  return hasAnyRole(roles, [
    'CRAVEN_FOUNDER',
    'CRAVEN_CORPORATE_SECRETARY',
    'CRAVEN_BOARD_MEMBER',
    'CRAVEN_EXECUTIVE',
    'CRAVEN_CEO',
    'CRAVEN_CFO',
    'CRAVEN_COO',
    'CRAVEN_CTO',
    'CRAVEN_CXO',
  ]);
}

/**
 * Check if user can manage governance (Founder or Corporate Secretary)
 */
export function canManageGovernance(roles: string[]): boolean {
  // Note: This is a synchronous check, so we check roles array
  // The roles array should already include all roles for tstroman.ceo@cravenusa.com
  return hasAnyRole(roles, ['CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY']);
}

/**
 * Check if user can vote on board resolutions
 */
export function canVoteOnResolutions(roles: string[]): boolean {
  // tstroman.ceo@cravenusa.com always has access (roles array should include CRAVEN_BOARD_MEMBER)
  return roles.includes('CRAVEN_BOARD_MEMBER') || roles.includes('CRAVEN_FOUNDER');
}

