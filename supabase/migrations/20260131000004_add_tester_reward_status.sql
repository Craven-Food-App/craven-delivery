-- Add tester_reward_status to android_tester_enrollments
-- Status values: 'enrolled' (just signed up), 'testing' (in testing phase), 'issued' (credits granted - can show as credits)

ALTER TABLE public.android_tester_enrollments 
ADD COLUMN IF NOT EXISTS tester_reward_status TEXT DEFAULT 'enrolled' 
CHECK (tester_reward_status IN ('enrolled', 'testing', 'issued'));

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_android_tester_enrollments_reward_status
ON public.android_tester_enrollments(tester_reward_status);

-- Update existing enrollments to 'enrolled' if they don't have credits yet
-- If they have credits issued, set to 'issued'
UPDATE public.android_tester_enrollments ate
SET tester_reward_status = CASE 
  WHEN EXISTS (
    SELECT 1 FROM public.tester_credit_grants tcg
    JOIN auth.users u ON u.id = tcg.user_id
    WHERE u.email = ate.email
  ) THEN 'issued'
  ELSE 'enrolled'
END
WHERE tester_reward_status IS NULL OR tester_reward_status = 'enrolled';

COMMENT ON COLUMN public.android_tester_enrollments.tester_reward_status IS 
'Reward status: enrolled (just signed up), testing (in testing phase), issued (credits granted - can show as credits)';

