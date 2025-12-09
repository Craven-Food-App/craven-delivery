-- First, let's add admin policies for managing driver applications and profiles

-- Add admin policy for managing feeder applications
CREATE POLICY "Admins can manage all applications" 
ON public.feeder_applications 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add admin policy for managing driver profiles  
CREATE POLICY "Admins can manage all driver profiles"
ON public.driver_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add admin policy for viewing user profiles (to find users)
CREATE POLICY "Admins can view all user profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Let's also create a function to make someone an active driver
CREATE OR REPLACE FUNCTION public.make_user_active_driver(
  target_user_id uuid,
  vehicle_info jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  application_exists boolean;
BEGIN
  -- Check if the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can activate drivers';
  END IF;

  -- Check if user has an application
  SELECT EXISTS (
    SELECT 1 FROM public.feeder_applications 
    WHERE user_id = target_user_id
  ) INTO application_exists;

  -- Update application status if it exists
  IF application_exists THEN
    UPDATE public.feeder_applications 
    SET 
      status = 'approved',
      background_check = true,
      vehicle_inspection = true,
      updated_at = now()
    WHERE user_id = target_user_id;
  END IF;

  -- Create or update driver profile
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
    true,  -- is_available
    'online',  -- status
    COALESCE(vehicle_info->>'vehicle_type', 'car'),
    COALESCE(vehicle_info->>'vehicle_make', 'Unknown'),
    COALESCE(vehicle_info->>'vehicle_model', 'Unknown'),
    COALESCE((vehicle_info->>'vehicle_year')::integer, 2020),
    COALESCE(vehicle_info->>'license_plate', 'TEMP123'),
    5.0,  -- initial rating
    0     -- total_deliveries
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    is_available = true,
    status = 'online',
    vehicle_type = COALESCE(vehicle_info->>'vehicle_type', driver_profiles.vehicle_type),
    vehicle_make = COALESCE(vehicle_info->>'vehicle_make', driver_profiles.vehicle_make),
    vehicle_model = COALESCE(vehicle_info->>'vehicle_model', driver_profiles.vehicle_model),
    vehicle_year = COALESCE((vehicle_info->>'vehicle_year')::integer, driver_profiles.vehicle_year),
    license_plate = COALESCE(vehicle_info->>'license_plate', driver_profiles.license_plate),
    updated_at = now();

  -- Update user profile role if needed
  UPDATE public.user_profiles 
  SET role = 'driver'
  WHERE user_id = target_user_id AND role IS NULL;

END;
$$;