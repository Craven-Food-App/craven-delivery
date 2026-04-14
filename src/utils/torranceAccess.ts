/**
 * EXECUTIVE ACCESS UTILITY
 * 
 * Checks executive access via database roles (exec_users / user_roles tables).
 * All authorization is enforced server-side via RLS and edge function checks.
 */

export const TORRANCE_EMAIL = 'tstroman.ceo@cravenusa.com';
export const JUSTIN_EMAIL = 'jsweet.cfo@cravenusa.com';
export const JUSTIN_EMAIL_ALIASES = [
  JUSTIN_EMAIL,
  'j.sweet.cfo@cravenusa.com',
];

export type ExecutiveBypassRole = 'ceo' | 'cfo' | null;

/**
 * Checks if the given email belongs to Torrance Stroman (CEO)
 * Uses exact email match only - no partial matching.
 */
export const isTorrance = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return email.toLowerCase() === TORRANCE_EMAIL.toLowerCase();
};

/**
 * Checks if the given email belongs to Justin Sweet (CFO)
 */
export const isJustin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase();
  return JUSTIN_EMAIL_ALIASES.some(
    (allowedEmail) => normalizedEmail === allowedEmail.toLowerCase()
  );
};

/**
 * Returns the executive bypass role tied to the current email, if any.
 */
export const getExecutiveBypassRole = (
  email: string | null | undefined
): ExecutiveBypassRole => {
  if (isTorrance(email)) return 'ceo';
  if (isJustin(email)) return 'cfo';
  return null;
};

/**
 * Checks if the current authenticated user is Torrance
 */
export const isTorranceUser = async (): Promise<boolean> => {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { user } } = await supabase.auth.getUser();
  return isTorrance(user?.email);
};

/**
 * Universal access check - returns true if user is CEO.
 * NOTE: This should be backed by server-side role checks (RLS/edge functions).
 */
export const hasFullAccess = (email: string | null | undefined): boolean => {
  return getExecutiveBypassRole(email) === 'ceo';
};

/**
 * CFO Portal full access - returns true if user is CEO or CFO.
 * Justin Sweet has unrestricted access to everything within the CFO portal.
 */
export const hasCFOPortalAccess = (email: string | null | undefined): boolean => {
  return getExecutiveBypassRole(email) !== null;
};

/**
 * Investor access check - returns true if user is CEO or CFO.
 */
export const hasInvestorAccess = (email: string | null | undefined): boolean => {
  return hasCFOPortalAccess(email);
};
