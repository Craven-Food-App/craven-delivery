UPDATE public.time_entries AS te
SET employee_id = NULL,
    updated_at = now()
FROM public.exec_users AS eu,
     public.employees AS e
WHERE te.exec_user_id = eu.id
  AND te.employee_id = e.id
  AND te.user_id = eu.user_id
  AND e.user_id IS DISTINCT FROM eu.user_id;