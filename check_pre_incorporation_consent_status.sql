-- ============================================================================
-- CHECK PRE-INCORPORATION CONSENT STATUS FOR TORRANCE STROMAN
-- ============================================================================

SELECT 
  id,
  proposed_officer_name,
  proposed_officer_email,
  formation_mode,
  pre_incorporation_consent_url,
  status,
  updated_at
FROM public.executive_appointments
WHERE proposed_officer_email = 'tstroman.ceo@cravenusa.com'
ORDER BY created_at DESC;

-- If pre_incorporation_consent_url is still NULL, the document generation might have failed
-- Check the Edge Function logs in Supabase Dashboard for errors




