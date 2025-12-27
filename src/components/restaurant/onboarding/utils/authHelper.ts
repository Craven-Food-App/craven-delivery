import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Ensures user is authenticated for onboarding. Creates account if needed.
 * @param email - Email address from onboarding form
 * @param password - Optional password. If not provided, generates a temporary one
 * @returns User object if authenticated, null if failed
 */
export async function ensureAuthenticatedForOnboarding(
  email: string,
  password?: string
): Promise<{ id: string } | null> {
  try {
    // Check if user is already logged in
    const { data: { user: existingUser } } = await supabase.auth.getUser();
    if (existingUser) {
      return existingUser;
    }

    // Try to create a new account (will fail if account already exists)
    const tempPassword = password || `Temp${Date.now()}${Math.random().toString(36).slice(2)}!`;
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/restaurant/register`,
        data: {
          user_type: 'restaurant_owner',
        },
      },
    });

    // If account was created successfully
    if (signUpData.user && !signUpError) {
      toast.success('Account created! You can now upload images and complete your registration.');
      
      // If email confirmation is required, inform user but allow them to continue
      if (!signUpData.session) {
        toast.info('Please check your email to verify your account. You can continue with onboarding.');
        // Return user even without session for uploading purposes
        return signUpData.user;
      }
      
      return signUpData.user;
    }

    // If account already exists, send magic link for sign in
    if (signUpError && (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered'))) {
      // Send magic link for existing user
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/restaurant/register`,
        },
      });

      if (magicLinkError) {
        console.error('Error sending magic link:', magicLinkError);
        toast.error('An account with this email already exists. Please sign in to continue.');
      } else {
        toast.info('An account with this email already exists. Please check your email for a sign-in link.');
      }
      return null;
    }

    // Other signup errors
    if (signUpError) {
      console.error('Error creating account:', signUpError);
      toast.error(signUpError.message || 'Failed to create account. Please try again.');
      return null;
    }

    return null;
  } catch (error: any) {
    console.error('Error ensuring authentication:', error);
    toast.error(error.message || 'Failed to authenticate');
    return null;
  }
}

/**
 * Uploads a file for onboarding, creating account if needed
 * @param file - File to upload
 * @param fileType - Type of file (logoUrl, coverImageUrl, etc.)
 * @param email - Email from onboarding form (used to create account if needed)
 * @param bucket - Storage bucket name (default: 'restaurant-images')
 * @returns Public URL of uploaded file, or null if failed
 */
export async function uploadFileForOnboarding(
  file: File,
  fileType: string,
  email: string,
  bucket: 'restaurant-images' | 'restaurant-documents' = 'restaurant-images'
): Promise<string | null> {
  try {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return null;
    }

    // Ensure user is authenticated (creates account if needed)
    const user = await ensureAuthenticatedForOnboarding(email);
    if (!user) {
      toast.error('Unable to authenticate. Please try again.');
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `onboarding/${user.id}/${fileType}_${Date.now()}.${fileExt}`;

    // Upload to specified bucket
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error: any) {
    console.error('Error uploading file:', error);
    toast.error(error.message || 'Failed to upload file');
    return null;
  }
}

