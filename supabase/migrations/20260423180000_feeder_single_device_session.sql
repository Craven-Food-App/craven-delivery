-- One active feeder login per user: last device to set active_device_session_id wins; other clients sign out.
ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS active_device_session_id uuid;

COMMENT ON COLUMN public.driver_profiles.active_device_session_id IS
  'Client-generated id for this device install; updated on each sign-in. Other devices see the change and must sign out.';
