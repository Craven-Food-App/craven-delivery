-- Fix Nathan Curry's Hub PIN Access
-- Email: natecurry.cto@cravenusa.com
-- PIN: 570022
-- This ensures Nathan can access the Hub using PIN 570022

DO $$
DECLARE
  nathan_email TEXT := 'natecurry.cto@cravenusa.com';
  nathan_pin TEXT := '570022';
  pin_hash_result TEXT;
BEGIN
  -- Generate bcrypt hash for PIN 570022
  -- Using crypt with gen_salt to create a proper bcrypt hash
  SELECT crypt(nathan_pin, gen_salt('bf', 10)) INTO pin_hash_result;
  
  -- Insert or update Nathan's PIN in ceo_access_credentials
  -- Note: This table is used for ALL executives, not just CEO
  INSERT INTO public.ceo_access_credentials (
    user_email,
    pin_hash,
    updated_at
  )
  VALUES (
    nathan_email,
    pin_hash_result,
    now()
  )
  ON CONFLICT (user_email) DO UPDATE
  SET 
    pin_hash = pin_hash_result,
    updated_at = now();
  
  RAISE NOTICE '✅ Nathan Curry PIN configured successfully!';
  RAISE NOTICE 'Email: %', nathan_email;
  RAISE NOTICE 'PIN: %', nathan_pin;
  
END $$;

