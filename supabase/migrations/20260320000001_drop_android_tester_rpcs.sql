-- Drop Android Tester Program RPCs (program removed from app; tables left for historical data)
-- Run after removing all app/edge code that invoked these functions.

DROP FUNCTION IF EXISTS public.log_tester_activity_day(UUID);
DROP FUNCTION IF EXISTS public.submit_tester_feedback(UUID, TEXT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.get_tester_progress(UUID);
DROP FUNCTION IF EXISTS public.enroll_android_tester(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_available_tester_credits(UUID);
DROP FUNCTION IF EXISTS public.issue_tester_credits(UUID, TEXT);
DROP FUNCTION IF EXISTS public.apply_tester_credits_to_checkout(UUID, INTEGER, INTEGER, INTEGER);
