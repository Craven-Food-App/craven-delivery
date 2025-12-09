-- Fix create_driver_profile_from_application to not require vehicle_inspection
CREATE OR REPLACE FUNCTION public.create_driver_profile_from_application(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
  
  -- Get approved feeder application (removed vehicle_inspection requirement)
  SELECT * INTO app_record
  FROM public.feeder_applications 
  WHERE user_id = target_user_id 
    AND status = 'approved'
    AND background_check = true
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
$function$;