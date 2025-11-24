/**
 * TORRANCE STROMAN FULL ACCESS UTILITY
 * 
 * Torrance Stroman (tstroman.ceo@cravenusa.com) has FULL ACCESS to EVERYTHING.
 * This utility function should be used in ALL authorization checks to ensure
 * Torrance bypasses all restrictions.
 */

export const TORRANCE_EMAIL = 'tstroman.ceo@cravenusa.com';

/**
 * Checks if the given email belongs to Torrance Stroman
 */
export const isTorrance = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const emailLower = email.toLowerCase();
  return emailLower === TORRANCE_EMAIL.toLowerCase() || 
         emailLower.includes('torrance') ||
         emailLower.includes('tstroman');
};

/**
 * Checks if the current authenticated user is Torrance
 * Use this in components that need to check access
 */
export const isTorranceUser = async (): Promise<boolean> => {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { user } } = await supabase.auth.getUser();
  return isTorrance(user?.email);
};

/**
 * Universal access check - returns true if user is Torrance
 * Use this to bypass ALL authorization checks
 */
export const hasFullAccess = (email: string | null | undefined): boolean => {
  return isTorrance(email);
};


