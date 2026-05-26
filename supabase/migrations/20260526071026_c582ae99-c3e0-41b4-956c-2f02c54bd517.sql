-- Remove Moov integration from the database completely

DROP TABLE IF EXISTS public.moov_invites CASCADE;

ALTER TABLE public.restaurants
  DROP COLUMN IF EXISTS moov_account_id,
  DROP COLUMN IF EXISTS moov_onboarding_invite_code,
  DROP COLUMN IF EXISTS moov_onboarding_status,
  DROP COLUMN IF EXISTS moov_onboarding_complete,
  DROP COLUMN IF EXISTS moov_capabilities,
  DROP COLUMN IF EXISTS moov_fee_plan_codes;
