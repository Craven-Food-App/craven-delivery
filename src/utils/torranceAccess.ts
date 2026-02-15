/**
 * TORRANCE STROMAN & JUSTIN SWEET FULL ACCESS UTILITY
 * 
 * Torrance Stroman (tstroman.ceo@cravenusa.com) - CEO has FULL ACCESS to EVERYTHING.
 * Justin Sweet (jsweet.cfo@cravenusa.com) - CFO has FULL ACCESS to INVESTOR MATERIALS.
 * This utility function should be used in ALL authorization checks to ensure
 * these executives bypass all restrictions.
 */

export const TORRANCE_EMAIL = 'tstroman.ceo@cravenusa.com';
export const JUSTIN_EMAIL = 'jsweet.cfo@cravenusa.com';

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
 * Checks if the given email belongs to Justin Sweet (CFO)
 */
export const isJustin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const emailLower = email.toLowerCase();
  return emailLower === JUSTIN_EMAIL.toLowerCase() || 
         emailLower.includes('jsweet') ||
         (emailLower.includes('justin') && emailLower.includes('sweet'));
};

/**
 * Checks if the current authenticated user is Torrance
 * Use this in components that need to check access
 */
export const isTorranceUser = async (): Promise<boolean> => {
  const { supabase } = await import(/* @vite-ignore */ '@/integrations/supabase/client');
  const { data: { user } } = await supabase.auth.getUser();
  return isTorrance(user?.email);
};

/**
 * Universal access check - returns true if user is Torrance (CEO)
 * Use this to bypass ALL authorization checks
 */
export const hasFullAccess = (email: string | null | undefined): boolean => {
  return isTorrance(email);
};

/**
 * Investor access check - returns true if user is Torrance (CEO) or Justin (CFO)
 * Use this for investor materials access
 */
export const hasInvestorAccess = (email: string | null | undefined): boolean => {
  return isTorrance(email) || isJustin(email);
};


