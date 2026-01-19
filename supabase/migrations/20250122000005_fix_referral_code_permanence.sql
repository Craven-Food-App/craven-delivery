-- Fix generate_referral_code to return existing code if user already has one
-- This ensures referral codes are permanent and never regenerate

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid, p_user_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_existing_code TEXT;
  v_code TEXT;
  v_exists BOOLEAN;
  v_attempts INTEGER := 0;
BEGIN
  -- FIRST: Check if user already has a code for this user_type
  SELECT code INTO v_existing_code
  FROM referral_codes
  WHERE user_id = p_user_id
    AND user_type = p_user_type
    AND is_active = true
  LIMIT 1;
  
  -- If they already have a code, return it immediately (PERMANENT)
  IF v_existing_code IS NOT NULL THEN
    RETURN v_existing_code;
  END IF;
  
  -- Only generate a new code if they don't have one
  LOOP
    -- Generate 8-character alphanumeric code
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code already exists globally
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = v_code) INTO v_exists;
    
    IF NOT v_exists THEN
      -- Insert new referral code
      INSERT INTO referral_codes (user_id, code, user_type, is_active)
      VALUES (p_user_id, v_code, p_user_type, true)
      ON CONFLICT (user_id, user_type) DO UPDATE
      SET code = EXCLUDED.code,
          is_active = true
      WHERE referral_codes.user_id = p_user_id
        AND referral_codes.user_type = p_user_type;
      
      RETURN v_code;
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after 10 attempts';
    END IF;
  END LOOP;
END;
$function$;

-- Add unique constraint to prevent duplicate codes per user+type
-- This ensures database-level enforcement that each user can only have one active code per type
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'referral_codes_user_type_unique'
  ) THEN
    ALTER TABLE referral_codes DROP CONSTRAINT referral_codes_user_type_unique;
  END IF;
  
  -- DATA CLEANUP: ensure at most one active code per (user_id, user_type)
  -- For any duplicates, keep the most recently created row active and deactivate the others
  WITH ranked AS (
    SELECT
      id,
      user_id,
      user_type,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, user_type
        ORDER BY created_at DESC, id DESC
      ) AS rn
    FROM referral_codes
    WHERE is_active = true
  )
  UPDATE referral_codes rc
  SET is_active = false
  FROM ranked r
  WHERE rc.id = r.id
    AND r.rn > 1;
  
  -- Create unique constraint on (user_id, user_type) where is_active = true
  -- Note: PostgreSQL doesn't support partial unique constraints directly, so we'll use a unique index
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_referral_codes_user_type_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_referral_codes_user_type_unique 
    ON referral_codes (user_id, user_type) 
    WHERE is_active = true;
  END IF;
END $$;

