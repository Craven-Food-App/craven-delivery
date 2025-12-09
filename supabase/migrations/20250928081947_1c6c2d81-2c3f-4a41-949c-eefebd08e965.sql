-- Create function to automatically create driver profile from approved feeder application
CREATE OR REPLACE FUNCTION public.create_driver_profile_from_application(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  app_record RECORD;
  profile_exists boolean;
BEGIN
  -- Check if driver profile already exists
  SELECT EXISTS (
    SELECT 1 FROM public.driver_profiles 
    WHERE user_id = target_user_id
  ) INTO profile_exists;
  
  IF profile_exists THEN
    RETURN true;
  END IF;
  
  -- Get approved feeder application
  SELECT * INTO app_record
  FROM public.feeder_applications 
  WHERE user_id = target_user_id 
    AND status = 'approved'
    AND background_check = true
    AND vehicle_inspection = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No approved feeder application found for user';
  END IF;
  
  -- Create driver profile from application data
  INSERT INTO public.driver_profiles (
    user_id,
    is_available,
    status,
    vehicle_type,
    vehicle_make,
    vehicle_model,
    vehicle_year,
    license_plate,
    rating,
    total_deliveries
  ) VALUES (
    target_user_id,
    false,  -- Start offline
    'offline',
    app_record.vehicle_type,
    app_record.vehicle_make,
    app_record.vehicle_model,
    app_record.vehicle_year,
    app_record.license_plate,
    5.0,  -- Initial rating
    0     -- Initial deliveries
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create driver profile: %', SQLERRM;
END;
$$;

-- Create function to ensure driver can go online
CREATE OR REPLACE FUNCTION public.ensure_driver_can_go_online(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- First ensure driver profile exists
  PERFORM public.create_driver_profile_from_application(target_user_id);
  
  -- Update driver status to online
  UPDATE public.driver_profiles 
  SET 
    status = 'online',
    is_available = true,
    updated_at = now()
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver profile not found after creation attempt';
  END IF;
  
  RETURN true;
END;
$$;