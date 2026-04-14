-- Torrance Stroman: set annual base salary to $80,000 when missing, empty, or zero.

UPDATE public.executive_appointments ea
SET
  compensation_structure = '{"base_salary":80000}'::text,
  updated_at = now()
WHERE
  (
    lower(trim(COALESCE(ea.proposed_officer_email, ''))) = 'tstroman.ceo@cravenusa.com'
    OR ea.proposed_officer_name ~* 'torrance\s+stroman'
  )
  AND (
    ea.compensation_structure IS NULL
    OR trim(ea.compensation_structure) = ''
    OR trim(ea.compensation_structure) IN ('{}', 'null', 'NULL')
  );

UPDATE public.executive_appointments ea
SET
  compensation_structure = (
    COALESCE(ea.compensation_structure::jsonb, '{}'::jsonb) || jsonb_build_object('base_salary', 80000)
  )::text,
  updated_at = now()
WHERE
  (
    lower(trim(COALESCE(ea.proposed_officer_email, ''))) = 'tstroman.ceo@cravenusa.com'
    OR ea.proposed_officer_name ~* 'torrance\s+stroman'
  )
  AND trim(COALESCE(ea.compensation_structure, '')) ~ '^\s*\{'
  AND COALESCE(ea.compensation_structure::jsonb ->> 'base_salary', '0')::numeric = 0;
