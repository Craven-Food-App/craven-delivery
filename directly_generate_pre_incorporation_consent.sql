-- ============================================================================
-- DIRECTLY GENERATE PRE-INCORPORATION CONSENT FOR TORRANCE STROMAN
-- This script ensures formation_mode is enabled and provides the appointment ID
-- ============================================================================

-- Step 1: Ensure columns exist
ALTER TABLE public.executive_appointments
ADD COLUMN IF NOT EXISTS formation_mode BOOLEAN DEFAULT false;

ALTER TABLE public.executive_appointments
ADD COLUMN IF NOT EXISTS pre_incorporation_consent_url TEXT;

-- Step 2: Enable formation_mode and clear URL
UPDATE public.executive_appointments
SET 
  formation_mode = true,
  pre_incorporation_consent_url = NULL,
  updated_at = now()
WHERE proposed_officer_email = 'tstroman.ceo@cravenusa.com'
  AND (proposed_officer_name ILIKE '%Torrance%Stroman%' 
    OR proposed_officer_name ILIKE '%Torrace%Stroman%');

-- Step 3: Get the appointment ID for manual edge function call
SELECT 
  id as appointment_id,
  proposed_officer_name,
  proposed_officer_email,
  formation_mode,
  status,
  'Call edge function with: {"appointment_id": "' || id || '", "force_regenerate": true}' as next_step
FROM public.executive_appointments
WHERE proposed_officer_email = 'tstroman.ceo@cravenusa.com'
  AND (proposed_officer_name ILIKE '%Torrance%Stroman%' 
    OR proposed_officer_name ILIKE '%Torrace%Stroman%')
ORDER BY created_at DESC
LIMIT 1;




