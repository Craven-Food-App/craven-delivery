-- Set Tony Packo's logo to the seeded image in Supabase Storage
UPDATE public.restaurants_master
SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773013555938.jpg'
WHERE name = 'Tony Packo''s' AND city = 'Toledo' AND state = 'OH';

-- Set Applebee's logo to the seeded image in Supabase Storage
UPDATE public.restaurants_master
SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773013585044.jpg'
WHERE name = 'Applebee''s' AND city = 'Toledo' AND state = 'OH';

-- Set Arby's logo to the seeded image in Supabase Storage
UPDATE public.restaurants_master
SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773013601605.jpg'
WHERE name = 'Arby''s' AND city = 'Toledo' AND state = 'OH';

-- Set Balance Grille logo to the seeded image in Supabase Storage
UPDATE public.restaurants_master
SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773013654751.jpg'
WHERE name = 'Balance Grille' AND city = 'Toledo' AND state = 'OH';

-- Set Mancy's Italian Grill logo to the seeded image in Supabase Storage
UPDATE public.restaurants_master
SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/MANCYS%20ITALIANlogo.png'
WHERE name = 'Mancy''s Italian Grill' AND city = 'Toledo' AND state = 'OH';
