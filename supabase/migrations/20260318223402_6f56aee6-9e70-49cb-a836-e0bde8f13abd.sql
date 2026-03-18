UPDATE public.restaurants_master SET status = 'COMING_SOON' WHERE name != 'CMIH Kitchen';
UPDATE public.restaurants_master SET status = 'REQUESTABLE' WHERE name = 'CMIH Kitchen';