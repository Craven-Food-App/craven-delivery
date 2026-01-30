-- Verify the trigger function has been updated correctly
-- Run this in Supabase Dashboard SQL Editor

-- Check the function definition
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'check_all_documents_signed';

-- Also verify the trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'trigger_document_signed';

-- Test the function with a sample appointment ID (replace with actual ID)
-- SELECT public.check_all_documents_signed('YOUR_APPOINTMENT_ID_HERE');

