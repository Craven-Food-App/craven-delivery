-- Make Jason Parcell an active driver/feeder, bypass onboarding
INSERT INTO public.driver_profiles (user_id, vehicle_type, status, is_available, is_test_user, tier_status, tier_status_v2)
VALUES ('06847119-d5e5-44dc-a5f4-6b3b677d9423', 'car', 'online', true, true, 'Feeder', 'FEEDER_PROBATIONARY')
ON CONFLICT DO NOTHING;

INSERT INTO public.driver_settings (user_id, is_test_user, on_fire_game_enabled)
VALUES ('06847119-d5e5-44dc-a5f4-6b3b677d9423', true, false)
ON CONFLICT (user_id) DO UPDATE SET is_test_user = true;