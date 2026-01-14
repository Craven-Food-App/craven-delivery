import { supabase } from '@/integrations/supabase/client';

/**
 * Check if the current user is a test user
 * Test users can only see and receive test orders
 */
export async function isTestUser(userId?: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) return false;

    // Check driver_settings first (most reliable)
    const { data: settings } = await supabase
      .from('driver_settings')
      .select('is_test_user')
      .eq('user_id', targetUserId)
      .single();

    if (settings?.is_test_user) return true;

    // Fallback: check driver_profiles
    const { data: profile } = await supabase
      .from('driver_profiles')
      .select('is_test_user')
      .eq('user_id', targetUserId)
      .single();

    return profile?.is_test_user || false;
  } catch (error) {
    console.error('Error checking if user is test user:', error);
    return false;
  }
}

/**
 * Get the is_test filter condition for order queries
 * Returns { is_test: true } for test users, { is_test: false } for regular users
 */
export async function getTestOrderFilter(userId?: string): Promise<{ is_test: boolean } | {}> {
  const testUser = await isTestUser(userId);
  return testUser ? { is_test: true } : { is_test: false };
}





