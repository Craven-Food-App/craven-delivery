-- Fix: get_business_nearby only returns restaurants_master rows with status in ('REQUESTABLE','COMING_SOON','LEAD_READY')
UPDATE public.restaurants_master
SET status = 'REQUESTABLE'
WHERE marketplace_type = 'mall'
  AND status = 'ACTIVE';