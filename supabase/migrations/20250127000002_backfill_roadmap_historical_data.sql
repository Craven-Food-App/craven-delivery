-- Technology Roadmap Schema
-- This migration ensures the roadmap tables exist
-- All roadmap data must be added manually or via GitHub sync integration
-- No placeholder data is inserted here

-- Clean up any fake 2024 data that may have been inserted previously
DELETE FROM public.cto_roadmap_slip_alerts 
WHERE initiative_id IN (
  SELECT id FROM public.cto_roadmap_initiatives WHERE year = 2024
);

DELETE FROM public.cto_roadmap_dependencies 
WHERE dependent_initiative_id IN (
  SELECT id FROM public.cto_roadmap_initiatives WHERE year = 2024
) OR depends_on_initiative_id IN (
  SELECT id FROM public.cto_roadmap_initiatives WHERE year = 2024
);

DELETE FROM public.cto_roadmap_milestones 
WHERE initiative_id IN (
  SELECT id FROM public.cto_roadmap_initiatives WHERE year = 2024
);

DELETE FROM public.cto_roadmap_initiatives WHERE year = 2024;
