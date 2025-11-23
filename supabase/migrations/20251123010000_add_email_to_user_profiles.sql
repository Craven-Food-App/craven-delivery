-- Add email column to user_profiles if it doesn't exist
-- This allows easier querying without joining auth.users

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN email TEXT;
    
    -- Backfill email from auth.users
    UPDATE public.user_profiles up
    SET email = au.email
    FROM auth.users au
    WHERE up.user_id = au.id
      AND up.email IS NULL;
    
    RAISE NOTICE 'Added email column to user_profiles and backfilled from auth.users';
  ELSE
    RAISE NOTICE 'Email column already exists in user_profiles';
  END IF;
END $$;

-- Create a trigger to keep email in sync with auth.users
CREATE OR REPLACE FUNCTION sync_user_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET email = NEW.email
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_user_profile_email_trigger ON auth.users;

-- Create trigger to sync email when auth.users.email changes
CREATE TRIGGER sync_user_profile_email_trigger
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_user_profile_email();

-- Also sync on insert
CREATE OR REPLACE FUNCTION handle_new_user_with_email()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, email, role, preferences, settings)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'customer'),
    '{}',
    '{}'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = NEW.email,
    full_name = COALESCE(user_profiles.full_name, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_with_email();

