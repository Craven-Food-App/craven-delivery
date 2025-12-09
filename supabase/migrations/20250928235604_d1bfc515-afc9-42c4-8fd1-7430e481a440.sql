-- Fix remaining functions that don't have secure search_path

-- Update set_order_number function
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number = generate_order_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Update sync_driver_session_status function
CREATE OR REPLACE FUNCTION public.sync_driver_session_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.driver_profiles 
    SET 
      status = CASE WHEN NEW.is_online THEN 'online' ELSE 'offline' END,
      is_available = NEW.is_online,
      updated_at = now()
    WHERE user_id = NEW.driver_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.driver_profiles 
    SET 
      status = 'offline',
      is_available = false,
      updated_at = now()
    WHERE user_id = OLD.driver_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Update create_driver_profile_from_application function
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
$function$;