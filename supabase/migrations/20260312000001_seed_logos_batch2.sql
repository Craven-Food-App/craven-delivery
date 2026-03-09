-- Set seed logos from Supabase Storage for additional restaurants (batch 2).
-- Run after 20260311000001; overrides any prior logo_url for these names.

UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773013751104.jpg' WHERE name = 'Bangkok Kitchen';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773013775224.jpg' WHERE name = 'Bar Louie';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773013792415.jpg' WHERE name = 'Bob Evans';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773013841352.jpg' WHERE name = 'Chili''s';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773013861105.jpg' WHERE name = 'Cracker Barrel';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773013878790.jpg' WHERE name = 'Denny''s';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773013952977.jpg' WHERE name = 'Dunkin''';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773014023637.jpg' WHERE name = 'Holland House';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773014076682.jpg' WHERE name = 'Home Slice Pizza';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773014105739.jpg' WHERE name = 'IHOP';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773014131269.jpg' WHERE name IN ('McDonald''s', 'McDonalds');
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773014153763.jpg' WHERE name = 'Olive Garden';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773014170637.jpg' WHERE name = 'Outback Steakhouse';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773014193727.jpg' WHERE name = 'Panda Express';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773014220077.jpg' WHERE name = 'Red Lobster';
UPDATE public.restaurants_master SET logo_url = 'https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos/FB_IMG_1773014242955.jpg' WHERE name IN ('Red Robin', 'Red Robbin');
