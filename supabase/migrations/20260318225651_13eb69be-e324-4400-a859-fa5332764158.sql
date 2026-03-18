-- Set all seeded merchants back to REQUESTABLE (they are on the app)
UPDATE public.restaurants_master 
SET status = 'REQUESTABLE';

-- For real sign-ups: only CMIH Kitchen and Crave'n Stylz should be active
-- Others should be marked as not active (coming soon)
UPDATE public.restaurants 
SET is_active = false 
WHERE name NOT IN ('CMIH Kitchen', 'Crave''n Stylz');

UPDATE public.restaurants 
SET is_active = true 
WHERE name IN ('CMIH Kitchen', 'Crave''n Stylz');