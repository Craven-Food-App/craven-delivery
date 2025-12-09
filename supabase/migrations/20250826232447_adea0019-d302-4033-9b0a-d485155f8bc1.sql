-- Fix driver profile creation by allowing approved feeders to create their profiles
CREATE OR REPLACE FUNCTION create_driver_profile_for_approved_craver()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create driver profile for approved applications
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO public.driver_profiles (user_id, rating, total_deliveries, driver_level, status, is_available)
    VALUES (NEW.user_id, 0, 0, 1, 'offline', false)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create driver profile when application is approved
DROP TRIGGER IF EXISTS trigger_create_driver_profile ON public.craver_applications;
CREATE TRIGGER trigger_create_driver_profile
  AFTER UPDATE ON public.craver_applications
  FOR EACH ROW
  EXECUTE FUNCTION create_driver_profile_for_approved_craver();

-- Allow service role to insert driver profiles for approved feeders
CREATE POLICY "Service role can create driver profiles for approved feeders" 
ON public.driver_profiles 
FOR INSERT 
WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR is_approved_craver(user_id));