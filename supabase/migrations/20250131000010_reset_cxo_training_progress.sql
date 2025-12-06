-- =====================================================
-- Reset CXO Training Progress
-- =====================================================
-- This migration resets all training progress data
-- Use this to clear training completion status and start fresh

-- Delete all training progress records
DELETE FROM public.cxo_training_progress;

-- Delete all training audit log entries (optional - comment out if you want to keep audit history)
-- DELETE FROM public.cxo_training_audit;

-- Reset sequence if using serial IDs (not needed for UUIDs, but included for completeness)
-- No sequences to reset since we're using UUIDs

-- Optional: If you want to keep audit history but reset progress, uncomment the audit deletion above
-- For now, we'll only reset progress, keeping audit history for compliance

-- Verify reset
DO $$
DECLARE
  progress_count INTEGER;
  audit_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO progress_count FROM public.cxo_training_progress;
  SELECT COUNT(*) INTO audit_count FROM public.cxo_training_audit;
  
  RAISE NOTICE 'Training progress records remaining: %', progress_count;
  RAISE NOTICE 'Training audit records remaining: %', audit_count;
END $$;

