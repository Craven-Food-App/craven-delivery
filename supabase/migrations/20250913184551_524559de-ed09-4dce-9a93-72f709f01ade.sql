-- Create/update user profile for Torrance Stroman
INSERT INTO public.user_profiles (user_id, full_name, phone, role)
VALUES ('93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd', 'Torrance Stroman', '5672251495', 'driver')
ON CONFLICT (user_id) 
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  updated_at = now();

-- Create approved feeder application
INSERT INTO public.feeder_applications (
  user_id,
  first_name,
  last_name,
  email,
  phone,
  date_of_birth,
  street_address,
  city,
  state,
  zip_code,
  vehicle_type,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  vehicle_color,
  license_plate,
  insurance_provider,
  insurance_policy,
  drivers_license,
  status,
  background_check,
  vehicle_inspection
) VALUES (
  '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd',
  'Torrance',
  'Stroman',
  'cmih@chef.net',
  '5672251495',
  '1990-01-01',
  '123 Main St',
  'Los Angeles',
  'CA',
  '90210',
  'car',
  'Toyota',
  'Camry',
  2020,
  'Silver',
  'ABC123',
  'State Farm',
  'POL123456',
  'DL123456',
  'approved',
  true,
  true
) ON CONFLICT (user_id) 
DO UPDATE SET
  status = 'approved',
  background_check = true,
  vehicle_inspection = true,
  updated_at = now();

-- Create driver profile
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
  '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd',
  true,
  'online',
  'car',
  'Toyota',
  'Camry',
  2020,
  'ABC123',
  5.0,
  0
) ON CONFLICT (user_id) 
DO UPDATE SET
  is_available = true,
  status = 'online',
  updated_at = now();