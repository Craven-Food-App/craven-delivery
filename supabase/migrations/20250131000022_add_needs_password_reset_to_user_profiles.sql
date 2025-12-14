-- Add needs_password_reset column to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS needs_password_reset BOOLEAN DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_needs_password_reset 
ON public.user_profiles(needs_password_reset) 
WHERE needs_password_reset = true;


