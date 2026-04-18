-- Create completed craver_application for Jason Parcell so feeder app treats him as active
INSERT INTO public.craver_applications (
  user_id, first_name, last_name, email, phone, city, state, zip_code,
  status, onboarding_completed_at, onboarding_started_at,
  vehicle_make, vehicle_model, vehicle_year, license_plate
)
VALUES (
  '06847119-d5e5-44dc-a5f4-6b3b677d9423',
  'Jason', 'Parcell', 'jparcell2022@gmail.com', '0000000000',
  'Test City', 'CA', '90001',
  'approved', now(), now(),
  'Tesla', 'Model 3', 2023, 'TEST123'
)
ON CONFLICT DO NOTHING;

-- Ensure driver_profile is online and active
UPDATE public.driver_profiles
SET status = 'online', is_available = true, is_test_user = true,
    tier_status = 'Feeder', tier_status_v2 = 'FEEDER_PROBATIONARY'
WHERE user_id = '06847119-d5e5-44dc-a5f4-6b3b677d9423';