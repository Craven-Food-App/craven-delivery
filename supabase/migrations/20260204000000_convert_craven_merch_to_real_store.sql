-- ============================================================================
-- CONVERT "Crave'n Merch" TO REAL STORE
-- Transfer ownership to craven@usa.com account
-- ============================================================================

DO $$
DECLARE
  crave_n_merch_restaurant_id UUID;
  craven_user_id UUID;
BEGIN
  -- Find the "Crave'n Merch" restaurant
  SELECT id INTO crave_n_merch_restaurant_id
  FROM public.restaurants
  WHERE name = 'Crave''n Merch'
  LIMIT 1;
  
  -- Find the craven@usa.com user account
  SELECT id INTO craven_user_id
  FROM auth.users
  WHERE email = 'craven@usa.com'
  LIMIT 1;
  
  -- If both exist, update the restaurant
  IF crave_n_merch_restaurant_id IS NOT NULL AND craven_user_id IS NOT NULL THEN
    -- Update restaurant owner
    UPDATE public.restaurants
    SET 
      owner_id = craven_user_id,
      email = 'craven@usa.com',
      updated_at = NOW()
    WHERE id = crave_n_merch_restaurant_id;
    
    -- Ensure user profile exists for craven@usa.com
    INSERT INTO public.user_profiles (user_id, full_name, role, created_at)
    VALUES (craven_user_id, 'Torrance Stroman', 'admin', NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = COALESCE(user_profiles.full_name, 'Torrance Stroman'),
      role = 'admin',
      updated_at = NOW();
    
    RAISE NOTICE 'Successfully transferred "Crave''n Merch" to craven@usa.com account';
  ELSIF crave_n_merch_restaurant_id IS NULL THEN
    RAISE WARNING 'Restaurant "Crave''n Merch" not found';
  ELSIF craven_user_id IS NULL THEN
    RAISE WARNING 'User account craven@usa.com not found';
  END IF;
END $$;

