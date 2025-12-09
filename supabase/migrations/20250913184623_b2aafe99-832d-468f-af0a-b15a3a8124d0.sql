-- Insert user profile for Torrance Stroman if it doesn't exist
INSERT INTO public.user_profiles (user_id, full_name, phone, role)
SELECT '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd', 'Torrance Stroman', '5672251495', 'driver'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles WHERE user_id = '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd'
);

-- Update existing user profile if it exists
UPDATE public.user_profiles 
SET full_name = 'Torrance Stroman', 
    phone = '5672251495', 
    role = 'driver',
    updated_at = now()
WHERE user_id = '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd';

-- Insert feeder application if it doesn't exist
INSERT INTO public.feeder_applications (
  user_id, first_name, last_name, email, phone, date_of_birth,
  street_address, city, state, zip_code, vehicle_type, vehicle_make,
  vehicle_model, vehicle_year, vehicle_color, license_plate,
  insurance_provider, insurance_policy, drivers_license,
  status, background_check, vehicle_inspection
)
SELECT 
  '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd', 'Torrance', 'Stroman', 'cmih@chef.net', '5672251495', '1990-01-01',
  '123 Main St', 'Los Angeles', 'CA', '90210', 'car', 'Toyota',
  'Camry', 2020, 'Silver', 'ABC123',
  'State Farm', 'POL123456', 'DL123456',
  'approved', true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.feeder_applications WHERE user_id = '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd'
);

-- Update existing feeder application
UPDATE public.feeder_applications 
SET status = 'approved', background_check = true, vehicle_inspection = true, updated_at = now()
WHERE user_id = '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd';

-- Insert driver profile if it doesn't exist
INSERT INTO public.driver_profiles (
  user_id, is_available, status, vehicle_type, vehicle_make,
  vehicle_model, vehicle_year, license_plate, rating, total_deliveries
)
SELECT 
  '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd', true, 'online', 'car', 'Toyota',
  'Camry', 2020, 'ABC123', 5.0, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.driver_profiles WHERE user_id = '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd'
);

-- Update existing driver profile
UPDATE public.driver_profiles 
SET is_available = true, status = 'online', updated_at = now()
WHERE user_id = '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd';