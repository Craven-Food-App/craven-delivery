
-- Update Supabase vendor to correct Pro plan pricing ($25/month)
UPDATE tech_vendors 
SET 
  monthly_cost = 25.00,
  annual_cost = 300.00
WHERE name = 'Supabase';

-- Delete inflated historical cost data for Supabase
DELETE FROM tech_actual_costs
WHERE vendor_id = (SELECT id FROM tech_vendors WHERE name = 'Supabase');
