-- Keep ONLY these equity records:
-- 1. Torrance Stroman - 18% / 18,000,000 shares (id: 684f7d11-6551-45b8-a468-f5699fdc4025)
-- 2. Justin Sweet - 10% (id: 1b94040d-9610-4fc7-9c7e-1b5ea379c98e)
-- 3. Terri Crawford - 3% (id: 56d50376-efeb-44ab-8724-de2d3bbfdda8)

-- Remove all OTHER equity records
DELETE FROM public.employee_equity
WHERE id NOT IN (
  '684f7d11-6551-45b8-a468-f5699fdc4025', -- Torrance 80%
  '1b94040d-9610-4fc7-9c7e-1b5ea379c98e', -- Justin 10%
  '56d50376-efeb-44ab-8724-de2d3bbfdda8'  -- Terri 3%
);

-- Verify cleanup
SELECT 
  emp.first_name,
  emp.last_name,
  emp.position,
  e.shares_percentage,
  e.shares_total,
  e.equity_type
FROM public.employee_equity e
JOIN public.employees emp ON e.employee_id = emp.id
ORDER BY e.shares_percentage DESC;

