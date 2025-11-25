-- Tech Cost Management Categories
-- This migration creates the default cost categories for the Tech Cost Management system
-- All vendor and cost data must be added manually or via billing API integrations

-- Create default categories (they should already exist, but just in case)
INSERT INTO public.tech_cost_categories (name, description) VALUES
  ('Cloud Infrastructure', 'Supabase, Vercel, AWS, etc.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.tech_cost_categories (name, description) VALUES
  ('Software Licenses', 'SaaS subscriptions and licenses')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.tech_cost_categories (name, description) VALUES
  ('Development Tools', 'GitHub, IDE licenses, etc.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.tech_cost_categories (name, description) VALUES
  ('Security Tools', 'Security monitoring and compliance tools')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.tech_cost_categories (name, description) VALUES
  ('Monitoring & Analytics', 'Error tracking, analytics, monitoring')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.tech_cost_categories (name, description) VALUES
  ('Storage', 'File storage, database storage, backups')
ON CONFLICT (name) DO NOTHING;

-- Note: Vendors, budgets, actual costs, and forecasts must be added manually
-- or via billing API integrations. No placeholder data is inserted here.

-- Clean up any fake vendor data that may have been inserted previously
-- Delete fake vendors: Supabase, Vercel, GitHub, Sentry, Resend, Stripe (if they exist from fake data)
DELETE FROM public.tech_cost_alerts 
WHERE vendor_id IN (
  SELECT id FROM public.tech_vendors 
  WHERE name IN ('Supabase', 'Vercel', 'GitHub', 'Sentry', 'Resend', 'Stripe')
  AND contract_start_date < '2025-01-01'
);

DELETE FROM public.tech_actual_costs 
WHERE vendor_id IN (
  SELECT id FROM public.tech_vendors 
  WHERE name IN ('Supabase', 'Vercel', 'GitHub', 'Sentry', 'Resend', 'Stripe')
  AND contract_start_date < '2025-01-01'
);

DELETE FROM public.tech_licenses 
WHERE vendor_id IN (
  SELECT id FROM public.tech_vendors 
  WHERE name IN ('Supabase', 'Vercel', 'GitHub', 'Sentry', 'Resend', 'Stripe')
  AND contract_start_date < '2025-01-01'
);

DELETE FROM public.tech_vendors 
WHERE name IN ('Supabase', 'Vercel', 'GitHub', 'Sentry', 'Resend', 'Stripe')
AND contract_start_date < '2025-01-01';

-- Delete fake budgets and costs from 2024
DELETE FROM public.tech_cost_forecasts WHERE forecast_period < '2025-01';

DELETE FROM public.tech_actual_costs WHERE period < '2025-01';

DELETE FROM public.tech_budgets WHERE period < '2025-01';

