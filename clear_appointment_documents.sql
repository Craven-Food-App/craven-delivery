-- Clear document URLs for Torrance Stroman's appointment
-- This allows documents to be regenerated with updated data
-- 
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy and paste this script
-- 3. Modify the email if needed (currently set to tstroman.ceo@cravenusa.com)
-- 4. Click "Run" to execute

-- Clear all document URLs for the specified appointment
UPDATE public.executive_appointments
SET
  appointment_letter_url = NULL,
  board_resolution_url = NULL,
  employment_agreement_url = NULL,
  certificate_url = NULL,
  deferred_compensation_url = NULL,
  confidentiality_ip_url = NULL,
  stock_subscription_url = NULL,
  updated_at = now()
WHERE LOWER(proposed_officer_email) = 'tstroman.ceo@cravenusa.com'
  AND LOWER(proposed_officer_name) LIKE '%torrance%';

-- Verify the update
SELECT 
  id,
  proposed_officer_name,
  proposed_officer_email,
  appointment_letter_url,
  board_resolution_url,
  employment_agreement_url,
  certificate_url,
  deferred_compensation_url,
  confidentiality_ip_url,
  stock_subscription_url,
  status
FROM public.executive_appointments
WHERE LOWER(proposed_officer_email) = 'tstroman.ceo@cravenusa.com'
  AND LOWER(proposed_officer_name) LIKE '%torrance%';




