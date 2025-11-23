-- Update verify_ceo_pin function to track access
-- AND fix Nathan Curry's PIN in one migration
-- Uses plain text PIN storage (same as CEO PIN system) for consistency

-- Step 1: Update verify_ceo_pin function to track access
CREATE OR REPLACE FUNCTION public.verify_ceo_pin(
  check_email TEXT,
  check_pin TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_pin TEXT;
BEGIN
  -- Get the stored PIN for the email
  SELECT pin_hash INTO stored_pin
  FROM public.ceo_access_credentials
  WHERE user_email = check_email;
  
  -- If no record found, return false
  IF stored_pin IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verify PIN using plain text comparison (same as CEO PIN system)
  IF stored_pin != check_pin THEN
    RETURN false;
  END IF;
  
  -- If valid, update last access time and access count
  UPDATE public.ceo_access_credentials
  SET 
    last_access_at = now(),
    access_count = COALESCE(access_count, 0) + 1,
    updated_at = now()
  WHERE user_email = check_email;
  
  RETURN true;
END;
$$;

-- Step 2: Set Nathan Curry's PIN to 570022 (stored as plain text, same as CEO)
INSERT INTO public.ceo_access_credentials (
  user_email,
  pin_hash,
  updated_at
)
VALUES (
  'natecurry.cto@cravenusa.com',
  '570022',
  now()
)
ON CONFLICT (user_email) DO UPDATE
SET 
  pin_hash = '570022',
  updated_at = now();

