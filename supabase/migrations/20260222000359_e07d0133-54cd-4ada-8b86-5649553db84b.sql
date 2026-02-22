
ALTER TABLE public.driver_profiles DROP CONSTRAINT driver_profiles_rating_tier_check;
ALTER TABLE public.driver_profiles ADD CONSTRAINT driver_profiles_rating_tier_check 
  CHECK (rating_tier = ANY (ARRAY['Bronze'::text, 'Feeder'::text, 'Gold'::text, 'Platinum'::text, 'Diamond'::text, 'Ultimate'::text]));
